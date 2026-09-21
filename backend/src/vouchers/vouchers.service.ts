import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateVoucherDto } from './dto/create-voucher.dto';

function generateCode(): string {
  return randomBytes(4).toString('hex').toUpperCase();
}

@Injectable()
export class VouchersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(purchaserId: string, dto: CreateVoucherDto) {
    const voucher = await this.prisma.voucher.create({
      data: {
        code: generateCode(),
        type: dto.type,
        restaurantId: dto.restaurantId,
        purchaserId,
        recipientId: dto.recipientId,
        valueCents: dto.valueCents,
        menuItemId: dto.menuItemId,
        maxRedemptions: dto.maxRedemptions ?? 1,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
    });

    if (dto.recipientId && dto.recipientId !== purchaserId) {
      await this.notifications.sendToUser(
        dto.recipientId,
        'You received a gift voucher! 🎁',
        `Someone sent you a voucher worth ${((dto.valueCents ?? 0) / 100).toFixed(2)} — code ${voucher.code}.`,
        { type: 'voucher_gifted', voucherId: voucher.id },
      );
    }

    return voucher;
  }

  /** Restaurant-issued promotional vouchers (free meals for special occasions) skip the purchaser field. */
  issuePromotional(restaurantId: string, dto: Omit<CreateVoucherDto, 'type' | 'restaurantId'>) {
    return this.prisma.voucher.create({
      data: {
        code: generateCode(),
        type: 'PROMOTIONAL',
        restaurantId,
        valueCents: dto.valueCents,
        menuItemId: dto.menuItemId,
        maxRedemptions: dto.maxRedemptions ?? 1,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
    });
  }

  async redeem(code: string, userId: string, context: { bookingId?: string; bulkOrderId?: string }) {
    const voucher = await this.prisma.voucher.findUnique({ where: { code } });
    if (!voucher) throw new NotFoundException('Voucher not found');
    if (voucher.expiresAt && voucher.expiresAt < new Date()) {
      throw new BadRequestException('This voucher has expired');
    }
    if (voucher.redemptionCount >= voucher.maxRedemptions) {
      throw new BadRequestException('This voucher has already been fully redeemed');
    }
    if (voucher.recipientId && voucher.recipientId !== userId) {
      throw new BadRequestException('This voucher was gifted to a different account');
    }

    return this.prisma.$transaction([
      this.prisma.voucherRedemption.create({
        data: { voucherId: voucher.id, redeemedBy: userId, ...context },
      }),
      this.prisma.voucher.update({
        where: { id: voucher.id },
        data: { redemptionCount: { increment: 1 } },
      }),
    ]);
  }

  myVouchers(userId: string) {
    return this.prisma.voucher.findMany({
      where: { OR: [{ purchaserId: userId }, { recipientId: userId }] },
      orderBy: { createdAt: 'desc' },
    });
  }
}
