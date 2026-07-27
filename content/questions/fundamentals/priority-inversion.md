---
title: What is priority inversion and how is it solved?
topics: [concurrency]
roles: [backend, infra]
tags: [priority-inversion, priority-inheritance, real-time, mutex, scheduling]
time: 15
updated: 2026-07-27
---

## Question

Explain priority inversion: what causes it, why it's dangerous (the Mars Pathfinder incident), and the two solutions — priority inheritance and priority ceiling.

## Answer

**Priority inversion:** A high-priority task is blocked waiting for a resource held by a low-priority task, while a medium-priority task preempts the low-priority task — effectively, the medium task runs instead of the high-priority one.

```mermaid
sequenceDiagram
    participant H as High Priority Task
    participant M as Medium Priority Task
    participant L as Low Priority Task
    participant Lock as Mutex
    L->>Lock: acquire()
    H->>Lock: try acquire() — blocked!
    Note over H: Blocked waiting for Lock
    M->>M: preempts L (higher priority)
    Note over M,L: M runs; L can't release Lock; H stays blocked
    Note over H: High priority task starved by Medium!
```

**Real incident — Mars Pathfinder (1997):** A high-priority meteorological task shared a mutex with a low-priority data task. A medium-priority communications task starved the low-priority task, causing the high-priority task to miss its deadline, triggering a system reset. Fixed by enabling priority inheritance on the mutex.

**Solution 1 — Priority Inheritance:**
When a high-priority task blocks on a mutex held by a lower-priority task, the low-priority task temporarily inherits the high-priority task's priority. This lets it preempt medium tasks and release the lock quickly.

```
Low task (prio=1) holds lock → High task (prio=10) waits
→ Low task promoted to prio=10
→ Low task preempts Medium (prio=5)
→ Low finishes, releases lock, reverts to prio=1
→ High task runs
```

**Solution 2 — Priority Ceiling Protocol:**
Each mutex has a ceiling priority = maximum priority of any task that will ever lock it. A task locking the mutex is promoted to the ceiling priority immediately (before contention). Prevents inversion entirely. More predictable but requires knowing priorities statically.

**In practice:**
- POSIX `PTHREAD_PRIO_INHERIT` attribute enables priority inheritance on mutexes.
- Linux real-time (PREEMPT_RT) supports priority inheritance.
- Java's `synchronized` does NOT support priority inheritance — potential issue for real-time Java.
- Use `ReentrantLock` with care in real-time systems; prefer purpose-built RTOS primitives.

## Follow-ups

- Priority inheritance can cause a "chained blocking" — explain the scenario.
- Why does Java's `synchronized` not implement priority inheritance?
- How does the Priority Ceiling Protocol prevent deadlock?
