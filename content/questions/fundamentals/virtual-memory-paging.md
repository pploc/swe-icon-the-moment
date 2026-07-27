---
title: How does virtual memory work — paging, page tables, and TLB?
topics: [os-linux]
roles: [backend, infra]
tags: [virtual-memory, paging, page-table, tlb, mmu, demand-paging]
time: 25
updated: 2026-07-27
---

## Question

Explain virtual memory: why it exists, how the MMU and page tables translate virtual to physical addresses, what a page fault is, and how the TLB speeds things up. Where does the overhead come from?

## Answer

**Why virtual memory:**
- **Isolation:** Process A cannot access Process B's memory — each has its own virtual address space.
- **Larger-than-RAM programs:** Demand paging loads pages only when accessed.
- **Simplified allocation:** Processes see a flat 0..N address space; fragmented physical memory is hidden.

**Page table translation:**

On x86-64, virtual addresses are 48-bit (Linux uses 4-level page tables, ARM64 supports 5-level):

```mermaid
flowchart LR
    VA["Virtual Address\n48 bits"] --> L4["PGD index\n9 bits"]
    L4 --> L3["PUD index\n9 bits"]
    L3 --> L2["PMD index\n9 bits"]
    L2 --> L1["PTE index\n9 bits"]
    L1 --> Offset["Page offset\n12 bits("4KB pages")"]
    L1 -->|"physical page frame"| PA["Physical Address"]

```

Each level is a 4KB table of 512 8-byte entries. Full translation: 4 memory accesses + the final access = 5 total. Without TLB: memory is 5x slower for every access.

**TLB (Translation Lookaside Buffer):** CPU-side cache of recent virtual→physical translations. On TLB hit: translation in 1-2 cycles. On TLB miss: hardware page table walk (4 levels).

**Page fault:** CPU accesses a virtual address with no valid PTE → hardware raises a page fault exception → kernel's fault handler:
1. **Valid fault (minor):** Page is in memory but not mapped (CoW, demand alloc) → allocate/map, resume.
2. **Valid fault (major):** Page is swapped out → read from swap → map → resume.
3. **Invalid fault:** Segmentation fault (SIGSEGV) — address not in any VMA.

**Memory overhead of page tables:** A full 4-level page table for a 48-bit address space could be 512GB of tables. In practice, only the used portions are allocated (sparse trees). A typical process has megabytes of page tables.

**Huge pages:** Instead of 4KB pages, use 2MB (or 1GB) pages. Fewer TLB entries needed, fewer page fault handlers, less page table memory. TLB coverage increases 512x per entry. Used for databases (Postgres `huge_pages`), JVM heap, Redis.

```bash
# Check huge page allocation
cat /proc/meminfo | grep HugePages
# Enable transparent huge pages
echo always > /sys/kernel/mm/transparent_hugepage/enabled
```

## Follow-ups

- What is a TLB shootdown and when does it happen? (When page table entries change — e.g., munmap — the kernel must invalidate TLB entries on all CPUs that may have cached the translation.)
- What is a "minor page fault" vs a "major page fault"? How does `perf stat` show them?
- How does ASLR use virtual memory to randomize address layouts for security?
