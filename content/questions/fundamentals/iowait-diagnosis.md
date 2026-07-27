---
title: How do you diagnose high I/O wait on Linux?
topics: [os-linux]
roles: [backend, infra]
tags: [iowait, iostat, iotop, blktrace, disk-io, latency, linux]
time: 20
updated: 2026-07-27
---

## Question

Production server shows high `%iowait` in `top`. Walk through the diagnosis: tools to identify which process, which disk, which file, and whether the issue is throughput or latency. What does high iowait actually mean?

## Answer

**What `%iowait` means:** Percentage of CPU time the CPU was idle *while* at least one I/O request was pending. It's NOT a measure of disk utilization — it measures idle-waiting-for-disk time. High iowait = CPU waiting for disk.

**Step-by-step diagnosis:**

**Step 1 — Identify the disk:**
```bash
iostat -x 1        # extended stats per device
# Key columns:
# %util  — device utilization (100% = saturated)
# await  — average I/O latency (ms)
# r/s    — reads per second
# w/s    — writes per second
```

If `%util > 80%` or `await > 20ms` for HDD (`> 2ms` for SSD) → disk is the problem.

**Step 2 — Identify the process:**
```bash
iotop -o           # show only processes doing I/O
# PID  PRIO  USER  DISK READ  DISK WRITE  SWAPIN IO>  COMMAND
```

**Step 3 — Identify the file:**
```bash
lsof -p <pid>                    # open files of the process
# Or use eBPF:
bpftrace -e 'tracepoint:block:block_rq_issue { printf("%s %d %s\n", comm, pid, args->rwbs); }'
```

**Step 4 — Differentiate read vs write I/O:**
- High reads: cold cache (workload accesses data not in page cache), or sequential scan.
- High writes: bulk insert, WAL writes, checkpoint (database), log files.

**Step 5 — Analyze I/O patterns:**
```bash
blktrace -d /dev/sda -o trace     # record block-level I/O trace
blkparse -i trace -o /dev/stdout  # parse + view
btt -i trace.blktrace.0           # I/O time breakdown: queue time + service time
```

**Common causes:**
- **Swap thrashing:** Memory pressure causing pages to be read from swap.
- **Database checkpoint storm:** Postgres checkpoint writing many dirty pages.
- **Log rotation:** Compressing large log files.
- **Defrag / fsck running.**
- **Missing index:** Full table scan instead of indexed lookup.

**Mitigation strategies:**
- Increase RAM (reduce disk reads).
- Move to SSD/NVMe (lower latency).
- Use `ionice -c 3 -p <pid>` to reduce I/O priority of background jobs.
- Tune `dirty_ratio` / `dirty_background_ratio` for write coalescing.

## Follow-ups

- What is the difference between `iowait` and `await` in iostat?
- How do you check if I/O is the bottleneck vs CPU being the bottleneck?
- What is `blk_mq` (multi-queue block layer) and how does it improve I/O for NVMe?
