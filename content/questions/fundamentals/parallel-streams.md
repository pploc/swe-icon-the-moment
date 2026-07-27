---
title: How do you use Java parallel streams correctly and when should you avoid them?
topics: [concurrency]
roles: [backend]
tags: [parallel-streams, java, fork-join, thread-safety, spliterator]
time: 20
updated: 2026-07-27
---

## Question

Explain how Java parallel streams work, what operations are safe, when they provide speedup, and the common mistakes that lead to incorrect results or worse performance than sequential streams.

## Answer

**How parallel streams work:**

`stream.parallel()` or `Collection.parallelStream()` splits the source using a `Spliterator`, forks subtasks to `ForkJoinPool.commonPool()`, and merges results.

```mermaid
flowchart TD
    Source["List("1M elements")"] --> Split["Spliterator splits\ninto chunks"]
    Split --> T1["Worker 1\nprocess 0-250k"]
    Split --> T2["Worker 2\nprocess 250k-500k"]
    Split --> T3["Worker 3\nprocess 500k-750k"]
    Split --> T4["Worker 4\nprocess 750k-1M"]
    T1 & T2 & T3 & T4 --> Merge["Combine results"]

```

**When parallel streams help:**
- Large datasets (>10k elements) with CPU-bound operations.
- Operations are independent (no shared mutable state).
- Reduction operations (`sum`, `collect`, `reduce`) are associative.
- The source splits efficiently (arrays, `ArrayList` → excellent; `LinkedList` → poor).

**Common mistakes:**

**1. Shared mutable state:**
```java
// BROKEN — race condition
List<Integer> results = new ArrayList<>();
stream.parallel().forEach(x -> results.add(x));  // ArrayList not thread-safe!

// CORRECT
List<Integer> results = stream.parallel().collect(Collectors.toList());
```

**2. Stateful lambdas (order-dependent):**
```java
// BROKEN — output order non-deterministic
stream.parallel().forEach(System.out::println);

// CORRECT if order matters
stream.parallel().forEachOrdered(System.out::println);  // slower
```

**3. Blocking operations (I/O):**
```java
// WRONG — blocks ForkJoinPool threads, starves other tasks
stream.parallel().map(url -> httpClient.get(url)).collect(...)
// Use CompletableFuture + custom executor for I/O-bound work
```

**4. Small datasets:**
Parallel overhead (splitting, task submission, merging) > sequential computation benefit for small N. Benchmark; don't assume.

**5. Non-associative operations:**
`reduce((a,b) -> a - b)` is not associative → parallel gives wrong result.

**Configuring the thread pool:**
```java
// Use a custom pool to avoid starving the common pool
ForkJoinPool pool = new ForkJoinPool(4);
pool.submit(() -> stream.parallel().map(fn).collect(...)).get();
```

**Good use case:** Matrix multiplication, image processing, sorting large datasets, bulk CSV processing.

## Follow-ups

- How does `Spliterator` decide how to split the source? What makes `ArrayList` better than `LinkedList`?
- What is the `SIZED`, `ORDERED`, `DISTINCT` characteristic on a Spliterator?
- How would you benchmark a parallel stream vs sequential to decide which to use?
