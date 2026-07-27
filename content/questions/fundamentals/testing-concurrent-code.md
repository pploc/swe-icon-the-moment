---
title: How do you test concurrent code correctly?
topics: [concurrency]
roles: [backend]
tags: [testing, concurrency, race-detector, stress-test, jcstress, thread-weaver]
time: 20
updated: 2026-07-27
---

## Question

Concurrent bugs are notoriously hard to reproduce. Walk through the strategies for testing concurrent code: race detectors, stress testing, model-based testing, and tools like jcstress for Java and `-race` for Go.

## Answer

**Challenge:** Concurrency bugs are timing-dependent. A test that passes 1000 times may fail on the 1001st run under different scheduling. Traditional unit tests rarely expose races.

**Strategy 1 — Race detectors (dynamic analysis):**

*Go:* `go test -race ./...` — instruments every memory access, checks for concurrent conflicting accesses. Catches real races, but only those executed during the test run.

*Java:* ThreadSanitizer (for C/C++ codebases via JNI), or use `jcstress`.

**Strategy 2 — Stress testing:**

Run the concurrent code in tight loops with many threads. Increase the probability of exposing races:
```java
@Test
void stressTestCounter() throws Exception {
    AtomicInteger counter = new AtomicInteger(0);
    int THREADS = 100, OPS = 1000;
    ExecutorService pool = Executors.newFixedThreadPool(THREADS);
    List<Future<?>> futures = new ArrayList<>();
    for (int i = 0; i < THREADS; i++)
        futures.add(pool.submit(() -> {
            for (int j = 0; j < OPS; j++) counter.incrementAndGet();
        }));
    for (Future<?> f : futures) f.get();
    pool.shutdown();
    assertEquals(THREADS * OPS, counter.get());
}
```

**Strategy 3 — jcstress (Java Concurrency Stress Tests):**

Framework for writing systematic concurrency tests. Defines "actors" (threads) and "arbiters" (result checkers). The tool runs millions of interleavings:
```java
@JCStressTest
@Outcome(id = "0, 0", expect = FORBIDDEN)  // both see 0? impossible
@Outcome(id = "1, 1", expect = ACCEPTABLE) // both see each other's write
@State public class SeqCstTest {
    int x, y;
    @Actor void actor1(II_Result r) { x = 1; r.r1 = y; }
    @Actor void actor2(II_Result r) { y = 1; r.r2 = x; }
}
```

**Strategy 4 — Formal verification / model checking:**
- **TLA+** — specify the algorithm, let the model checker enumerate all states.
- **Alloy** — relational model checker.
- Used at Amazon (AWS services verified with TLA+), Microsoft (Azure protocols).

**Strategy 5 — Isolating concurrent code:**
- Push concurrency to infrastructure (queues, databases), keep business logic single-threaded.
- Use actor model — each actor is single-threaded; test actors in isolation.
- Use immutable data — nothing to race on.

**Detecting deadlocks in tests:** Timeout the test (`@Test(timeout=5000)`). If it hangs → likely deadlock.

## Follow-ups

- What is the difference between a data race and a race condition, and which does the Go race detector catch?
- How does `jcstress` enumerate interleavings? Does it cover all possible orderings?
- How would you test a lock-free data structure for correctness under concurrent access?
