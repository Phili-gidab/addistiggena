# 07 — Gap Analysis: Proposal vs. Implementation

**Date:** 2026-07-26 · **Compared against:** Addis Tiggena Full Project Proposal v1.0 (Wezete Technology → Amnen Promotion)

> **Update 2026-08-04 — P0 + P1 closed.** Since this audit: payment webhooks are HMAC-verified
> (unsigned only via dev flag), `/files/*` is JWT-gated (admin or document owner), the OTP
> `devCode` is production-gated, the verification rejection-note bug is fixed (note persisted +
> document states written + provider notified), price floors are seeded, and the dispatch engine
> is live — auto-match on booking create, 90s offer cascade with re-offer on reject/expiry
> (`BookingOffer` audit table), EXPIRED on pool exhaustion, 30-minute auto-confirm of COMPLETED
> jobs, ETA in `/bookings/:id/track`. New: Telegram notification dispatcher (SMS + Telegram
> mirrors incl. e-receipts), `/auth/telegram/link|resume` for the bot channel, real Chapa driver
> and Africa's Talking SMS driver (both env-gated), migration
> `20260804000000_dispatch_telegram_verification`. Web UI (countdowns, ETA, estimates, secure
> doc links) and the full bot booking flow are being built alongside. Sections below describe
> the pre-update state.

Legend: ✅ implemented · 🟡 partial / demo-grade · 🔴 stubbed (placeholder code exists) · ❌ missing entirely

---

## 1. Executive summary

| Deliverable (proposal §3) | Status | Reality |
| --- | --- | --- |
| Backend API | 🟡 ~70% | 12 NestJS modules, 47 endpoints, real Prisma/PostGIS schema, working booking state machine, wallet & commission ledger. Missing: dispatch engine, real-time layer, notifications, disputes, all external integrations. |
| Web platform (customer) | 🟡 ~65% | Full booking wizard, tracking map, chat, payments UI, receipts, reviews — all wired to the real API. Missing: photo upload, price estimates, ETA, i18n toggle, push. |
| Admin dashboard | 🟡 ~50% | Verification queue, review moderation, payouts, commission config, KPI charts. Missing: user management, disputes, category/pricing CRUD, system settings. |
| Provider web UI | 🟡 ~70% | Registration, docs upload, availability, wallet, payout requests, job lifecycle buttons. Missing: 90s countdown UI, job alerts, navigation hand-off, earnings charts. |
| **Android apps (customer + provider)** | ❌ 0% | `apps/mobile` contains **one README and no source code**. Not in npm workspaces. |
| **Telegram bot** | 🔴 ~5% | 101 lines: language picker + read-only category list. Booking flow, phone/OTP linking, location share, notifications, payments all "coming soon" stubs. |
| Payment gateways (Telebirr/Chapa/CBEBirr) | 🔴 | Drivers are placeholders (`TODO(week3)`): no HTTP calls, **no webhook signature verification**. Cash flag works. Ledger/commission split behind them is real. |
| SMS gateway | 🔴 | Console driver only. Ethio Telecom driver throws; Africa's Talking driver doesn't exist. OTP `devCode` returned in the API response. |
| Real-time (Socket.IO) | ❌ | No WebSocket anywhere (API or web). 4s HTTP polling instead. Docs 04 declares polling the deliberate MVP path — contradicts proposal §7.2 and roadmap Week 3. |
| Push notifications (FCM) | ❌ | No firebase-admin, no device-token table, no notification model. |
| Deployment / launch readiness | ❌ | CI builds only (no tests, no lint, no deploy). Dockerfile for API only (web/bot none). Repo is not even a git repository. Zero automated tests; `npm test` fails (jest not installed). |

Overall: **Weeks 1–2 of the roadmap are genuinely done; Weeks 3–5 are mostly not started.** The roadmap's own ✅ markers all say "scaffolded/skeleton" — consistent with this audit.

---

## 2. Customer features (proposal §5.1, all MVP)

