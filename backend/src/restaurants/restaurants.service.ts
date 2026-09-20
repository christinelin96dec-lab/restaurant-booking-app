import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { RestaurantStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SearchRestaurantsDto } from './dto/search-restaurants.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';

@Injectable()
export class RestaurantsService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: SearchRestaurantsDto) {
    return this.prisma.restaurant.findMany({
      where: {
        status: RestaurantStatus.ACTIVE,
        city: query.city ? { equals: query.city, mode: 'insensitive' } : undefined,
        cuisineTypes: query.cuisine ? { has: query.cuisine } : undefined,
        name: query.q ? { contains: query.q, mode: 'insensitive' } : undefined,
        stats: query.minRating ? { averageRating: { gte: query.minRating } } : undefined,
        badges: query.badge ? { some: { type: query.badge as any, revokedAt: null } } : undefined,
      },
      include: { stats: true, badges: true },
      orderBy: { stats: { weightedRating: 'desc' } },
    });
  }

  async top(city?: string, limit = 20) {
    return this.prisma.restaurant.findMany({
      where: { status: RestaurantStatus.ACTIVE, city: city ? { equals: city, mode: 'insensitive' } : undefined },
      include: { stats: true, badges: true },
      orderBy: { stats: { weightedRating: 'desc' } },
      take: limit,
    });
  }

  async findByIdOrThrow(id: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
      include: { stats: true, badges: true, menuItems: true, bulkPackages: true, tables: true },
    });
    if (!restaurant) throw new NotFoundException('Restaurant not found');
    return restaurant;
  }

  async assertUserIsAdmin(restaurantId: string, userId: string) {
    const link = await this.prisma.restaurantAdmin.findUnique({
      where: { userId_restaurantId: { userId, restaurantId } },
    });
    if (!link) throw new ForbiddenException('You do not manage this restaurant');
  }

  async update(restaurantId: string, userId: string, dto: UpdateRestaurantDto) {
    await this.assertUserIsAdmin(restaurantId, userId);
    return this.prisma.restaurant.update({ where: { id: restaurantId }, data: dto });
  }
}
