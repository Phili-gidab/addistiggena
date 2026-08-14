# 05 — Delivery Roadmap (5 Weeks)

Engineering translation of proposal §8, with concrete tasks and definitions of done (DoD).
The repository already contains the Week-1/Week-2 head start produced at kickoff (marked ✅).

## Week 1 — Discovery & Design

| Task | Owner | DoD |
| --- | --- | --- |
| Requirements workshops with Amnen | PM | Signed-off MVP scope + scope-freeze date |
| Figma wireframes: customer app, provider app, web, admin | UI/UX | All MVP screens; Amharic assets; design tokens (§6 colours) |
| Repo, monorepo scaffold, local Docker env | Backend Sr. | ✅ `docker compose up` + `npm install` works on a fresh machine |
| Database schema design | Backend Sr. | ✅ Prisma schema for all MVP entities incl. PostGIS columns |
| API contract definition | Backend Sr. | ✅ Endpoint list in doc 04; DTOs in code |
| **Start Telecloud provisioning** (account, VPC, ECS quotas) | PM + DevOps | Resources from doc 03 ordered — lead times! |
| **Start Telebirr/Chapa/CBEBirr merchant onboarding + SMS gateway contract** | PM | Applications submitted (longest external lead time in the project) |

## Week 2 — Core Backend

| Task | DoD |
| --- | --- |
| OTP auth (SMS abstraction + JWT) | ✅ scaffolded — request/verify works end-to-end in dev (console SMS); rate-limited via Redis |
| User & provider CRUD, document upload to OBS | Provider can register, upload docs (pre-signed URLs), admin sees queue |
| Booking engine + state machine | ✅ scaffolded — all transitions validated + tested; offer timeout job (90 s) |
| Catalog module + seed (plumbing, electrical, carpentry, painting, AC…) | ✅ scaffolded — categories in am/en served |
| Nearby-provider matching (PostGIS) | ✅ scaffolded — ranked radius query returns verified+available providers |
| Admin panel skeleton (API side) | Verification + booking oversight endpoints behind ADMIN role |
| CI pipeline | Lint + build + tests on every PR |

## Week 3 — Apps + Integrations

| Task | DoD |
| --- | --- |
| Customer Android app (Expo): auth, browse, book, track | Booking flow works against staging API |
| Provider Android app (Expo): jobs, accept/reject, navigate, earnings | Provider completes a job end-to-end |
| Payment gateways: Telebirr, Chapa, CBEBirr | ✅ interface + webhook scaffolded — real credentials wired, sandbox payment confirmed, commission ledger written |
| Google Maps + live tracking (Socket.IO + Redis geo) | Customer sees moving technician dot + ETA |
| Telegram bot booking flow (am/en) | ✅ skeleton — full scene flow: category → location → confirm → status updates |
| Push notifications (FCM) + SMS mirrors | State changes reach offline users |

## Week 4 — Web + Admin

| Task | DoD |
| --- | --- |
| Customer web portal (Next.js): booking, history, receipts | ✅ skeleton — full flows styled per design system |
| Admin dashboard: verification queue, bookings map, payments/commission, disputes, category & commission config, analytics | Ops can run the platform without DB access |
| Analytics & KPI reporting | DAU/MAU, bookings by category, geographic heat map |
| SMS gateway production integration | Real OTP delivery < 10 s |
| Payout flow (wallet → Telebirr/bank) | Provider withdrawal processed same-day with audit log |

## Week 5 — QA & Launch

| Task | DoD |
| --- | --- |
| Load testing (ELB + 2 app ECS) | Target: 200 concurrent bookings, p95 < 500 ms |
| Security review & pen-test; WAF tuning | No high/critical findings open |
| UAT with real customers + technicians | Sign-off from Amnen |
| Backup/restore drill (Volume Backup Service) | DB restored to fresh ECS < 1 h |
| Production deploy (Telecloud), Play Store submission | Apps live; ELB/TLS/domain done; runbook written |
| Go-live + hypercare rotation | On-call schedule for launch fortnight |

## Post-launch (from proposal §9.3)

Month 2: featured listings + provider subscriptions · Month 3: corporate contracts ·
Month 4: ad placements · Later: subscriptions for households, AI recommendations, voice booking,
CCE/Kubernetes migration when deploy frequency demands it.

## Critical-path items to start TODAY

1. **Telebirr merchant onboarding** — every payment feature depends on it; longest external lead time.
2. **Telecloud account + quota** (doc 03 shopping list) — provisioning + VPN setup takes days.
3. **SMS gateway contract** — OTP is the front door of the product.
4. **Play Store developer account** — review times affect the Week-5 launch.
5. **Figma design sprint** — mobile devs consume it from Week 3 Day 1.
