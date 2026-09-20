# Product Spec — Restaurant Booking & Discovery Platform

"Agoda's booking flow + TripAdvisor's discovery/review layer, purpose-built for restaurants."

## 1. Users & Roles

| Role | Description |
|---|---|
| **Guest** | Browses restaurants, reads reviews, no account. |
| **Diner (App User)** | Registered user. Books tables/rooms, places bulk orders, buys/redeems vouchers, writes reviews, edits their own profile. |
| **Restaurant Admin** | Owns/manages one or more restaurant listings. Edits restaurant info (like a TripAdvisor business owner), manages availability, menus, bulk-order requests, vouchers/promotions, and responds to reviews. |
| **Platform Admin (us)** | Approves restaurant listings, manages payouts/fees, moderates reviews, manages badges, oversees delivery-partner integrations. |
| **Delivery Partner (external)** | Not a user role in-app — restaurants link their existing delivery-platform listings (Grab, Foodpanda, etc.) as outbound links/deep-links. We do not run delivery logistics ourselves. |

## 2. Core Features

### 2.1 Discovery (TripAdvisor-style)
- Search/browse restaurants by city, cuisine, price range, rating, open-now, badges.
- Restaurant profile: photos, description, menu, hours, location map, amenities, price range.
- Not location-restricted for *browsing/ordering delivery* — a user can view and be linked to a restaurant's delivery-partner ordering page regardless of city. Bulk/table bookings ARE restricted to restaurants in the user's selected city (see 2.4).
- Reviews & star ratings (1–5) from verified diners (verified = completed booking/order only, to prevent fake reviews).
- Top Restaurants list, ranked by weighted rating (see §5).
- Restaurant badges (Bronze/Silver/Gold/Michelin-style "Platform Choice") driven by rating + review volume + consistency (see §5).

### 2.2 Table / Room Booking (Agoda-style)
- Browse availability by date/time/party size.
- Book a **table**, a **private room**, or the **whole venue** (buyout).
- Real-time availability calendar per restaurant, managed by the Restaurant Admin.
- Booking states: `PENDING → CONFIRMED → COMPLETED / CANCELLED / NO_SHOW`.
- Optional deposit or full prepayment, configurable per restaurant.
- Booking confirmation + reminders via push/email.

### 2.3 Vouchers & Gifting
- Diners can purchase **gift vouchers** (fixed amount or specific meal/menu item) for another user by email/phone/in-app username.
- Restaurants can issue **promotional/free-meal vouchers** tied to special occasions (anniversaries, holidays, slow-season pushes, "review reward" etc.), targeted platform-wide, city-wide, or to a specific segment (e.g. top reviewers).
- Vouchers have: code, value/type, expiry, redemption rules (dine-in / bulk order / delivery), single or multi-use.
- Redemption is validated at checkout (booking or bulk order) and at the restaurant via QR/code scan for walk-in dine-in redemption.

### 2.4 Bulk / Event Ordering (weddings, birthdays, donations, corporate)
Rules (per requirements):
- Bulk orders are **restricted to restaurants located in the same city as the delivery/event address** — unlike normal delivery-partner ordering, which is not location-restricted.
- Must be placed **at least 3 days (72h) in advance** of the event date. The system hard-blocks submission if the event date is < 3 days out.
- Requires **full payment upfront** at order confirmation (no partial deposit) — this is what "secures" the slot.
- Order types: Wedding, Birthday, Corporate, Donation/Charity, Other (free text).
- Flow: diner selects restaurant → bulk-order menu/package → guest count → event date/time/address → review 3-day + full-payment rule → pay → order status `CONFIRMED`.
- Restaurant Admin sees a **Bulk Order queue** with prep lead time, can accept/reject/request changes before the payment is captured... but since payment is captured at confirmation, rejection triggers an automatic refund (minus any non-refundable processing fee, configurable).
- Donation orders: same flow, but the "recipient" is a charity/organization the diner specifies (name + address) rather than the diner's own event location; still same-city + 3-day + full-payment rules apply.

### 2.5 Payments & Platform Fee
- All payments (bookings with prepayment, bulk orders, vouchers) go through the platform's payment processor with **restaurant payouts via Stripe Connect** (or equivalent split-payment provider).
- **Platform fee: 10% of order total**, deducted automatically at the point of payout to the restaurant, for **bulk orders**. (Normal table bookings without prepayment carry no fee; if a restaurant enables prepayment for table bookings, the fee model is configurable per restaurant but defaults to the same 10% on the prepaid amount — confirm before general rollout.)
- Restaurant sees a clear fee breakdown before accepting any bulk order: order subtotal, platform fee (10%), net payout.
- Refund/cancellation policy is set by each restaurant within platform-defined bounds (e.g. bulk orders cancelled by the restaurant are refunded 100%; diner-initiated cancellations follow a tiered refund based on days-before-event).

