---
title: What is the happens-before relation in Go's memory model?
topics: [concurrency]
roles: [backend]
tags: [go, memory-model, happens-before, channel, sync, goroutine]
time: 20
updated: 2026-07-27
---

## Question

Explain Go's memory model: the happens-before guarantees for channel operations, sync primitives, and goroutine creation/completion. Give a concrete example where a race exists because a happens-before edge is missing.

## Answer

**Go memory model (2022 revision):** Defines when one goroutine is guaranteed to observe the effects of another. Without a happens-before edge, the value a goroutine reads is undefined (may be stale, zero, or any past value).

**Established happens-before edges:**

| Operation | Happens-before |
|---|---|
| `go f()` | f() starts executing |
| Channel send on unbuffered ch | Corresponding receive completes |
| Channel receive on unbuffered ch | Send that satisfied it completes |
| `ch <- v` on buffered (cap n) | The nth receive from ch |
| `close(ch)` | Receive that returns zero due to close |
| `sync.Mutex.Unlock()` | Any subsequent `Lock()` |
| `sync.WaitGroup.Done()` | `Wait()` returns |
| `once.Do(f)` returns | f() completes |

**Example — race (no HB edge):**
```go
var x int
go func() { x = 1 }()   // goroutine A writes x
fmt.Println(x)           // main goroutine reads x — NO HB edge → race
```
The goroutine write may not be visible to main. Go race detector flags this.

**Fix with channel:**
```go
var x int
done := make(chan struct{})
go func() {
    x = 1
    done <- struct{}{}   // send HB→ receive
}()
<-done                   // receive sees all writes before send
fmt.Println(x)           // safe: x=1 guaranteed
```

**Fix with WaitGroup:**
```go
var x int
var wg sync.WaitGroup
wg.Add(1)
go func() {
    x = 1
    wg.Done()   // Done() HB→ Wait() returns
}()
wg.Wait()
fmt.Println(x)  // safe
```

**Buffered channel nuance:**
```go
ch := make(chan int, 1)
ch <- 1   // does NOT HB the receive on buffered channels (for cap=1)
// The nth *receive* HB the nth+cap *send* — used for semaphore patterns
```

**Go race detector:** `go run -race ./...` — instruments all memory accesses, reports data races. Essential for CI. ~5-10x slowdown, use in testing not production.

## Follow-ups

- How does Go's `sync/atomic` provide memory ordering guarantees?
- What is the "happens-before" relationship established by `once.Do(f)`?
- Why is passing a pointer to a goroutine a common source of data races?
