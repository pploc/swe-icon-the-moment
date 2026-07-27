---
title: How do you read and tune Linux kernel parameters with sysctl?
topics: [os-linux]
roles: [backend, infra]
tags: [sysctl, kernel-parameters, tcp, vm, network, tuning, production]
time: 15
updated: 2026-07-27
---

## Question

Walk through the most important `sysctl` parameters for production systems: network performance, memory management, and security hardening. How do you apply changes permanently?

## Answer

**`sysctl` basics:**
```bash
sysctl -a                           # show all parameters
sysctl net.ipv4.tcp_fin_timeout     # read one
sysctl -w net.ipv4.tcp_fin_timeout=30   # set live
# Persist: /etc/sysctl.conf or /etc/sysctl.d/99-custom.conf
sysctl -p /etc/sysctl.d/99-custom.conf  # apply file
```

**Network performance parameters:**
```ini
# TCP connection limits
net.ipv4.tcp_max_syn_backlog = 65536       # SYN queue (pre-accept)
net.core.somaxconn = 65535                 # listen() backlog cap
net.core.netdev_max_backlog = 65536        # NIC receive queue

# Ephemeral port range (for outbound connections)
net.ipv4.ip_local_port_range = 1024 65535

# TIME_WAIT handling
net.ipv4.tcp_tw_reuse = 1                  # reuse TIME_WAIT sockets
net.ipv4.tcp_fin_timeout = 30              # FIN_WAIT2 timeout

# Buffer autotuning
net.core.rmem_max = 134217728              # 128MB max receive buffer
net.core.wmem_max = 134217728              # 128MB max send buffer
net.ipv4.tcp_rmem = 4096 87380 67108864   # min/default/max
net.ipv4.tcp_wmem = 4096 65536 67108864
```

**Memory management:**
```ini
vm.swappiness = 10              # reduce swap tendency (10 for servers)
vm.dirty_ratio = 15             # writeback threshold (% RAM)
vm.dirty_background_ratio = 5  # background writeback threshold
vm.overcommit_memory = 1        # for Redis background save
vm.max_map_count = 262144       # for Elasticsearch/Java
```

**Security hardening:**
```ini
# Disable IP forwarding (unless router/container host)
net.ipv4.ip_forward = 0

# SYN flood protection
net.ipv4.tcp_syncookies = 1

# Disable ICMP redirects
net.ipv4.conf.all.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0

# Ignore ping (optional)
net.ipv4.icmp_echo_ignore_all = 0
```

**Kubernetes node tuning (common):**
```ini
net.bridge.bridge-nf-call-iptables = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward = 1
fs.inotify.max_user_watches = 524288
fs.inotify.max_user_instances = 512
```

## Follow-ups

- What is `net.ipv4.tcp_syncookies` and how does it protect against SYN flood attacks?
- How do you diagnose a setting applied via `sysctl` that doesn't seem to take effect?
- What is `fs.file-max` and how does it differ from per-process `ulimit -n`?
