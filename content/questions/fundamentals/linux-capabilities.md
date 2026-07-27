---
title: How do Linux capabilities replace root privileges?
topics: [os-linux]
roles: [backend, infra]
tags: [capabilities, linux, privilege, setuid, seccomp, least-privilege]
time: 20
updated: 2026-07-27
---

## Question

Explain Linux capabilities: how they decompose the all-or-nothing root privilege into fine-grained permissions, the three capability sets per process, and how containers use them for least-privilege.

## Answer

**Problem with root:** In traditional Unix, root (UID=0) has all privileges — bind to port 80, load kernel modules, kill any process. Services that only need one privilege (bind to port 80) must run as root, gaining all privileges.

**Linux capabilities:** Split root privileges into ~40 independent capabilities. A process can have specific capabilities without being root.

**Key capabilities:**

| Capability | Allows |
|---|---|
| `CAP_NET_BIND_SERVICE` | Bind to ports < 1024 (web servers) |
| `CAP_NET_RAW` | Raw socket access (ping, packet capture) |
| `CAP_SYS_PTRACE` | ptrace (debuggers) |
| `CAP_SYS_ADMIN` | Broad admin: mount, set hostname, etc. (too powerful — avoid) |
| `CAP_KILL` | Send signals to any process |
| `CAP_SETUID/SETGID` | Change UID/GID |
| `CAP_DAC_OVERRIDE` | Bypass file read/write/execute permission checks |
| `CAP_NET_ADMIN` | Network admin: interfaces, routing, firewall |

**Three per-process capability sets:**
- **Permitted:** Maximum capabilities the process can have.
- **Effective:** Currently active capabilities (used for permission checks).
- **Inheritable:** Capabilities kept across `exec()`.

```bash
# Check capabilities of a process
cat /proc/<pid>/status | grep -i cap
capsh --decode=<hex_value>

# Set capabilities on an executable (avoid running as root)
setcap 'cap_net_bind_service+ep' /usr/bin/node
# Now node can bind :443 without being root
```

**Containers and capabilities:**

Docker's default set drops dangerous capabilities: `CAP_SYS_ADMIN`, `CAP_NET_ADMIN`, `CAP_SYS_MODULE`, etc. Kubernetes:
```yaml
securityContext:
  capabilities:
    drop: [ALL]
    add: [NET_BIND_SERVICE]
```

**Privileged containers** (`--privileged`) restore all capabilities — avoid in production.

**Ambient capabilities (Linux 4.3+):** Capabilities that survive `exec()` even for non-privileged binaries — simpler than `setuid`.

## Follow-ups

- What is `CAP_SYS_ADMIN` and why is it considered the "new root"?
- How does the kernel check capabilities — where in the code path does the check happen?
- How do you audit what capabilities a container needs? (`amicontained`, scanning syscall requirements with strace)
