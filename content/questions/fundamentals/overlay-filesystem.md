---
title: How does the overlay filesystem work in container images?
topics: [os-linux]
roles: [backend, infra]
tags: [overlayfs, copy-on-write, container, docker, layer, filesystem]
time: 20
updated: 2026-07-27
---

## Question

Explain OverlayFS: how it creates a unified view of multiple filesystem layers, how Docker uses it for image layers, and the copy-on-write behavior when a container writes to a read-only image layer.

## Answer

**What OverlayFS is:** A stackable filesystem that merges multiple directories into one unified view. Used by Docker and containerd as the default storage driver.

**Three directory types:**
- **Lower dir(s):** Read-only layers (image layers). Can be multiple (stacked).
- **Upper dir:** Read-write layer (container writable layer).
- **Work dir:** Internal overlay scratch space (must be on same filesystem as upper).
- **Merged dir:** The unified view shown to the container.

```mermaid
flowchart LR
    subgraph Container
        M["Merged\n(what container sees)"]
    end
    M -->|"read"| U["Upper dir\n(container writes)"]
    M -->|"read("if not in upper")"| L3["Layer 3\n(nginx config)"]
    L3 -->|"read("if not found")"| L2["Layer 2\n(nginx binary)"]
    L2 -->|"read("if not found")"| L1["Layer 1\n(ubuntu base)"]


```

**Read operations:** Kernel checks upper dir first; if not found, checks lower dirs in order.

**Write operations (copy-on-write):**
- **Create file:** Written to upper dir only.
- **Modify existing file:** File is first copied from lower to upper (copy-up), then modified in upper. Original in lower is unchanged — other containers sharing the image are unaffected.
- **Delete file:** A "whiteout" file is created in upper dir that masks the lower file.

**Copy-up performance cost:** First write to a large file causes the entire file to be copied to upper. A write to byte 1 of a 500MB video file → 500MB copy-up. Avoid writing to large files in containers; mount volumes for large mutable data.

**Mounting overlay:**
```bash
mkdir upper work merged
mount -t overlay overlay \
  -o lowerdir=/image/layer2:/image/layer1,upperdir=upper,workdir=work \
  merged
```

**Docker layers:**
```bash
docker image inspect nginx | jq '.[].GraphDriver'
# {"Data": {"LowerDir": "/var/lib/docker/overlay2/.../diff:...",
#            "MergedDir": "/var/lib/docker/overlay2/.../merged",
#            "UpperDir": "/var/lib/docker/overlay2/.../diff",
#            "WorkDir":  "/var/lib/docker/overlay2/.../work"}}
```

**Why image layers matter:** Layers are shared across all containers using the same image. A 500MB nginx image shared by 100 containers = 500MB on disk (not 50GB). Only the upper (writable) layer per container uses additional space.

## Follow-ups

- What is "whiteout" in OverlayFS and how does it implement deletion?
- How does `docker commit` convert a container's upper layer into a new image layer?
- What are the performance limitations of OverlayFS for database workloads?
