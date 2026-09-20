# Architecture

## 1. Stack

| Layer | Choice | Why |
|---|---|---|
| Mobile (iOS + Android) | **React Native + Expo (TypeScript)**, Expo Router | Single codebase, fast iteration, OTA updates, huge native-module ecosystem (maps, camera, push). |
| Backend API | **NestJS (TypeScript)** | Modular DI architecture maps cleanly onto our domain modules (restaurants, bookings, bulk-orders, payments...); shares types with the RN client via a shared `packages/shared-types` (future). |
| Database | **PostgreSQL** | Relational integrity matters here (bookings can't double-book a table, payments must reconcile with orders, fee math must be exact). |
| ORM | **Prisma** | Type-safe schema, migrations, good fit for NestJS. |
| Cache / locks | **Redis** | Availability locking during checkout (prevent double-booking a table/room), rate limiting, job queues (BullMQ). |
| Payments | **Stripe Connect (Standard/Express accounts)** | Native support for marketplace split payments — platform takes 10% application fee, remainder auto-transfers to the restaurant's connected account. |
| File storage | **S3-compatible object storage** | Restaurant photos, menu images, review photos. |
| Push notifications | **Expo Push + FCM/APNs** | Booking reminders, voucher offers, badge alerts. |
| Background jobs | **BullMQ (Redis-backed)** | Nightly rating/badge recompute, booking reminders, voucher expiry, refund processing. |
| Infra | **Docker Compose (dev)** → managed Postgres/Redis + container host (prod, e.g. Fly.io/Render/ECS) | Keep infra swappable; not prescribing a cloud vendor at this stage. |

## 2. High-Level System

```
                         ┌─────────────────────┐
                         │   Mobile App (RN)    │
                         │  Diner + Admin views │
                         └──────────┬───────────┘
                                    │ HTTPS/REST (JWT)
                                    ▼
                         ┌─────────────────────┐
                         │   NestJS API         │
                         │  ┌────────────────┐  │
                         │  │ Auth            │  │
                         │  │ Restaurants     │  │
                         │  │ Bookings        │  │
                         │  │ BulkOrders      │  │
                         │  │ Vouchers        │  │
                         │  │ Reviews         │  │
                         │  │ Payments        │  │
                         │  │ Badges/Ranking  │  │
                         │  └────────────────┘  │
                         └───┬───────┬───────┬───┘
                             │       │       │
                 ┌───────────┘   ┌───┘   ┌───┘
                 ▼               ▼       ▼
          ┌────────────┐  ┌───────────┐ ┌──────────────┐
          │ PostgreSQL │  │   Redis   │ │ Stripe Connect│
          │  (Prisma)  │  │(locks/jobs)│ │ (split pay)  │
          └────────────┘  └───────────┘ └──────────────┘
                                             │
                                             ▼
                                   Restaurant payout (90%)
                                   Platform fee (10%)

  Delivery is NEVER handled by us — the Restaurant Detail screen
  deep-links out to the restaurant's existing Grab/Foodpanda/etc. listing.
```

## 3. Key Domain Rules → System Design

### 3.1 No double-booking
Table/room availability is checked-and-locked atomically: on booking attempt, acquire a short-lived Redis lock keyed by `restaurantId:tableId:date:slot`, re-validate against Postgres inside a transaction, write the booking, release the lock. Prevents two diners confirming the same slot in a race.

### 3.2 Bulk order gating (3-day lead time, same city, full prepayment)
Enforced **server-side** (never trust client-side date math):
- `eventDate >= now + 72h` — reject with a clear error otherwise.
- `restaurant.city === deliveryOrEventAddress.city` — reject cross-city bulk orders (normal delivery-partner links are exempt from this check entirely, since we don't handle that delivery ourselves).
- Order transitions to `CONFIRMED` only after the Stripe PaymentIntent for **100% of the order total** succeeds — no partial-payment path exists for bulk orders.

### 3.3 Platform fee (10%)
Computed server-side at order-confirmation time, stored immutably on the order record (`subtotal`, `platformFeeAmount`, `netPayoutAmount`) so later fee-percentage changes never retroactively alter historical orders. Implemented via Stripe's `application_fee_amount` on the PaymentIntent, routed to the restaurant's connected account.

### 3.4 Verified reviews only
A review can only be created against a `bookingId` or `bulkOrderId` owned by the reviewing user with status `COMPLETED`. This is a DB-level foreign key + status check, not just a UI restriction.

### 3.5 Ranking & badges
Nightly BullMQ job recomputes the Bayesian weighted rating (see PRODUCT_SPEC.md §6) per restaurant, writes it to a denormalized `restaurantStats` table (avoids expensive aggregate queries on every discovery request), and re-evaluates badge thresholds.

## 4. Data Model (see `backend/prisma/schema.prisma` for the source of truth)

Core entities: `User`, `RestaurantAdmin` (join of User↔Restaurant with role), `Restaurant`, `MenuItem`, `BulkOrderPackage`, `Table`, `Booking`, `BulkOrder`, `Voucher`, `VoucherRedemption`, `Review`, `RestaurantStats`, `Badge`, `Payment`.

## 5. API Surface (v1, REST)

```
POST   /auth/signup /auth/login /auth/refresh
GET    /restaurants?city=&cuisine=&rating=&badge=&q=
GET    /restaurants/:id
PATCH  /restaurants/:id                    (restaurant admin only)
GET    /restaurants/:id/menu
PATCH  /restaurants/:id/menu
GET    /restaurants/:id/availability?date=
POST   /bookings
GET    /bookings/mine
PATCH  /bookings/:id/cancel
POST   /bulk-orders                        (validates 3-day + same-city, creates PaymentIntent)
GET    /bulk-orders/mine
PATCH  /bulk-orders/:id/accept|reject       (restaurant admin only)
POST   /vouchers                           (purchase/gift)
POST   /vouchers/:code/redeem
GET    /reviews?restaurantId=
POST   /reviews                            (must reference completed booking/bulkOrder)
POST   /reviews/:id/reply                  (restaurant admin only)
GET    /restaurants/top?city=
POST   /webhooks/stripe
```

## 6. Repo Layout

```
restaurant-booking-app/
├── docs/                 # this file, PRODUCT_SPEC.md
├── backend/              # NestJS API
│   ├── prisma/schema.prisma
│   └── src/
│       ├── auth/
│       ├── restaurants/
│       ├── bookings/
│       ├── bulk-orders/
│       ├── vouchers/
│       ├── reviews/
│       ├── payments/
│       └── badges/
└── mobile/               # Expo React Native app
    └── app/               # expo-router file-based routes
```
