import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BulkOrderStatus, BulkOrderType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateBulkOrderDto } from './dto/create-bulk-order.dto';

@Injectable()
export class BulkOrdersService {
  private readonly minLeadHours: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
    private readonly notifications: NotificationsService,
    config: ConfigService,
  ) {
    this.minLeadHours = Number(config.get<string>('BULK_ORDER_MIN_LEAD_HOURS', '72'));
  }

  /**
   * Bulk/event orders (weddings, birthdays, corporate, donations) are restricted
   * to restaurants in the same city as the event, must be placed at least
   * `minLeadHours` ahead of the event, and require full prepayment.
   * See docs/PRODUCT_SPEC.md §2.4 and docs/ARCHITECTURE.md §3.2.
   */
  async create(userId: string, dto: CreateBulkOrderDto) {
    const restaurant = await this.prisma.restaurant.findUnique({ where: { id: dto.restaurantId } });
    if (!restaurant) throw new NotFoundException('Restaurant not found');
    if (!restaurant.stripeAccountId) {
      throw new BadRequestException('This restaurant is not yet set up to accept bulk orders');
    }

    const pkg = await this.prisma.bulkOrderPackage.findUnique({ where: { id: dto.packageId } });
    if (!pkg || pkg.restaurantId !== dto.restaurantId || !pkg.isAvailable) {
      throw new BadRequestException('Bulk order package not available for this restaurant');
    }
    if (dto.guestCount < pkg.minGuests || (pkg.maxGuests && dto.guestCount > pkg.maxGuests)) {
      throw new BadRequestException(
        `This package supports ${pkg.minGuests}${pkg.maxGuests ? `-${pkg.maxGuests}` : '+'} guests`,
      );
    }

    const eventDate = new Date(dto.eventDate);
    const earliestAllowed = new Date(Date.now() + this.minLeadHours * 60 * 60 * 1000);
    if (eventDate < earliestAllowed) {
      throw new BadRequestException(
        `Bulk orders must be placed at least ${this.minLeadHours} hours (3 days) before the event`,
      );
    }

    if (dto.eventCity.trim().toLowerCase() !== restaurant.city.trim().toLowerCase()) {
      throw new BadRequestException(
        'Bulk orders can only be placed with restaurants located in the same city as the event',
      );
    }

    if (dto.type === BulkOrderType.DONATION && !dto.donationRecipientName) {
      throw new BadRequestException('Donation orders require a recipient organization name');
    }

    const subtotalCents = pkg.pricePerHeadCents * dto.guestCount;
    const platformFeeCents = this.payments.computeApplicationFeeCents(subtotalCents);

    // Full prepayment is required to secure a bulk-order slot — no partial deposit path exists.
    const { payment, clientSecret } = await this.payments.createConnectedPaymentIntent({
      userId,
      amountCents: subtotalCents,
      currency: pkg.currency,
      restaurantStripeAccountId: restaurant.stripeAccountId,
    });

    const bulkOrder = await this.prisma.bulkOrder.create({
      data: {
        userId,
        restaurantId: dto.restaurantId,
        packageId: dto.packageId,
        type: dto.type,
        guestCount: dto.guestCount,
        eventDate,
        eventAddress: dto.eventAddress,
        eventCity: dto.eventCity,
        donationRecipientName: dto.donationRecipientName,
        donationRecipientAddress: dto.donationRecipientAddress,
        subtotalCents,
        platformFeeCents,
        totalCents: subtotalCents,
        currency: pkg.currency,
        status: BulkOrderStatus.PENDING_PAYMENT,
        paymentId: payment.id,
      },
    });

    return { bulkOrder, clientSecret };
  }

  findMine(userId: string) {
    return this.prisma.bulkOrder.findMany({
      where: { userId },
      include: { restaurant: true, package: true },
      orderBy: { eventDate: 'desc' },
    });
  }

  /** Restaurant admin's queue: every bulk order for a restaurant they manage. */
  async findForRestaurant(restaurantId: string, adminUserId: string) {
    const link = await this.prisma.restaurantAdmin.findUnique({
      where: { userId_restaurantId: { userId: adminUserId, restaurantId } },
    });
    if (!link) throw new ForbiddenException('You do not manage this restaurant');

    return this.prisma.bulkOrder.findMany({
      where: { restaurantId },
      include: { user: { select: { fullName: true, email: true } }, package: true },
      orderBy: { eventDate: 'asc' },
    });
  }

  async accept(id: string, adminUserId: string) {
    const order = await this.getForAdmin(id, adminUserId);
    if (order.status !== BulkOrderStatus.CONFIRMED) {
      throw new BadRequestException('Only paid (confirmed) orders can be accepted');
    }
    return order; // already CONFIRMED once paid; "accept" is a no-op acknowledgement for the admin UI
  }

  async reject(id: string, adminUserId: string) {
    const order = await this.getForAdmin(id, adminUserId);
    if (order.status !== BulkOrderStatus.CONFIRMED) {
      throw new BadRequestException('Only confirmed orders can be rejected');
    }
    if (order.payment) {
      await this.payments.refund(order.payment.stripePaymentIntentId);
    }
    const rejected = await this.prisma.bulkOrder.update({ where: { id }, data: { status: BulkOrderStatus.REJECTED } });
    await this.notifications.sendToUser(
      order.userId,
      'Bulk order declined',
      'The restaurant was unable to accommodate your order — your payment has been refunded in full.',
      { type: 'bulk_order_rejected', bulkOrderId: order.id },
    );
    return rejected;
  }

  private async getForAdmin(id: string, adminUserId: string) {
    const order = await this.prisma.bulkOrder.findUnique({ where: { id }, include: { payment: true } });
    if (!order) throw new NotFoundException('Bulk order not found');
    const link = await this.prisma.restaurantAdmin.findUnique({
      where: { userId_restaurantId: { userId: adminUserId, restaurantId: order.restaurantId } },
    });
    if (!link) throw new ForbiddenException('You do not manage this restaurant');
    return order;
  }
}