### 2.6 Restaurant Admin Portal (in-app + optionally web)
- Edit restaurant profile: name, description, photos, cuisine, hours, location, amenities, price range — TripAdvisor-style self-serve editing, subject to platform moderation for major changes (name/location changes flagged for review).
- Manage menu(s): categories, items, prices, photos, dietary tags; a separate **bulk-order package menu** (per-head packages) can be defined for events.
- Manage table/room inventory and availability calendar.
- View & respond to reviews.
- Manage vouchers/promotions.
- View bookings & bulk-order queue, accept/reject, see payout/fee breakdown.
- Analytics: views, bookings, rating trend, revenue.

### 2.7 Reviews, Ratings & Badges
- 1–5 star rating + written review + photos, per completed booking/order (prevents drive-by fake reviews).
- Restaurant can publicly reply once per review.
- Users can mark reviews "helpful."
- **Top Restaurants** ranking (per city and globally) computed from a Bayesian-weighted average rating (protects new restaurants with few reviews from being unfairly ranked #1 or unfairly buried) — see §5 for formula.
- **Badges** (auto-awarded, recalculated periodically):
  - 🥉 Rising Star — ≥4.0 avg, ≥10 reviews, listed < 6 months.
  - 🥈 Guest Favorite — ≥4.3 avg, ≥50 reviews, last 6 months.
  - 🥇 Top Rated — ≥4.6 avg, ≥150 reviews, last 12 months.
  - 🏆 Platform Choice — top 1% citywide, manually curated shortlist reviewed by Platform Admin from the 🥇 pool.

## 3. Non-Goals (explicitly out of scope for MVP)
- We do **not** operate our own delivery fleet — delivery is always handed off to existing partners (Grab, Foodpanda, etc.) via deep link/API where available.
- We do not process on-premise POS/inventory beyond what's needed for availability and bulk-order menus.

## 4. Screen List (Diner-facing, mobile)
1. Onboarding / Login / Signup (email, phone, social)
2. Home / Discover (search, filters, Top Restaurants, badges, city selector)
3. Restaurant Detail (photos, menu, reviews, availability, "Book," "Bulk Order," "Order Delivery via ↗")
4. Booking Flow (date/time/party size → table/room/whole-venue → confirm/pay)
5. Bulk Order Flow (event type → package/menu → guest count → date/address → 3-day + full-payment gate → pay)
6. Vouchers (browse/buy gift vouchers, my vouchers/wallet, redeem)
7. Reviews (write review, my reviews)
8. My Bookings / Orders (upcoming, past, cancelled)
9. Profile & Settings
10. Notifications (booking reminders, voucher offers, badge alerts)

## 5. Screen List (Restaurant Admin-facing)
1. Admin Dashboard (bookings today, bulk-order queue, rating, badge status)
2. Restaurant Profile Editor
3. Menu Manager (à la carte + bulk-order packages)
4. Availability & Table/Room Manager
5. Bookings List
6. Bulk Order Queue (accept/reject, fee breakdown)
7. Vouchers & Promotions Manager
8. Reviews (view/reply)
9. Payouts & Fee statements

## 6. Ranking Formula (Top Restaurants)

Bayesian weighted rating, per restaurant:

```
weighted_rating = (v / (v + m)) * R + (m / (v + m)) * C
```
- `R` = restaurant's average rating
- `v` = number of reviews for the restaurant
- `m` = minimum review threshold (platform-tunable, e.g. 20)
- `C` = mean rating across all restaurants in the same city

This is what both **Top Restaurants** ordering and **badge eligibility** are computed from, recalculated on a nightly job (see ARCHITECTURE.md §Jobs).

## 7. MVP Phasing

**Phase 1 — Core marketplace**
- Auth (diner + restaurant admin), restaurant listing CRUD, search/discovery, table booking (no prepayment), reviews/ratings, basic Top Restaurants ranking.

**Phase 2 — Payments & bulk orders**
- Stripe Connect payouts, prepayment on bookings, full bulk-order flow with 3-day/same-city rule + 10% platform fee, refund/cancellation handling.

**Phase 3 — Vouchers, badges, growth**
- Gift vouchers, restaurant promo vouchers, badge system + nightly recompute job, restaurant analytics dashboard, delivery-partner deep links.

**Phase 4 — Polish & scale**
- Push notifications, referral/loyalty, multi-language, admin moderation tooling, performance/caching pass.
