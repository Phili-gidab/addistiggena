# 04 — System Architecture

## High-level layout

```
 Clients                     API edge                Services (NestJS modules)        Data
┌───────────┐             ┌────────────┐            ┌──────────────────────┐   ┌──────────────┐
│ Web (Next)│──REST/WS──▶ │            │            │ Auth (OTP + JWT)     │   │ PostgreSQL   │
│ Android   │──REST/WS──▶ │  ELB + WAF │──────────▶ │ Users & Providers    │◀─▶│  + PostGIS   │
│ (RN/Expo) │             │  REST API  │            │ Catalog (categories) │   ├──────────────┤
│ Telegram  │──webhook──▶ │  JWT auth  │            │ Bookings (state mch.)│◀─▶│ Redis        │
│  bot      │             │  rate limit│            │ Payments & Wallets   │   ├──────────────┤
│ Admin     │──REST────▶  │            │            │ Reviews              │   │ OBS (files)  │
└───────────┘             └────────────┘            │ Notifications        │   └──────────────┘
                                                    │ Realtime gateway(WS) │
                                                    │ Admin                │
                                                    └──────────────────────┘
External: SMS gateway · FCM · Google Maps · Telebirr/Chapa/CBEBirr (webhooks back into API)
```

One NestJS application, modular monolith. Splitting into microservices in a 5-week build would be
self-harm; module boundaries are kept clean so extraction is possible later.

## Data model (Prisma schema, `apps/api/prisma/schema.prisma`)

| Entity | Purpose / notable fields |
| --- | --- |
| `User` | Phone (unique), role (`CUSTOMER` / `PROVIDER` / `ADMIN`), language (`am` / `en`), name |
| `OtpCode` | Hashed OTP, phone, expiry, attempt counter — throttled via Redis |
| `ProviderProfile` | 1:1 with User: trade, bio, service radius (km), base location (PostGIS point), availability toggle, verification status (`PENDING` / `VERIFIED` / `REJECTED` / `SUSPENDED`), rating aggregate |
| `ProviderDocument` | OBS object key + doc type (ID, certificate, police clearance) + review state |
| `ServiceCategory` | Slug, Amharic + English names, icon, base price floor, active flag |
| `Booking` | Customer, provider, category, status, price quote/final, location (PostGIS point + landmark note), timestamps per transition, cancellation reason |
| `Payment` | Booking 1:1, gateway (`TELEBIRR` / `CHAPA` / `CBEBIRR` / `CASH`), state, gateway ref, idempotency key |
| `Wallet` / `WalletTransaction` | Provider balance; double-entry style ledger rows: `JOB_CREDIT`, `COMMISSION`, `PAYOUT` |
| `Payout` | Withdrawal requests: amount, destination (Telebirr/bank), state |
| `Review` | Booking 1:1: stars 1–5, text, moderation state (published after 24h moderation) |

Geospatial: `ProviderProfile.location` and `Booking.location` are
`geography(Point, 4326)` columns (Prisma `Unsupported` type), queried with raw SQL.

## Booking state machine

```
 REQUESTED ──(provider accepts, 90s window)──▶ ACCEPTED ──▶ EN_ROUTE ──▶ ARRIVED ──▶ IN_PROGRESS
     │                                            │                                     │
     │ (timeout/reject → offer next provider)     │ (customer cancel, reason)           ▼
     ▼                                            ▼                                 COMPLETED
  EXPIRED / REJECTED                          CANCELLED                                 │
                                                                       (customer confirms, or
                                                                        auto-confirm after 30 min)
                                                                                        ▼
                                                                                     PAID
```

Transitions are validated server-side (single source of truth); every transition is timestamped
and emitted over Socket.IO to both parties, and mirrored as push/SMS for offline users.

## Matching: "nearest verified technician"

