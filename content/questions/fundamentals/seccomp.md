---
title: How does seccomp work and how do containers use it for syscall filtering?
topics: [os-linux]
roles: [backend, infra]
tags: [seccomp, bpf, syscall-filter, container, security, docker, kubernetes]
time: 20
updated: 2026-07-27
---

## Question

Explain Linux seccomp (Secure Computing Mode): strict mode vs seccomp-BPF, how Docker's and Kubernetes's default seccomp profiles work, and how to create a custom profile.

## Answer

**What seccomp is:** A kernel feature that restricts which system calls a process can make. Enforced at the kernel level — even if the process is compromised, it can't make forbidden syscalls.

**Two modes:**

**Mode 1 — Strict mode:**
Only `read()`, `write()`, `_exit()`, `sigreturn()` allowed. All other syscalls → SIGKILL. Used for sandboxed computation (calculators, untrusted plugins).
```c
prctl(PR_SET_SECCOMP, SECCOMP_MODE_STRICT);
```

**Mode 2 — seccomp-BPF (filter mode):**
A BPF program is attached that inspects each syscall (number + arguments) and returns an action.
```c
struct sock_filter filter[] = {
    BPF_STMT(BPF_LD|BPF_W|BPF_ABS, offsetof(struct seccomp_data, nr)),
    BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K, __NR_execve, 0, 1),
    BPF_STMT(BPF_RET|BPF_K, SECCOMP_RET_KILL),  // block execve
    BPF_STMT(BPF_RET|BPF_K, SECCOMP_RET_ALLOW),  // allow all else
};
```

**Actions:**
- `SECCOMP_RET_ALLOW` — syscall proceeds.
- `SECCOMP_RET_ERRNO` — return error to caller (EPERM).
- `SECCOMP_RET_KILL_PROCESS` — terminate immediately.
- `SECCOMP_RET_TRAP` — send SIGSYS (for logging/auditing).

**Docker's default seccomp profile:**
Blocks ~44 dangerous syscalls including:
- `reboot`, `kexec_load` — reboot the system.
- `ptrace` — debug other processes.
- `perf_event_open` — hardware perf events.
- `clone` with `CLONE_NEWUSER` — create user namespaces.
- `mount`, `umount2` — filesystem changes.

```bash
# Run with no seccomp (dangerous):
docker run --security-opt seccomp=unconfined nginx

# Custom profile:
docker run --security-opt seccomp=/path/profile.json nginx
```

**Kubernetes:**
```yaml
spec:
  securityContext:
    seccompProfile:
      type: RuntimeDefault   # use container runtime's default
      # type: Localhost
      # localhostProfile: profiles/custom.json
```

**Creating a minimal profile with `strace`:**
```bash
strace -c -f -e trace=all ./program 2>&1 | grep -v '^---'
# Generate allow-list from observed syscalls
```

## Follow-ups

- What is `SECCOMP_RET_LOG` and how can it help audit syscall usage?
- How does Chrome's renderer process use seccomp for sandboxing?
- What is the overhead of seccomp-BPF filtering per syscall?
