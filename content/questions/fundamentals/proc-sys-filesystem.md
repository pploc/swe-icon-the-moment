---
title: How do you use /proc and /sys to inspect the Linux kernel at runtime?
topics: [os-linux]
roles: [backend, infra]
tags: [proc, sysfs, kernel, debug, runtime, monitoring]
time: 20
updated: 2026-07-27
---

## Question

Walk through the most useful `/proc` and `/sys` paths for understanding system state, diagnosing problems, and tuning the kernel — without requiring a reboot.

## Answer

**`/proc` — process and system information (virtual filesystem):**

**Per-process (`/proc/<pid>/`):**
```bash
/proc/<pid>/status      # state, memory (VmRSS, VmSwap), threads, UID, caps
/proc/<pid>/maps        # virtual memory areas (VMAs) with permissions
/proc/<pid>/smaps       # detailed memory per VMA: PSS, dirty pages
/proc/<pid>/fd/         # symlinks to all open file descriptors
/proc/<pid>/fdinfo/     # FD flags, position
/proc/<pid>/cmdline     # full command line (null-separated)
/proc/<pid>/environ     # environment variables
/proc/<pid>/io          # I/O stats: read_bytes, write_bytes
/proc/<pid>/net/tcp     # open TCP connections (hex encoded)
/proc/<pid>/stack       # kernel stack trace (debugging D-state)
/proc/<pid>/limits      # resource limits (ulimit values)
/proc/<pid>/oom_score   # OOM kill likelihood
```

**System-wide (`/proc/`):**
```bash
/proc/meminfo           # RAM, swap, buffers, cache, huge pages
/proc/cpuinfo           # CPU model, MHz, cache, flags
/proc/stat              # CPU time per core (user, sys, idle, iowait)
/proc/net/sockstat      # socket statistics (TCP_ALLOC, orphan sockets)
/proc/loadavg           # 1, 5, 15 minute load averages
/proc/interrupts        # interrupt counts per CPU per IRQ
/proc/softirqs          # software interrupt counts
/proc/diskstats         # per-device I/O: reads, writes, ms spent
/proc/slabinfo          # kernel slab allocator usage
/proc/sys/              # tunable kernel parameters (same as sysctl)
```

**`/sys` (sysfs) — kernel object model:**
```bash
/sys/block/sda/queue/scheduler       # I/O scheduler (mq-deadline, none)
/sys/block/sda/queue/read_ahead_kb   # readahead size
/sys/devices/system/cpu/cpu0/cpufreq/# CPU frequency scaling
/sys/kernel/mm/transparent_hugepage/ # THP settings
/sys/fs/cgroup/                      # cgroup v2 hierarchy
```

**Practical examples:**
```bash
# Find which process holds a port
cat /proc/net/tcp | awk '$4 == "0A" {print $7}'  # port 10 hex = listening sockets

# Check page cache hit/miss ratio
awk '/Buffers|Cached/ {print}' /proc/meminfo

# Live I/O wait per disk
while true; do awk '/sda/ {print $4, $8}' /proc/diskstats; sleep 1; done

# Check open FD count per process
for pid in /proc/[0-9]*; do echo "$pid: $(ls $pid/fd 2>/dev/null | wc -l)"; done | sort -t: -k2 -n | tail
```

## Follow-ups

- How does `top` calculate CPU percentage — what does it read from `/proc`?
- What is `/proc/sys/net/ipv4/tcp_fin_timeout` and when would you tune it?
- How does `procfs` differ from a real filesystem — where is the data stored?
