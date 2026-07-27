---
title: How do you read and analyze a Java thread dump?
topics: [concurrency]
roles: [backend, infra]
tags: [thread-dump, jstack, deadlock, blocked, java, debugging]
time: 20
updated: 2026-07-27
---

## Question

A Java production service is hanging. Walk through how to capture a thread dump, how to read it, and the key patterns to look for: deadlocks, thread contention, blocked threads, and thread pool exhaustion.

## Answer

**Capturing a thread dump:**
```bash
# Method 1: jstack (safe, non-destructive)
jstack <PID> > thread_dump.txt

# Method 2: kill signal (UNIX)
kill -3 <PID>   # sends SIGQUIT, JVM prints dump to stdout

# Method 3: JVM diagnostic command
jcmd <PID> Thread.print

# Method 4: via JMX / VisualVM for live analysis
```

**Thread dump anatomy:**

```
"http-nio-8080-exec-5" #42 daemon prio=5 os_prio=0 tid=0x... nid=0x1a23
    java.lang.Thread.State: BLOCKED (on object monitor)
        at com.example.OrderService.process(OrderService.java:87)
        - waiting to lock <0x000000076b3d1e68> (a com.example.Cache)
        at com.example.OrderService.handleRequest(OrderService.java:45)
        ...
"http-nio-8080-exec-3" #40 daemon prio=5 os_prio=0 tid=0x...
    java.lang.Thread.State: BLOCKED (on object monitor)
        at com.example.Cache.get(Cache.java:23)
        - locked <0x000000076b3d1e68>     ← holds the lock the above waits for
```

**Thread states:**

| State | Meaning |
|---|---|
| `RUNNABLE` | Running or ready (may include I/O wait) |
| `BLOCKED` | Waiting for a monitor lock (`synchronized`) |
| `WAITING` | `Object.wait()`, `LockSupport.park()` |
| `TIMED_WAITING` | `sleep()`, `wait(timeout)`, `park(timeout)` |
| `TERMINATED` | Done |

**Deadlock detection:** JVM automatically detects `BLOCKED` deadlocks and prints a "Found one Java-level deadlock" section at the end. Look for circular "waiting to lock" / "locked" relationships.

**Key patterns to look for:**

1. **All threads BLOCKED on same lock** → hot contention, lock needs to be broken up (striping, redesign).
2. **Thread pool all WAITING** → queue is empty (consumers outpacing producers) or starvation.
3. **Thread pool all RUNNABLE** → CPU-bound or spinning.
4. **Thread pool all TIMED_WAITING** → normal idle state for thread pool workers.
5. **Few threads BLOCKED on DB/network** → slow external dependency.

**Tools for analysis:**
- **FastThread.io** — online thread dump analyzer with visualization.
- **VisualVM** → Threads tab → Thread Dump.
- **IBM Thread Analyzer** for IBM JVMs.

## Follow-ups

- How does `jstack` differ from a heap dump (`jmap`)? When do you use each?
- What does it mean when a thread is `RUNNABLE` but consuming 0% CPU? (Blocked in a native call that the JVM classifies as RUNNABLE — e.g., `recv()` inside a `SocketInputStream`.)
- How do you correlate a Java thread with an OS-level `top` output? (Use `nid` hex in thread dump = TID in `top -H -p <pid>`.)
