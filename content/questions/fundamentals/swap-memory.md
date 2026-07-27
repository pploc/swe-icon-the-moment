---
title: How does swap space work and what is swappiness?
topics: [os-linux]
roles: [backend, infra]
tags: [swap, swappiness, memory, paging, zswap, memory-pressure]
time: 15
updated: 2026-07-27
---

## Question

Explain swap: how the kernel decides which pages to swap out, what swappiness controls, the performance impact of swap, and the debate about disabling swap for production database/cache servers.

## Answer

**What swap is:** Disk space (swap partition or file) used as overflow memory. When RAM is full, the kernel evicts cold memory pages to swap, freeing RAM for active pages.

**Two types of pages swapped:**
1. **Anonymous pages:** Heap, stack data with no backing file. Must go to swap to be evicted.
2. **File-backed pages:** Page cache (file reads/writes). Can be evicted by simply discarding (file on disk is the backing store). No swap needed.

**Swappiness (`vm.swappiness`, 0-200):**
Controls the kernel's tendency to swap out anonymous memory vs reclaim file-backed page cache:
- `swappiness=0`: Strongly prefer reclaiming page cache; only swap under extreme pressure.
- `swappiness=60` (default): Balance.
- `swappiness=200`: Aggressively swap even if page cache is available.

```bash
cat /proc/sys/vm/swappiness        # current value
sysctl -w vm.swappiness=10         # set for current session
echo "vm.swappiness=10" >> /etc/sysctl.conf  # persist
```

**LRU (Least Recently Used) eviction:** Kernel maintains an active list and inactive list of pages. Pages move from active to inactive when not accessed; inactive pages are eviction candidates. `kswapd` daemon handles reclamation when free memory falls below thresholds.

**Performance impact of swap:**
- Accessing a swapped-out page: disk read → 1-10ms latency vs ~100ns for RAM.
- Swap causes latency spikes ("swap storms") — all processes slow down.
- With NVMe SSDs, swap is faster but still 100-1000x slower than RAM.

**Databases/caches (Redis, Postgres) debate:**
- **Disable swap:** Predictable latency — never degrade silently; OOM kill is preferable to slow swap.
- **Keep swap:** Allows graceful handling of occasional memory spikes; prevents OOM kills.
- **Recommended (Redis):** `vm.swappiness=0` and disable swap entirely for cache nodes. `vm.overcommit_memory=1` for Redis background save.

**zswap:** Compressed swap cache — compresses evicted pages in RAM before writing to disk. Often eliminates disk swap entirely by 2-3x compression. Better than no swap, better than disk swap.

## Follow-ups

- What is the difference between `kswapd` (background reclaim) and direct reclaim (in the allocation path)?
- How does `zram` (compressed RAM block device) differ from `zswap`?
- How do you see how much swap a specific process is using? (`/proc/<pid>/status`: VmSwap field.)
