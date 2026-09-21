import { BadgeType } from '@prisma/client';
import { BadgesService } from './badges.service';

const RESTAURANT_A = {
  id: 'restaurant-a',
  city: 'CityX',
  reviews: Array(12).fill({ rating: 4.2 }), // meets RISING_STAR (avg>=4.0, >=10 reviews) but not GUEST_FAVORITE (needs 50)
};

const RESTAURANT_B = {
  id: 'restaurant-b',
  city: 'CityX',
  reviews: Array(5).fill({ rating: 5.0 }), // too few reviews for any badge tier
};

function buildService() {
  const prisma = {
    restaurant: { findMany: jest.fn().mockResolvedValue([RESTAURANT_A, RESTAURANT_B]) },
    restaurantStats: { upsert: jest.fn() },
    restaurantBadge: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
  const notifications = { sendToRestaurantAdmins: jest.fn(), sendToUser: jest.fn() };
  const service = new BadgesService(prisma as any, notifications as any);
  return { service, prisma, notifications };
}

describe('BadgesService.recomputeAll', () => {
  it('computes the Bayesian-weighted rating using the city mean as the prior', async () => {
    const { service, prisma } = buildService();
    await service.recomputeAll();

    // City mean across both restaurants: (12*4.2 + 5*5.0) / 17 ≈ 4.4353
    // weighted = (v/(v+20))*R + (20/(v+20))*C, with v=12, R=4.2 for restaurant A
    const [upsertArgsForA] = prisma.restaurantStats.upsert.mock.calls.find(
      ([args]: any) => args.where.restaurantId === 'restaurant-a',
    );
    expect(upsertArgsForA.update.weightedRating).toBeCloseTo(4.347, 2);
    expect(upsertArgsForA.update.averageRating).toBeCloseTo(4.2, 5);
    expect(upsertArgsForA.update.reviewCount).toBe(12);
  });

  it('awards RISING_STAR to a restaurant that clears the threshold, and notifies its admins', async () => {
    const { service, prisma, notifications } = buildService();
    await service.recomputeAll();

    expect(prisma.restaurantBadge.create).toHaveBeenCalledWith({
      data: { restaurantId: 'restaurant-a', type: BadgeType.RISING_STAR },
    });
    expect(notifications.sendToRestaurantAdmins).toHaveBeenCalledWith(
      'restaurant-a',
      expect.any(String),
      expect.stringContaining('Rising Star'),
      expect.objectContaining({ type: 'badge_awarded' }),
    );
  });

  it('does not award any badge to a restaurant below the review-count minimum', async () => {
    const { service, prisma } = buildService();
    await service.recomputeAll();

    const createdForB = prisma.restaurantBadge.create.mock.calls.some(
      ([args]: any) => args.data.restaurantId === 'restaurant-b',
    );
    expect(createdForB).toBe(false);
  });

  it('revokes a previously-earned badge once a restaurant no longer qualifies', async () => {
    const prisma = {
      restaurant: { findMany: jest.fn().mockResolvedValue([RESTAURANT_B]) },
      restaurantStats: { upsert: jest.fn() },
      restaurantBadge: {
        findUnique: jest.fn().mockResolvedValue({ id: 'badge-1', revokedAt: null }),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    const notifications = { sendToRestaurantAdmins: jest.fn(), sendToUser: jest.fn() };
    const service = new BadgesService(prisma as any, notifications as any);
    await service.recomputeAll();

    expect(prisma.restaurantBadge.update).toHaveBeenCalledWith({
      where: { id: 'badge-1' },
      data: { revokedAt: expect.any(Date) },
    });
  });
});
