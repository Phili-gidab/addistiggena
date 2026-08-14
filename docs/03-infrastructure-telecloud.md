# 03 — Infrastructure: What to Buy from Ethio Telecom Telecloud

Source: *Telecloud Services v1.0* customer presentation (Ethio Telecom, Jan 2024) mapped against
Addis Tiggena's needs. Telecloud portal: https://telecloud.ethiotelecom.et

## Why Telecloud (vs the proposal's AWS default)

- **Data residency** — customer PII, national IDs, and payment records stay in Ethiopia.
- **Latency** — users, technicians, and the ops team are all in Addis; in-country hosting beats
  any foreign region.
- **Billing in ETB, pay-as-you-go** — no forex procurement cycle for a local client.
- **One vendor** — cloud, SMS, and Telebirr payment rails under the same roof simplifies
  contracts and support escalation.

Trade-off accepted: Telecloud has no managed PostgreSQL, no managed Kafka/queues, fewer regions.
We self-manage PostgreSQL (with Telecloud backup services) and keep the architecture simple.

## Shopping list — MVP launch (Week 5 go-live)

| # | Telecloud service | Qty / sizing (initial) | Purpose |
| --- | --- | --- | --- |
| 1 | **ECS** — Elastic Cloud Server | 2× app servers (4 vCPU / 8 GB, 100 GB EVS) | Runs Docker: API, web (Next.js), bot, Socket.IO. Two for redundancy behind ELB |
| 2 | **ECS** | 1× database server (4 vCPU / 16 GB, 200 GB EVS high-IO) | PostgreSQL 16 + PostGIS, Redis |
| 3 | **EVS** — Elastic Volume Service | Attached to the above | Block storage for OS + data volumes |
| 4 | **OBS** — Object Storage Service | 1 bucket, ~100 GB to start | Provider documents (IDs, certificates), portfolio photos, job photo evidence, e-receipts |
| 5 | **VPC** — Virtual Private Cloud | 1 VPC, 2 subnets (public: ELB/NAT; private: app + DB) | Network isolation |
| 6 | **Security Groups** | 3 (elb-sg, app-sg, db-sg) | Only ELB→app:3000-3001, only app→db:5432/6379; SSH only via VPN |
| 7 | **Network ACL** | On the private subnet | Subnet-level allow/deny as a second layer |
| 8 | **ELB** — Elastic Load Balance | 1 | TLS termination, distributes traffic across the 2 app ECSs, health checks |
| 9 | **EIP** — Elastic IP | 2 (ELB, NAT gateway) | Public entry points |
| 10 | **NAT Gateway** | 1 | Outbound internet for private-subnet servers (payment/webhook calls, FCM, Maps API) without exposing them |
| 11 | **VPN** (Virtual Private Network) | 1 site-to-site / client VPN | Ops/admin access to private subnet — no public SSH |
| 12 | **WAF** — Web Application Firewall | On the ELB/domain | Shields API + web from SQLi, XSS, malicious uploads (we handle national IDs — non-negotiable) |
| 13 | **EdgeFW** — Edge Firewall | On the EIPs | North–south IPS + antivirus at the border |
| 14 | **Cloud Server Backup Service** | Both app ECSs, weekly | Whole-server restore point |
| 15 | **Volume Backup Service** | DB data volume, **nightly** | Online consistent backups of PostgreSQL EVS disk without stopping the server |
| 16 | **ECS Snapshot** | Before each production deploy | Instant rollback point (cheap insurance during the 5-week crunch) |
| 17 | **IMS** — Image Management Service | Free | Golden server image (hardened Ubuntu + Docker) so app servers are identical/replaceable |

Also from Ethio Telecom (outside the Telecloud catalogue): **SMS gateway** for OTP and booking
notifications, and the **Telebirr merchant/API onboarding** — start both sign-ups in Week 1;
they have lead times.

## Purchase plan as executed (July 2026 revision — cost-minimized, two stages)

The list above is the target topology. To minimise spend we buy it in two stages and
right-size the servers (ECS resize is a reboot-level operation, so undersizing is cheap
to correct; the week-5 load test decides any upsize).

**Portal findings (2026-07-25):** Telecloud now lists **RDS for PostgreSQL** and **DCS
(managed Redis)** — both tagged "New" — which would replace the self-managed DB ECS.
Huawei Cloud docs confirm RDS for PostgreSQL supports the PostGIS extension. However the
RDS order form is **not yet configurable even when logged in** (ordering not enabled).
Trouble ticket filed to enable it; until then we run **Plan B: self-managed PostgreSQL +
PostGIS + Redis on a Memory-Optimized ECS**. If RDS is enabled later, migrate with a
`pg_dump`/restore and stop renewing the DB server (monthly billing = no lock-in).

### Stage 1 — bought now (dev → UAT → soft launch)

