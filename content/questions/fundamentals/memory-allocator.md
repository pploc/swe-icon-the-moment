---
title: How does the glibc memory allocator (ptmalloc) work?
topics: [os-linux]
roles: [backend, infra]
tags: [malloc, ptmalloc, jemalloc, tcmalloc, heap-fragmentation, allocator]
time: 20
updated: 2026-07-27
---

## Question

Explain how `ptmalloc2` (glibc malloc) manages heap memory: arenas, bins, and the difference between `brk()` and `mmap()` allocations. When does heap fragmentation occur, and why do jemalloc and tcmalloc outperform ptmalloc for multi-threaded workloads?

## Answer

**ptmalloc2 (glibc default allocator):**

**Arenas:** Multiple heap regions. Main arena uses `brk()`. Secondary arenas use `mmap()` (one per thread, up to `MALLOC_ARENA_MAX` = 2×cores). Reduces contention — each arena has its own lock.

**Bins (free chunk organization):**

| Bin type | Size | Notes |
|---|---|---|
| Fast bins | ≤ 160B | LIFO, no coalescing, ultra-fast |
| Small bins | ≤ 512B | Doubly-linked list, FIFO |
| Large bins | > 512B | Sorted by size |
| Unsorted bin | Any | Short-lived staging area |

**Allocation path:**
```
malloc(size):
1. Check fast bin (exact match) → return directly (O(1))
2. Check small bins → exact match → return
3. Check unsorted bin → exact or split match
4. Check large bins → best-fit
5. Request more memory (brk() or mmap())
```

**`brk()` vs `mmap()` allocation:**
- Small allocations (< 128KB default): `brk()` — extend heap via `sbrk()`. Fast. Memory returned to OS only when all higher-address chunks are free.
- Large allocations (≥ `MMAP_THRESHOLD` = 128KB): `mmap(MAP_ANONYMOUS)` — each allocation is its own mmap. Returned to OS on free. No fragmentation but higher syscall cost.

**Heap fragmentation:**
```
Allocate: [A=32B][B=64B][C=32B][D=128B]
Free B:   [A=32B][FREE 64B][C=32B][D=128B]
malloc(100): Cannot use the 64B hole → requests new memory
Result: "heap fragmentation" — free memory but unusable
```

**`jemalloc` (used by Firefox, Redis):**
- Per-size-class slab allocators.
- Thread-local caches (tcaches) → near-zero contention.
- Better fragmentation characteristics via extent-based allocation.
- Redis ships its own jemalloc for memory efficiency.

**`tcmalloc` (used by Google, gperftools):**
- Thread-local free lists (no locking for small allocations).
- Central heap for overflow.
- Excellent multi-threaded performance.
- Built-in heap profiler.

```bash
# Override allocator at runtime
LD_PRELOAD=/usr/lib/libjemalloc.so ./program
LD_PRELOAD=/usr/lib/libgperftools.so ./program
```

## Follow-ups

- What causes glibc `malloc_trim()` to return memory to the OS?
- How does the `MALLOC_MMAP_THRESHOLD_` environment variable affect allocator behavior?
- How do you detect memory fragmentation and heap growth in a Java (off-heap) or C++ application?
