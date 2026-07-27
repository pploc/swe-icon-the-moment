---
title: How does topological sort work and what problems does it solve?
topics: [dsa]
roles: [backend]
tags: [topological-sort, dag, kahn, dfs, cycle-detection]
time: 20
updated: 2026-07-27
---

## Question

Explain topological sort: what it is, when it's applicable, and walk through both the DFS-based and Kahn's (BFS/in-degree) algorithms. How do you detect if topological sort is impossible?

## Answer

**Topological sort** produces a linear ordering of vertices in a Directed Acyclic Graph (DAG) such that for every edge u→v, u appears before v. Only possible if the graph is a DAG (no cycles).

**Applications:** Build systems (compile A before B), course prerequisites, task scheduling, dependency resolution.

```mermaid
graph LR
    A[A: Compile Core] --> C[C: Compile App]
    B[B: Compile Utils] --> C
    C --> D[D: Link Binary]
    D --> E[E: Run Tests]
```
Valid order: A, B, C, D, E (or B, A, C, D, E).

**Algorithm 1 — Kahn's (BFS-based):**
1. Compute in-degree for every vertex.
2. Enqueue all vertices with in-degree 0.
3. While queue non-empty: dequeue u, add to result, decrement in-degree of u's neighbors; enqueue any that reach 0.
4. If result length < V → cycle exists.

**Algorithm 2 — DFS-based:**
1. DFS from each unvisited node.
2. On finishing a node (all descendants visited), push it to a stack.
3. The stack reversed is the topological order.
4. During DFS, if you reach a node in the current path (gray/in-progress) → cycle.

**Cycle detection:** Kahn's: result.size() < V. DFS: encountering a "gray" node.

```mermaid
flowchart TD
    A[Kahn's Algorithm] --> B[Compute in-degrees]
    B --> C[Queue nodes with in-degree 0]
    C --> D{Queue empty?}
    D -- no --> E[Dequeue u, add to result]
    E --> F[Decrement neighbors' in-degrees]
    F --> G[Enqueue newly zero-degree nodes]
    G --> D
    D -- yes --> H{result.size == V?}
    H -- yes --> I[Valid topological order]
    H -- no --> J[Cycle detected!]
```

**Which to use?** Kahn's is easier to implement iteratively and gives a canonical cycle detection path. DFS-based is compact and naturally fits recursive code.

## Follow-ups

- Can a graph have multiple valid topological orderings? When is it unique? (Unique iff there's a Hamiltonian path through the DAG.)
- How do you find all topological orderings? (Backtracking — exponential.)
- How is topological sort used in dynamic programming on DAGs?