| Item | Config | Billing | Price |
| --- | --- | --- | --- |
| App ECS | General Purpose telecloudECS2\|4 (2 vCPU/4 GB), Ubuntu 22.04, 100 GB disk, `tiggena-private` + `app-sg`, temporary EIP (smallest bandwidth) | Monthly | ~4.5k ETB/mo (est.) |
| DB ECS | Memory-Optimized telecloudECS2\|8 (2 vCPU/8 GB), Ubuntu 22.04, 40 GB system + **200 GB High-IO data disk**, `tiggena-private` + `db-sg`, **no EIP** | Monthly | ~5.5–7k ETB/mo (est.) |
| OBS | 100 GB @ 2.86 ETB/GB/mo tier, private bucket `tiggena-docs`, pre-signed URLs only | **1 year prepaid** | **2,917 ETB/yr (actual)** |
| Volume Backup Service | Nightly policy on the DB data disk, ~7-day retention | Monthly | small |
| VPC + 2 subnets + 3 SGs + ACL + IMS image + SSH keys | `tiggena-vpc` 10.0.0.0/16; `tiggena-public` 10.0.1.0/24; `tiggena-private` 10.0.2.0/24; elb-sg / app-sg / db-sg | — | free |

### Stage 2 — buy at go-live (week 5)

1. Second app ECS cloned from the IMS golden image (resize both to 4\|8 only if the load test says so).
2. ELB + its EIP (TLS terminates there).
3. NAT Gateway; then remove the app server's temporary EIP — app servers become fully private.
4. WAF on the ELB (non-negotiable — national IDs).
5. Resize DB to 4\|16 / migrate to RDS if UAT metrics or the enabled RDS justify it.

### Deliberate cuts vs the original list

- **Cloud Server Backup (weekly, app ECSs)** — skipped: app servers are stateless Docker
  hosts; the free IMS golden image + redeploy covers restore. Only the DB volume needs backup.
- **EdgeFW** — deferred; WAF covers the L7 threats at MVP scale. Revisit after the week-5 pen-test.
- **ECS snapshots** — on-demand before deploys only, never scheduled.
- **DCS Redis** — not orderable yet; Redis runs on the DB ECS (as in local dev) until it is.

## Growth phase (post-launch, buy when metrics demand)

| Telecloud service | Trigger to buy |
| --- | --- |
| **Auto Scaling (AS)** + more ECS | Sustained CPU > 60% on app servers or launch campaigns |
| **CCE** — Cloud Container Engine (managed Kubernetes) | When we outgrow Docker Compose on ECS (many services, frequent deploys) |
| **VSS** — Vulnerability Scan Service | With CCE — scans container images against our security policies |
| **Direct Connect / Cloud Connect** | If Amnen opens a physical ops centre needing low-latency private connectivity |
| **RDS for MySQL** | Only if self-managed PostgreSQL becomes an ops burden (Plan B, see doc 02) |
| **Bare Metal Server (BMS)** | Only for extreme DB IO needs — unlikely in year 1 |

## Network topology

```
                        Internet
                           │
              ┌────────────┴───────────┐
              │  EIP + EdgeFW + WAF    │
              │         ELB            │   public subnet
              └────────────┬───────────┘
        ┌──────────────────┼──────────────────┐
        │                  │                  │
  ┌─────┴─────┐      ┌─────┴─────┐      ┌─────┴──────┐
  │ ECS app-1 │      │ ECS app-2 │      │ NAT GW+EIP │  (outbound only)
  │ api·web·  │      │ api·web·  │      └────────────┘
  │ bot·ws    │      │ bot·ws    │       private subnet (app)
  └─────┬─────┘      └─────┬─────┘
        └────────┬─────────┘
           ┌─────┴──────┐        ┌──────────────┐
           │  ECS db-1  │        │  OBS bucket  │  (via VPC endpoint)
           │ Postgres + │        └──────────────┘
           │ PostGIS ·  │         private subnet (data)
           │ Redis      │        Ops access: VPN only
           └────────────┘
```

## Monthly operating cost lines (fill in with current Telecloud tariffs)

Matches proposal §9.2: cloud hosting (3× ECS + EVS + ELB + EIP + NAT + WAF + backups + OBS),
Google Maps API (per-request), SMS gateway (per SMS), FCM (free tier), support agents,
maintenance retainer. Telecloud is metered pay-per-use — get the current rate card from the
account manager and fill the table before contract signature.

## Security & compliance checklist

- TLS everywhere (ELB termination + internal TLS to app), HSTS on web.
- Documents (IDs, certificates) in OBS: private bucket, pre-signed URLs only, short expiry.
- DB: encrypted EVS volume, nightly Volume Backup, weekly restore drill in Week 5.
- Secrets: server-side `.env` provisioned via CI secrets — never in the repo.
- Access: VPN + SSH keys only; no password auth; admin dashboard behind role-based auth + IP allowlist.
- Pen-test + load test in Week 5 (proposal §10), WAF rules tuned from findings.
