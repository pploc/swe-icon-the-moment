---
title: How does garbage collection work in a modern runtime?
topics: [languages]
roles: [backend]
tags: [gc, jvm, golang, memory]
time: 20
updated: 2026-07-26
---

## Question

Compare how the JVM and Go collect garbage. Why are the designs so different,
and when does GC become your production problem?

## Answer

Both are **tracing collectors** (find live objects from roots, reclaim the
rest) but they optimise for different goals:

**JVM (G1/ZGC)** — *generational, compacting*:

- The **weak generational hypothesis**: most objects die young. Allocate in a
  young gen (cheap pointer-bump in TLABs), collect it often, promote
  survivors to the old gen, collect that rarely.
- Compaction moves objects to defragment the heap — which is why the JVM
  needs precise pointer maps and (historically) stop-the-world pauses.
- Modern collectors (ZGC, Shenandoah) do concurrent compaction with colored
  pointers/read barriers and hit sub-millisecond pauses on 100GB+ heaps.

**Go** — *non-generational, non-compacting, concurrent mark & sweep*:

- Optimised for **low latency and simplicity**: tri-color marking runs
  concurrently with the app, with write barriers keeping it correct; pauses
  are typically <1ms.
- No compaction — size-segregated spans limit fragmentation. Escape analysis
  keeps many allocations on the stack entirely.
- The `GOGC` knob trades memory headroom for GC frequency.

**When GC becomes your problem:** allocation-heavy hot paths (fix: reduce
garbage — pooling, `sync.Pool`, streaming instead of buffering), heap sized
too close to the live set (GC runs constantly), and tail-latency spikes from
pauses or from GC stealing CPU at the wrong time. The universal first step is
the same: measure (GC logs, `pprof`, JFR) before tuning flags.

## Follow-ups

- What is a memory leak in a GC'd language? Give two concrete examples. (Growing global map, goroutine leak holding references, unclosed listeners.)
- Why does Go *not* have a generational collector? What did the team argue?
- Reference counting (Python, Swift) vs tracing — trade-offs?
