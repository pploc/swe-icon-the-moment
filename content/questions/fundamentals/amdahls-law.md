---
title: Explain Amdahl's Law and why it limits parallel speedup
topics: [concurrency]
roles: [backend, infra]
tags: [amdahls-law, parallelism, speedup, serial-fraction, scaling]
time: 15
updated: 2026-07-27
---

## Question

State Amdahl's Law and use it to calculate the theoretical maximum speedup. Then explain why the serial fraction of a program is so critical, and how Gustafson's Law presents a more optimistic view.

## Answer

**Amdahl's Law:**

If a program has a fraction `p` that can be parallelized (0 ≤ p ≤ 1), the maximum speedup with `N` processors is:

```
Speedup(N) = 1 / ((1 - p) + p/N)
```

As N → ∞: `Speedup_max = 1 / (1 - p)`

```mermaid
xychart-beta
    title "Amdahl's Law: Speedup vs Processors"
    x-axis["1, 2, 4, 8, 16, 32, 64"]
    y-axis "Speedup" 0 --> 20
    line["1, 1.9, 3.5, 6.0, 9.0, 12.0, 14.0"]

```

**Concrete examples:**

| Serial fraction (1-p) | Max speedup (N→∞) |
|---|---|
| 50% | 2× |
| 25% | 4× |
| 10% | 10× |
| 5% | 20× |
| 1% | 100× |

Even if 95% of your code is parallelized, the theoretical max speedup is only 20× — no matter how many CPUs you add.

**Why the serial fraction matters so much:** The 5% serial part becomes the bottleneck. With 64 cores: `1 / (0.05 + 0.95/64) ≈ 17×`. Adding more cores beyond ~20 brings diminishing returns.

**Real-world serial bottlenecks:**
- Global data structure locks (GC pauses, shared counters)
- I/O (single disk, network)
- Sequential initialization and finalization phases
- Dependency chains in algorithms

**Gustafson's Law:** Amdahl's assumes fixed problem size. Gustafson observes that in practice, we scale the *problem size* with more processors. The serial work stays roughly constant while parallel work grows. This gives linear speedup for many scientific computing workloads.

**Design implication:** To scale to many cores, aggressively minimize serial sections. Avoid global locks, use sharding, embrace embarrassingly parallel designs.

## Follow-ups

- A web server handles independent requests — what is its parallel fraction? (Close to 1.0 — each request is independent. Speedup is nearly linear with cores, minus framework overhead.)
- What is "embarrassingly parallel" and give three examples?
- How does Amdahl's Law apply to microservices? (Each service boundary is a serial coordination point.)
