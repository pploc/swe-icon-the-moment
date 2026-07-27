---
title: How does the Linux I/O scheduler work and when does it matter?
topics: [os-linux]
roles: [backend, infra]
tags: [io-scheduler, blk-mq, deadline, noop, cfq, nvme, disk]
time: 15
updated: 2026-07-27
---

## Question

Explain the Linux block I/O scheduler: the difference between legacy single-queue and modern multi-queue (`blk-mq`), the available schedulers (None, mq-deadline, BFQ, Kyber), and when you should switch from the default.

## Answer

**What the I/O scheduler does:** Sits between the filesystem and block device driver. Reorders, merges, and prioritizes I/O requests to improve throughput and latency.

**Legacy single-queue schedulers (old kernels):**
- **CFQ (Completely Fair Queuing):** Per-process queues; fair time allocation. Good for desktop/mixed workloads. Default before kernel 5.0.
- **Deadline:** Ensures all requests complete within a deadline. Good for databases.
- **Noop:** No reordering — simple FIFO. Good for SSDs (random access is fast, no benefit from reordering).

**Multi-queue (`blk-mq`) — modern (kernel 5.0+):**

```mermaid
flowchart LR
    SW["Software Queues\n(per-CPU)"] --> HW["Hardware Dispatch Queues\n(per NVMe queue)"]
    HW --> SSD["NVMe SSD\n(multiple queues)"]


```

Modern NVMe SSDs support 64+ hardware queues — one per CPU core. The old single-queue model was a bottleneck. `blk-mq` maps software queues to hardware queues for true parallelism.

**Modern schedulers (`blk-mq` era):**

| Scheduler | Use case |
|---|---|
| `none` (noop) | NVMe SSDs — no reordering needed, HW handles it |
| `mq-deadline` | General SSD, databases needing deadline guarantees |
| `bfq` | Desktop — proportional-share, best for mixed interactive+background |
| `kyber` | Low-latency workloads, fast SSDs |

**Check and set scheduler:**
```bash
cat /sys/block/sda/queue/scheduler
# [mq-deadline] none bfq

# Change for this session:
echo none > /sys/block/nvme0n1/queue/scheduler

# Persist (udev rule):
echo 'ACTION=="add|change", KERNEL=="nvme[0-9]n[0-9]", ATTR{queue/scheduler}="none"' \
  > /etc/udev/rules.d/60-ioscheduler.rules
```

**When to change:**
- NVMe SSD: `none` — no benefit from reordering; reduce overhead.
- SATA SSD: `mq-deadline` — minor benefit from merging; deadline provides fairness.
- HDD: `mq-deadline` or `bfq` — reordering reduces head seek time.
- Database server: `deadline` or `none` — predictable latency over throughput.

## Follow-ups

- What is "I/O merging" and how does it reduce device driver overhead?
- How does the deadline scheduler guarantee request latency and prevent starvation?
- How do you check the I/O queue depth and inflight requests for a disk?
