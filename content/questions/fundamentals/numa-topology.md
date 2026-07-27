---
title: How does NUMA (Non-Uniform Memory Access) affect application performance?
topics: [os-linux]
roles: [backend, infra]
tags: [numa, topology, memory-locality, numactl, cpu-affinity, performance]
time: 20
updated: 2026-07-27
---

## Question

Explain NUMA topology: what it is, how to detect it, the performance penalty for remote memory access, and how to optimize applications and databases for NUMA-aware operation.

## Answer

**What NUMA is:** In multi-socket servers, each CPU socket has its own local memory controller and DRAM. Accessing memory attached to another socket (remote) is 1.5-3x slower than local memory.

```mermaid
flowchart LR
    subgraph Node0["NUMA Node 0"]
        CPU0["CPUs 0-15\n("24 cores")"] <-->|"local access ~80ns"| MEM0["64GB RAM"]
    end
    subgraph Node1["NUMA Node 1"]
        CPU1["CPUs 16-31\n("24 cores")"] <-->|"local access ~80ns"| MEM1["64GB RAM"]
    end
    CPU0 <-->|"remote access ~140ns"| MEM1
    CPU1 <-->|"remote access ~140ns"| MEM0

```

**Detecting NUMA topology:**
```bash
numactl --hardware           # show nodes, CPUs, distances
# node 0 cpus: 0 2 4 6 ... (even cores)
# node 1 cpus: 1 3 5 7 ... (odd cores)
# node distances: node 0  node 1
#                     0:  10    21
#                     1:  21    10

lscpu | grep NUMA            # NUMA node count
numastat -p <pid>            # per-node memory allocation for process
```

**Performance impact:**
- CPU 0 allocating memory → placed on Node 0 (fast).
- Kernel default: `NUMA_INTERLEAVE` or `localalloc` depending on policy.
- Thread migrated to Node 1 but memory still on Node 0 → all memory accesses are remote → 2x latency.

**Optimization strategies:**

1. **`numactl --cpunodebind=0 --membind=0 ./program`:** Pin both CPUs and memory to same node.

2. **`numactl --interleave=all ./program`:** Interleave memory across all nodes. Good for memory-bandwidth-bound apps (Memcached).

3. **CPU affinity pinning:** `taskset -c 0-15 ./program` — keep all threads on Node 0 CPUs.

4. **Database-specific:**
   - MySQL: `innodb_numa_interleave=ON` — interleave InnoDB buffer pool across nodes.
   - Redis: `numactl --membind=0` — bind to single node for lowest latency.

5. **Kernel `automatic NUMA balancing`:** Kernel detects remote accesses and migrates pages. Works but causes occasional page migration stalls.

```bash
cat /proc/sys/kernel/numa_balancing   # 1=enabled
```

**JVM and NUMA:** JVM heap allocated on first-touch (which thread, which NUMA node). Large heaps with `G1GC` or `ZGC` use multiple NUMA regions.

## Follow-ups

- How does the Linux kernel's automatic NUMA balancing (`autonuma`) detect remote memory accesses?
- What is `libnuma` and how does it provide programmatic NUMA placement?
- On a 4-socket NUMA machine, how would you partition a database across NUMA nodes?
