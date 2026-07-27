---
title: How does inotify work for filesystem event monitoring?
topics: [os-linux]
roles: [backend, infra]
tags: [inotify, fanotify, filesystem-events, hot-reload, linux, file-watch]
time: 15
updated: 2026-07-27
---

## Question

Explain `inotify` and `fanotify`: how applications watch for filesystem changes (config hot-reload, live code reloading, security monitoring), the event types available, and the limits that cause production problems.

## Answer

**`inotify`:** Linux kernel subsystem for monitoring filesystem events on files and directories.

**Usage pattern:**
```c
// 1. Create inotify instance
int ifd = inotify_init1(IN_NONBLOCK);

// 2. Add watch for a directory
int wd = inotify_add_watch(ifd, "/etc/myapp", IN_MODIFY | IN_CREATE | IN_DELETE);

// 3. Read events
char buf[4096];
ssize_t len = read(ifd, buf, sizeof(buf));
// Parse into struct inotify_event
```

**Event types:**

| Event | Meaning |
|---|---|
| `IN_CREATE` | File/directory created |
| `IN_DELETE` | File/directory deleted |
| `IN_MODIFY` | File content modified |
| `IN_CLOSE_WRITE` | File written then closed |
| `IN_MOVED_FROM/TO` | File renamed |
| `IN_ATTRIB` | Metadata changed (permissions, timestamps) |

**Use cases:**
- **Config hot-reload:** Kubernetes `ConfigMap` — kubelet watches for changes via inotify, signals container to reload.
- **Webpack/nodemon:** Development file watcher.
- **Falco/security tools:** Detect suspicious file activity (writes to `/etc/passwd`).
- **Syncing tools:** `rsync --watch`, `lsyncd`.

**Limits (production concern):**
```bash
# Maximum watches per user
cat /proc/sys/fs/inotify/max_user_watches    # default: 8192

# Maximum instances per user
cat /proc/sys/fs/inotify/max_user_instances  # default: 128

# Increase for IDEs, Docker, Kubernetes nodes
echo 524288 > /proc/sys/fs/inotify/max_user_watches
# Persist:
echo "fs.inotify.max_user_watches=524288" >> /etc/sysctl.conf
```

**Common error:** "Too many open files" or "inotify limit reached" — IDE (IntelliJ, VSCode) watching a large project with many files hits the limit. Fix: increase `max_user_watches`.

**`fanotify`:** More powerful than inotify:
- Can watch entire filesystem mounts (not just specific paths).
- Can grant/deny access to files (requires CAP_SYS_ADMIN).
- Used by antivirus scanners, backup software.
- Returns full path (inotify only returns filename within watched dir).

**Go example with `fsnotify` library:**
```go
watcher, _ := fsnotify.NewWatcher()
watcher.Add("/etc/myapp/config.yaml")
for event := range watcher.Events {
    if event.Op&fsnotify.Write != 0 {
        reloadConfig()
    }
}
```

## Follow-ups

- What is `IN_CLOSE_WRITE` vs `IN_MODIFY` and why is close-write more reliable for config reload?
- How does Docker detect image layer changes without inotify? (It doesn't — it computes SHA256 digests.)
- What is the "rename-then-replace" pattern for atomic config file updates?
