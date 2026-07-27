---
title: How does Linux IPC work — pipes, sockets, shared memory, and message queues?
topics: [os-linux]
roles: [backend, infra]
tags: [ipc, pipe, socket, shared-memory, message-queue, unix-socket]
time: 20
updated: 2026-07-27
---

## Question

Compare the Linux IPC mechanisms: anonymous pipes, named pipes (FIFOs), Unix domain sockets, shared memory, and POSIX message queues. When is each appropriate, and what are their performance and semantic differences?

## Answer

**IPC mechanisms comparison:**

```mermaid
flowchart TD
    IPC[Linux IPC] --> Pipes
    IPC --> Sockets[Unix Domain Sockets]
    IPC --> SHM[Shared Memory]
    IPC --> MQ[Message Queues]
    Pipes --> Anon[Anonymous pipe\npipe() — parent/child only]
    Pipes --> Named[Named pipe / FIFO\nmkfifo — any processes]
```

**Anonymous pipes (`pipe()`):**
- Unidirectional byte stream. Parent→child only (FD inherited across `fork()`).
- Kernel buffer (~64KB by default). Blocks when buffer full (backpressure).
- No name, no filesystem entry.
```bash
ls | grep ".txt"   # shell uses pipes between ls and grep
```

**Named pipes (FIFOs):**
- Filesystem entry (`mkfifo /tmp/mypipe`).
- Any two processes can use it (by name).
- Same byte-stream semantics as anonymous pipe.
- Blocking: writer blocks until reader opens; reader blocks until writer opens.

**Unix domain sockets:**
- Bidirectional, full-duplex (unlike pipes).
- `AF_UNIX` — no network stack overhead.
- Support for `sendmsg()` with ancillary data — can pass file descriptors between processes!
- Used by: Docker daemon (`/var/run/docker.sock`), PostgreSQL (`/var/run/postgresql/.s.PGSQL.5432`), systemd, X11.
- Performance: 2-4x faster than TCP loopback for local IPC.

**Shared memory (fastest):**
```c
// POSIX: shm_open + mmap
int fd = shm_open("/myshm", O_CREAT|O_RDWR, 0666);
ftruncate(fd, 4096);
void *ptr = mmap(NULL, 4096, PROT_READ|PROT_WRITE, MAP_SHARED, fd, 0);
// ptr is shared between processes — writes visible immediately
```
Zero-copy, zero-syscall on the data path. Requires manual synchronization (semaphores, mutexes with `PTHREAD_PROCESS_SHARED`).

**POSIX message queues:**
- Named (`mq_open("/myqueue")`). Message-oriented (not stream).
- Priority ordering. Fixed max message size.
- Kernel-buffered — sender doesn't block until queue full.
- Useful for: discrete work items, command/response patterns.

**Performance ranking (fastest to slowest):**
1. Shared memory (no data copy)
2. Unix domain sockets
3. Pipes / FIFOs
4. TCP loopback
5. POSIX message queues (similar to pipes)

## Follow-ups

- How does Docker pass file descriptors over a Unix socket when sharing volumes?
- What is `socketpair()` and how does it create a bidirectional anonymous socket pair?
- Why is shared memory with semaphores often harder to use than Unix sockets for IPC?
