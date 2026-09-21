# Restaurant Booking & Discovery Platform

An Agoda-style booking experience combined with TripAdvisor-style discovery and reviews — purpose-built for restaurants. Diners can book tables, private rooms, or whole venues; place pre-paid bulk/event orders (weddings, birthdays, corporate, donations); gift and redeem vouchers; and browse/review restaurants with ratings and badges. Restaurant owners self-serve their listing, menu, tables, and bulk-order queue, TripAdvisor-style, and connect their own Stripe account for payouts.

📄 **Start here:**
- [`docs/PRODUCT_SPEC.md`](docs/PRODUCT_SPEC.md) — roles, features, business rules (3-day bulk-order lead time, same-city restriction, 10% platform fee, badge thresholds), screen list, MVP phasing.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — tech stack, system diagram, domain-rule → system-design mapping, API surface.
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — how to actually ship this: hosting, env vars, Stripe webhook, EAS builds, App/Play Store submission.

## Repo layout

```
restaurant-booking-app/
├── docs/                    product spec, architecture, deployment
├── .github/workflows/ci.yml backend + mobile CI (typecheck, build, tests)
├── backend/                 NestJS API (TypeScript) + Prisma/PostgreSQL
│   ├── prisma/schema.prisma   ← full data model
│   ├── prisma/seed.ts         ← demo data (restaurant, admin/diner logins)
│   ├── src/**/*.spec.ts       ← Jest unit tests (32, all passing)
│   ├── Dockerfile / docker-compose.prod.yml
│   └── src/
│       ├── auth/ users/ restaurants/ bookings/ bulk-orders/
│       ├── vouchers/ reviews/ payments/ badges/ notifications/ uploads/
└── mobile/                  Expo React Native app (iOS + Android, TypeScript)
    ├── eas.json                ← EAS Build profiles
    └── app/                    expo-router file-based routes (diner + admin screens)
```

## Getting started

### Backend
```bash
cd backend
cp .env.example .env      # fill in DATABASE_URL, STRIPE_SECRET_KEY, S3_*, etc.
npm install
docker compose up -d      # local Postgres + Redis
npm run prisma:migrate
npm run prisma:seed       # optional: demo restaurant + diner/admin logins
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
- **Restaurant payouts**: each restaurant admin connects their own Stripe Express account via an in-app onboarding link (`POST /restaurants/:id/stripe/onboarding-link`); bulk orders are blocked until that's done.
- **Verified reviews only**: a review must reference the reviewer's own `COMPLETED` booking or bulk order, and can't be submitted twice for the same one (`backend/src/reviews/reviews.service.ts`).
- **Ratings & badges**: nightly job computes a Bayesian-weighted rating per restaurant and awards/revokes badges, notifying the restaurant's admins when they earn one (`backend/src/badges/badges.service.ts`).
- **Push notifications**: booking confirmations, bulk-order confirm/reject, gift vouchers, and new badges all notify via Expo Push (`backend/src/notifications/`), registered from the mobile app on login.
- **Photo uploads**: restaurant/menu/review photos upload directly to S3 via short-lived presigned URLs, never proxied through the API (`backend/src/uploads/`).
- **Webhook security**: the Stripe webhook verifies the `Stripe-Signature` header against the raw request body before trusting any event.

## Status

Backend, mobile, CI, and deployment tooling are all built and validated — not just written. Every piece below was actually run locally against a live Postgres + Redis (and, for Stripe, real signature verification with fake keys) before being committed:

- Backend **builds, migrates, and boots** cleanly (`tsc`, `prisma migrate deploy`, `nest build`).
- **32 Jest unit tests** cover the fee math, booking-conflict detection, bulk-order gating, badge formula, Stripe onboarding, webhook idempotency, and upload validation — all passing.
- Full HTTP smoke tests: signup/login, double-booking correctly rejected, bulk-order 72h/same-city rules correctly rejected and a valid order correctly accepted, admin-only routes correctly 403 for a diner, duplicate reviews correctly 409, webhook signature verification correctly accepts/rejects.
- Mobile **bundles cleanly** via `expo export` (1000+ modules) with no broken imports or routes.
- Two real bugs were found this way and fixed: `/users/me` was leaking the password hash, and a duplicate review / an unmatched Stripe webhook payment intent both hit raw 500s instead of clean, idempotent responses.

**What's left before a real launch** (see `docs/DEPLOYMENT.md` §4): an app icon/splash, real Stripe/AWS/EAS credentials in place of the local test values used above, and App Store / Play Store listing assets. Everything code-side is ready to point at that real infrastructure.
