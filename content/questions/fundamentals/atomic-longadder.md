---
title: What is an atomic variable and when do you use AtomicLong vs LongAdder?
topics: [concurrency]
roles: [backend]
tags: [atomic, longadder, atomiclong, cas, contention, java]
time: 15
updated: 2026-07-27
---

## Question

Explain Java's atomic variable classes. When does `AtomicLong` fall short under high contention, and how does `LongAdder` solve it? What is the tradeoff?

## Answer

**`AtomicLong`:** Uses CAS on a single memory location. Under high contention (many threads incrementing), all threads fight over the same cache line. CAS retries spin — O(n²) total CAS attempts for n threads.

**`LongAdder` (Java 8+):** Uses a `Cell[]` array. Each thread hashes to a different `Cell` and updates it. The true sum is computed by summing all cells on `sum()`.

```mermaid
flowchart LR
    subgraph AtomicLong
        T1["Thread 1"] -->|CAS| AL["Single long\n100% contention"]
        T2["Thread 2"] -->|CAS retry| AL
        T3["Thread 3"] -->|CAS retry| AL
    end
    subgraph LongAdder
        T4["Thread 4"] -->|update| C1["Cell 0"]
        T5["Thread 5"] -->|update| C2["Cell 1"]
        T6["Thread 6"] -->|update| C3["Cell 2"]
        C1 & C2 & C3 -->|sum()| Total
    end

```

**`LongAdder` operation:**
- Initial: uses a single `base` long (like `AtomicLong`).
- On contention: allocates `Cell[]` (power of 2 size). Each thread probes a cell using its thread-hash. CAS the cell; on failure, try another cell or grow array.
- `sum()` = `base` + sum of all cells. NOT an atomic snapshot — sum may be stale under concurrent updates.
- `reset()` sets all cells to 0.
- `sumThenReset()` = `sum()` + `reset()` in one pass.

**When to use each:**

| Need | Use |
|---|---|
| Accurate current value at any time | `AtomicLong` |
| High-throughput counter (metrics, stats) | `LongAdder` |
| CAS-based algorithms (compareAndSet needed) | `AtomicLong` |
| Approximate sum across many writers | `LongAdder` |

**`DoubleAdder` / `LongAccumulator`:** Generalization — `LongAccumulator` accepts any binary accumulation function (max, min, product).

**`ConcurrentHashMap.size()`** uses `LongAdder` internally — explains why `size()` may be approximate under concurrent modifications.

## Follow-ups

- Why does `LongAdder.sum()` not guarantee a consistent snapshot?
- How does the Striped64 superclass (shared by `LongAdder` and `LongAccumulator`) work?
- When would you use `DoubleAdder` for a floating-point counter?
