import { BadRequestException } from '@nestjs/common';
import { BookingsService } from './bookings.service';

const TABLE = { id: 'table-1', restaurantId: 'restaurant-1', capacity: 4 };

function buildService(existingBooking: any = null) {
  const prisma = {
    table: { findUnique: jest.fn().mockResolvedValue(TABLE) },
    booking: {
      findFirst: jest.fn().mockResolvedValue(existingBooking),
      create: jest.fn().mockImplementation(({ data }) => ({
        id: 'booking-1',
        ...data,
        slotStart: new Date(data.slotStart),
        restaurant: { name: 'Test Restaurant' },
      })),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };
  // withLock in the real RedisService acquires a distributed lock around `fn`;
  // for unit tests we just run the callback directly.
  const redis = { withLock: jest.fn((_key: string, _ttl: number, fn: () => Promise<any>) => fn()) };
  const notifications = { sendToUser: jest.fn() };

  const service = new BookingsService(prisma as any, redis as any, notifications as any);
  return { service, prisma, redis, notifications };
}

const baseDto = {
  restaurantId: 'restaurant-1',
  tableId: 'table-1',
  partySize: 2,
  date: '2026-10-05T19:00:00.000Z',
  slotStart: '2026-10-05T19:00:00.000Z',
  slotEnd: '2026-10-05T20:30:00.000Z',
};

describe('BookingsService.create', () => {
  it('rejects a party size larger than the table capacity', async () => {
    const { service } = buildService();
    await expect(service.create('user-1', { ...baseDto, partySize: 10 })).rejects.toThrow(/seats up to 4/);
  });

  it('rejects when an overlapping booking already exists for the table', async () => {
    const { service } = buildService({ id: 'existing-booking' });
    await expect(service.create('user-1', baseDto)).rejects.toThrow(BadRequestException);
  });

  it('acquires the per-slot lock before checking for conflicts', async () => {
    const { service, redis } = buildService();
    await service.create('user-1', baseDto);
    expect(redis.withLock).toHaveBeenCalledWith(
      `booking-lock:${baseDto.tableId}:${baseDto.date}:${baseDto.slotStart}`,
      expect.any(Number),
      expect.any(Function),
    );
  });

  it('creates a CONFIRMED booking when the slot is free', async () => {
    const { service, prisma } = buildService(null);
    const booking = await service.create('user-1', baseDto);
    expect(prisma.booking.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'CONFIRMED', userId: 'user-1' }) }),
    );
    expect(booking.id).toBe('booking-1');
  });

  it('notifies the diner once the booking is confirmed', async () => {
    const { service, notifications } = buildService(null);
    const booking = await service.create('user-1', baseDto);
    expect(notifications.sendToUser).toHaveBeenCalledWith(
      'user-1',
      'Booking confirmed',
      expect.stringContaining('Test Restaurant'),
      expect.objectContaining({ type: 'booking_confirmed', bookingId: booking.id }),
    );
  });
});
