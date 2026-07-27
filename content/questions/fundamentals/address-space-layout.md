---
title: What is the Linux process address space layout?
topics: [os-linux]
roles: [backend, infra]
tags: [address-space, stack, heap, bss, text, mmap, aslr, linux]
time: 20
updated: 2026-07-27
---

## Question

Describe the virtual address space of a Linux process: all the regions (text, data, BSS, heap, stack, mmap, vDSO), how ASLR randomizes them, and how stack overflow is detected.

## Answer

**Typical 64-bit process address space layout:**

```
0x0000000000000000 - 0x0000000000000fff  Unmapped (null pointer trap)
0x0000000000400000 - ...                 Text (.text) — executable code
                                         Data (.data) — initialized globals
                                         BSS  (.bss)  — zero-initialized globals
[growing upward ↑]
0x... (after BSS)                        Heap (malloc/brk)
...
0x7f...                                  mmap region (libraries, mmap'd files,
                                         anonymous mmap for large allocations)
0x7ffe...                                Stack (main thread)
                                         [grows downward ↓]
0x7ffff7ffd000                           vDSO (kernel-mapped shared lib)
0x7ffff7ffe000                           vvar (kernel data for vDSO)
0xffff800000000000+                      Kernel space (not accessible from user)
```

**Region purposes:**

| Region | Contents | Growth |
|---|---|---|
| `.text` | Executable code (read+exec, no write) | Fixed |
| `.data` | Initialized global/static variables | Fixed |
| `.bss` | Zero-initialized globals | Fixed |
| Heap | `malloc()`, `new` allocations | ↑ (via `brk()`) |
| mmap | Shared libs, `mmap()` files, large allocs | Flexible |
| Stack | Local variables, call frames | ↓ (per thread) |

**ASLR (Address Space Layout Randomization):**
At each `exec()`, the kernel randomizes the base addresses of stack, heap, mmap regions, and vDSO. Makes buffer overflow exploits harder (attacker doesn't know where to jump).

```bash
cat /proc/sys/kernel/randomize_va_space
# 0 = disabled, 1 = partial, 2 = full (default)
```

**Stack overflow detection:**
A `guard page` (non-mapped page) sits below the main stack. When the stack overflows, the first access to the guard page causes a SIGSEGV. `ulimit -s` controls stack size limit (default 8MB).

```bash
cat /proc/<pid>/maps   # view all VMAs with permissions and offsets
pmap -x <pid>          # formatted view of address space
```

**Per-thread stacks:** Each thread has its own stack (allocated by `pthread_create` in mmap region). Main thread stack is special — at the highest address, grows down into the ASLR-randomized region.

## Follow-ups

- What is the difference between `brk()` and `mmap()`-based heap allocation and when does glibc use each?
- How does the kernel's stack randomization work: does it change on every exec?
- What is a "red zone" in the stack frame and why does it exist?
