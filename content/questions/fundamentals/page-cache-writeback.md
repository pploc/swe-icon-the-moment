---
title: How does Linux memory management work — page cache, dirty pages, and writeback?
topics: [os-linux]
roles: [backend, infra]
tags: [page-cache, dirty-pages, writeback, pdflush, vm, linux-memory]
time: 20
updated: 2026-07-27
---

## Question

Explain the Linux page cache: how file reads/writes flow through it, what "dirty pages" are, how writeback works, and the kernel parameters that control when and how aggressively dirty data is flushed to disk.

## Answer

**Page cache:** A cache of file system data in RAM. All file reads/writes go through the page cache. Reading a file → data loaded into page cache → served from RAM on subsequent reads. Writing → data written to page cache (fast) → kernel eventually writes to disk (writeback).

```mermaid
flowchart LR
    App -->|"read("fd")"| PC["Page Cache\n (kernel memory)"]
    PC -->|"cache hit"| App
    PC -->|"cache miss"| Disk[("Disk")]
    Disk --> PC
    App -->|"write("fd")"| PC
    PC -->|"dirty page"| WB["Writeback\n (kworker)"]
    WB -->|"flush"| Disk




```

**Dirty pages:** Pages modified in the page cache but not yet written to disk. If the system crashes before writeback, data is lost (unless `fsync()` was called).

**Writeback triggers:**
1. **Background writeback** (`/proc/sys/vm/dirty_background_ratio`): When dirty pages exceed this % of total RAM (default 10%), `kworker` threads begin writing in the background.
2. **Throttled writeback** (`/proc/sys/vm/dirty_ratio`): When dirty pages exceed this % (default 20%), processes making writes are throttled (slowed) until writeback catches up.
3. **Age-based writeback** (`/proc/sys/vm/dirty_expire_centisecs`): Pages dirty for more than this time (default 3000 = 30 seconds) are written regardless.
4. **`fsync()`/`msync()`**: Forces immediate writeback of all dirty pages for the given FD.

**Viewing page cache stats:**
```bash
cat /proc/meminfo
# MemTotal:     32 GB
# MemFree:       2 GB
# Buffers:     512 MB  ← block device metadata cache
# Cached:       20 GB  ← file page cache (this is "used" but reclaimable!)
# Dirty:       100 MB  ← not yet written to disk
# Writeback:    10 MB  ← currently being written

free -h   # shows available = MemFree + Buffers + Cached
```

**Tuning for databases:**
- Set `dirty_background_ratio=5` and `dirty_ratio=10` to flush more aggressively.
- Databases do their own I/O management with `O_DIRECT` (bypass page cache) — better control over durability.
- With `O_DIRECT`, page cache is not used — writes go directly to disk; reads bypass cache.

**`drop_caches`** (testing only):
```bash
echo 3 > /proc/sys/vm/drop_caches   # free page cache, dentries, inodes
# Dangerous on production — forces all subsequent reads from disk
```

## Follow-ups

- What is the `Buffers` vs `Cached` distinction in `/proc/meminfo`?
- How does `vm.vfs_cache_pressure` control dentry and inode cache reclaim?
- What happens when a machine with 30GB of dirty pages loses power and there's no UPS?
