import { RestaurantsService } from './restaurants.service';

function buildService(stripeAccountId: string | null) {
  const restaurant = { id: 'restaurant-1', stripeAccountId };
  const prisma = {
    restaurantAdmin: { findUnique: jest.fn().mockResolvedValue({ id: 'link-1' }) },
    restaurant: {
      findUniqueOrThrow: jest.fn().mockResolvedValue(restaurant),
      update: jest.fn().mockImplementation(({ data }) => ({ ...restaurant, ...data })),
    },
  };
  const payments = {
    createConnectedAccount: jest.fn().mockResolvedValue('acct_new123'),
    createOnboardingLink: jest.fn().mockResolvedValue('https://connect.stripe.com/setup/xyz'),
    getAccountStatus: jest.fn().mockResolvedValue({ chargesEnabled: true, payoutsEnabled: false, detailsSubmitted: true }),
  };
  const service = new RestaurantsService(prisma as any, payments as any);
  return { service, prisma, payments };
}

describe('RestaurantsService Stripe onboarding', () => {
  it('creates a new connected account when the restaurant has none yet', async () => {
    const { service, prisma, payments } = buildService(null);
    const { url } = await service.createStripeOnboardingLink('restaurant-1', 'user-1', 'refresh://', 'return://');

    expect(payments.createConnectedAccount).toHaveBeenCalled();
    expect(prisma.restaurant.update).toHaveBeenCalledWith({
      where: { id: 'restaurant-1' },
      data: { stripeAccountId: 'acct_new123' },
    });
    expect(payments.createOnboardingLink).toHaveBeenCalledWith('acct_new123', 'refresh://', 'return://');
    expect(url).toBe('https://connect.stripe.com/setup/xyz');
  });

  it('reuses an existing connected account instead of creating a duplicate', async () => {
    const { service, prisma, payments } = buildService('acct_existing456');
    await service.createStripeOnboardingLink('restaurant-1', 'user-1', 'refresh://', 'return://');

    expect(payments.createConnectedAccount).not.toHaveBeenCalled();
    expect(prisma.restaurant.update).not.toHaveBeenCalled();
    expect(payments.createOnboardingLink).toHaveBeenCalledWith('acct_existing456', 'refresh://', 'return://');
  });

  it('reports connected: false with no Stripe calls when the restaurant has no account', async () => {
    const { service, payments } = buildService(null);
    const status = await service.getStripeStatus('restaurant-1', 'user-1');

    expect(status).toEqual({ connected: false, chargesEnabled: false, payoutsEnabled: false, detailsSubmitted: false });
    expect(payments.getAccountStatus).not.toHaveBeenCalled();
  });

  it('fetches live status from Stripe when the restaurant is connected', async () => {
    const { service, payments } = buildService('acct_existing456');
    const status = await service.getStripeStatus('restaurant-1', 'user-1');

    expect(payments.getAccountStatus).toHaveBeenCalledWith('acct_existing456');
    expect(status).toEqual({ connected: true, chargesEnabled: true, payoutsEnabled: false, detailsSubmitted: true });
  });
});
