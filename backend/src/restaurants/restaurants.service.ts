import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus, RestaurantStatus } from '@prisma/client';
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

  /**
   * Returns every active table/room for the restaurant along with the slots already
   * booked on `dateStr` (YYYY-MM-DD), so the client can compute open time slots.
   */
  async getAvailability(restaurantId: string, dateStr: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      throw new BadRequestException('date must be in YYYY-MM-DD format');
    }
    const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    const tables = await this.prisma.table.findMany({
      where: { restaurantId, isActive: true },
    });

    const bookings = await this.prisma.booking.findMany({
      where: {
        restaurantId,
        status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
        slotStart: { gte: dayStart, lt: dayEnd },
      },
      select: { tableId: true, slotStart: true, slotEnd: true },
    });

    return {
      date: dateStr,
      tables: tables.map((table) => ({
        id: table.id,
        name: table.name,
        type: table.type,
        capacity: table.capacity,
        bookedSlots: bookings
          .filter((b) => b.tableId === table.id)
          .map((b) => ({ slotStart: b.slotStart, slotEnd: b.slotEnd })),
      })),
    };
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
