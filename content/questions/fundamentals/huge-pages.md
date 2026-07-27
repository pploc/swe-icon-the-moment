---
title: What are huge pages and how do they improve performance?
topics: [os-linux]
roles: [backend, infra]
tags: [huge-pages, thp, tlb, mmu, database, jvm, linux]
time: 20
updated: 2026-07-27
---

## Question

Explain Linux huge pages: why small 4KB pages create TLB pressure for large workloads, how 2MB and 1GB huge pages help, and the difference between explicit (`HugeTLBFS`) and transparent huge pages (THP) — including THP's problematic side effects.

## Answer

**TLB pressure with 4KB pages:**

A process with a 4GB working set needs 1,048,576 page table entries. The L1 TLB typically holds 64 entries — 99.99% miss rate. Each TLB miss triggers a page table walk (4 memory accesses on x86-64). Memory-intensive workloads spend 10-30% of time on TLB misses.

**Huge pages solution:**
- 2MB pages: TLB covers 512x more address space per entry.
- 1GB pages: 262,144x more. 4GB = just 4 TLB entries.
- Fewer page table levels needed → fewer memory accesses per walk.

**Explicit huge pages (HugeTLBFS):**
```bash
# Reserve 512 huge pages (512 × 2MB = 1GB reserved)
echo 512 > /proc/sys/vm/nr_hugepages

# Application uses them:
mmap(NULL, size, PROT_READ|PROT_WRITE,
     MAP_PRIVATE|MAP_ANONYMOUS|MAP_HUGETLB, -1, 0);
```
Reserved upfront — kernel can always satisfy the allocation. Used by: Oracle DB, PostgreSQL (`huge_pages=on`), Java JVM heap.

**Transparent Huge Pages (THP):**
Kernel automatically promotes adjacent 4KB pages into 2MB pages for anonymous memory. No application changes needed.

```bash
cat /sys/kernel/mm/transparent_hugepage/enabled
# always [madvise] never
```

**THP problems:**
- **Compaction stalls:** To create a 2MB contiguous block, kernel must move many 4KB pages → CPU stall spikes (milliseconds of latency).
- **CoW amplification:** A write to one byte of a 2MB page → copy entire 2MB page (vs 4KB for regular pages) → 512x more memory during CoW.
- **Redis, MongoDB, Cassandra recommendation:** `echo never > /sys/kernel/mm/transparent_hugepage/enabled` — THP causes latency spikes.

**Best practice by workload:**

| Workload | Recommendation |
|---|---|
| Large database (Oracle, PG) | Explicit huge pages (2MB or 1GB) |
| JVM applications | `-XX:+UseHugeTLBFS` with reserved huge pages |
| Redis / in-memory cache | Disable THP (always) |
| General purpose | THP = madvise (only where requested) |

## Follow-ups

- How does `madvise(MADV_HUGEPAGE)` request THP for a specific memory region?
- What is "huge page fragmentation" and why is it worse after system uptime?
- How do 1GB huge pages differ from 2MB in terms of allocation requirements?
