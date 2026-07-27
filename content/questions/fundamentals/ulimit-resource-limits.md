---
title: What are Linux resource limits (ulimit) and how do you configure them for production?
topics: [os-linux]
roles: [backend, infra]
tags: [ulimit, resource-limits, nofile, nproc, systemd, production]
time: 15
updated: 2026-07-27
---

## Question

Explain Linux resource limits: the types of limits (open files, processes, stack size, core dumps), the soft vs hard limit distinction, how to configure them persistently, and common misconfigurations that break production services.

## Answer

**Resource limits (rlimits):** Per-process limits enforced by the kernel. Two levels:
- **Soft limit:** Enforced limit. Process can raise up to the hard limit.
- **Hard limit:** Ceiling. Only root can raise it.

**Key limit types:**

| Resource | `ulimit` flag | Common need |
|---|---|---|
| Open files (FDs) | `-n` | Web servers, DBs: 65536+ |
| Processes/threads | `-u` | Java apps with many threads |
| Stack size | `-s` | Default 8MB |
| Core dump size | `-c` | `unlimited` for debugging |
| Virtual memory | `-v` | Rarely set |
| Max file size | `-f` | Prevents runaway writes |

**Viewing and setting:**
```bash
ulimit -a                    # show all current limits
ulimit -n 65536              # set soft limit for current session
ulimit -Hn                   # hard limit for open files

# Check process limits:
cat /proc/<pid>/limits
```

**Persistent configuration:**

*`/etc/security/limits.conf` (PAM — login sessions):*
```
* soft nofile 65536
* hard nofile 65536
# username soft nproc 4096
```

*`/etc/systemd/system/myservice.service` (systemd services):*
```ini
[Service]
LimitNOFILE=65536
LimitNPROC=4096
LimitCORE=infinity   # enable core dumps
```

**Common production issues:**

1. **"Too many open files" (`EMFILE`):** `ulimit -n` default 1024 is too low for web servers. Set to 65536+.

2. **Elasticsearch/Kafka startup failure:** Requires `vm.max_map_count` raised: `echo 262144 > /proc/sys/vm/max_map_count`.

3. **Java thread creation fails:** `ulimit -u` (max processes) too low — Linux implements threads as processes (`clone()`).

4. **Core dumps not generated:** `ulimit -c 0` (default) prevents core dumps. Set `unlimited` in service unit + configure core dump path (`/proc/sys/kernel/core_pattern`).

5. **Container inheritance:** Container processes inherit host limits. May need to set in Docker: `--ulimit nofile=65536:65536`.

## Follow-ups

- What is `vm.max_map_count` and why do Elasticsearch and Java need it raised?
- How do you check if a running process hit its ulimit without restarting it?
- Why does `systemd` not read `/etc/security/limits.conf`?
