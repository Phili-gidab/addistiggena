# 02 — Technology Stack

Decisions follow the proposal (§7.2) with a few sharpened choices. Where the proposal listed
alternatives ("Flutter / React Native", "AWS S3 / Cloudflare R2", "AWS hosting"), the selection and
rationale are recorded here.

## Summary

| Layer | Choice | Why |
| --- | --- | --- |
| Language | **TypeScript everywhere** | One language across API, web, admin, bot, and mobile — a 7-person, 5-week team cannot afford context switching |
| Backend API | **Node.js 22 + NestJS 10** | High concurrency for realtime events; structured modules/DI suit a multi-developer sprint; large local talent pool |
| ORM | **Prisma** (+ raw SQL for geospatial) | Fast schema iteration, typed client; PostGIS queries done via `$queryRaw` |
| Database | **PostgreSQL 16 + PostGIS 3.4** | ACID for money movement; PostGIS powers "nearest verified technician" matching |
| Cache / sessions | **Redis 7** | OTP throttling, rate limiting, live technician positions, job-offer timers |
| Realtime | **Socket.IO** (via `@nestjs/websockets`) | Live tracking, booking status pushes, chat; falls back to polling on bad networks |
| Customer web | **Next.js 14 (App Router)** | SSR for low-end devices & SEO, Amharic font support (Noto Sans Ethiopic) |
| Admin dashboard | **Next.js + an admin UI kit** (built Week 4) | Same skills as web; tables/charts for ops |
| Mobile (Android) | **React Native via Expo** — customer + provider apps | Chosen over Flutter: shares TypeScript API client/types with the rest of the repo; Expo gives OTA updates (critical for fast fixes post-launch); background location supported via `expo-location`/`expo-task-manager` |
| Telegram bot | **Telegraf.js** | Mature session/scene handling for the conversational Amharic/English booking flow |
| Auth | **Phone OTP + JWT** (access + refresh) | No email dependency; stateless API |
| SMS / OTP delivery | **Provider abstraction**: Ethio Telecom SMS gateway or Africa's Talking; `console` driver in dev | Keeps us free to pick the cheaper/faster gateway per message class |
| Push notifications | **FCM** | Free tier covers early growth (per proposal §9.2) |
| Maps & GPS | **Google Maps Platform** (Maps SDK, Directions, Places) | Proposal's judgment: most reliable in Ethiopia |
| Payments | **Telebirr + Chapa + CBEBirr** behind a single `PaymentGateway` interface | Fallback chain Telebirr → Chapa → CBEBirr; webhook-driven confirmation; manual reconciliation tooling in admin |
| Object storage | **Telecloud OBS** (S3-compatible client) | Certificates, portfolio photos, receipts — kept in-country (see doc 03); the proposal's AWS S3/R2 option is replaced by OBS deliberately |
| Hosting | **Ethio Telecom Telecloud** (not AWS) | See doc 03 — data residency, ETB billing, latency, and proximity to Telebirr rails outweigh AWS's ecosystem for this product |
| CI/CD | GitHub Actions → Docker images → deploy to Telecloud ECS | Simple, reproducible; CCE/Kubernetes deferred until scale demands it |

## Deviations from the proposal, made explicit

1. **Hosting: Telecloud instead of AWS.** The proposal names AWS (§7.2) but the client supplied the
   Telecloud services catalogue as the infrastructure source. Telecloud wins on: data residency in
   Ethiopia, billing in ETB (no forex procurement), single-digit-ms latency to Addis users, and one
   vendor for SMS + cloud + (Telebirr) payments. Trade-off: fewer managed services — accepted, see
   doc 03 for what we self-manage.
2. **Mobile: React Native (Expo), not Flutter.** Either satisfies the proposal; RN keeps the whole
   codebase TypeScript and lets mobile reuse the shared API types. If the hired mobile developer is
   Flutter-only, this decision can be reversed in Week 1–2 with no architectural impact (the API is
   the contract).
3. **Database: self-managed PostgreSQL on Telecloud, not RDS.** Telecloud's managed database is
   MySQL-only; we need PostGIS. We run PostgreSQL + PostGIS in Docker on a dedicated ECS instance
   and buy Telecloud **Volume Backup Service** for it. (Fallback if ops capacity is a concern:
   switch to Telecloud RDS MySQL 8 and use its spatial types — but PostGIS is meaningfully better
   for radius/nearest queries, so this is Plan B only.)

## Repo & tooling conventions

- **Monorepo, npm workspaces** — `apps/api`, `apps/web`, `apps/bot`, `apps/mobile`.
- Node >= 20, `.nvmrc` at root; Prettier + ESLint shared config.
- Environment via `.env` per app (never committed); `.env.example` documents every variable.
- Conventional commits; `main` protected; feature branches + PR review.
- Docker Compose for local Postgres/Redis; production images built per app.
