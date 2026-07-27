---
title: How do Kotlin coroutines work and how do they differ from threads and Java's async?
topics: [concurrency]
roles: [backend]
tags: [kotlin, coroutines, suspend, dispatcher, structured-concurrency]
time: 25
updated: 2026-07-27
---

## Question

Explain Kotlin coroutines: how `suspend` functions compile, what dispatchers do, the scope/cancellation model (structured concurrency), and how they compare to Java threads, CompletableFuture, and Go goroutines.

## Answer

**What a `suspend` function is:**

`suspend` marks a function that can be paused without blocking a thread. The Kotlin compiler transforms it into a state machine with a `Continuation` parameter — essentially a callback that the coroutine runtime calls when resuming.

```kotlin
// What you write:
suspend fun fetchUser(id: Int): User {
    val data = httpClient.get(url)   // suspend point
    return parseUser(data)
}

// Compiler transforms to (simplified):
fun fetchUser(id: Int, continuation: Continuation<User>): Any {
    return when (continuation.state) {
        0 -> { httpClient.get(url, continuation) }  // suspend, register callback
        1 -> parseUser(continuation.result)         // resume
    }
}
```

**Dispatchers — which thread pool runs the coroutine:**

| Dispatcher | Use case |
|---|---|
| `Dispatchers.Main` | UI thread (Android/Compose) |
| `Dispatchers.IO` | Blocking I/O, DB calls (elastic thread pool) |
| `Dispatchers.Default` | CPU-bound (fixed = num CPUs) |
| `Dispatchers.Unconfined` | No specific thread, inherits current |

```kotlin
// Switch context mid-coroutine:
withContext(Dispatchers.IO) {
    db.query(...)       // runs on IO thread pool
}
// Back to original dispatcher after block
```

**Structured concurrency:**
```kotlin
coroutineScope {            // creates a scope
    val userDeferred = async { fetchUser(id) }
    val ordersDeferred = async { fetchOrders(id) }
    val user = userDeferred.await()
    val orders = ordersDeferred.await()
    // scope finishes when BOTH complete
    // If one fails → other is cancelled → scope throws
}
```

Scopes ensure no coroutine outlives its parent. Cancellation propagates automatically.

**Comparison:**

| | Kotlin Coroutines | Java Threads | Java CompletableFuture | Go Goroutines |
|---|---|---|---|---|
| Weight | Very light (100-200B) | Heavy (1MB stack) | None (future wrapper) | Light (2KB) |
| Code style | Sequential | Sequential | Callback chains | Sequential |
| Cancellation | Structured | `interrupt()` | Manual | Context |
| Parallelism | Via dispatchers | Yes | Via executor | GOMAXPROCS |

**`launch` vs `async`:**
- `launch` → fire-and-forget, returns `Job`.
- `async` → returns `Deferred<T>`, must call `.await()` to get result.

**Flow (cold streams):** `Flow<T>` is Kotlin's coroutine-native reactive stream. Cold (doesn't run until collected). Supports backpressure via suspension.

## Follow-ups

- What is a `CoroutineScope` and why should you avoid `GlobalScope`?
- How does coroutine cancellation work under the hood? (Throws `CancellationException` at the next suspension point.)
- Compare Kotlin `Flow` to Java's `Flux` (Project Reactor).
