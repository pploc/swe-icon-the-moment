---
title: What is sendfile() and zero-copy I/O?
topics: [os-linux]
roles: [backend, infra]
tags: [sendfile, zero-copy, splice, tee, dma, kernel-bypass]
time: 20
updated: 2026-07-27
---

## Question

Explain zero-copy I/O: the problem with the traditional read+write data path, how `sendfile()`, `splice()`, and `tee()` eliminate userspace copies, and how DMA enables the deepest zero-copy.

## Answer

**Traditional file-to-socket transfer (4 copies!):**

```mermaid
flowchart LR
    Disk --> DMA1["DMA → kernel\nread buffer"]
    DMA1 -->|"copy("CPU")"| UBuf["User buffer\n(read() returns)"]
    UBuf -->|"copy("CPU")"| KBuf["Kernel socket\nsend buffer"]
    KBuf --> DMA2["DMA → NIC"]


```

1. DMA: disk → kernel read buffer (no CPU).
2. **CPU copy:** kernel buffer → user buffer (`read()` completes).
3. **CPU copy:** user buffer → kernel socket buffer (`write()` called).
4. DMA: socket buffer → NIC (no CPU).

2 wasted CPU copies + 4 context switches (2 syscalls).

**`sendfile()` (2 copies):**
```c
sendfile(sockfd, filefd, &offset, count);
// kernel reads file, writes directly to socket buffer
// NO copy through user space
```
Cuts to: DMA → kernel read buffer → socket buffer (kernel memcpy) → NIC via DMA. 2 context switches, 0 user-space copies.

Used by: Nginx (static file serving), Apache, Kafka (log file → network).

**`sendfile()` + `TCP_CORK`:** Buffer multiple sendfile calls until cork is removed → fewer TCP segments.

**`splice()` — zero-copy between two file descriptors:**
```c
splice(filefd, NULL, pipefd[1], NULL, count, SPLICE_F_MOVE);
splice(pipefd[0], NULL, sockfd, NULL, count, SPLICE_F_MOVE);
```
Uses a pipe as a buffer in kernel space. Moves page references instead of copying data. Avoids even the kernel memcpy if file and socket buffers are in the same cache.

**`tee()` — duplicate pipe data:**
```c
tee(pipefd[0], pipefd2[1], count, 0);
// Copies data from one pipe to another without consuming it
// Used for: logging while forwarding — no extra copy
```

**Scatter-gather I/O (`sendmsg`):** `struct iovec` array — multiple buffers sent as one packet without concatenation copy.

**DMA + hardware offload (deepest zero-copy):**
- NIC reads directly from application buffer via RDMA (Remote DMA).
- Used in InfiniBand, RoCE — bypass the kernel entirely.
- Or: `AF_XDP` + DPDK — user-space NIC driver, shared memory ring between NIC and app.

## Follow-ups

- How does Kafka achieve near-zero-copy for log consumption using `sendfile`?
- What is `MSG_ZEROCOPY` socket option and how does it differ from `sendfile`?
- How does `io_uring` interact with zero-copy paths?
