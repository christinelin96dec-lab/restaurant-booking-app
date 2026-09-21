import { PrismaClient, UserRole, TableType, BulkOrderType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  const diner = await prisma.user.upsert({
    where: { email: 'diner@example.com' },
    update: {},
    create: { email: 'diner@example.com', fullName: 'Dana Diner', passwordHash, role: UserRole.DINER, city: 'Bangkok' },
  });

  const adminUser = await prisma.user.upsert({
    where: { email: 'owner@example.com' },
    update: {},
    create: { email: 'owner@example.com', fullName: 'Ravi Owner', passwordHash, role: UserRole.RESTAURANT_ADMIN },
  });

  const restaurant = await prisma.restaurant.upsert({
    where: { id: '11111111-1111-1111-1111-111111111111' },
    update: {},
    create: {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Riverside Thai Kitchen',
      description: 'Modern Thai cuisine on the riverfront, known for its tasting menus and private dining rooms.',
      cuisineTypes: ['Thai', 'Seafood'],
      city: 'Bangkok',
      address: '88 Charoen Krung Rd, Bangkok',
      priceRange: 3,
      photos: ['https://placehold.co/800x480?text=Riverside+Thai+Kitchen'],
      amenities: ['Riverside view', 'Private dining', 'Vegetarian options'],
      openingHours: {
        mon: [{ open: '11:00', close: '22:00' }],
        tue: [{ open: '11:00', close: '22:00' }],
        wed: [{ open: '11:00', close: '22:00' }],
        thu: [{ open: '11:00', close: '22:00' }],
        fri: [{ open: '11:00', close: '23:00' }],
        sat: [{ open: '11:00', close: '23:00' }],
        sun: [{ open: '11:00', close: '22:00' }],
      },
      status: 'ACTIVE',
      stripeAccountId: 'acct_seed_demo', // placeholder — replace via the real Stripe Connect onboarding flow
      deliveryLinks: { grab: 'https://food.grab.com/th/en/restaurant/demo', foodpanda: 'https://foodpanda.co.th/restaurant/demo' },
    },
  });

  await prisma.restaurantAdmin.upsert({
    where: { userId_restaurantId: { userId: adminUser.id, restaurantId: restaurant.id } },
    update: {},
    create: { userId: adminUser.id, restaurantId: restaurant.id },
  });

  const tableIds = ['22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222223'];
  await prisma.table.upsert({
    where: { id: tableIds[0] },
    update: {},
    create: { id: tableIds[0], restaurantId: restaurant.id, type: TableType.TABLE, name: 'Table 4 (window)', capacity: 4 },
  });
  await prisma.table.upsert({
    where: { id: tableIds[1] },
    update: {},
    create: { id: tableIds[1], restaurantId: restaurant.id, type: TableType.PRIVATE_ROOM, name: 'The Lotus Room', capacity: 20 },
  });

  await prisma.menuItem.createMany({
    data: [
      { restaurantId: restaurant.id, name: 'Tom Yum Goong', priceCents: 32000, category: 'Soups', dietaryTags: ['spicy'] },
      { restaurantId: restaurant.id, name: 'Pad Thai', priceCents: 25000, category: 'Noodles', dietaryTags: [] },
      { restaurantId: restaurant.id, name: 'Green Curry', priceCents: 29000, category: 'Curries', dietaryTags: ['spicy'] },
      { restaurantId: restaurant.id, name: 'Mango Sticky Rice', priceCents: 15000, category: 'Desserts', dietaryTags: ['vegetarian'] },
    ],
    skipDuplicates: true,
  });

  await prisma.bulkOrderPackage.upsert({
    where: { id: '33333333-3333-3333-3333-333333333333' },
    update: {},
    create: {
      id: '33333333-3333-3333-3333-333333333333',
      restaurantId: restaurant.id,
      name: 'Wedding Banquet Package',
      description: 'Six-course set menu, plated service, includes welcome drinks.',
      pricePerHeadCents: 180000,
      minGuests: 20,
      maxGuests: 200,
    },
  });

  await prisma.review.upsert({
    where: { id: '44444444-4444-4444-4444-444444444444' },
    update: {},
    create: {
      id: '44444444-4444-4444-4444-444444444444',
      userId: diner.id,
      restaurantId: restaurant.id,
      rating: 5,
      comment: 'Incredible tom yum and the private room was perfect for our anniversary dinner.',
    },
  });

  console.log('Seed complete:');
  console.log(`  Diner login:  diner@example.com / password123`);
  console.log(`  Admin login:  owner@example.com / password123`);
  console.log(`  Restaurant:   ${restaurant.name} (${restaurant.id})`);
  console.log(`  Bulk package: ${'33333333-3333-3333-3333-333333333333'} (type ${BulkOrderType.WEDDING})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
