---
title: How do journaling filesystems work (ext4, XFS)?
topics: [os-linux]
roles: [backend, infra]
tags: [journaling, ext4, xfs, fsync, crash-consistency, write-barrier]
time: 20
updated: 2026-07-27
---

## Question

Explain journaling in ext4 and XFS: what consistency problem it solves, the three journaling modes (writeback, ordered, journal), how `fsync()` relates to durability, and when to use which mode.

## Answer

**The problem — torn writes:**

A non-journaling filesystem (ext2) may leave the filesystem in an inconsistent state after a crash:
```
Allocate inode ✓  →  Update directory entry ✓  →  CRASH before writing data blocks
```
On reboot: directory points to inode with no data blocks → corrupted file. `fsck` must scan entire filesystem to repair (minutes for large disks).

**Journaling solution:** Write changes to a dedicated journal (circular log) first. Once the journal entry is committed (flushed to disk), apply changes to the actual filesystem. On crash: replay the journal on mount → consistent state in seconds.

**Three journaling modes:**

| Mode | What's journaled | Performance | Safety |
|---|---|---|---|
| `writeback` | Metadata only; data writes unordered | Fastest | File data may be stale/corrupt after crash |
| `ordered` (default ext4) | Metadata only; data written before metadata | Good | File data up to date at crash point |
| `journal` | Both metadata and data | Slowest | Strongest guarantee |

**`data=ordered` (ext4 default):**
1. Write file data blocks.
2. Commit journal (metadata).
3. Update actual filesystem.

On crash: data blocks are written before the metadata journal commit → file either has old data or new data, but inode is consistent.

**`fsync()` and `fdatasync()`:**
```c
write(fd, data, len);      // write to page cache (not durable)
fsync(fd);                 // flush data + metadata to disk (durable)
fdatasync(fd);             // flush data only; skip metadata if size unchanged
```
Without `fsync()`, data sits in the page cache and may be lost on crash. Most databases call `fsync()` on commit. `O_DIRECT | O_SYNC` — bypass cache and write directly to disk.

**Write barriers:** Ensure journal commit is on disk before subsequent writes. Needed for correctness with drive write cache. `barrier=1` (ext4 default) uses disk cache flush commands.

**XFS vs ext4:**
- XFS uses metadata-only journaling + delayed allocation (batch allocations). Faster for large files and parallel I/O. Better at large-scale. No `data=journal` mode.

## Follow-ups

- What is "delayed allocation" in ext4 and XFS and how does it improve performance?
- How does PostgreSQL use `fsync()` and `fdatasync()` for WAL durability?
- What is the risk of `O_DIRECT` writes in terms of alignment requirements?
