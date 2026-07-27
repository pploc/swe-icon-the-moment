---
title: What is dmesg and how do you use it for kernel-level debugging?
topics: [os-linux]
roles: [backend, infra]
tags: [dmesg, kernel-log, hardware-error, oom, mce, linux, debugging]
time: 15
updated: 2026-07-27
---

## Question

Explain the kernel ring buffer and `dmesg`: what types of messages are logged, how to diagnose hardware errors (MCE, disk errors, OOM kills), and how to configure persistent kernel logging.

## Answer

**`dmesg` / kernel ring buffer:**
The kernel maintains a circular ring buffer (`printk` messages). Fixed size (default 512KB on most systems, can be larger with `CONFIG_LOG_BUF_SHIFT`). Oldest messages are overwritten when full.

```bash
dmesg                          # print ring buffer
dmesg -H                       # human readable timestamps, colors
dmesg -T                       # human-readable absolute timestamps
dmesg -l err,crit,alert,emerg  # filter by level
dmesg -w                       # follow (like tail -f)
dmesg | grep -i error
dmesg | grep -i 'out of memory'  # OOM kills
```

**Message levels (0=emerg, 7=debug):**
```
0 KERN_EMERG   — system unusable
1 KERN_ALERT   — action required
2 KERN_CRIT    — critical condition
3 KERN_ERR     — error (disk errors, hardware faults)
4 KERN_WARNING — warnings (driver issues)
5 KERN_NOTICE  — normal but significant
6 KERN_INFO    — informational (device init, mounts)
7 KERN_DEBUG   — debug
```

**Common diagnostic patterns:**

**OOM kill:**
```
[123456.789] Out of memory: Kill process 4567 (java) score 850 or sacrifice child
[123456.790] Killed process 4567 (java) total-vm:8392300kB, rss:7234560kB
```

**Disk errors (potential disk failure):**
```
[234567.890] blk_update_request: I/O error, dev sda, sector 1234567890
[234567.891] EXT4-fs error (device sda1): ext4_find_entry:...
```

**Hardware MCE (Machine Check Exception) — CPU/memory error:**
```
[345678.901] mce: [Hardware Error]: CPU 0: Machine Check Exception: 5 Bank 4: ...
[345678.902] mce: [Hardware Error]: RIP !INEXACT! 10:<ffffffff811234> {do_something+0x3f}
```
→ Possible bad RAM. Check with `mcelog` or `edac_mc_ctl`.

**Persistent kernel logging:**
```bash
# journald persists kernel messages:
journalctl -k              # kernel messages (from journal)
journalctl -k -b -1        # kernel messages from last boot (crash analysis!)

# rsyslog can write kern.* to /var/log/kern.log
```

**Adjusting ring buffer size:**
```bash
# Kernel config option: CONFIG_LOG_BUF_SHIFT
# Runtime (needs root):
dmesg -S                   # check current size
# Or set at boot: log_buf_len=8M in kernel cmdline
```

## Follow-ups

- What is `kdump` and how does it capture a kernel crash dump (vmcore)?
- How do you decode a kernel oops/panic to find the faulting source line?
- What is `mcelog` and how does it handle Machine Check Exceptions?