| Feature | Status | Gap detail |
| --- | --- | --- |
| OTP authentication | 🟡 | Works end-to-end in dev. No real SMS transport; `devCode` leaked in response; refresh tokens stateless/non-revocable for 30 days; no resend-cooldown UI. |
| Service category browser | ✅ | Live from API, bilingual names, icons. |
| GPS location pinning | 🟡 | Leaflet + OpenStreetMap/CARTO, **not Google Maps** as proposed. Tap/drag pin, geolocation, landmark notes ✅. No address search/geocoding, no saved addresses. |
| Real-time tracking | 🟡 | Map + 7-stage progress timeline ✅, but 4s polling, no WebSocket, **no ETA countdown**, and provider position only updates when the technician manually taps "Share my live location" — no continuous GPS stream. |
| In-app chat & calling | 🟡 | Text chat works (polled, 500-char, party-authorized). **VoIP calling missing** — plain `tel:` link exposes raw phone numbers (no masking). No attachments, read receipts, unread badges. |
| Booking history | 🟡 | List + detail ✅. **Re-book shortcut missing** (promised in proposal §4.1 step 10 and in the web app's own marketing copy). |
| Ratings & reviews | 🟡 | Submission + star display ✅. **24-hour auto-publish not automated** (reviews sit PENDING until an admin clicks). **No public read endpoint** — review text can never be displayed to other customers. |
| Digital payment | 🔴 | Full method-selection UI and receipt exist, but all three gateways are stubs and the web ships a "Simulate gateway confirmation (dev)" button that posts the webhook from the browser. **No e-receipt via SMS** (in-app printable receipt only). |
| Amharic-first UI | 🟡 | Ethiopic fonts loaded and used well; `lang="am"`. But **no i18n framework, no language toggle**, copy is hardcoded "አማርኛ · English" concatenations, and errors/admin/status badges/dates are English-only. Not the "Amharic default with English toggle" architecture promised. |
| Photo with issue description | ❌ | No file input in the wizard, no photo field in `CreateBookingDto`, no attachment model. (Proposal §4.1 step 02.) |
| Price range at booking | ❌ | Proposal §4.1 step 05 promises "estimated price range". `priceQuoteEtb` exists but is never populated (seed sets no `priceFloorEtb`), so no price is ever shown before completion — and the payment path throws if the provider forgets to type a final price. |
| Subscriptions / AI recommendations / voice booking | — | Correctly deferred (proposal marks these Future). |

---

## 3. Provider features (proposal §5.2)

| Feature | Status | Gap detail |
| --- | --- | --- |
| Professional profile | 🟡 | Trade, bio, radius, base location ✅. **One trade per provider only** (scalar FK, not many-to-many). **No portfolio gallery** (enum value exists, no endpoints). **No public provider profile page/endpoint** — customers only see the 10-row nearby projection (no photo, no bio, no reviews). |
| Document verification | 🟡 | Upload (ID/certificate/police clearance) + admin verify/reject/suspend ✅. But per-document review states are never written, **rejection note is silently discarded (bug at `admin.controller.ts:85`)**, no provider notification on verdict, no re-submission flow. |
| Job request management | 🟡 | Accept/reject with a real 90-second window + auto-expire sweeper ✅. **Counter-offer missing entirely** (no column, no endpoint — proposal §4.2 step 06). No push/sound alert; provider must have the page open. |
| GPS navigation | ❌ | No turn-by-turn, no hand-off link to Google Maps/OSM directions, nothing (proposal §4.2 step 07). |
| Earnings dashboard | 🟡 | Wallet balance, double-entry ledger, commission breakdown, payout requests ✅. No weekly summaries or earnings chart (proposal §6.3). |
| Availability toggle | 🟡 | Works, gated on verification. **No working-hours schedule** (no column, no endpoint). |
| Job history & analytics | 🟡 | History ✅. No rating trend, no repeat-customer rate. |
| In-app communication | 🟡 | Same chat as customer side. |
| Featured listing / team management | — | Correctly deferred (Future). |

---

## 4. Admin dashboard (proposal §5.3)

| Module | Status | Gap detail |
| --- | --- | --- |
| Provider verification | 🟡 | Queue + verify/reject/suspend ✅ (suspend has API but no UI button). Rejection-note bug; no per-document verdicts; no automated notification to provider. |
| User management | ❌ | No UI and no `/admin/users` endpoint. Cannot search, suspend, ban, or change role of any user. |
| Booking oversight | 🟡 | Recent-bookings table (UI caps at 12 rows; API returns last 100). No filters, search, pagination, manual intervention tools, or the proposed **real-time booking map**. |
| Payment & commission | 🟡 | Transaction ledger, commission rate config, payout process/reject ✅. **No fraud flags, no refund processing** (enum exists, no code path), payout "processing" just flips a status — no real transfer call. |
| Dispute resolution | ❌ | Nothing at all — no model, no endpoints, no UI. The proposal's entire complaint workflow (§4.3 step 04: receive → assign → investigate → rule → audit trail) is absent. |
| Analytics & reporting | 🟡 | 5 KPI tiles + 14-day booking chart + category ranking ✅. **No DAU/MAU** (no activity tracking exists to compute them), **no geographic heat maps** (despite PostGIS), no technician league tables, no date-range filters, no export. |
| Category & pricing | ❌ | Categories are seed-only — no CRUD, no price-floor editing, **no surge pricing** (no model, no code). |
| System configuration | ❌ | Only one config key (`commission_rate`). No notification templates, no API key management, no feature flags, no audit log of admin actions. |

---

## 5. Core engine gaps (blockers hiding behind "done" features)

1. **No dispatch/matching engine.** The PostGIS nearby query exists but `BookingsService.create` never calls it. A booking made with "First available technician" is created with `providerId = null` and **sits in REQUESTED forever** — nobody is offered the job, and there is no re-offer cascade after a reject/expiry. This is the proposal's headline "Real-Time Discovery" pillar.
2. **No auto-confirm after 30 minutes** (proposal §4.2 step 08). `COMPLETED → PAID` only happens through an explicit payment.
3. **The 90s expiry sweeper is a per-process `setInterval`** — runs duplicated on every replica; not Redis/queue-backed as the architecture doc describes.
4. **EN_ROUTE can be skipped** (arrive is allowed straight from ACCEPTED), so the tracking timeline can jump stages.
5. **Redis is provisioned in docker-compose and used by nothing.** No `ioredis`/`redis` dependency in the API.

---

## 6. Integration gaps (proposal §7.2 stack vs. reality)

| Proposed | Reality |
| --- | --- |
| Telebirr + Chapa + CBEBirr | Stub drivers, fake refs, `TODO(week3)` ×5, **webhook accepts unsigned payloads** |
| Africa's Talking SMS / Ethio Telecom | Console logger only; Ethio driver throws; Africa's Talking driver absent despite being an allowed env value |
| FCM push | Absent |
| Google Maps Platform (Directions, Places) | Absent — Leaflet + OSM tiles instead; no directions, no ETA, no geocoding |
| Socket.io / Firebase real-time | Absent — HTTP polling (4–6s) everywhere |
| Redis (cache, rate limit, geo) | Container runs; API never connects |
| AWS S3 / Cloudflare R2 (→ Telecloud OBS per docs) | Local disk via Multer; **served unauthenticated at `/files/*`**; no volume in the Dockerfile (uploads lost on redeploy) |
| VoIP calling | Absent |

---

## 7. Security findings (must fix before any real money/PII)

1. **Forgeable payment webhook** — `POST /payments/webhook/:gateway` is unauthenticated and does no signature verification: anyone who knows/guesses a `gatewayRef` can mark a booking PAID and credit a wallet.
2. **National ID documents publicly served** — uploads land on local disk and are exposed as static files at `/files/<objectKey>` with no auth (one sample PDF is committed in the repo).
3. **OTP `devCode` returned in the API response** whenever `SMS_PROVIDER=console` — the committed default and the only working driver.
4. **Non-revocable 30-day refresh tokens** — not persisted, no rotation, no logout.
5. **No rate limiting** anywhere (no throttler module; only the per-phone OTP cooldown).
6. **CORS wide open** (`origin: true` + credentials).
7. Role changes (customer → provider) don't invalidate old JWTs until refresh.

---

## 8. Quality & launch readiness (roadmap Weeks 4–5)

- **Tests: zero.** No spec files; `npm test` fails outright (jest not in devDependencies). CI runs install + build only — no lint, no tests, no deploy stage.
- **Not a git repository** — CI has never run; branch protection/PR conventions in docs are aspirational.
- **Dockerfiles:** API only (multi-stage, good) — none for web or bot, though docs say all apps run as containers. API Dockerfile `EXPOSE 3001` vs. actual port 4001.
- **No deployment automation:** no deploy scripts, no Terraform/Ansible, no nginx/ELB config, no production compose. Telecloud provisioning is documented (docs 03) but only the OBS bucket purchase is marked actual.
- **Bot defects:** `bot.launch().then()` misused (startup message prints at shutdown, bad token = unhandled rejection), stale `dist/` pointing at the wrong API port, no `bot.catch()`, no command menu, no fallback handler.
- **No observability:** no Swagger, no structured logging, no Sentry/APM, no metrics endpoint.
- Week 5 items untouched: load testing, pen-test, UAT, backup/restore drill, Play Store submission.

---

## 9. Proposal promises with no owner anywhere

These appear in the proposal but exist in **no** app and no doc task:

- **Connectivity resilience as designed** (§3 pillar 4, §10 risk #1): the SMS fallback has no transport, the Telegram bot cannot book, and offline caching requires the nonexistent mobile app. The mitigation for the highest-rated risk (internet instability, High/High) is currently not in place.
- **E-receipts via SMS** (§4.4 step 06) — settlement sends nothing.
- **Refunds** (§4.3, §5.3) — enum value only.
- **Notification templates** (§5.3 System Configuration).
- **Surge pricing** (§5.3 Category & Pricing).
- **Photo evidence on job completion** (§4.2 step 08 note).
- **Loyalty credit on re-book** (§4.1 step 10 — marked "future" in-line, fine to defer).

---

## 10. Suggested priority order

**P0 — security/correctness (do before anything else)**
Webhook signature verification (or shared-secret) · auth-gate `/files/*` (pre-signed URLs) · stop returning `devCode` outside dev builds · fix rejection-note bug · populate `priceFloorEtb` or make payment amount resolution safe.

**P1 — make the core loop actually work end-to-end**
Dispatch engine (call `nearby()` on booking create, offer cascade, re-offer on reject/expiry) · auto-confirm timer (30 min) · one real payment gateway (Chapa has the simplest public API) + one real SMS provider · ETA + 90s countdown UI · price estimate display.

**P2 — proposal-complete features**
Telegram bot booking flow (needs `telegramId` on User + notification dispatcher) · admin: user management, disputes, category CRUD, refunds · i18n framework + language toggle · photo upload on bookings · public provider profiles + review reads · re-book shortcut · counter-offer.

**P3 — platform & launch**
Android apps (biggest single line item — currently 0%) · WebSocket layer or committed polling story · FCM push · working hours · Dockerfiles for web/bot + deploy pipeline · tests + CI gates · git init + branch protection · load/pen testing, UAT, Play Store.
