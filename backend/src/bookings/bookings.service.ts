import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async create(userId: string, dto: CreateBookingDto) {
    const table = await this.prisma.table.findUnique({ where: { id: dto.tableId } });
    if (!table || table.restaurantId !== dto.restaurantId) {
      throw new NotFoundException('Table not found for this restaurant');
    }
    if (dto.partySize > table.capacity) {
      throw new BadRequestException(`This table seats up to ${table.capacity} guests`);
    }

    const lockKey = `booking-lock:${dto.tableId}:${dto.date}:${dto.slotStart}`;

    // See docs/ARCHITECTURE.md §3.1 — lock + re-check inside the lock to avoid double-booking.
    return this.redis.withLock(lockKey, 10_000, async () => {
      const conflict = await this.prisma.booking.findFirst({
        where: {
          tableId: dto.tableId,
          status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
          slotStart: { lt: new Date(dto.slotEnd) },
          slotEnd: { gt: new Date(dto.slotStart) },
        },
      });
      if (conflict) {
        throw new BadRequestException('This table is no longer available for the selected time');
      }

      return this.prisma.booking.create({
        data: {
          userId,
          restaurantId: dto.restaurantId,
          tableId: dto.tableId,
          partySize: dto.partySize,
          date: new Date(dto.date),
          slotStart: new Date(dto.slotStart),
          slotEnd: new Date(dto.slotEnd),
          notes: dto.notes,
          status: BookingStatus.CONFIRMED,
        },
      });
    });
  }

  findMine(userId: string) {
    return this.prisma.booking.findMany({
      where: { userId },
      include: { restaurant: true, table: true },
      orderBy: { date: 'desc' },
    });
  }

  async cancel(id: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking || booking.userId !== userId) throw new NotFoundException('Booking not found');
    return this.prisma.booking.update({ where: { id }, data: { status: BookingStatus.CANCELLED } });
  }
}
