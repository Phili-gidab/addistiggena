# 06 — Running the App Locally (Day-to-Day Cheat Sheet)

The platform is three processes + Docker infrastructure. **All of them must be running**
for the site to work end-to-end. Run each in its own terminal from the repo root
(`Desktop/Addis Tiggena`).

## TL;DR — every time you sit down

```bash
# 1. Infrastructure (PostgreSQL + Redis) — needs Docker Desktop open
docker compose up -d

# 2. API  →  http://localhost:4001
npm run start:dev -w apps/api

# 3. Web  →  http://localhost:4000
npm run dev -w apps/web

# 4. (optional) Telegram bot — needs BOT_TOKEN in apps/bot/.env
npm run start:dev -w apps/bot
```

Then open **http://localhost:4000**.

Shut down when done: `Ctrl+C` in each terminal, then `docker compose down`
(or just leave the containers running — they're cheap).

## First-time setup only

```bash
npm install                          # installs every workspace
cp apps/api/.env.example apps/api/.env
npm run db:migrate -w apps/api       # creates the schema
npm run db:seed -w apps/api          # categories + demo users
```

## Demo accounts

| Phone | Role |
| --- | --- |
| `0900000001` | Admin |
| `0911000002` | Technician (verified) |
| any other number | Customer (created on first login) |

OTP codes are **printed in the API terminal** and echoed on the login page
(`SMS_PROVIDER=console` — no real SMS in dev).

## Troubleshooting

| Symptom | Cause → Fix |
| --- | --- |
| Categories/services never load; console shows `:4001 … ERR_CONNECTION_REFUSED` | The API isn't running → start step 2 |
| API crashes on boot with a Prisma/connection error | Postgres isn't running → Docker Desktop open? then `docker compose up -d` |
| "Your session expired — please sign in again" | Access token outlived its 1 h TTL and the refresh failed (e.g. DB reseeded) → sign in again |
| Web page looks half-styled after pulling new code | Dev server needs a restart + hard refresh (`Ctrl+Shift+R`) |
| Port already in use (`EADDRINUSE 4000/4001`) | An old dev server is still alive → close its terminal or kill the process |
| `docker compose ps` shows empty list | Containers stopped → `docker compose up -d` |

## Ports

| Service | Port |
| --- | --- |
| Web (Next.js) | 4000 |
| API (NestJS) | 4001 |
| PostgreSQL | 5432 |
| Redis | 6379 |
