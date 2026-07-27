---
title: How do you use lsof, ss, and netstat to diagnose network issues?
topics: [os-linux]
roles: [backend, infra]
tags: [lsof, ss, netstat, tcp-state, connections, diagnosis, linux]
time: 15
updated: 2026-07-27
---

## Question

Walk through using `lsof`, `ss`, and `netstat` to answer: which process holds a port, why there are too many CLOSE_WAIT/TIME_WAIT connections, and how to inspect socket buffers.

## Answer

**`ss` — socket statistics (modern, fast, replaces netstat):**

```bash
ss -tlnp            # TCP, listening, numeric, process
# State  Recv-Q Send-Q  Local Addr:Port  Peer Addr:Port  Process
# LISTEN     0   128    0.0.0.0:8080    0.0.0.0:*        users:(("java",pid=1234))

ss -tnp             # TCP, connected, show process
ss -s               # socket summary stats
ss -tnp state established  # only ESTABLISHED connections
ss -tnp state time-wait    # TIME_WAIT connections

# Extended socket info (buffers)
ss -tnpe            # includes socket memory (rcvbuf, sndbuf)
```

**`netstat` (older, still common):**
```bash
netstat -tlnp        # listening ports
netstat -tnp         # all TCP connections
netstat -s           # statistics (error counts, retransmits)
netstat -an | awk '/CLOSE_WAIT/{count++} END{print count}'
```

**TCP states to watch:**

| State | Meaning | Common cause of accumulation |
|---|---|---|
| `LISTEN` | Server waiting | Normal |
| `ESTABLISHED` | Active connection | Normal |
| `TIME_WAIT` | Connection closed, waiting 2×MSL | High connection rate; tune `tcp_tw_reuse` |
| `CLOSE_WAIT` | Remote closed; local hasn't closed | **Bug** — application not calling `close()` |
| `FIN_WAIT2` | Waiting for remote FIN | Remote hung; `tcp_fin_timeout` |
| `SYN_RECV` | Completing 3-way handshake | SYN flood if count is huge |

**`CLOSE_WAIT` accumulation = bug:**
```bash
ss -tnp state close-wait | head -20
# Shows which process has CLOSE_WAIT connections
# Fix: application must call close() after detecting peer closed connection
```

**`lsof` — list open files:**
```bash
lsof -i :8080           # which process listens on :8080
lsof -i tcp             # all TCP connections
lsof -p <pid>           # all open files of process
lsof -i -n | grep LISTEN  # all listening sockets

# Count open files per process
lsof | awk '{print $1}' | sort | uniq -c | sort -rn | head
```

**`/proc/net/tcp` — raw TCP connection table:**
```bash
# Columns: local_addr:port, remote_addr:port, state (hex)
# State 0A = LISTEN, 01 = ESTABLISHED, 06 = TIME_WAIT
cat /proc/net/tcp | awk '$4 == "0A"'    # LISTEN (hex 10 = 0x0A)
```

## Follow-ups

- What causes `Recv-Q > 0` on a LISTEN socket, and what does it indicate?
- How do you find which process is holding a `CLOSE_WAIT` connection and force-close it?
- What is `ss -m` and how does it show socket memory usage?
