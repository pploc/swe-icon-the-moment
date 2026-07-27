---
title: How does ForkJoinPool work and what is work stealing?
topics: [concurrency]
roles: [backend]
tags: [fork-join, work-stealing, parallel-streams, forkjoin, divide-conquer]
time: 20
updated: 2026-07-27
---

## Question

Explain the ForkJoinPool (Java) and the work-stealing algorithm that makes it efficient for recursive divide-and-conquer workloads. How does it differ from a standard thread pool?

## Answer

**Standard thread pool problem:** All tasks go to a single shared queue. Under high parallelism, this queue becomes a contention bottleneck.

**ForkJoinPool:** Each worker thread has its **own double-ended queue (deque)**. The thread pushes and pops its own tasks from one end. Other threads steal from the opposite end when idle.

```mermaid
flowchart TD
    subgraph T1 ["Thread 1 (owner)"]
        D1["Deque: [A, B, C, D"] ← push/pop here"]
    end
    subgraph T2 ["Thread 2 (stealer)"]
        D2["Deque: ["] → steal from T1's tail"]
    end
    T2 -->|"steal D("tail")"| D1
    T1 -->|"push/pop from head"| D1



```

**Work-stealing advantages:**
- Minimal contention: each thread mostly operates on its own deque (no shared lock).
- Natural load balancing: idle threads steal from busy ones.
- Locality: a thread processes its own sub-tasks (temporal locality in cache).

**Fork-join programming model:**

```java
class SumTask extends RecursiveTask<Long> {
    int[] arr; int lo, hi;
    
    protected Long compute() {
        if (hi - lo < THRESHOLD) {
            // Base case: compute directly
            return sumSequential(arr, lo, hi);
        }
        int mid = (lo + hi) / 2;
        SumTask left  = new SumTask(arr, lo, mid);
        SumTask right = new SumTask(arr, mid, hi);
        left.fork();                    // push to deque, may be stolen
        long rightResult = right.compute();  // compute right inline
        long leftResult  = left.join();      // wait for left
        return leftResult + rightResult;
    }
}
ForkJoinPool.commonPool().invoke(new SumTask(arr, 0, arr.length));
```

**Why `right.compute()` inline?** Avoids pushing right task to deque, then stealing it back. Keep the most recent task on the thread.

**Java 8 parallel streams** use `ForkJoinPool.commonPool()` internally. `Arrays.parallelSort()` uses it. Stream parallelism is only beneficial when: operations are CPU-bound, independent, and dataset is large (overhead < benefit).

**When NOT to use ForkJoinPool:** I/O-bound tasks (threads block, waste pool capacity). Use a standard thread pool for I/O. Also avoid for tasks with high variance in size — work stealing helps but uneven tasks are harder to balance.

## Follow-ups

- Why does `right.compute()` before `left.join()` give better performance than `left.fork(); right.fork(); join both`?
- How does Java's `CompletableFuture` relate to ForkJoinPool?
- What pool size should you use for ForkJoinPool with CPU-bound tasks?
