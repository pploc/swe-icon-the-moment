---
title: What is the StampedLock in Java and how does optimistic reading work?
topics: [concurrency]
roles: [backend]
tags: [stampedlock, java, optimistic-read, rwlock, lock, stamp]
time: 20
updated: 2026-07-27
---

## Question

Explain Java's `StampedLock`: how it improves on `ReadWriteLock`, what an optimistic read is and how you validate it, and the pitfalls of using `StampedLock` compared to `ReentrantReadWriteLock`.

## Answer

**Problem with `ReentrantReadWriteLock`:** Under heavy read load, writers can be starved (readers block writers). Also, every read must acquire the read lock — still involves CAS operations.

**`StampedLock` (Java 8+):** Three modes:
1. **Write lock** — exclusive, like a normal write lock.
2. **Read lock** — shared, like `ReadWriteLock` read lock.
3. **Optimistic read** — lock-free read with validation. The key innovation.

**Optimistic read pattern:**
```java
StampedLock lock = new StampedLock();
double x, y;

// Optimistic read:
long stamp = lock.tryOptimisticRead();   // returns non-zero stamp; no lock acquired
double currentX = x;                     // read fields
double currentY = y;
if (!lock.validate(stamp)) {             // check: did any write happen?
    // Optimistic failed — fall back to real read lock
    stamp = lock.readLock();
    try {
        currentX = x;
        currentY = y;
    } finally {
        lock.unlockRead(stamp);
    }
}
// Use currentX, currentY
```

**How validation works:** `tryOptimisticRead()` returns the current stamp (a version counter). `validate(stamp)` returns true if no write has occurred since the stamp was taken — O(1) check, no lock acquired. If a write happened, stamp changes → validate fails.

**Performance:** Optimistic reads avoid all lock acquisition under read-heavy, write-rare workloads. Even with occasional validation failures, the common path has no contention.

**Pitfalls:**

1. **Not reentrant:** A thread holding a `StampedLock` write lock cannot re-acquire it — deadlock. `ReentrantReadWriteLock` is reentrant.
2. **No condition variables:** `StampedLock` doesn't support `Condition`. Use `ReentrantLock` if you need `await()`/`signal()`.
3. **Validation window:** Between `tryOptimisticRead()` and `validate()`, reads may see torn values. Fields read must be copied to locals and only used after validation.
4. **Interruption:** Write lock is not interruptible (unlike `ReentrantLock.lockInterruptibly()`).
5. **Non-fair:** Can starve writers under extreme read load.

**When to use `StampedLock`:** Frequently-read data structure where writes are rare (configuration, spatial index). The optimistic path eliminates read-lock overhead under normal conditions.

## Follow-ups

- How does `StampedLock`'s stamp mechanism prevent the ABA problem in validation?
- Can you convert a `StampedLock` optimistic read to a write lock atomically?
- Benchmark `ReadWriteLock` vs `StampedLock` for a read-heavy cache — what ratio of reads vs writes makes `StampedLock` worth it?
