---
title: What is lock striping and how does ConcurrentHashMap use it?
topics: [concurrency]
roles: [backend]
tags: [lock-striping, concurrent-hashmap, java, sharding, scalability]
time: 20
updated: 2026-07-27
---

## Question

Explain lock striping as a technique to reduce lock contention. Describe how Java's `ConcurrentHashMap` uses it (pre-Java 8 segments, Java 8+ bin-level locking), and how it differs from a fully synchronized `HashMap`.

## Answer

**Problem with a single lock:** A `Collections.synchronizedMap(hashMap)` wraps every operation in a single `synchronized` block. Under high concurrency, all threads contend on one lock → serialized access, no parallelism.

**Lock striping:** Divide the protected data structure into N independent segments (stripes), each with its own lock. Operations on different stripes proceed in parallel.

```mermaid
flowchart LR
    subgraph Striped ["ConcurrentHashMap (16 stripes)"]
        S0["Stripe 0\n[lock_0]\nbuckets 0-3"]
        S1["Stripe 1\n[lock_1]\nbuckets 4-7"]
        S2["..."]
        S15["Stripe 15\n[lock_15]\nbuckets 60-63"]
    end
    T1["Thread A\nput key=5"] -->|"hash(5) % 16 = 1"| S1
    T2["Thread B\nput key=12"] -->|"hash(12) % 16 = 4"| S2
    Note["A and B operate on different stripes\n→ no contention!"]




```

**Java 7 `ConcurrentHashMap`:** 16 `Segment` objects, each a mini hash table with its own `ReentrantLock`. Concurrency level = 16.

**Java 8 `ConcurrentHashMap` (redesigned):**
- No `Segment` objects.
- Locking is **per-bucket (bin)**. Only the head node of each bucket chain is `synchronized`.
- Reads are completely lock-free (use volatile + CAS).
- For empty buckets: CAS to insert. For non-empty: `synchronized(head)`.
- When bucket overflows 8 nodes: converts to Red-Black tree (same treeification from HashMap).
- Reduces contention to per-key-hash-bucket granularity — effectively N-way striping where N = number of buckets.

**Operations:**
- `get()`: Lock-free. Read volatile references.
- `put()`: CAS if empty bin; `synchronized(bin_head)` if non-empty.
- `size()`: Approximate using `LongAdder` — avoids contention on a single count.

**`LongAdder` trick:** Instead of one `AtomicLong`, use an array of `Cell`s. Each thread updates a different cell (striped counter). Sum them for total. Reduces contention from O(threads) to O(1) per operation.

## Follow-ups

- Why does `ConcurrentHashMap` not allow null keys or values, while `HashMap` does?
- What is `computeIfAbsent` and how does it atomically handle the check-then-act pattern?
- How does `ConcurrentSkipListMap` differ from `ConcurrentHashMap`?
