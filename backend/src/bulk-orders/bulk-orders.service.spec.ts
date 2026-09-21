import { BadRequestException } from '@nestjs/common';
import { BulkOrderType } from '@prisma/client';
import { BulkOrdersService } from './bulk-orders.service';

const RESTAURANT = {
  id: 'restaurant-1',
  city: 'Bangkok',
  stripeAccountId: 'acct_123',
};

const PACKAGE = {
  id: 'package-1',
  restaurantId: 'restaurant-1',
  isAvailable: true,
  minGuests: 20,
  maxGuests: 200,
  pricePerHeadCents: 5000,
  currency: 'USD',
};

function hoursFromNow(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function buildService(overrides: { restaurant?: any; pkg?: any } = {}) {
  const prisma = {
    restaurant: { findUnique: jest.fn().mockResolvedValue(overrides.restaurant ?? RESTAURANT) },
    bulkOrderPackage: { findUnique: jest.fn().mockResolvedValue(overrides.pkg ?? PACKAGE) },
    bulkOrder: { create: jest.fn().mockImplementation(({ data }) => ({ id: 'order-1', ...data })) },
  };
  const payments = {
    computeApplicationFeeCents: jest.fn((amountCents: number) => Math.round(amountCents * 0.1)),
    createConnectedPaymentIntent: jest.fn().mockResolvedValue({
      payment: { id: 'payment-1' },
      clientSecret: 'secret_123',
    }),
  };
  const notifications = { sendToUser: jest.fn(), sendToRestaurantAdmins: jest.fn() };
  const config = { get: (_key: string, def?: string) => def };

  const service = new BulkOrdersService(prisma as any, payments as any, notifications as any, config as any);
  return { service, prisma, payments };
}

const baseDto = {
  restaurantId: 'restaurant-1',
  packageId: 'package-1',
  type: BulkOrderType.WEDDING,
  guestCount: 50,
  eventDate: hoursFromNow(96), // 4 days out — clears the 72h rule
  eventAddress: '123 Main St',
  eventCity: 'Bangkok',
};

describe('BulkOrdersService.create', () => {
  it('rejects orders placed less than 72 hours before the event', async () => {
    const { service } = buildService();
    await expect(service.create('user-1', { ...baseDto, eventDate: hoursFromNow(24) })).rejects.toThrow(
      /72 hours/,
    );
  });

  it('rejects orders for a restaurant in a different city than the event', async () => {
    const { service } = buildService();
    await expect(service.create('user-1', { ...baseDto, eventCity: 'Chiang Mai' })).rejects.toThrow(
      /same city/,
    );
  });

  it('is case-insensitive when comparing event city to restaurant city', async () => {
    const { service } = buildService();
    await expect(service.create('user-1', { ...baseDto, eventCity: 'bangkok' })).resolves.toBeDefined();
  });

  it('rejects a restaurant with no Stripe account configured', async () => {
    const { service } = buildService({ restaurant: { ...RESTAURANT, stripeAccountId: null } });
    await expect(service.create('user-1', baseDto)).rejects.toThrow(/not yet set up/);
  });

  it('rejects a guest count below the package minimum', async () => {
    const { service } = buildService();
    await expect(service.create('user-1', { ...baseDto, guestCount: 5 })).rejects.toThrow(BadRequestException);
  });

  it('rejects a guest count above the package maximum', async () => {
    const { service } = buildService();
    await expect(service.create('user-1', { ...baseDto, guestCount: 500 })).rejects.toThrow(BadRequestException);
  });

  it('requires a donation recipient name for DONATION orders', async () => {
    const { service } = buildService();
    await expect(
      service.create('user-1', { ...baseDto, type: BulkOrderType.DONATION, donationRecipientName: undefined }),
    ).rejects.toThrow(/recipient organization/);
  });

  it('computes subtotal, 10% platform fee, and charges the diner the full subtotal', async () => {
    const { service, payments, prisma } = buildService();
    const { bulkOrder } = await service.create('user-1', baseDto);

    // 50 guests * 5000 cents/head = 250000 cents subtotal
    expect(payments.createConnectedPaymentIntent).toHaveBeenCalledWith(
      expect.objectContaining({ amountCents: 250000, restaurantStripeAccountId: 'acct_123' }),
    );
    expect(prisma.bulkOrder.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          subtotalCents: 250000,
          platformFeeCents: 25000, // 10% of subtotal
          totalCents: 250000, // diner pays the full subtotal; the fee is deducted from the restaurant's payout
          status: 'PENDING_PAYMENT',
        }),
      }),
    );
    expect(bulkOrder.id).toBe('order-1');
  });
});
