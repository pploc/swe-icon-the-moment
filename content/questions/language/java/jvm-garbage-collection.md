---
title: How does the JVM garbage collector work and how do you tune it?
topics: [java]
roles: [backend, infra]
tags: [jvm, gc, garbage-collector, g1gc, zgc, heap, tuning]
time: 25
updated: 2026-07-27
---

## Question

Explain JVM garbage collection: generational hypothesis, the main collectors (G1GC, ZGC, Shenandoah), GC tuning flags, and how to diagnose GC pressure using GC logs and tools like GCViewer or Grafana.

## Answer

**Generational hypothesis:** Most objects die young. JVM divides heap into generations:

```mermaid
flowchart LR
    subgraph Young["Young Generation"]
        Eden["Eden\n("new allocations")"]
        S1["Survivor 0"]
        S2["Survivor 1"]
    end
    subgraph Old["Old (Tenured)\nGeneration"]
        Tenured["Long-lived objects"]
    end
    Eden -->|"Minor GC"| S1
    S1 -->|"survived N GCs"| Tenured
    Tenured -->|"Major/Full GC"| Tenured

```

**GC types:**
- **Minor GC:** Collects Young Gen. Fast (milliseconds). Frequent.
- **Major/Old GC:** Collects Old Gen. Slower. Triggered when Old Gen is full.
- **Full GC:** Collects entire heap. Causes "stop-the-world" pause. Avoid in production.

**Key collectors:**

| Collector | JDK | Stop-the-world | Best for |
|---|---|---|---|
| **G1GC** (default ≥JDK9) | 9+ | ~100ms | General purpose, balanced throughput+latency |
| **ZGC** | 11+ | <1ms | Low-latency; large heaps (TB scale) |
| **Shenandoah** | 12+ (Red Hat) | <10ms | Low-latency alternative to ZGC |
| **ParallelGC** | Old default | Seconds | Max throughput, batch jobs |
| **SerialGC** | All | Variable | Small apps, microcontainers |

**Essential JVM flags:**
```bash
# Heap sizing
-Xms4g -Xmx4g          # fix heap size (avoid dynamic resizing)
-XX:NewRatio=3          # old:young ratio (3:1 → 75% old, 25% young)
-XX:+UseG1GC            # select G1

# GC logging (JDK 9+)
-Xlog:gc*:file=/var/log/gc.log:time,uptime:filecount=5,filesize=20m

# G1 specific
-XX:MaxGCPauseMillis=200        # target pause (G1 tries to meet this)
-XX:G1HeapRegionSize=16m        # region size (1-32MB)
-XX:G1NewSizePercent=20         # min young gen %

# ZGC
-XX:+UseZGC
-XX:SoftMaxHeapSize=8g          # ZGC soft limit; triggers GC before hard Xmx
```

**Diagnosing GC issues:**
```bash
# Enable verbose GC log
java -Xlog:gc*:file=gc.log:time -jar app.jar

# GC metrics via JMX / Actuator:
curl localhost:8081/actuator/metrics/jvm.gc.pause

# Check GC causes:
grep "GC cause" gc.log | sort | uniq -c | sort -rn
```

**Common GC problems:**
- **Long STW pauses:** Tune `-XX:MaxGCPauseMillis`, switch to ZGC.
- **Frequent GC:** Heap too small (`-Xmx`), or allocation rate too high (check for object churn).
- **`OutOfMemoryError: Java heap space`:** Heap exhausted → memory leak, or heap too small.
- **`OutOfMemoryError: GC overhead limit exceeded`:** >98% time spent in GC → stuck, increase heap or fix leak.

## Follow-ups

- What is "object churn" and how does it cause excessive GC pressure?
- How does ZGC achieve sub-millisecond pauses? (Concurrent marking + load barriers.)
- What is Epsilon GC and when would you use it?
