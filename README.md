# Addis Tiggena — አዲስ ጥገና

Integrated digital maintenance service platform for Addis Ababa, connecting households and
businesses with verified maintenance professionals (plumbing, electrical, carpentry, painting,
AC, …) across four channels: **Web**, **Android**, **Telegram bot**, and an **Admin dashboard**.

Prepared by **Wezete Technology** for **Amnen Promotion**. See the full proposal in
`docs/01-project-overview.md`.

## Repository layout

```
addis-tiggena/
├── apps/
│   ├── api/        # NestJS backend — REST API, auth, bookings, payments, realtime
│   ├── web/        # Next.js customer web portal (Amharic-first)
│   ├── bot/        # Telegram bot (Telegraf) — conversational booking
│   └── mobile/     # Android apps (Expo / React Native) — customer + provider (scaffold notes)
├── docs/           # Project documentation & roadmap
├── docker-compose.yml  # Local dev: PostgreSQL + PostGIS, Redis
└── package.json    # npm workspaces root
```

## Quick start (local development)

Prerequisites: Node.js >= 20, Docker Desktop.

```bash
# 1. Start infrastructure (PostgreSQL + PostGIS, Redis)
docker compose up -d

# 2. Install dependencies (root installs all workspaces)
npm install

# 3. Configure environment
cp apps/api/.env.example apps/api/.env

# 4. Create the database schema
npm run db:migrate -w apps/api

# 5. Seed service categories + demo data
npm run db:seed -w apps/api

# 6. Run the API (http://localhost:4001)
npm run start:dev -w apps/api

# 7. Run the web app (http://localhost:4000)
npm run dev -w apps/web

# 8. Run the Telegram bot (needs BOT_TOKEN in apps/bot/.env)
npm run start:dev -w apps/bot
```

In development, OTP codes are printed to the API console instead of being sent by SMS
(`SMS_PROVIDER=console`).

## Documentation

| Doc | Contents |
| --- | --- |
| [docs/01-project-overview.md](docs/01-project-overview.md) | Proposal digest: problem, solution, actors, MVP scope |
| [docs/02-tech-stack.md](docs/02-tech-stack.md) | Chosen technologies and the reasoning behind each |
| [docs/03-infrastructure-telecloud.md](docs/03-infrastructure-telecloud.md) | What to buy from Ethio Telecom Telecloud, sizing & topology |
| [docs/04-architecture.md](docs/04-architecture.md) | System architecture, data model, booking state machine, payment flow |
| [docs/05-roadmap.md](docs/05-roadmap.md) | 5-week delivery roadmap with epics, tasks, and definitions of done |
| [docs/06-running-locally.md](docs/06-running-locally.md) | Day-to-day run cheat sheet, demo accounts, troubleshooting |

© 2026 Wezete Technology — Confidential & Proprietary.
