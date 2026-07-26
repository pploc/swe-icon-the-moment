---
title: At-least-once, at-most-once, exactly-once — what does Kafka actually give you?
topics: [messaging, distributed-systems]
difficulty: senior
roles: [backend, platform]
tags: [kafka, delivery-semantics, offsets, consumers]
time: 25
updated: 2026-07-26
---

## Question

Your team consumes payment events from Kafka. Explain the three delivery
semantics, where duplicates and loss actually come from (both sides of the
pipeline), and what "exactly-once" means in practice.

## Answer

The semantics are decided by **when you commit relative to when you process**
— on both the producer and consumer side.

**Producer side:**

- Send succeeds but the ack is lost → producer retries → **duplicate in the
  log** (at-least-once). Kafka's **idempotent producer** (sequence numbers
  per partition, on by default now) removes these retry duplicates.
- `acks=0/1` and a leader dies before replication → **loss**. Durable
  configs: `acks=all` + `min.insync.replicas=2`.

**Consumer side (where most real bugs live):**

- **Commit offset *after* processing** → crash between the two → the batch is
  reprocessed → duplicates downstream = at-least-once. Standard choice.
- **Commit *before* processing** → crash → those messages are skipped =
  at-most-once. Rarely what you want.
- Also: auto-commit on an interval commits offsets for messages you may not
  have finished; rebalances replay from the last commit.

**"Exactly-once":** within a **Kafka→Kafka** pipeline, transactions +
`read_committed` give exactly-once *stream processing* (offsets and outputs
commit atomically — the Streams model). The moment a side effect leaves Kafka
(DB write, HTTP call, email), you're back to at-least-once + **idempotent
consumers**: dedup on a stable event ID, upserts/conditional writes, or
storing offsets in the same DB transaction as the effect.

Rule worth saying out loud: *design every consumer to tolerate duplicates;
treat any other guarantee as an optimisation.*

## Follow-ups

- Ordering: what does Kafka guarantee, and what breaks it? (Per-partition only; retries with `max.in.flight>5` historically, key repartitioning.)
- What is consumer lag, and your first three moves when it grows unbounded?
- Contrast with SQS: visibility timeout instead of offsets — how do semantics shift?
