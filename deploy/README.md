# Deploying Addis Tiggena to the Telecloud ECS

Single-server layout (current quota: 1× ECS, 2 vCPU / 4 GB, 100 GB disk): PostgreSQL+PostGIS,
API, web, bot and Caddy all run as containers on the one box. When the second (DB) ECS from
docs/03 is assigned, move the `db` service there and change `DATABASE_URL` — nothing else changes.

## 0. Prerequisites (Telecloud console)

- **Elastic IP** bound to the ECS.
- **DNS**: A records for both `WEB_DOMAIN` and `API_DOMAIN` → the elastic IP (before first start —
  Caddy needs them resolvable to issue TLS certificates).
- **Security group** on the ECS: inbound 80 + 443 from `0.0.0.0/0`, 22 from the office IP only,
  nothing else. All inter-service traffic stays on the Docker network.

## 1. Install Docker on the ECS (Ubuntu 22.04)

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER   # log out & back in
```

## 2. Get the code onto the server

Recommended: push this repo to a private GitHub repository, then on the ECS:

```bash
git clone <repo-url> tiggena && cd tiggena
```

(Without git: `scp`/WinSCP the project folder **excluding node_modules** and `.env` files.)

## 3. Configure

```bash
cd deploy
cp .env.example .env
nano .env        # fill EVERY value; generate secrets with: openssl rand -hex 32
```

Production behavior to know: `NODE_ENV=production` is forced — OTP codes are never echoed in
responses, unsigned payment webhooks are rejected (each gateway needs its webhook secret), and
`SMS_PROVIDER=africastalking` refuses to boot without credentials (use that, or accept that
`console` logs codes to `docker logs` until the Ethio Telecom SMS contract lands).

## 4. Launch

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

The API container runs `prisma migrate deploy` automatically on boot. Then seed once
(categories, price floors, commission rate, admin account):

```bash
docker compose -f docker-compose.prod.yml exec api npx ts-node prisma/seed.ts
```

## 5. Verify

```bash
curl -s https://<API_DOMAIN>/health          # {"status":"ok",...}
docker compose -f docker-compose.prod.yml ps # all services Up
```

Open `https://<WEB_DOMAIN>`, log in with a real phone (SMS OTP), and message the bot with
`/start`. Register the bot's webhook-free long polling needs no inbound port.

## 6. Backups

Telecloud nightly volume backup covers the DB disk (docs/03). Add a logical dump as well —
on the ECS crontab (`crontab -e`):

```
0 2 * * * docker compose -f /home/ubuntu/tiggena/deploy/docker-compose.prod.yml exec -T db pg_dump -U tiggena tiggena | gzip > /home/ubuntu/backups/tiggena-$(date +\%F).sql.gz
```

Keep ~14 days; test a restore before go-live (Week-5 DoD in docs/05).

## 7. Updating

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build   # rebuilds changed images, migrates on boot
```

## Known limits of this stage

- One box: a reboot takes everything down (~1 min). ELB + second app ECS is the docs/03 Stage-2 plan.
- Uploads live in the `uploads` Docker volume — included in ECS volume backups, but move to OBS
  pre-signed URLs (docs/03) before scale.
- Telebirr/CBEBirr initiation is still instruction-based pending merchant onboarding; Chapa is
  fully live once `CHAPA_SECRET_KEY` + `CHAPA_WEBHOOK_SECRET` are set.
