---
title: How does Linux routing work and what is policy-based routing?
topics: [os-linux]
roles: [backend, infra]
tags: [routing, route-table, iproute2, policy-routing, bgp, linux]
time: 20
updated: 2026-07-27
---

## Question

Explain Linux kernel routing: the routing table, how the kernel selects a route for outgoing packets, and how policy-based routing (multiple routing tables + rules) enables advanced traffic steering.

## Answer

**Routing table lookup for outgoing packets:**

When a packet is sent:
1. Check if destination is local (lo, any interface IP) → deliver locally.
2. Look up routing table: longest prefix match wins.
3. If no route found → use default gateway (`0.0.0.0/0`).
4. Determine egress interface + next-hop.

**Viewing and managing routes:**
```bash
# Main routing table
ip route show
# or: route -n (legacy)
# 10.0.0.0/24 dev eth0 proto kernel scope link src 10.0.0.5
# 0.0.0.0/0 via 10.0.0.1 dev eth0     ← default gateway

# Add route
ip route add 192.168.100.0/24 via 10.0.0.1

# Add default gateway
ip route add default via 10.0.0.1

# Blackhole (drop)
ip route add blackhole 10.10.0.0/16
```

**Policy-based routing (PBR):** Multiple routing tables selected by rules. Rules match on source IP, interface, DSCP mark, etc.

```mermaid
flowchart LR
    Packet["Outgoing packet"] --> Rules["Routing rules\n("ip rule list")"]
    Rules -->|"from 10.0.1.0/24"| Table100["Table 100\n("ISP A routes")"]
    Rules -->|"mark 0x1"| Table200["Table 200\n("ISP B routes")"]
    Rules -->|"default"| Main["Main table"]

```

```bash
# List rules
ip rule list
# 0:     from all lookup local       ← highest priority
# 32766: from all lookup main
# 32767: from all lookup default

# Create rule + table for dual-ISP routing:
ip rule add from 10.0.1.0/24 table 100        # traffic from subnet → ISP A
ip route add default via 1.2.3.1 table 100    # ISP A gateway

ip rule add from 10.0.2.0/24 table 200        # traffic from subnet → ISP B  
ip route add default via 5.6.7.1 table 200    # ISP B gateway
```

**ECMP (Equal-Cost Multi-Path):** Multiple next-hops with equal metric — kernel load balances:
```bash
ip route add 0.0.0.0/0 nexthop via 1.2.3.1 weight 1 \
                        nexthop via 5.6.7.1 weight 1
```

**Kubernetes uses policy routing:** Each node adds routes for pod CIDRs. Flannel/Calico add table rules so pod traffic goes via the correct tunnel or interface.

## Follow-ups

- What is the `local` routing table and why does it have higher priority than `main`?
- How does BGP (Bird, FRRouting) inject routes into the Linux kernel routing table?
- What is source routing and why is it often disabled for security?
