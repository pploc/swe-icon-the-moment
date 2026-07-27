---
title: What is thread-local storage and when is it appropriate?
topics: [concurrency]
roles: [backend]
tags: [thread-local, tls, java, go, context, per-thread]
time: 15
updated: 2026-07-27
---

## Question

Explain thread-local storage: the mechanism, use cases, and pitfalls — especially around thread pools and virtual threads.

## Answer

**Thread-local storage (TLS):** Each thread has its own copy of a variable — reads and writes are isolated to the current thread with no synchronization needed.

**Java `ThreadLocal<T>`:**
```java
ThreadLocal<SimpleDateFormat> fmt =
    ThreadLocal.withInitial(() -> new SimpleDateFormat("yyyy-MM-dd"));

// In any thread:
fmt.get().format(date);  // each thread gets its own instance
```

**Why `SimpleDateFormat`?** It's not thread-safe (mutable internal state). Creating one per call is expensive. TLS gives each thread its own instance — no synchronization, no object creation per call.

**Implementation:** The `Thread` object holds a `ThreadLocalMap<ThreadLocal<?>, Object>` — a hash map keyed by the `ThreadLocal` object itself. O(1) access, zero contention.

**Use cases:**
- Per-thread expensive objects (connections, formatters, random number generators).
- Request-scoped context (user ID, trace ID, transaction context) in frameworks like Spring (`SecurityContextHolder`, `TransactionSynchronizationManager`).
- Avoiding passing context through every method call.

**Pitfalls:**

1. **Thread pool reuse:** Threads in a pool are reused across requests. If you don't call `remove()`, the previous request's context leaks into the next.
   ```java
   try {
       threadLocal.set(userContext);
       // handle request
   } finally {
       threadLocal.remove();  // MUST clean up
   }
   ```

2. **Memory leaks:** `ThreadLocalMap` uses weak keys (the `ThreadLocal` reference) but strong values. If the `ThreadLocal` goes out of scope but the thread lives on (thread pool), the value is never GC'd.

3. **Virtual threads (Java 21):** Virtual threads are created per task, not reused → TLS is scoped naturally to the task. But if you create millions of virtual threads, millions of TLS copies exist simultaneously. Prefer `ScopedValue` (JEP 429) for virtual thread contexts.

**Go equivalent:** No built-in TLS. Go discourages per-goroutine state (goroutines are cheap, created/destroyed freely). Use `context.Context` to pass request-scoped values explicitly.

## Follow-ups

- How does Spring's `RequestContextHolder` use `ThreadLocal`?
- What is `InheritableThreadLocal` and when would a child thread need the parent's TLS?
- Explain Java 21's `ScopedValue` as the structured replacement for `ThreadLocal`.
