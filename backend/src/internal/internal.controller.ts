import { Controller, ForbiddenException, Headers, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { TableType, UserRole } from '@prisma/client';

/**
 * TEMPORARY: seeds live test data via HTTP because this environment can't reach
 * Postgres directly to run `prisma db seed`. Guarded by ADMIN_SEED_SECRET.
 * Delete this module once no longer needed — see docs/DEPLOYMENT.md.
 */
@Controller('internal')
export class InternalController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Post('seed-test-data')
  async seed(@Headers('x-seed-secret') secret: string) {
    const expected = this.config.get<string>('ADMIN_SEED_SECRET');
    if (!expected || secret !== expected) {
      throw new ForbiddenException('Invalid seed secret');
    }

    const passwordHash = await bcrypt.hash('password123', 10);

    const diner = await this.prisma.user.upsert({
      where: { email: 'diner@example.com' },
      update: {},
      create: { email: 'diner@example.com', fullName: 'Dana Diner', passwordHash, role: UserRole.DINER, city: 'Bangkok' },
    });

    const adminUser = await this.prisma.user.upsert({
      where: { email: 'owner@example.com' },
      update: {},
      create: { email: 'owner@example.com', fullName: 'Ravi Owner', passwordHash, role: UserRole.RESTAURANT_ADMIN },
    });

    const restaurant = await this.prisma.restaurant.upsert({
      where: { id: '11111111-1111-1111-1111-111111111111' },
      update: {},
      create: {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Riverside Thai Kitchen',
        description: 'Modern Thai cuisine on the riverfront.',
        cuisineTypes: ['Thai', 'Seafood'],
        city: 'Bangkok',
        address: '88 Charoen Krung Rd, Bangkok',
        priceRange: 3,
        photos: ['https://placehold.co/800x480?text=Riverside+Thai+Kitchen'],
        amenities: ['Riverside view', 'Private dining'],
        openingHours: { mon: [{ open: '11:00', close: '22:00' }] },
        status: 'ACTIVE',
        // No stripeAccountId — left null on purpose so the live Connect
        // onboarding flow can be exercised for real against this restaurant.
      },
    });

    await this.prisma.restaurantAdmin.upsert({
      where: { userId_restaurantId: { userId: adminUser.id, restaurantId: restaurant.id } },
      update: {},
      create: { userId: adminUser.id, restaurantId: restaurant.id },
    });

    const tableId = '22222222-2222-2222-2222-222222222222';
    await this.prisma.table.upsert({
      where: { id: tableId },
      update: {},
      create: { id: tableId, restaurantId: restaurant.id, type: TableType.TABLE, name: 'Table 4 (window)', capacity: 4 },
    });

    const packageId = '33333333-3333-3333-3333-333333333333';
    await this.prisma.bulkOrderPackage.upsert({
      where: { id: packageId },
      update: {},
      create: {
        id: packageId,
        restaurantId: restaurant.id,
        name: 'Wedding Banquet Package',
        pricePerHeadCents: 180000,
        minGuests: 20,
        maxGuests: 200,
      },
    });

    return {
      dinerLogin: { email: 'diner@example.com', password: 'password123' },
      adminLogin: { email: 'owner@example.com', password: 'password123' },
      restaurantId: restaurant.id,
      tableId,
      packageId,
    };
  }
}
