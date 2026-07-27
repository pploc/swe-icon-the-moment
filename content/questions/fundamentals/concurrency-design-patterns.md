---
title: What patterns help write correct concurrent code from the start?
topics: [concurrency]
roles: [backend]
tags: [design-patterns, concurrency, confinement, immutability, message-passing]
time: 20
updated: 2026-07-27
---

## Question

Rather than retrofitting synchronization, what architectural patterns make concurrent code correct by design? Describe confinement, immutability, copy-on-write, message passing, and event sourcing as concurrency strategies.

## Answer

**The golden rule:** The fewer shared mutable variables, the fewer races. Design to eliminate sharing first; synchronize as a last resort.

**Pattern 1 — Thread confinement:**
Assign data exclusively to one thread. No sharing → no races.
```java
// Per-thread database connection — only that thread uses it
static ThreadLocal<Connection> conn = ThreadLocal.withInitial(DB::connect);
```
*Where used:* Servlet containers (one thread per request), actor model (each actor owns its state), Redis (single-threaded event loop).

**Pattern 2 — Immutability:**
Share freely; never write. Value objects, records, frozen configs after startup.
```java
record Config(int timeout, String host) {} // immutable, share everywhere
```

**Pattern 3 — Copy-on-write:**
Writers make a full copy, update it, and atomically swap the reference. Readers always see a consistent snapshot.
```java
CopyOnWriteArrayList<Handler> handlers = new CopyOnWriteArrayList<>();
// Reads: no lock, very fast
// Writes: copy + swap, expensive — OK for rarely-written lists
```

**Pattern 4 — Message passing (channels/queues):**
Threads communicate by passing messages; each thread processes its mailbox serially.
```go
// Goroutines communicate via channels; no shared state
requestCh <- Request{userId: 123}
resp := <-responseCh
```
*Where used:* Go (channels), Erlang/Akka (actors), Kafka (distributed message passing).

**Pattern 5 — Single-writer principle:**
Only one goroutine/thread writes to a particular piece of state; others read via immutable snapshots or message-based queries.

**Pattern 6 — Event sourcing:**
State is the result of replaying immutable events. Events are appended to a log (single writer). No concurrent mutation — only append.
```mermaid
flowchart LR
    Cmd[Command] --> Handler[Handler\n(single writer)]
    Handler --> Log[(Event Log\nimmutable append)]
    Log --> View1[Read Model 1]
    Log --> View2[Read Model 2]
```

**Decision hierarchy:**
1. Avoid sharing: confinement or immutability.
2. If sharing necessary: message passing.
3. If shared mutable state unavoidable: minimize scope, use concurrency primitives correctly.
4. Synchronize only after profiling shows you need to.

## Follow-ups

- How does the "share memory by communicating" principle in Go manifest in practice?
- What is the "ownership" model in Rust and how does it prevent data races at compile time?
- How does Redux (frontend state management) apply the single-writer principle?
