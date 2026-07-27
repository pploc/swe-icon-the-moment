---
title: How do you use strace and perf to diagnose Linux performance problems?
topics: [os-linux]
roles: [backend, infra]
tags: [strace, perf, ltrace, profiling, tracing, linux, performance]
time: 20
updated: 2026-07-27
---

## Question

Walk through using `strace` and `perf` for production diagnosis: what each tool does, how to interpret their output, and typical findings from real performance investigations.

## Answer

**`strace` — system call tracer:**

Intercepts every syscall using `ptrace`. Shows name, arguments, return value, and timing.

```bash
# Trace a running process
strace -p <pid> -f   # -f follows forks

# Trace with timing
strace -T -p <pid>    # -T: time per syscall

# Count syscalls (statistics mode — lowest overhead)
strace -c ./program
# Output:
# % time     seconds  usecs/call     calls    errors syscall
# 23.45      0.001234         12       100           write
# 15.20      0.000800         40        20         2 open

# Filter specific syscalls
strace -e trace=read,write,open ./program

# Track file activity
strace -e trace=file ./program
```

**Typical findings with strace:**
- Application calling `stat()` on every request (cache miss? slow filesystem?).
- `futex` calls with long waits → lock contention.
- `poll`/`epoll_wait` with timeout=0 → busy-polling (CPU waste).
- Many small `write()` calls (should buffer and batch).

**`strace` overhead: 3-10x slowdown.** Do not use in production with `-p` on hot paths without `-c` stats mode.

**`perf` — Linux performance profiler:**

Based on hardware performance counters and kernel tracepoints. Near-zero overhead.

```bash
# CPU flame graph (record 30s)
perf record -g -p <pid> -- sleep 30
perf report --stdio --no-children

# Count events
perf stat -e cycles,instructions,cache-misses,context-switches ./program

# Trace specific events
perf trace -e syscalls:sys_enter_write -p <pid>

# Top-like CPU hotspots
perf top -p <pid>
```

**Flamegraph with perf:**
```bash
perf record -g ./program
perf script | stackcollapse-perf.pl | flamegraph.pl > out.svg
```

**`perf stat` sample output:**
```
10,234,567,890  cycles                    # 3.2 GHz
 8,456,789,012  instructions              # 0.83 IPC (low — memory bound?)
     2,345,678  cache-misses              # 5% miss rate
         1,234  context-switches
```

**`ltrace`** — library call tracer (like strace but for library calls, e.g., `malloc`, `printf`).

**`/proc/pid/syscall`** — currently executing syscall for a running/blocked process.

## Follow-ups

- How do you generate a flamegraph from Java (async-profiler → perf output)?
- What is `perf probe` and how do you trace arbitrary kernel/user functions?
- Why does `strace` show 100% overhead but `perf` does not?
