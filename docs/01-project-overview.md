# 01 — Project Overview (Proposal Digest)

Source: *Addis Tiggena — Full Project Proposal v1.0*, Wezete Technology for Amnen Promotion, 2026.

## Mission

Give every Addis Ababa household instant access to a verified, skilled maintenance
professional — making professional repairs as easy as sending a message.

## The problem

The home-maintenance sector in Addis Ababa is informal, fragmented, and trust-deficient:

- **No centralised platform** — customers rely on word-of-mouth; technicians get inconsistent work.
- **Poor address systems** — locations are hard to describe; technicians waste travel time.
- **No verification** — fraud/quality risk for customers; skilled providers go unrecognised.
- **Connectivity gaps** — booking systems must survive 2G/3G networks and outages.
- **Cash-only payments** — unsafe, inflexible, and disputes are common.

Market: 5.4M+ residents, growing middle class, **no dominant digital home-services platform**.

## The solution — four channels, one platform

| Channel | Audience | Key capability |
| --- | --- | --- |
| Web portal | Urban professionals, landlords, offices | Full booking, search, history, receipts |
| Android app | Mobile-first customers & technicians | GPS tracking, push notifications, offline |
| Telegram bot | Low-data users, quick requests | Conversational booking in Amharic/English |
| Admin dashboard | Amnen/Wezete operations team | Oversight, verification, disputes, analytics |

### Solution pillars

1. **Real-time discovery** — GPS matching of the nearest verified technician by availability, trade, and rating.
2. **Trust & verification engine** — document-verified, badge-approved technicians only.
3. **Ethiopian payment stack** — Telebirr, Chapa, CBEBirr; automatic commission split; same-day payouts.
4. **Connectivity-resilient design** — Telegram bot, SMS fallback, offline-cached bookings, 2G-friendly UI.

## Actors and their journeys

- **Customer**: register (phone OTP) → pick service → pin location (+ landmark notes) → choose
  technician → confirm → live-track → service delivered → pay digitally → rate & review → re-book.
- **Provider (technician)**: register → upload documents (ID, certificates) → admin verification
  (3–5 day SLA) → go live (radius, hours, availability toggle) → receive job push (90-second window)
  → accept/reject/counter-offer → navigate → complete → wallet credited net of commission → withdraw
  (Telebirr/bank, same-day).
- **Admin**: provider vetting → live booking oversight → payment/commission oversight → dispute
  resolution with audit trail → analytics/KPIs → platform configuration (categories, price floors,
  commission rates, surge rules) → support & moderation.

## MVP scope (from proposal §5)

**Customer**: OTP auth · category browser · GPS pinning · real-time tracking · in-app chat/call ·
booking history · ratings & reviews · digital payment (3 gateways) · Amharic-first UI.

**Provider**: profile · document verification · job request management · GPS navigation · earnings
dashboard · availability toggle · job history · in-app communication.

**Admin**: provider verification · user management · booking oversight · payments & commission ·
dispute resolution · analytics · category & pricing config · system configuration.

**Explicitly future (not MVP)**: subscriptions, AI recommendations, voice booking, featured
listings, team management.

## Business model (for Amnen Promotion)

| Stream | Launch |
| --- | --- |
| Service commission (auto-deducted % per completed transaction) | Day 1 |
| Featured listings (fixed fee) | Month 2 |
| Provider subscriptions (lower commission + analytics) | Month 2 |
| Corporate contracts (hotels, hospitals, offices) | Month 3 |
| Ad placements (CPM/CPC) | Month 4 |

## Key risks to engineer around

| Risk | Mitigation baked into the design |
| --- | --- |
| Internet instability (High/High) | Telegram bot + SMS fallback + offline-capable app, cached maps |
| GPS inaccuracy (High/Med) | Landmark notes field, manual pin correction, in-app chat for last-mile |
| Fraudulent providers (Med/High) | Document verification, probationary rating period, photo evidence |
| Gateway failures (Med/Med) | 3-gateway fallback chain (Telebirr → Chapa → CBEBirr), retry + reconciliation |
| Timeline overrun (Med/High) | Fixed MVP scope, parallel tracks, scope-freeze date |
| Data breach (Low/High) | HTTPS everywhere, JWT, encrypted payments, pen-test in Week 5 |

## Timeline & team

5 weeks: (1) Discovery & design → (2) Core backend → (3) Apps + integrations → (4) Web + admin →
(5) QA & launch. Team of 7: PM, UI/UX, 2× backend, mobile, frontend, QA.
See `docs/05-roadmap.md` for the engineering breakdown.
