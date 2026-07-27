---
title: What is a core dump and how do you analyze one?
topics: [os-linux]
roles: [backend, infra]
tags: [core-dump, gdb, coredumpctl, SIGSEGV, debugging, crash-analysis]
time: 20
updated: 2026-07-27
---

## Question

Explain core dumps: what triggers them, how to configure the kernel to capture them, and how to use `gdb` or `coredumpctl` to identify the root cause of a crash.

## Answer

**What is a core dump:** A snapshot of a process's memory, registers, and thread state at the moment of crash. Written to disk when a process is killed by certain signals.

**Signals that generate core dumps by default:**
`SIGSEGV` (segfault), `SIGABRT` (abort), `SIGBUS` (bus error), `SIGFPE` (floating-point error), `SIGILL` (illegal instruction), `SIGQUIT`.

**Enabling core dumps:**
```bash
# 1. Set ulimit to allow core dumps
ulimit -c unlimited     # session
# Or in systemd:
[Service]
LimitCORE=infinity

# 2. Set core pattern (where to write)
cat /proc/sys/kernel/core_pattern
# Default: 'core' (current directory)

# Set to systemd-coredump (recommended):
echo "|/usr/lib/systemd/systemd-coredump %P %u %g %s %t %c %h" \
  > /proc/sys/kernel/core_pattern

# Or write to /tmp with PID:
echo "/tmp/core.%e.%p.%t" > /proc/sys/kernel/core_pattern
```

**Pattern variables:** `%e` = executable name, `%p` = PID, `%t` = timestamp.

**Analyzing with `gdb`:**
```bash
gdb /path/to/binary /path/to/corefile

# Inside gdb:
(gdb) bt              # backtrace — full call stack at crash
(gdb) thread apply all bt  # all thread stacks
(gdb) info registers  # CPU register values
(gdb) x/20x $rsp      # examine stack memory
(gdb) list            # show source code at crash location
(gdb) info locals     # local variable values
(gdb) p variable_name # print a variable
```

**`coredumpctl` (systemd):**
```bash
coredumpctl list                     # list all captured core dumps
coredumpctl debug <pid>              # open in gdb automatically
coredumpctl info <pid>               # show metadata, signal, etc.
coredumpctl dump <pid> -o /tmp/core  # export core dump
```

**Typical crash investigation:**
```
Program received signal SIGSEGV, Segmentation fault.
#0  0x00007f... in process_request (req=0x0) at server.c:142
#1  0x00007f... in handle_connection (conn=...) at server.c:89

→ req is NULL at line 142 — null pointer dereference
→ Look at how req is passed from handle_connection
```

**Stripped binaries:** Production binaries often lack debug symbols. Solutions:
- Keep separate `.debug` files (debuginfo packages).
- Use `eu-addr2line` or addr2line with symbol map.

## Follow-ups

- How do you enable core dumps in a Docker container?
- What is `gcore` and how does it generate a core dump of a running process without killing it?
- How do symbol servers (like debuginfod) provide debug symbols on demand?
