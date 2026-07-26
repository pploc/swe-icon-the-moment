---
title: A hot cache key expires — how do you survive the stampede?
topics: [caching, performance]
roles: [backend, sre]
tags: [redis, stampede, ttl, invalidation]
time: 20
updated: 2026-07-26
---

## Question

Your homepage data is cached in Redis with a 60s TTL and served 10,000×/s.
The key expires, and every request misses at once — the database gets 10,000
identical queries and falls over. What happened, and what are your options?

## Answer

This is a **cache stampede** (thundering herd / dog-piling): expiry turns the
cache from a shield into a synchronised trigger. Defences, roughly in the
order worth reaching for:

1. **Request coalescing / single-flight** — only one request per key
   recomputes; the rest wait for its result (Go's `singleflight`, a Redis
   `SET NX` lock with a short TTL, or a per-key in-process mutex). Turns
   10,000 queries into 1 per app node — or 1 globally with a distributed lock.
2. **Stale-while-revalidate** — keep serving the expired value while one
   background refresh runs. Users get slightly stale data; the DB gets one
   query. Store a logical TTL inside the value; keep the Redis TTL longer.
3. **Probabilistic early refresh** — each hit refreshes early with a
   probability that rises as expiry nears (XFetch), desynchronising refreshes
   without any lock.
4. **TTL jitter** — for *many* keys warmed together (deploy, cache flush),
   randomise TTLs (60s ± 10%) so they don't expire in one wave.
5. **Never-expire + explicit invalidation** — the writer updates the cache;
   TTL becomes just a safety net. Strongest, but now you own invalidation
   correctness and race handling (write-then-delete vs delete-then-write).

A senior answer also mentions the **blast-radius controls** for when defences
fail: DB-side max connections / statement timeouts, and load-shedding so a
stampede degrades to errors for some instead of an outage for all.

## Follow-ups

- The stampede happened on a *nonexistent* key being hammered — different problem, different fix. (Negative caching, bloom filter — cache penetration.)
- Redis itself restarts cold. How do you warm it without recreating the stampede?
- Compare this per-key lock with the locking you'd use for cache *consistency* on writes.
