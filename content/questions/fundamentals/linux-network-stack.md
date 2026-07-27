---
title: How does the Linux network stack process an incoming packet?
topics: [os-linux]
roles: [backend, infra]
tags: [network-stack, packet-processing, netfilter, iptables, socket-buffer, linux]
time: 25
updated: 2026-07-27
---

## Question

Trace an incoming TCP packet from NIC to the application: DMA into ring buffer, NAPI poll, protocol stack processing, netfilter/iptables hooks, socket buffer, and the `recv()` call. Where can each stage become a bottleneck?

## Answer

**Packet journey from NIC to application:**

```mermaid
flowchart TD
    Packet["Packet arrives at NIC"] --> DMA["DMA into NIC ring buffer\n (kernel memory, no CPU)"]
    DMA --> IRQ["Interrupt → NAPI poll\n (disable further interrupts)"]
    IRQ --> SKB["Create sk_buff\n (socket buffer)\nframe header stripped"]
    SKB --> L2["L2 processing\n (Ethernet, bridge, vlan)"]
    L2 --> NF1["netfilter: PREROUTING\n (iptables/nftables)"]
    NF1 --> Route["Routing decision\n (local or forward?)"]
    Route --> NF2["netfilter: INPUT\n (firewall rules)"]
    NF2 --> L4["L4 processing\n (TCP: reassembly,\nACK, flow control)"]
    L4 --> SockBuf["Socket receive buffer\n (sk->sk_receive_queue)"]
    SockBuf --> App["Application recv ()"]



```

**Key data structures:**

- **`sk_buff` (skb):** The kernel's network packet structure. Contains: data pointers, protocol headers, metadata (interface, timestamp, mark). Passed through all network layers without copying data (just pointer manipulation).

- **NIC ring buffer:** A fixed-size circular buffer of pre-allocated DMA descriptors. NIC fills them; kernel drains them. If the kernel is too slow → ring buffer fills → **packet drop (RX drop)**.

**Bottleneck stages:**

1. **NIC ring buffer overflow:** `ethtool -G eth0 rx 4096` — increase ring buffer size.
2. **Softirq overloaded:** `NET_RX` softirq runs on one CPU → IRQ affinity tuning.
3. **Socket receive buffer full:** `setsockopt(SO_RCVBUF)` or `net.core.rmem_max`.
4. **Application not reading fast enough:** `recv()` rate too slow → buffer fills → TCP window closes (backpressure).

**Monitoring drops:**
```bash
ethtool -S eth0 | grep -i drop      # NIC-level drops
netstat -s | grep "receive errors"   # IP/TCP errors
cat /proc/net/dev | awk '/eth0/{print $3, $5}'  # RX packets, errs
ss -s                                # socket statistics
```

**Netfilter hooks (iptables):**
- `PREROUTING`: before routing (NAT, DNAT).
- `INPUT`: packets to local process.
- `FORWARD`: packets forwarded (router).
- `OUTPUT`: locally generated.
- `POSTROUTING`: after routing (SNAT, masquerade).

**XDP bypass:** For ultra-high performance, XDP hooks at the NIC driver level — before `sk_buff` allocation, before all of the above. 10-100M packets/sec possible.

## Follow-ups

- What is GRO (Generic Receive Offload) and how does it reduce per-packet overhead?
- How does the RSS (Receive-Side Scaling) distribute packets across CPU cores via IRQ affinity?
- How does Cilium replace iptables with eBPF for Kubernetes pod networking?
