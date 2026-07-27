---
title: What is a happens-before violation and how do you find one?
topics: [concurrency]
roles: [backend]
tags: [happens-before, data-race, race-detector, tsan, jmm, debugging]
time: 20
updated: 2026-07-27
---

## Question

Give three concrete examples of happens-before violations in Java and Go, explain why each is a bug even if it "works most of the time," and describe how dynamic race detectors find them.

## Answer

**Example 1 — Java: unsynchronized initialization flag:**
```java
boolean ready = false;
String data = null;

// Thread A:
data = "hello";    // write data
ready = true;      // write ready (no volatile!)

// Thread B:
if (ready) {
    System.out.println(data.length());  // may see ready=true, data=null → NPE
}
```
No HB edge between A's writes and B's reads. The JIT/CPU can reorder A's writes (data may publish after ready). Fix: make `ready` volatile.

**Example 2 — Go: goroutine started after write:**
```go
var msg string
go func() {
    fmt.Println(msg)  // may print empty string
}()
msg = "hello"  // write happens after goroutine start — NO HB
```
Go's memory model: `go f()` HB f() starts, but the write to `msg` after the `go` statement doesn't HB the goroutine's read. Fix: write `msg` before `go`, or use a channel.

**Example 3 — Java: counter without synchronization:**
```java
int counter = 0;
// Thread A: counter++;
// Thread B: counter++;
// Expected: 2. Actual: may be 1 (lost update)
```
Read-modify-write is not atomic. HB violation — both reads may see 0. Fix: `AtomicInteger` or `synchronized`.

**Why it "works most of the time":** Cache coherence protocols eventually propagate writes. On x86 (strongly ordered), reorderings are rare. Under light load or in development (low concurrency), races don't manifest. Under high concurrency or on ARM (weakly ordered), they do.

**How race detectors work:**

**ThreadSanitizer (TSan):** Instruments every memory access at compile time. Maintains a "shadow memory" per 8-byte word — records which thread last wrote/read and the lock state. At runtime, checks if concurrent accesses conflict without a HB edge. Reports the exact stack traces of both conflicting accesses.

**Java race detector (jcstress, ThreadSanitizer via JNI):** Similar shadow-memory approach.

**Go race detector (`-race`):** Same TSan-based approach. Reports exact goroutine stacks and timing.

**Cost:** ~5-20x runtime overhead. Enable in CI, disable in production.

## Follow-ups

- What is the difference between what TSan detects (data races) and what you care about (race conditions)?
- TSan reports a race on `int x` — but x is only 4 bytes. Why is a torn read still a bug?
- How does TSan handle C++ `std::atomic<T>` accesses?
