---
title: What is thread interruption in Java and how do you handle it correctly?
topics: [concurrency]
roles: [backend]
tags: [thread-interruption, interrupt, interrupted-exception, java, cancellation]
time: 15
updated: 2026-07-27
---

## Question

Explain Java's thread interruption mechanism: what `interrupt()` does, why `InterruptedException` must not be silently swallowed, and the correct pattern for cooperative cancellation.

## Answer

**Interruption is a cooperative signal:** `thread.interrupt()` sets the interrupted flag on the target thread. It does NOT stop the thread. The thread must check and respond.

**What happens when interrupt() is called:**

1. If the thread is sleeping (`Thread.sleep`), waiting (`Object.wait`, `Condition.await`, `BlockingQueue.take`): an `InterruptedException` is thrown, and the **interrupted flag is cleared**.
2. If the thread is running normally: only the interrupted flag is set. Thread continues running until it checks.
3. If the thread is blocked in I/O (`java.io` streams): behavior is unspecified — use `java.nio` channels which throw `ClosedByInterruptException`.

**Checking the interrupt flag:**
```java
// Polling the flag:
while (!Thread.currentThread().isInterrupted()) {
    doWork();
}

// interruptted() vs isInterrupted():
Thread.interrupted()                  // static, clears the flag
Thread.currentThread().isInterrupted() // instance, does NOT clear flag
```

**Correct handling of InterruptedException:**

**Option 1 — Restore the interrupt flag and propagate:**
```java
try {
    Thread.sleep(1000);
} catch (InterruptedException e) {
    Thread.currentThread().interrupt();  // restore flag
    throw new RuntimeException("Interrupted", e);  // or return
}
```

**Option 2 — Propagate InterruptedException up the call stack (cleanest):**
```java
void doWork() throws InterruptedException {
    queue.take();  // let InterruptedException propagate
}
```

**What NOT to do:**
```java
try {
    queue.take();
} catch (InterruptedException e) {
    // swallowing — WRONG! Caller loses the cancellation signal
    log.error("Interrupted", e);
}
```

**Correct cancellation pattern:**
```java
class Worker implements Runnable {
    public void run() {
        while (!Thread.currentThread().isInterrupted()) {
            try {
                Item item = queue.take();  // throws IE if interrupted
                process(item);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;  // exit loop
            }
        }
        cleanup();
    }
}
// To cancel: worker.interrupt()
```

## Follow-ups

- How does `Future.cancel(true)` use interruption?
- How does Java's `ExecutorService.shutdownNow()` use interruption to stop running tasks?
- Compare Java interruption to Go's context cancellation — which is safer and why?
