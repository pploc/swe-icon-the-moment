---
title: What is a deadlock, and how do you prevent one?
topics: [concurrency]
difficulty: mid
roles: [backend]
tags: [deadlock, locks, mutex]
time: 15
updated: 2026-07-26
---

## Question

Two services in production are stuck: each holds a lock the other needs.
Explain what happened, the conditions required for it, and the strategies you'd
use to prevent or recover from it.

## Answer

A deadlock needs **all four Coffman conditions** simultaneously:

1. **Mutual exclusion** — the resources can't be shared.
2. **Hold and wait** — a thread holds one lock while waiting for another.
3. **No preemption** — locks can't be forcibly taken away.
4. **Circular wait** — a cycle exists in the "who waits for whom" graph.

Break any one of them and deadlock is impossible. Practical strategies:

- **Lock ordering** (breaks circular wait) — define a global order for
  acquiring locks and never acquire against it. This is the most common fix.
- **Try-lock with timeout/backoff** (breaks hold-and-wait) — `tryLock(50ms)`,
  release everything on failure, retry. Beware livelock; add jitter.
- **Single coarse lock or lock-free structures** — remove the multi-lock
  situation entirely; often the pragmatic answer.
- **Detection & recovery** — databases do this: build the wait-for graph,
  pick a victim, abort it. Application code usually can't kill threads safely,
  so prevention beats detection there.

In distributed systems the same shape appears with row locks across
transactions, or two services synchronously calling each other — the fix is
the same idea: ordering, timeouts, or removing the cycle.

## Follow-ups

- What's the difference between deadlock, livelock, and starvation?
- How does a database detect deadlocks between transactions?
- You can't reproduce the deadlock locally — how do you diagnose it in prod? (Thread dumps, `jstack`, `pprof`, lock contention profiles.)
