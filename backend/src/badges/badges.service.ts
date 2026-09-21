import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BadgeType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const MIN_REVIEW_THRESHOLD = 20; // `m` in the Bayesian formula, see docs/PRODUCT_SPEC.md §6

interface BadgeRule {
  type: BadgeType;
  minAverage: number;
  minReviews: number;
}

// Order matters: a restaurant is awarded the highest tier it qualifies for.
// PLATFORM_CHOICE is curated manually by platform admins, not auto-awarded here.
const BADGE_RULES: BadgeRule[] = [
  { type: BadgeType.TOP_RATED, minAverage: 4.6, minReviews: 150 },
  { type: BadgeType.GUEST_FAVORITE, minAverage: 4.3, minReviews: 50 },
  { type: BadgeType.RISING_STAR, minAverage: 4.0, minReviews: 10 },
];

const BADGE_LABELS: Record<BadgeType, string> = {
  [BadgeType.RISING_STAR]: 'Rising Star',
  [BadgeType.GUEST_FAVORITE]: 'Guest Favorite',
  [BadgeType.TOP_RATED]: 'Top Rated',
  [BadgeType.PLATFORM_CHOICE]: 'Platform Choice',
};

@Injectable()
export class BadgesService {
  private readonly logger = new Logger(BadgesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async recomputeAll() {
    this.logger.log('Recomputing restaurant ratings and badges...');
    const restaurants = await this.prisma.restaurant.findMany({
      include: { reviews: { select: { rating: true } } },
    });

    // Mean rating per city, used as the Bayesian prior `C`.
    const cityRatings = new Map<string, number[]>();
    for (const r of restaurants) {
      const ratings = r.reviews.map((rv) => rv.rating);
      if (!ratings.length) continue;
      cityRatings.set(r.city, [...(cityRatings.get(r.city) ?? []), ...ratings]);
    }
    const cityMean = (city: string) => {
      const ratings = cityRatings.get(city) ?? [];
      return ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
    };

    for (const restaurant of restaurants) {
      const v = restaurant.reviews.length;
      const R = v ? restaurant.reviews.reduce((a, b) => a + b.rating, 0) / v : 0;
      const C = cityMean(restaurant.city);
      const weightedRating = v
        ? (v / (v + MIN_REVIEW_THRESHOLD)) * R + (MIN_REVIEW_THRESHOLD / (v + MIN_REVIEW_THRESHOLD)) * C
        : 0;

      await this.prisma.restaurantStats.upsert({
        where: { restaurantId: restaurant.id },
        create: { restaurantId: restaurant.id, reviewCount: v, averageRating: R, weightedRating },
        update: { reviewCount: v, averageRating: R, weightedRating, lastComputedAt: new Date() },
      });

      await this.applyBadges(restaurant.id, R, v);
    }
  }

  private async applyBadges(restaurantId: string, averageRating: number, reviewCount: number) {
    const earned = BADGE_RULES.find((rule) => averageRating >= rule.minAverage && reviewCount >= rule.minReviews);

    for (const rule of BADGE_RULES) {
      const shouldHave = earned?.type === rule.type;
      const existing = await this.prisma.restaurantBadge.findUnique({
        where: { restaurantId_type: { restaurantId, type: rule.type } },
      });

      if (shouldHave && !existing) {
        await this.prisma.restaurantBadge.create({ data: { restaurantId, type: rule.type } });
        await this.notifications.sendToRestaurantAdmins(
          restaurantId,
          'New badge earned! 🏅',
          `Your restaurant just earned the "${BADGE_LABELS[rule.type]}" badge.`,
          { type: 'badge_awarded', restaurantId, badgeType: rule.type },
        );
      } else if (!shouldHave && existing && !existing.revokedAt) {
        await this.prisma.restaurantBadge.update({ where: { id: existing.id }, data: { revokedAt: new Date() } });
      } else if (shouldHave && existing?.revokedAt) {
        await this.prisma.restaurantBadge.update({ where: { id: existing.id }, data: { revokedAt: null } });
      }
    }
  }
}
