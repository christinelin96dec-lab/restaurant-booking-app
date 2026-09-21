# Deployment Guide

This describes how to actually ship what's in this repo. Nothing here has been executed — it
documents the steps for whoever has the real accounts/credentials (Stripe, a cloud host, Apple/
Google developer accounts) to run them. Everything referenced (Dockerfile, CI workflow, seed
script, migrations) has been built and validated locally as part of this repo; only the "point it
at real infrastructure and press go" part remains.

## 1. Backend

### 1.1 Pick a host
`backend/Dockerfile` is a standard multi-stage Node build — it runs on any container host:
Fly.io, Render, Railway, AWS ECS/Fargate, Google Cloud Run, etc. Pick one; the steps below are
host-agnostic except where noted.

### 1.2 Provision infrastructure
- **PostgreSQL 16** — a managed instance (RDS, Supabase, Neon, Render Postgres...) is strongly
  preferred over self-hosting for a production workload.
- **Redis 7** — used for the booking-slot lock and (via BullMQ, wired but not yet scheduled
  beyond the nightly badge job) background jobs. A managed instance (Upstash, ElastiCache,
  Render Redis) is fine — it doesn't need to be highly durable.
- **S3-compatible object storage** — an S3 bucket (or R2/Spaces) for restaurant/menu/review
  photos. Needs public read on the objects the app uploads (or a CDN in front of it) and an IAM
  user/key scoped to `PutObject`/`GetObject` on that bucket only.
- **Stripe account** — enable Stripe Connect (Express accounts) in the Stripe dashboard. You'll
  need the account's secret key and, after step 1.5, a webhook signing secret.

If you'd rather self-host Postgres/Redis alongside the API on a single VM, `backend/docker-
compose.prod.yml` does that — `docker compose -f docker-compose.prod.yml up -d` with a `.env`
providing `POSTGRES_PASSWORD`, `JWT_SECRET`, etc.

### 1.3 Environment variables
Copy `backend/.env.example` and fill in real values for the target environment. At minimum:
`DATABASE_URL`, `REDIS_URL`, `JWT_SECRET` (generate a long random value, don't reuse the example),
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`,
`S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL_BASE`. Set these as your host's secrets/env config — never
commit a real `.env`.

### 1.4 Build & deploy
```bash
docker build -t restaurant-api ./backend
# push to your registry, then deploy per your host's normal flow
```
The container's `CMD` runs `prisma migrate deploy` before starting the server, so a fresh deploy
always brings the schema up to date first. If your host prefers migrations as a distinct release
step (e.g. a Fly.io release_command, an ECS one-off task), run
`npx prisma migrate deploy` separately and drop it from the `CMD`.

### 1.5 Stripe webhook
Point a webhook endpoint at `POST https://<your-api-host>/webhooks/stripe`, subscribed to at
least `payment_intent.succeeded`. Copy the resulting signing secret into `STRIPE_WEBHOOK_SECRET`.

The endpoint already verifies the `Stripe-Signature` header against `STRIPE_WEBHOOK_SECRET` on the
raw request body (`PaymentsController` + `PaymentsService.constructWebhookEvent`, with `main.ts`
routing `/webhooks/stripe` through `express.raw()` instead of the global JSON parser so the exact
bytes Stripe signed are preserved) — this was verified locally by generating a real Stripe test
signature with `stripe.webhooks.generateTestHeaderString` and confirming both a missing and a
tampered signature are rejected with 400, and a valid one is accepted. Nothing further to do here
beyond setting the real `STRIPE_WEBHOOK_SECRET`.

### 1.6 Seed data (optional, for a fresh staging environment)
```bash
DATABASE_URL=<staging-url> npx prisma db seed
```
Creates a demo restaurant, admin/diner logins, and a bulk-order package — see
`backend/prisma/seed.ts`. Skip this for production.

### 1.7 Restaurant onboarding in production
Each restaurant admin connects their own Stripe account via the in-app "Payouts" screen (`POST
/restaurants/:id/stripe/onboarding-link`) — there's nothing to configure server-side per
restaurant beyond having `STRIPE_SECRET_KEY` set.

## 2. Mobile (iOS + Android)

Built with Expo; ship it via [EAS Build](https://docs.expo.dev/build/introduction/) rather than
raw Xcode/Android Studio builds, since that's what `mobile/eas.json` is set up for.

### 2.1 One-time setup
```bash
cd mobile
npm install -g eas-cli
eas login
eas init          # links this project to your Expo account, fills app.json's extra.eas.projectId
```
`eas init` is what makes push notifications work — `registerPushToken.ts` no-ops until
`extra.eas.projectId` exists (see `docs/PRODUCT_SPEC.md` / the notifications code for why).

### 2.2 Point at your deployed API
Update the `EXPO_PUBLIC_API_URL` values in `mobile/eas.json`'s `preview`/`production` build
profiles to your real staging/production API URLs (they're placeholders right now).

### 2.3 App identity
`mobile/app.json` has placeholder bundle identifiers (`com.restaurantapp.mobile`) and no icon/
splash assets yet — set real ones (`ios.bundleIdentifier`, `android.package`, `icon`, `splash`)
before your first store submission; changing them later means a new app listing.

### 2.4 Build
```bash
eas build --platform ios --profile production
eas build --platform android --profile production
```

### 2.5 Submit to the stores
```bash
eas submit --platform ios
eas submit --platform android
```
Requires an Apple Developer Program account ($99/yr) and a Google Play Console account (one-time
$25 fee), both already set up with your app's listing (screenshots, description, privacy policy —
required given this app handles payments and location).

## 3. CI

`.github/workflows/ci.yml` runs on every push/PR to `main`: backend typecheck + `prisma migrate
deploy` against a throwaway Postgres/Redis + `nest build` + the Jest suite, and mobile typecheck +
an `expo export` bundle check. Nothing else to configure — it uses ephemeral service containers,
not your real database.

To also run EAS builds from CI, add an `EXPO_TOKEN` repo secret and an `eas build` step; not
included here since it costs EAS build credits on every push and most teams want that gated
behind a manual trigger or a release tag instead.

## 4. What's still a placeholder

- `stripeAccountId: 'acct_seed_demo'` in the seed script isn't a real Stripe account — bulk orders
  against the seeded restaurant will fail at the Stripe API call until a real restaurant admin
  completes onboarding (§1.7).
- No app icon/splash assets — `mobile/app.json` just sets a background color.
- No rate limiting / WAF in front of the API — add one at your host/CDN layer before launch.
