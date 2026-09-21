import { PaymentsService } from './payments.service';

function fakeConfig(values: Record<string, string> = {}) {
  return { get: (key: string, def?: string) => values[key] ?? def } as any;
}

describe('PaymentsService.computeApplicationFeeCents', () => {
  it('takes 10% of the order total by default', () => {
    const service = new PaymentsService(fakeConfig(), {} as any, {} as any);
    expect(service.computeApplicationFeeCents(100000)).toBe(10000);
  });

  it('rounds to the nearest cent instead of truncating', () => {
    const service = new PaymentsService(fakeConfig(), {} as any, {} as any);
    // 10% of 12345 = 1234.5 -> should round to 1235, not truncate to 1234.
    expect(service.computeApplicationFeeCents(12345)).toBe(1235);
  });

  it('respects a configured PLATFORM_FEE_PERCENT override', () => {
    const service = new PaymentsService(fakeConfig({ PLATFORM_FEE_PERCENT: '15' }), {} as any, {} as any);
    expect(service.computeApplicationFeeCents(100000)).toBe(15000);
  });

  it('returns 0 fee for a 0 amount', () => {
    const service = new PaymentsService(fakeConfig(), {} as any, {} as any);
    expect(service.computeApplicationFeeCents(0)).toBe(0);
  });
});

describe('PaymentsService.handlePaymentSucceeded', () => {
  function buildService() {
    const prisma = {
      payment: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      bulkOrder: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    const notifications = { sendToUser: jest.fn(), sendToRestaurantAdmins: jest.fn() };
    const service = new PaymentsService(fakeConfig(), prisma as any, notifications as any);
    return { service, prisma, notifications };
  }

  it('is a no-op for a payment intent we have no record of (never throws)', async () => {
    const { service, prisma } = buildService();
    prisma.payment.findUnique.mockResolvedValue(null);

    await expect(service.handlePaymentSucceeded('pi_unknown')).resolves.toBeUndefined();
    expect(prisma.payment.update).not.toHaveBeenCalled();
  });

  it('confirms the bulk order and notifies diner + admins on a known payment', async () => {
    const { service, prisma, notifications } = buildService();
    prisma.payment.findUnique.mockResolvedValue({ id: 'payment-1' });
    prisma.payment.update.mockResolvedValue({ id: 'payment-1' });
    prisma.bulkOrder.findUnique.mockResolvedValue({
      id: 'order-1',
      userId: 'user-1',
      type: 'WEDDING',
      guestCount: 40,
      restaurant: { id: 'restaurant-1', name: 'Test Restaurant' },
    });

    await service.handlePaymentSucceeded('pi_known');

    expect(prisma.bulkOrder.update).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { status: 'CONFIRMED' },
    });
    expect(notifications.sendToUser).toHaveBeenCalledWith(
      'user-1',
      'Bulk order confirmed',
      expect.stringContaining('Test Restaurant'),
      expect.objectContaining({ type: 'bulk_order_confirmed' }),
    );
    expect(notifications.sendToRestaurantAdmins).toHaveBeenCalledWith(
      'restaurant-1',
      'New paid bulk order',
      expect.any(String),
      expect.objectContaining({ type: 'bulk_order_received' }),
    );
  });

  it('marks the payment succeeded but does nothing else for a non-bulk-order payment', async () => {
    const { service, prisma, notifications } = buildService();
    prisma.payment.findUnique.mockResolvedValue({ id: 'payment-1' });
    prisma.payment.update.mockResolvedValue({ id: 'payment-1' });
    prisma.bulkOrder.findUnique.mockResolvedValue(null);

    await service.handlePaymentSucceeded('pi_known');

    expect(prisma.bulkOrder.update).not.toHaveBeenCalled();
    expect(notifications.sendToUser).not.toHaveBeenCalled();
  });
});
