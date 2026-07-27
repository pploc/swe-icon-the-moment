---
title: What are POSIX threads and how do they differ from Linux kernel threads?
topics: [os-linux]
roles: [backend, infra]
tags: [pthreads, linux-threads, clone, NPTL, thread-pool, kernel]
time: 20
updated: 2026-07-27
---

## Question

Explain the relationship between POSIX `pthread` and Linux kernel `task_struct`: how `pthread_create` uses `clone()`, what the NPTL implementation provides, thread-local storage internals, and performance characteristics of Linux threads vs other OS thread implementations.

## Answer

**The Linux kernel has no separate "thread" concept.** Both processes and threads are represented by `task_struct`. The difference: threads share the address space, threads share file descriptor table.

**`clone()` — the unified kernel primitive:**
```c
// fork() ≈ clone(CLONE_VM=NO | CLONE_FILES=NO | ...)  → new address space
// pthread_create() ≈ clone(CLONE_VM | CLONE_FILES | CLONE_SIGHAND | CLONE_THREAD | ...)
//                     → shares address space + FDs + signal handlers
```

**NPTL (Native POSIX Thread Library):**

The modern Linux pthread implementation (glibc ≥ 2.3.2). Key features:
- 1:1 mapping: each pthread = one kernel task_struct.
- Fast `futex`-based mutex/condvar (no kernel syscall on uncontended path).
- Signal delivery: signals target the process; kernel picks an eligible thread.

**Thread creation steps:**
1. glibc allocates stack for new thread (via `mmap`).
2. Sets up TLS (Thread Local Storage) block at end of stack or separate allocation.
3. Calls `clone(CLONE_VM|CLONE_FILES|CLONE_SIGHAND|CLONE_THREAD|..., stack_ptr)`.
4. Kernel creates new task_struct, shares mm_struct (address space).
5. New thread starts execution.

**Thread-local storage (TLS):** `__thread int x;` — each thread gets its own `x`. Implemented via segment registers: `fs` register (x86-64) points to the TLS block of the current thread. Compiler translates `x` to `%fs:offset`.

**Performance (Linux vs other OS):**

| OS | Thread model | Thread creation cost |
|---|---|---|
| Linux | 1:1 (NPTL) | ~10µs |
| Windows | 1:1 | ~100µs |
| Old Solaris | M:N (multiplexed) | Variable |
| Go goroutines | M:N | ~200ns |

Linux threads are lightweight (1:1 with no extra overhead beyond task_struct). Creating 10,000 threads takes ~100ms on Linux.

```bash
# View all threads of a process
ps -T -p <pid>              # shows all threads with TID
cat /proc/<pid>/task/       # one directory per thread
ls /proc/<pid>/task/ | wc -l   # thread count
```

## Follow-ups

- What is `CLONE_THREAD` and how does it affect signal delivery semantics?
- How does `pthread_setaffinity_np` set CPU affinity for individual threads?
- What is the "N+1 thread" problem in Java application servers?
