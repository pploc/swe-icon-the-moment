---
title: What happens between `kubectl apply` and a running pod?
topics: [containers]
roles: [infra, platform, sre]
tags: [kubernetes, scheduler, kubelet, controllers]
time: 25
updated: 2026-07-26
---

## Question

You run `kubectl apply -f deployment.yaml` for a new Deployment. Walk through
everything that happens until traffic reaches a running container — name the
components and what each one owns.

## Answer

The key idea to demonstrate: Kubernetes is **controllers reconciling desired
state from the API server** — nothing calls anything imperatively.

1. **kubectl → API server** — auth (authn/authz/admission webhooks, defaults
   applied), then the Deployment object is written to **etcd**. That's all
   `apply` does.
2. **Deployment controller** (in controller-manager) notices via its watch:
   desired ReplicaSet missing → creates a ReplicaSet.
3. **ReplicaSet controller**: 3 replicas desired, 0 exist → creates 3 Pod
   objects. They sit **Pending, unscheduled** (`nodeName` empty).
4. **Scheduler** watches for unscheduled pods: filters nodes (resource
   requests, taints/tolerations, affinity, topology spread), scores the
   survivors, binds the pod to a node — again, just a write to the API.
5. **kubelet** on that node sees a pod bound to it: pulls images (CRI →
   containerd), sets up the sandbox, **CNI plugin** wires the pod network and
   assigns the IP, volumes mount (CSI), init containers run, then the main
   containers start. Liveness/readiness probes begin.
6. **Traffic path** — the pod's labels match a Service selector; the
   endpoints controller adds its IP to EndpointSlices **only once readiness
   passes**; kube-proxy (iptables/IPVS/eBPF) programs nodes so the Service
   VIP load-balances to it.

Senior signals: knowing pods stay Pending with a *reason* you can read in
events (`kubectl describe`), that kubelet — not the scheduler — starts
containers, and that readiness gates traffic while liveness restarts.

## Follow-ups

- Rolling update: how do maxSurge/maxUnavailable and readiness interact to keep traffic safe?
- Which rollout strategy would you pick, and why? See [[blue-green-vs-canary]].
- The pod is Running but the Service returns 503s — where do you look, in order?
- What do requests/limits do at *scheduling* time vs *runtime*? (Scheduling uses requests; limits enforce via cgroups — CPU throttling, OOM kills.)
