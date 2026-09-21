import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Reviews may only be written against a COMPLETED booking or bulk order that
   * belongs to the reviewer — see docs/ARCHITECTURE.md §3.4 ("verified reviews only").
   */
  async create(userId: string, dto: CreateReviewDto) {
    if (!dto.bookingId && !dto.bulkOrderId) {
      throw new BadRequestException('A review must reference a completed booking or bulk order');
    }

    let restaurantId: string;

    if (dto.bookingId) {
      const booking = await this.prisma.booking.findUnique({ where: { id: dto.bookingId } });
      if (!booking || booking.userId !== userId) throw new NotFoundException('Booking not found');
      if (booking.status !== 'COMPLETED') {
        throw new BadRequestException('You can only review a completed booking');
      }
      restaurantId = booking.restaurantId;
      const existing = await this.prisma.review.findUnique({ where: { bookingId: dto.bookingId } });
      if (existing) throw new ConflictException('You have already reviewed this booking');
    } else {
      const order = await this.prisma.bulkOrder.findUnique({ where: { id: dto.bulkOrderId } });
      if (!order || order.userId !== userId) throw new NotFoundException('Bulk order not found');
      if (order.status !== 'COMPLETED') {
        throw new BadRequestException('You can only review a completed bulk order');
      }
      restaurantId = order.restaurantId;
      const existing = await this.prisma.review.findUnique({ where: { bulkOrderId: dto.bulkOrderId } });
      if (existing) throw new ConflictException('You have already reviewed this order');
    }

    return this.prisma.review.create({
      data: {
        userId,
        restaurantId,
        bookingId: dto.bookingId,
        bulkOrderId: dto.bulkOrderId,
        rating: dto.rating,
        comment: dto.comment,
        photos: dto.photos ?? [],
      },
    });
  }

  forRestaurant(restaurantId: string) {
    return this.prisma.review.findMany({
      where: { restaurantId },
      include: { user: { select: { fullName: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async reply(reviewId: string, adminUserId: string, replyText: string) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Review not found');
    const link = await this.prisma.restaurantAdmin.findUnique({
      where: { userId_restaurantId: { userId: adminUserId, restaurantId: review.restaurantId } },
    });
    if (!link) throw new ForbiddenException('You do not manage this restaurant');

    return this.prisma.review.update({
      where: { id: reviewId },
      data: { adminReply: replyText, adminReplyAt: new Date() },
    });
  }
}
