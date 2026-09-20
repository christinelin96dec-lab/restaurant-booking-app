# Restaurant Booking & Discovery Platform

An Agoda-style booking experience combined with TripAdvisor-style discovery and reviews — purpose-built for restaurants. Diners can book tables, private rooms, or whole venues; place pre-paid bulk/event orders (weddings, birthdays, corporate, donations); gift and redeem vouchers; and browse/review restaurants with ratings and badges. Restaurant owners self-serve their listing, menu, availability, and bulk-order queue, TripAdvisor-style.

📄 **Start here:**
- [`docs/PRODUCT_SPEC.md`](docs/PRODUCT_SPEC.md) — roles, features, business rules (3-day bulk-order lead time, same-city restriction, 10% platform fee, badge thresholds), screen list, MVP phasing.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — tech stack, system diagram, domain-rule → system-design mapping, API surface.

## Repo layout

```
restaurant-booking-app/
├── docs/            product spec + architecture
├── backend/         NestJS API (TypeScript) + Prisma/PostgreSQL
│   └── prisma/schema.prisma   ← full data model
└── mobile/          Expo React Native app (iOS + Android, TypeScript)
    └── app/           expo-router file-based routes
```

## Getting started

### Backend
```bash
cd backend
cp .env.example .env      # fill in DATABASE_URL, STRIPE_SECRET_KEY, etc.
npm install
docker compose up -d      # local Postgres + Redis
npm run prisma:migrate
npm run start:dev
```

### Mobile
```bash
cd mobile
npm install
npx expo start            # scan the QR code with Expo Go, or run --ios / --android
```
Set `EXPO_PUBLIC_API_URL` to point the app at your local backend (defaults to `http://localhost:3000`).

## Key business rules encoded in this codebase

- **No double-booking**: table/room bookings are locked via Redis before being written (`backend/src/bookings/bookings.service.ts`).
- **Bulk orders**: same-city + 3-day (72h) lead time + full prepayment, enforced server-side (`backend/src/bulk-orders/bulk-orders.service.ts`).
- **10% platform fee**: computed and snapshotted at order confirmation, applied via Stripe Connect's `application_fee_amount` so the restaurant is paid net of the platform's cut (`backend/src/payments/payments.service.ts`).
- **Verified reviews only**: a review must reference the reviewer's own `COMPLETED` booking or bulk order (`backend/src/reviews/reviews.service.ts`).
- **Ratings & badges**: nightly job computes a Bayesian-weighted rating per restaurant and awards/revokes badges (`backend/src/badges/badges.service.ts`).

## Status

This is an initial scaffold: data model, core API modules with the rules above implemented, and a navigable mobile app shell with Agoda-style UI for discovery, booking, bulk ordering, vouchers, reviews, and a restaurant admin dashboard. See `docs/PRODUCT_SPEC.md` §7 for what's next.
