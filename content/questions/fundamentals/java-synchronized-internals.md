---
title: How does Java's synchronized keyword work under the hood?
topics: [concurrency]
roles: [backend]
tags: [synchronized, monitor, biased-locking, jvm, intrinsic-lock]
time: 20
updated: 2026-07-27
---

## Question

Explain how Java's `synchronized` is implemented: the object monitor, the JVM lock escalation path (biased → thin → fat/inflated), and how this compares to explicit `ReentrantLock`.

## Answer

**Object monitor:** Every Java object has an associated `ObjectMonitor`. `synchronized(obj)` acquires this intrinsic lock.

**Lock escalation (JVM optimization):**

```mermaid
flowchart TD
    A["Thread accesses synchronized block"] --> B{"First access?"}
    B -- yes --> C["Biased Lock\n("mark word stores thread ID")\nZero CAS on subsequent entries"]
    C --> D{Contention?}
    D -- yes --> E["Revoke bias\nThin Lock("CAS on mark word")"]
    E --> F{"Still contention?"}
    F -- yes --> G["Inflate to Fat Lock\n(ObjectMonitor)\nOS mutex, threads park/unpark"]
    F -- no --> E
    D -- no --> C

```

**Three lock states:**

1. **Biased lock (single thread):** JVM bets the lock is only used by one thread. Stores thread ID in object header (mark word). No CAS on re-entry — just a pointer comparison. Excellent for uncontested locks. Revoked when a second thread appears (safepoint pause required). *Note: Disabled by default in Java 15+.*

2. **Thin lock (CAS):** Two threads compete. JVM uses CAS on the mark word to swap in a lock record. Fast path if CAS succeeds. Spins briefly on failure.

3. **Fat lock / inflated (ObjectMonitor):** Sustained contention. JVM inflates to a full ObjectMonitor backed by OS primitives (mutex + condition variable). Threads `park()` (blocked, not spinning). Expensive but correct for high contention.

**`synchronized` vs `ReentrantLock`:**

| Feature | `synchronized` | `ReentrantLock` |
|---|---|---|
| Lock/unlock | Automatic (JVM) | Manual (`lock()`/`unlock()`) |
| Reentrancy | ✓ | ✓ |
| Fairness | ✗ | ✓ (optional) |
| Timed lock | ✗ | ✓ `tryLock(timeout)` |
| Multiple conditions | 1 (`wait`/`notify`) | N (`newCondition()`) |
| Lock interruptibly | ✗ | ✓ `lockInterruptibly()` |
| JIT optimization | Better (JVM knows) | Less (opaque) |

**When to prefer `synchronized`:**
- Simple cases where fairness/timeout not needed.
- JIT can elide (lock elision) or coarsen `synchronized` blocks when it proves thread confinement.

**When to prefer `ReentrantLock`:**
- Need timed/interruptible lock attempts.
- Need multiple condition variables.
- Need fair ordering.

## Follow-ups

- What is lock elision and lock coarsening in the JIT?
- How does Java's `StampedLock` differ from `ReentrantReadWriteLock`?
- What is a "safepoint" in the JVM and why does biased lock revocation require one?
