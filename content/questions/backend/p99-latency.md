---
title: p50 is fine but p99 is terrible — walk me through your debugging
topics: [performance, sre]
roles: [backend, sre]
tags: [tail-latency, percentiles, profiling]
time: 30
updated: 2026-07-26
---

## Question

Your API's median latency is 20ms, but p99 is 2 seconds and customers notice.
Why can't you ignore p99, what typically causes a heavy tail, and how do you
hunt it down?

## Answer

**Why p99 matters more than it sounds:** if a page fans out to 20 backend
calls, the chance a user request avoids every p99 is 0.99²⁰ ≈ 82% — nearly
1 in 5 page loads eats a tail latency. Fan-out amplifies the tail; your
heaviest users (biggest payloads, most data) live there too.

**The usual suspects, grouped:**

- **Queueing** — the big one. Utilisation above ~70–80% makes wait times
  explode (connection pools, thread pools, run queues, disk queues). p50
  barely moves; the tail detonates.
- **Pauses & maintenance** — GC pauses, page-cache misses, DB vacuum/
  checkpoints, compaction in LSM stores, TLS handshakes on cold connections,
  cold caches after deploys.
- **Skew** — one slow shard/replica/host (noisy neighbour, failing disk), a
  few giant tenants, lock contention on one hot row.
- **Retries & timeouts** — a hidden retry doubles latency for exactly the
  slow requests; timeout set at 1s manufactures a wall at 1s.

**The hunt:** (1) **Distributed traces filtered to slow requests only** —
comparing a p99 trace to a p50 trace usually names the culprit span
immediately. (2) Correlate the spikes — with deploys, cron, GC logs,
autovacuum, one specific host/AZ (group latency by instance!). (3) If it's
queueing, find the saturated pool via utilisation metrics.

**Mitigations to name:** cap utilisation / add capacity, hedged or duplicate
requests for read fan-outs, request timeouts + budgets end-to-end, split hot
tenants, tune the pause source. And measure honestly: never average
percentiles across hosts — aggregate histograms.

## Follow-ups

- Why is "average of p99s" wrong, and what do you do instead?
- Hedged requests: when do they help, and how do they go wrong? (Amplifying load on an already-saturated backend.)
- Your p99 is fine but a top customer's p99 is awful — what's the measurement lesson? (Per-tenant SLIs; global percentiles hide cohorts.)
- Which observability signal names the guilty span? See [[metrics-logs-traces]].
- One classic tail-latency source is a cache that all expires at once: [[cache-stampede]].
