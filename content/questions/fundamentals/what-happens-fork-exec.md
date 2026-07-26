---
title: What happens when you run a command in a Linux shell?
topics: [os-linux]
roles: [infra, sre, backend]
tags: [fork, exec, processes, syscalls]
time: 20
updated: 2026-07-26
---

## Question

You type `ls -l /tmp` in bash and press enter. Describe what the OS does, from
keystroke to output — processes, syscalls, and file descriptors included.

## Answer

The canonical flow:

1. **Parsing** — bash tokenises the line, expands globs/variables, and finds
   `ls` on `$PATH` (or uses a builtin — `cd` never spawns a process).
2. **`fork()`** — bash clones itself. The child is a copy-on-write duplicate:
   same memory pages until either side writes. This is why fork is cheap even
   for a large shell.
3. **`execve()`** — the child replaces its image with `/usr/bin/ls`. The kernel
   loads the ELF binary, maps its segments, runs the dynamic linker
   (`ld.so`) to resolve shared libraries, and jumps to `main`.
4. **File descriptors** — fd 0/1/2 (stdin/stdout/stderr) are inherited from
   bash and still point at the terminal. Redirection (`> out.txt`) is bash
   calling `open()` + `dup2()` in the child *between* fork and exec.
5. **Doing the work** — `ls` calls `openat()`/`getdents64()` to read directory
   entries and `statx()` for the `-l` metadata, then `write()`s to fd 1.
6. **Exit** — `ls` calls `exit_group()`; the kernel keeps a zombie entry until
   bash reaps it with `waitpid()` and reports `$?`.

Strong candidates mention copy-on-write explicitly, know redirection happens in
the child, and can name the fd-inheritance model. Great ones mention pipes
(`ls | wc`: bash creates the pipe first, forks twice, wires fds with `dup2`).

## Follow-ups

- Why do zombies exist, and what happens if the parent never reaps them?
- What's different when the shell runs a pipeline of three commands?
- `strace ls` shows no `fork` — why? (glibc uses `clone()`; `posix_spawn` exists too.)
