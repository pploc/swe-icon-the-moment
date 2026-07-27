---
title: How do you detect and fix a goroutine leak in Go?
topics: [concurrency]
roles: [backend]
tags: [goroutine-leak, go, context, channel, goleak, pprof]
time: 20
updated: 2026-07-27
---

## Question

Explain what a goroutine leak is, the most common causes, how to detect them in production (pprof, goleak), and the patterns that prevent them.

## Answer

**Goroutine leak:** A goroutine that was started but never terminates — blocked indefinitely on a channel send/receive or waiting for a lock that will never be released. Over time, leaks accumulate, consuming memory and CPU scheduler overhead.

**Common causes:**

1. **Blocked channel send (no receiver):**
```go
ch := make(chan int)  // unbuffered
go func() {
    ch <- result      // blocks forever if nobody reads ch
}()
// caller returns; goroutine stuck
```

2. **Blocked channel receive (no sender):**
```go
go func() {
    v := <-ch         // blocks if ch is never written to or closed
    process(v)
}()
```

3. **Missing context cancellation:**
```go
go func() {
    for {
        select {
        case <-time.After(1 * time.Second):
            doWork()
        // No ctx.Done() case → leaks when parent returns
        }
    }
}()
```

**Detection:**

```bash
# pprof goroutine endpoint
curl http://localhost:6060/debug/pprof/goroutine?debug=1

# Shows count and stack trace of all goroutines
# Look for: goroutines blocked on channel operations with growing count
```

**goleak (testing):**
```go
func TestHandler(t *testing.T) {
    defer goleak.VerifyNone(t)  // fails test if goroutines leak
    // ... run test code ...
}
```

**Prevention patterns:**

**1. Always pass context:**
```go
go func(ctx context.Context) {
    select {
    case result := <-work:
        process(result)
    case <-ctx.Done():
        return   // goroutine exits when context cancelled
    }
}(ctx)
```

**2. Use buffered channels for fire-and-forget:**
```go
ch := make(chan int, 1)  // buffer=1: goroutine never blocks on send
go func() { ch <- compute() }()
```

**3. WaitGroup with defer:**
```go
var wg sync.WaitGroup
for _, item := range items {
    wg.Add(1)
    go func(i Item) {
        defer wg.Done()
        process(i)
    }(item)
}
wg.Wait()   // guarantees all goroutines finish
```

**4. Timeout on goroutine operations:**
```go
select {
case v := <-ch:
    use(v)
case <-time.After(5 * time.Second):
    log.Error("timed out")
}
```

## Follow-ups

- How does `runtime.NumGoroutine()` help in monitoring goroutine counts?
- Why is `time.After` itself a subtle leak in loops? (Creates a new timer/channel per iteration; use `time.NewTimer` + `Reset`.)
- How does the `goleak` library work internally?
