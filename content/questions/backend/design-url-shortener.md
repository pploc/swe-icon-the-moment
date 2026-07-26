---
title: Design a URL shortener
topics: [system-design]
roles: [backend]
tags: [design, estimation, sharding]
companies: []
time: 45
updated: 2026-07-26
---

## Question

Design a service like bit.ly: given a long URL, return a short one; when
someone hits the short one, redirect. Target 100M new links/month and a
100:1 read:write ratio. Take it from requirements to a deployable design.

## Answer

What a strong loop looks like:

**1. Requirements & envelope math (5 min).**
100M writes/month ≈ 40 writes/s average → plan for ~400/s peak. Reads ≈
4k/s average, 40k/s peak. Storage: 100M × ~500 bytes ≈ 50GB/year — small.
This math should *drive* the design: reads dominate, data is tiny → cache
everything, don't over-shard.

**2. The short code.** Two viable schemes:

- **Counter + base62** — a monotonically increasing ID encoded in
  `[a-zA-Z0-9]`; 7 chars covers 3.5 trillion. Needs a coordinated counter
  (DB sequence, or block-allocated ranges per app node to avoid a hot spot).
  Codes are guessable — fine for this product.
- **Random / hash** — generate 7 random chars, insert with a unique
  constraint, retry on collision. No coordination, not enumerable.

**3. Data & API.** One table: `code (PK), long_url, created_at, owner,
expires_at`. `POST /links` → 201 with code; `GET /{code}` → **301 or 302**
(discuss: 301 is cached by browsers = less load but no analytics; 302 keeps
every hit visible).

**4. Read path.** CDN/edge cache → app → Redis (code→URL, LRU, TTL) →
database. Cache hit rate will be extreme because of popularity skew.
Negative-cache unknown codes to blunt scans.

**5. Scale & failure.** The DB is small; a single primary with replicas
carries this for years — say so, interviewers reward restraint. If forced:
shard by hash of code. Handle the counter node dying (pre-allocated ranges
survive), cache stampede on a viral link (single-flight), and abuse
(rate-limit creation, blocklist checks).

## Follow-ups

- Add click analytics without slowing redirects. (Async: log → queue → aggregate.)
- Custom aliases — what changes? (Uniqueness contention, reserved words.)
- Links must expire after 90 days — cheapest correct design? (Lazy expiry on read + background sweep.)
