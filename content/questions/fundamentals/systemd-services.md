---
title: How does systemd manage services and what are unit files?
topics: [os-linux]
roles: [backend, infra]
tags: [systemd, unit-file, service, cgroups, dependency, journald]
time: 20
updated: 2026-07-27
---

## Question

Explain how systemd starts and manages services: unit file anatomy, dependency ordering, cgroup integration, and how to write a production-ready service unit file with proper resource limits and restart policy.

## Answer

**systemd overview:** PID 1 on most modern Linux distributions. Manages service lifecycle, parallel startup, socket activation, cgroup integration, and centralized logging (journald).

**Unit file types:**
- `.service` — a daemon/process.
- `.socket` — socket activation (start service on first connection).
- `.timer` — systemd equivalent of cron.
- `.target` — group of units (like a runlevel).
- `.mount` — filesystem mount points.

**Production service unit file:**
```ini
[Unit]
Description=My API Service
After=network-online.target postgresql.service
Requires=postgresql.service

[Service]
Type=simple
User=myapp
Group=myapp
WorkingDirectory=/opt/myapp

# Environment
Environment=GOENV=production
EnvironmentFile=/etc/myapp/env

# Execution
ExecStart=/opt/myapp/server
ExecReload=/bin/kill -HUP $MAINPID
KillMode=process
KillSignal=SIGTERM
TimeoutStopSec=30

# Restart policy
Restart=always
RestartSec=5s

# Resource limits
LimitNOFILE=65536
LimitNPROC=4096
LimitCORE=infinity

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/myapp /var/log/myapp

# cgroup CPU/memory limits
CPUQuota=200%          # max 2 CPUs
MemoryMax=4G
MemorySwapMax=0        # no swap for this service

[Install]
WantedBy=multi-user.target
```

**Key service types:**
- `simple` — ExecStart is the main process. Started immediately.
- `forking` — ExecStart forks; parent exits; child is the daemon.
- `notify` — service sends `READY=1` via `sd_notify()` when ready. Systemd waits.
- `oneshot` — runs to completion; used for scripts, setup tasks.

**Dependency directives:**
- `After=X` — start after X (ordering, not requirement).
- `Requires=X` — if X fails, this service fails too.
- `Wants=X` — soft dependency; continue even if X fails.

**Commands:**
```bash
systemctl start myapp          # start
systemctl status myapp         # view status + recent logs
systemctl reload myapp         # send HUP (graceful config reload)
systemctl daemon-reload        # reload unit files after edit
journalctl -u myapp -f         # follow service logs
journalctl -u myapp --since "1 hour ago"
```

## Follow-ups

- What is socket activation (`Type=socket`) and how does it reduce startup time?
- How does `sd_notify()` work for `Type=notify` services?
- What is the `systemd-analyze blame` command used for?
