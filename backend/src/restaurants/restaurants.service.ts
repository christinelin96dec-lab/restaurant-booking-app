import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus, RestaurantStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SearchRestaurantsDto } from './dto/search-restaurants.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { CreateMenuItemDto, UpdateMenuItemDto } from './dto/menu-item.dto';
import { CreateTableDto, UpdateTableDto } from './dto/table.dto';
import { CreateBulkPackageDto, UpdateBulkPackageDto } from './dto/bulk-package.dto';
import { PaymentsService } from '../payments/payments.service';

@Injectable()
export class RestaurantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
  ) {}

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

  async myRestaurants(userId: string) {
    return this.prisma.restaurant.findMany({
      where: { admins: { some: { userId } } },
      include: { stats: true, badges: true },
    });
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

  // --- Menu items ---------------------------------------------------------

  async createMenuItem(restaurantId: string, userId: string, dto: CreateMenuItemDto) {
    await this.assertUserIsAdmin(restaurantId, userId);
    return this.prisma.menuItem.create({ data: { ...dto, restaurantId } });
  }

  async updateMenuItem(restaurantId: string, itemId: string, userId: string, dto: UpdateMenuItemDto) {
    await this.assertUserIsAdmin(restaurantId, userId);
    await this.assertBelongsToRestaurant('menuItem', itemId, restaurantId);
    return this.prisma.menuItem.update({ where: { id: itemId }, data: dto });
  }

  async deleteMenuItem(restaurantId: string, itemId: string, userId: string) {
    await this.assertUserIsAdmin(restaurantId, userId);
    await this.assertBelongsToRestaurant('menuItem', itemId, restaurantId);
    await this.prisma.menuItem.delete({ where: { id: itemId } });
    return { deleted: true };
  }

  // --- Tables / rooms ------------------------------------------------------

  async createTable(restaurantId: string, userId: string, dto: CreateTableDto) {
    await this.assertUserIsAdmin(restaurantId, userId);
    return this.prisma.table.create({ data: { ...dto, restaurantId } });
  }

  async updateTable(restaurantId: string, tableId: string, userId: string, dto: UpdateTableDto) {
    await this.assertUserIsAdmin(restaurantId, userId);
    await this.assertBelongsToRestaurant('table', tableId, restaurantId);
    return this.prisma.table.update({ where: { id: tableId }, data: dto });
  }

  async deleteTable(restaurantId: string, tableId: string, userId: string) {
    await this.assertUserIsAdmin(restaurantId, userId);
    await this.assertBelongsToRestaurant('table', tableId, restaurantId);
    await this.prisma.table.update({ where: { id: tableId }, data: { isActive: false } });
    return { deleted: true };
  }

  // --- Bulk-order packages --------------------------------------------------

  async createBulkPackage(restaurantId: string, userId: string, dto: CreateBulkPackageDto) {
    await this.assertUserIsAdmin(restaurantId, userId);
    if (dto.maxGuests && dto.maxGuests < dto.minGuests) {
      throw new BadRequestException('maxGuests cannot be less than minGuests');
    }
    return this.prisma.bulkOrderPackage.create({ data: { ...dto, restaurantId } });
  }

  async updateBulkPackage(restaurantId: string, packageId: string, userId: string, dto: UpdateBulkPackageDto) {
    await this.assertUserIsAdmin(restaurantId, userId);
    await this.assertBelongsToRestaurant('bulkOrderPackage', packageId, restaurantId);
    return this.prisma.bulkOrderPackage.update({ where: { id: packageId }, data: dto });
  }

  async deleteBulkPackage(restaurantId: string, packageId: string, userId: string) {
    await this.assertUserIsAdmin(restaurantId, userId);
    await this.assertBelongsToRestaurant('bulkOrderPackage', packageId, restaurantId);
    await this.prisma.bulkOrderPackage.update({ where: { id: packageId }, data: { isAvailable: false } });
    return { deleted: true };
  }

  // --- Stripe Connect onboarding (payouts) -----------------------------------

  /**
   * Returns a fresh onboarding link for the restaurant's Stripe Express account,
   * creating the account first if this restaurant doesn't have one yet.
   * The admin opens the returned URL in a browser to complete Stripe's KYC flow —
   * bulk orders are blocked until this restaurant has a stripeAccountId (see
   * BulkOrdersService.create).
   */
  async createStripeOnboardingLink(restaurantId: string, userId: string, refreshUrl: string, returnUrl: string) {
    await this.assertUserIsAdmin(restaurantId, userId);
    const restaurant = await this.prisma.restaurant.findUniqueOrThrow({ where: { id: restaurantId } });

    let accountId = restaurant.stripeAccountId;
    if (!accountId) {
      accountId = await this.payments.createConnectedAccount();
      await this.prisma.restaurant.update({ where: { id: restaurantId }, data: { stripeAccountId: accountId } });
    }

    const url = await this.payments.createOnboardingLink(accountId, refreshUrl, returnUrl);
    return { url };
  }

  async getStripeStatus(restaurantId: string, userId: string) {
    await this.assertUserIsAdmin(restaurantId, userId);
    const restaurant = await this.prisma.restaurant.findUniqueOrThrow({ where: { id: restaurantId } });
    if (!restaurant.stripeAccountId) {
      return { connected: false, chargesEnabled: false, payoutsEnabled: false, detailsSubmitted: false };
    }
    const status = await this.payments.getAccountStatus(restaurant.stripeAccountId);
    return { connected: true, ...status };
  }

  private async assertBelongsToRestaurant(
    model: 'menuItem' | 'table' | 'bulkOrderPackage',
    id: string,
    restaurantId: string,
  ) {
    const record = await (this.prisma[model] as any).findUnique({ where: { id }, select: { restaurantId: true } });
    if (!record || record.restaurantId !== restaurantId) {
      throw new NotFoundException('Not found for this restaurant');
    }
  }
}
