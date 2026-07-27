---
title: How do you implement a thread-safe lazy initialization pattern?
topics: [concurrency]
roles: [backend]
tags: [lazy-initialization, supplier, memoize, once, thread-safe, java, go]
time: 15
updated: 2026-07-27
---

## Question

Beyond Singleton, lazy initialization is a general pattern. Implement a generic thread-safe `Lazy<T>` supplier in Java and Go, and explain the edge cases around exception handling and reference visibility.

## Answer

**Java — using `Supplier` + `volatile` DCL:**
```java
public class Lazy<T> implements Supplier<T> {
    private final Supplier<T> initializer;
    private volatile T value;

    public Lazy(Supplier<T> initializer) {
        this.initializer = initializer;
    }

    @Override
    public T get() {
        T result = value;                        // read volatile once
        if (result == null) {
            synchronized (this) {
                result = value;
                if (result == null) {
                    value = result = initializer.get();
                }
            }
        }
        return result;
    }
}
```

**Why read `value` into `result` first?** Avoids reading a volatile twice on the happy path (volatile reads have a small cost). Local `result` is used for the null check and return.

**Exception handling:** If `initializer.get()` throws, `value` remains null → next caller retries initialization. Decide: retry on exception (above) or cache the exception (wrap in a `Throwable` holder and rethrow).

**Java — using `AtomicReference.updateAndGet` (lock-free but may call supplier multiple times):**
```java
AtomicReference<T> ref = new AtomicReference<>();
public T get() {
    return ref.updateAndGet(v -> v != null ? v : initializer.get());
}
// WARNING: initializer may be called multiple times if CAS races
// Only safe if initializer is idempotent and cheap
```

**Go — using `sync.Once`:**
```go
type Lazy[T any] struct {
    once  sync.Once
    value T
}

func (l *Lazy[T]) Get(init func() T) T {
    l.once.Do(func() {
        l.value = init()
    })
    return l.value
}
```
`sync.Once` guarantees exactly-once execution even under concurrent access. If `init` panics, the `Once` is considered done — subsequent calls return the zero value (or panic again if you want retry-on-panic, use a custom `Once`).

**Go `sync.Once` memory model:** The completion of `once.Do(f)` happens-before any `once.Do` call returns — ensures `l.value` is visible to all goroutines.

## Follow-ups

- How would you implement a `Lazy<T>` that retries initialization on failure?
- What is the difference between `sync.Once` and `atomic.Pointer` for lazy initialization in Go?
- How does Spring's `@Lazy` annotation implement lazy bean initialization?
