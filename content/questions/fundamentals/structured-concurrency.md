---
title: What is structured concurrency and what problem does it solve?
topics: [concurrency]
roles: [backend]
tags: [structured-concurrency, scope, cancellation, java, kotlin, goroutine]
time: 20
updated: 2026-07-27
---

## Question

Explain structured concurrency: what unstructured concurrency's problems are (goroutine leaks, orphaned futures), and how structured concurrency solves them through scope-based lifetime and automatic cancellation propagation.

## Answer

**Problem — unstructured concurrency:**

```java
// Who owns this future? What if the caller returns before it completes?
CompletableFuture<User> userFuture = CompletableFuture.supplyAsync(() -> fetchUser(id));
CompletableFuture<Orders> orderFuture = CompletableFuture.supplyAsync(() -> fetchOrders(id));
// If fetchUser throws, fetchOrders keeps running (leaked task)
// If the request times out, both futures are orphaned in the common pool
```

Problems: goroutine/thread leaks, errors in child tasks lost, no clear ownership, impossible to cancel all children when parent fails.

**Structured concurrency principle:** "A concurrent operation is structured when its lifetime is strictly nested within the lifetime of its parent operation." — analogous to how structured programming (if/while) replaced goto.

```mermaid
flowchart TD
    Parent["Parent Scope\n("request handler")"] --> C1["Child Task 1\n("fetch user")"]
    Parent --> C2["Child Task 2\n("fetch orders")"]
    Parent --> Close["Scope closes:\n1. Wait for all children\n2. Cancel stragglers\n3. Propagate errors"]

```

**Java 21 — StructuredTaskScope:**
```java
try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
    Subtask<User>   user   = scope.fork(() -> fetchUser(id));
    Subtask<Orders> orders = scope.fork(() -> fetchOrders(id));
    scope.join().throwIfFailed();   // waits; cancels others if one fails
    return new Response(user.get(), orders.get());
}   // scope close guarantees all tasks done
```

Variants:
- `ShutdownOnFailure` — cancel all on first failure.
- `ShutdownOnSuccess` — cancel all when first succeeds (race pattern).

**Go — errgroup:**
```go
g, ctx := errgroup.WithContext(parentCtx)
g.Go(func() error { return fetchUser(ctx, id) })
g.Go(func() error { return fetchOrders(ctx, id) })
if err := g.Wait(); err != nil { return err }
// All goroutines completed; context cancelled on first error
```

**Kotlin — coroutineScope:**
```kotlin
coroutineScope {            // structured
    val user   = async { fetchUser(id) }
    val orders = async { fetchOrders(id) }
    Result(user.await(), orders.await())
}   // scope ends only when all children complete
```

**Benefits:**
- No goroutine/thread leaks.
- Errors propagate to parent automatically.
- Cancellation cascades to all children.
- Easier to reason about concurrency lifetime.

## Follow-ups

- How does `errgroup` in Go propagate context cancellation to child goroutines?
- What is the difference between `StructuredTaskScope.ShutdownOnFailure` and `anyOf` in CompletableFuture?
- How does structured concurrency improve observability? (All child spans are nested under parent in distributed tracing.)
