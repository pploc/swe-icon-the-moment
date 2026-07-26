---
title: How do you make a payment API safe to retry?
topics: [distributed-systems, api-design]
roles: [backend]
tags: [idempotency, retries, exactly-once]
time: 25
updated: 2026-07-26
---

## Question

A client calls `POST /payments`, the request times out, and the client
retries. The user must not be charged twice. Design the mechanism that makes
this safe, and explain why "exactly-once delivery" is the wrong way to think
about it.

## Answer

The timeout is the crux: the client *cannot know* whether the first request
was processed. So the server must make duplicates harmless — **idempotency**.

**The standard mechanism — idempotency keys:**

1. Client generates a unique key per logical operation (UUID) and sends it as
   `Idempotency-Key`, reusing the same key on every retry of that operation.
2. Server, atomically with the business transaction, records the key:
   `INSERT INTO idempotency_keys (key, status, response) …` with a unique
   constraint — the constraint is what makes two concurrent retries safe.
3. Duplicate arrives → unique violation → return the **stored response** of
   the original attempt (or 409/"in-progress" if it hasn't finished).

**Critical details interviewers probe:**

- The key insert and the side effect must commit **in the same transaction**
  (or via an atomic reservation) — otherwise a crash between them recreates
  the bug.
- Keys need a TTL and a scope (per endpoint + client).
- A concurrent retry racing the original must block or get "in progress" —
  not execute twice.

**Why "exactly-once delivery" is the wrong frame:** over a network with
timeouts, delivery is at-least-once or at-most-once; you can't have both. What
systems actually build is at-least-once delivery + idempotent processing =
**exactly-once *effect***. The same pattern shows up downstream: consumer
dedup tables, `ON CONFLICT DO NOTHING`, conditional writes.

## Follow-ups

- The payment provider you call downstream has no idempotency support — now what? (Reconciliation, unique client reference, status polling before retry.)
- Where does the outbox pattern fit in this picture?
- How do idempotency keys interact with request bodies that differ between retries? (Reject: same key + different payload = 422.)