```sql
SELECT p.*, ST_Distance(p.location, ST_MakePoint($lng, $lat)::geography) AS distance_m
FROM   "ProviderProfile" p
WHERE  p."verificationStatus" = 'VERIFIED'
  AND  p."isAvailable" = true
  AND  p."trade" = $category
  AND  ST_DWithin(p.location, ST_MakePoint($lng, $lat)::geography, p."serviceRadiusKm" * 1000)
ORDER BY p."ratingAvg" DESC, distance_m ASC
LIMIT 10;
```

Job offers go to the customer's chosen technician first; on reject/timeout the booking can be
re-offered down the ranked list. Live technician positions are held in Redis
(`geo:providers` geoset) and flushed to Postgres periodically.

## Payment & commission flow (proposal §4.4)

1. Customer confirms completion → API creates `Payment(PENDING)` and returns gateway checkout
   parameters (Telebirr first; Chapa/CBEBirr as fallback; `CASH` flag supported for MVP).
2. Customer authenticates in the gateway app / USSD.
3. Gateway calls our **webhook** (`POST /payments/webhook/:gateway`) — signature-verified,
   idempotent by gateway reference.
4. On confirmation, one DB transaction: mark `Payment(CONFIRMED)` + booking `PAID`, write ledger
   rows — `JOB_CREDIT` (gross) and `COMMISSION` (negative, % from admin-configurable rate) — and
   update wallet balance.
5. E-receipt issued (in-app + SMS). Provider can request `Payout`; admin approves → transfer,
   audit-logged.

Money invariants: ledger rows are append-only; wallet balance is always derivable as the sum of
its transactions; webhooks are idempotent; every admin money action is audit-logged.

## Connectivity resilience

- Telegram bot covers booking end-to-end for low-data users (Telegraf scenes, Amharic/English).
- SMS notifications mirror every critical state change (accepted, arrived, payment, receipt).
- Mobile app caches categories, bookings, and map tiles; queues actions offline (Expo + SQLite).
- Web is SSR with skeleton loaders and compressed assets for 2G/3G.

## API surface (MVP, implemented in `apps/api`)

```
POST /auth/otp/request        { phone }            → sends OTP (console driver in dev)
POST /auth/otp/verify         { phone, code }      → { accessToken, refreshToken, user }
GET  /catalog/categories                            → active service categories (am/en)
GET  /providers/nearby        ?lat&lng&category     → ranked verified providers
PUT  /providers/me            profile fields        → provider self-service
PUT  /providers/me/availability { isAvailable }
POST /bookings                { categoryId, lat, lng, landmark, note, providerId? }
GET  /bookings/mine                                 → customer/provider history
POST /bookings/:id/accept|reject|enroute|arrive|start|complete|cancel
GET  /bookings/:id/track                            → live technician position (party-only)
GET  /bookings/:id/messages · POST …/messages       → in-app chat (party-only)
POST /uploads                 multipart "file"      → { objectKey } (5MB, jpeg/png/webp/pdf)
POST /providers/me/documents  { type, objectKey }   → verification document (PENDING)
GET  /wallet/me                                     → balance + ledger + payout history
POST /wallet/payouts          { amountEtb, destination } (funds reserved on request)
POST /payments/:bookingId/initiate { gateway }      → checkout params
POST /payments/webhook/:gateway                     → gateway confirmation (idempotent)
POST /reviews                 { bookingId, stars, text }
GET  /admin/providers?status=PENDING                → verification queue
POST /admin/providers/:id/verify|reject|suspend
GET  /admin/payouts · POST /admin/payouts/:id/process|reject (reject refunds)
GET  /admin/analytics                               → KPIs, 14-day series, category demand
GET  /health
```

Server-side lifecycle jobs: a 15-second sweep expires direct offers whose 90-second
window lapsed; key transitions fire SMS mirrors to the counterpart (console driver in dev).

Realtime: MVP ships **polling** (status 4s, tracking 5s, chat 4s) — deliberately
2G-friendly; Socket.IO push is the post-launch upgrade path on the same endpoints.
