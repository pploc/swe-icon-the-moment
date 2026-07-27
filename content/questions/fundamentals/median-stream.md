---
title: How do you find the running median of a stream of numbers?
topics: [dsa]
roles: [backend]
tags: [heap, median, streaming, two-heaps]
time: 25
updated: 2026-07-27
---

## Question

Design a data structure that supports two operations: `addNum(int num)` and `findMedian()`. Both should be as efficient as possible. Walk through the two-heap approach and analyze time and space.

## Answer

**Key insight:** Split the stream into two halves — the lower half in a max-heap, the upper half in a min-heap. The heaps are always balanced (sizes differ by at most 1).

- **Max-heap (lo):** holds the smaller half; top is the largest of the smaller half.
- **Min-heap (hi):** holds the larger half; top is the smallest of the larger half.

```mermaid
flowchart LR
    subgraph lo ["Max-Heap (lower half)"]
        direction TB
        L1["5"]
        L2["3"]
        L3["2"]
    end
    subgraph hi ["Min-Heap (upper half)"]
        direction TB
        H1["6"]
        H2["8"]
        H3["9"]
    end
    lo -->|"median = avg("5,6")"| hi




```

**`addNum(num)` — O(log n):**
1. Add to `lo` (max-heap).
2. Move `lo.top()` to `hi` (ensures lo.max ≤ hi.min).
3. If `hi.size() > lo.size()`, move `hi.top()` back to `lo` (rebalance).

**`findMedian()` — O(1):**
- If sizes equal: `(lo.top() + hi.top()) / 2.0`
- If lo is larger: `lo.top()`

**Space:** O(n).

**Why this works:** After every insertion, the invariant holds: all elements in `lo` ≤ all elements in `hi`, and sizes differ by ≤ 1. The median is always at the heap tops.

**Variation — sliding window median:** Use two heaps with lazy deletion (a "removed" set; skip deleted elements on peek). O(log n) per operation.

**Alternative for static arrays:** Sort → O(n log n) then O(1) median. Two-heap shines for **streams** (online algorithm).

## Follow-ups

- If the stream contains only integers in [0, 100], how can you find the median in O(1) using a frequency array?
- How does the sliding window median work with lazy deletion?
- What's the space-time tradeoff if you use an order-statistic tree (AVL/Red-Black) instead of two heaps?
