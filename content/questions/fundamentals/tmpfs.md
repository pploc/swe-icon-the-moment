---
title: What is tmpfs and how is it used in containers and performance optimization?
topics: [os-linux]
roles: [backend, infra]
tags: [tmpfs, ramfs, shared-memory, /dev/shm, containers, docker]
time: 15
updated: 2026-07-27
---

## Question

Explain `tmpfs`: how it differs from a normal filesystem, why it's stored in RAM, its uses for shared memory (`/dev/shm`), container `/tmp`, and performance optimization for write-heavy temporary files.

## Answer

**`tmpfs`:** A filesystem backed by RAM (and optionally swap). All files exist only in memory — no disk writes. Data is lost on unmount or reboot.

**vs `ramfs`:** `ramfs` is simpler but has no size limit — can fill all RAM. `tmpfs` has a configurable limit and can spill to swap.

**Creating a tmpfs:**
```bash
mount -t tmpfs -o size=1G tmpfs /mnt/mytmp
# Or in /etc/fstab:
# tmpfs /mnt/mytmp tmpfs defaults,size=1G 0 0
```

**Default `tmpfs` mounts on Linux:**
```bash
df -h | grep tmpfs
# /dev/shm      → POSIX shared memory (half of RAM default)
# /run          → PID files, sockets
# /sys/fs/cgroup → cgroup hierarchy (overlay in containers)
# /tmp          → sometimes tmpfs, sometimes ext4
```

**`/dev/shm`:** Used by POSIX shared memory (`shm_open()`), Boost.Interprocess, database shared buffers. PostgreSQL uses it for query work areas. Postgres + Docker: `/dev/shm` defaults to 64MB — too small. Fix:
```bash
docker run --shm-size=256m postgres
# or in docker-compose:
shm_size: '256mb'
```

**Container `/tmp` as tmpfs:**
```bash
docker run --tmpfs /tmp:rw,size=500m myapp
# All writes to /tmp stay in RAM — fast, no disk I/O, cleaned on container exit
```

**Performance uses:**
- Build cache: compile output to tmpfs for fast I/O during CI builds.
- Log aggregation: write logs to tmpfs, flush to disk periodically (tradeoff: lose logs on crash).
- Nginx: serve temp files from `/tmp` (default) — if high upload rate, make `/tmp` tmpfs.

**Size limits:**
```bash
mount | grep tmpfs          # show current mounts and sizes
# /dev/shm size defaults to half of total RAM
# Resize without unmount:
mount -o remount,size=4G /dev/shm
```

**tmpfs in Kubernetes:**
```yaml
volumes:
- name: tmpdir
  emptyDir:
    medium: Memory     # backed by tmpfs
    sizeLimit: 500Mi
```

## Follow-ups

- What happens to tmpfs contents during hibernation (suspend-to-disk)?
- How does PostgreSQL's `shared_buffers` relate to `/dev/shm`?
- When would you choose tmpfs over a ramdisk (`/dev/ram`)?
