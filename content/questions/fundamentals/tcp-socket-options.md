---
title: How do you configure key TCP/IP socket options for high-performance services?
topics: [os-linux]
roles: [backend, infra]
tags: [tcp, socket-options, SO_REUSEPORT, TCP_NODELAY, keepalive, backlog, tuning]
time: 20
updated: 2026-07-27
---

## Question

Walk through the most important socket and TCP options for production services: `SO_REUSEPORT`, `TCP_NODELAY`, `TCP_KEEPALIVE`, listen backlog, `SO_RCVBUF/SNDBUF`, and the kernel parameters that govern TCP behavior.

## Answer

**`SO_REUSEPORT` (Linux 3.9+):**
Multiple sockets can bind to the same port — each gets a share of incoming connections (kernel-level load balancing among workers). Avoids the "thundering herd" problem where all workers wake on `accept()`.
```go
// Go: set before Listen
l, _ := net.Listen("tcp", ":8080")
// Or with syscall: SO_REUSEPORT
```

**`TCP_NODELAY` (disable Nagle's algorithm):**
Nagle's algorithm: buffers small writes until ACK received or MSS full. Good for throughput; bad for latency (interactive apps, RPC).
```go
conn.(*net.TCPConn).SetNoDelay(true)  // disable Nagle's — send immediately
```
Use `TCP_NODELAY` for: databases (psql, redis), RPC (gRPC), game servers. Don't for: bulk data transfer (HTTP large uploads).

**`TCP_KEEPALIVE`:**
```bash
# System defaults:
cat /proc/sys/net/ipv4/tcp_keepalive_time    # 7200s (2 hours) — start probing
cat /proc/sys/net/ipv4/tcp_keepalive_intvl   # 75s  — probe interval
cat /proc/sys/net/ipv4/tcp_keepalive_probes  # 9    — probes before reset
```
Critical for detecting dead connections (clients that disappear without FIN). Set at socket level:
```c
setsockopt(fd, SOL_SOCKET, SO_KEEPALIVE, &val, sizeof(val));
// Fine-tune per socket:
setsockopt(fd, IPPROTO_TCP, TCP_KEEPIDLE, &val, sizeof(val));  // 60s
```

**Listen backlog:**
```c
listen(sockfd, 1024);  // default is often 128; increase for high-traffic
```
`/proc/sys/net/core/somaxconn` caps this (default 4096). Also tune `net.ipv4.tcp_max_syn_backlog`.

**Buffer sizes:**
```bash
# System-wide TCP buffer limits
cat /proc/sys/net/core/rmem_max      # max receive buffer (default 212992)
cat /proc/sys/net/core/wmem_max      # max send buffer
# Per-socket (override in application)
setsockopt(fd, SOL_SOCKET, SO_RCVBUF, &size, sizeof(size));
```
Larger buffers → higher throughput on high-latency links (bandwidth-delay product). Autotuning (`net.ipv4.tcp_moderate_rcvbuf=1`) adjusts dynamically.

**Key sysctl TCP parameters:**
```bash
# High-connection-count services
net.ipv4.tcp_tw_reuse=1           # reuse TIME_WAIT sockets
net.ipv4.ip_local_port_range=1024 65535  # more ephemeral ports
net.core.somaxconn=65535
```

## Follow-ups

- What is `TCP_CORK` and how does it interact with `TCP_NODELAY`?
- What causes TCP TIME_WAIT exhaustion and how does `SO_LINGER` relate?
- How does `SO_REUSEPORT` differ from `SO_REUSEADDR`?
