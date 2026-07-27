---
title: What is a segment tree and how do you build one for range queries?
topics: [dsa]
roles: [backend]
tags: [segment-tree, range-query, lazy-propagation, prefix-sum]
time: 25
updated: 2026-07-27
---

## Question

Explain the segment tree data structure. Show how to build one for range sum queries and point updates in O(log n). Then explain lazy propagation for range updates.

## Answer

**Segment tree:** A binary tree where each node stores the aggregate (sum, min, max) of a contiguous subarray. Leaves hold individual elements.

```mermaid
graph TD
    root["[0-5] sum=21"] --> left["[0-2] sum=9"]
    root --> right["[3-5] sum=12"]
    left --> ll["[0-1] sum=5"]
    left --> lr["[2-2] val=4"]
    right --> rl["[3-4] sum=7"]
    right --> rr["[5-5] val=5"]
    ll --> lll["[0-0] val=2"]
    ll --> llr["[1-1] val=3"]
    rl --> rll["[3-3] val=3"]
    rl --> rlr["[4-4] val=4"]

```

**Build:** Recursively split [lo, hi] into [lo, mid] and [mid+1, hi]. O(n) time, O(4n) space (array representation).

**Point update:** Walk from root, update the affected path to the leaf. O(log n).

**Range query:** Decompose [ql, qr] into O(log n) non-overlapping segments, aggregate results. O(log n).

```python
def query(node, lo, hi, ql, qr):
    if ql > hi or qr < lo: return 0       # out of range
    if ql <= lo and hi <= qr: return tree[node]  # fully covered
    mid = (lo + hi) // 2
    return (query(2*node, lo, mid, ql, qr) +
            query(2*node+1, mid+1, hi, ql, qr))
```

**Lazy propagation (range updates):**
When updating a range [ql, qr] by +delta, instead of propagating to all leaves immediately, store the pending update at the highest covering nodes. Push down lazily when those nodes are later visited.

Without lazy: range update = O(n). With lazy: O(log n).

**Segment tree vs prefix sum:**

| | Prefix Sum | Segment Tree |
|---|---|---|
| Build | O(n) | O(n) |
| Range query | O(1) | O(log n) |
| Point update | O(n) rebuild | O(log n) |
| Range update | O(n) | O(log n) with lazy |

Use prefix sums for static arrays with frequent queries. Use segment tree for dynamic updates.

## Follow-ups

- How does a segment tree with lazy propagation handle "set all elements in range to X"?
- What is a merge sort tree (segment tree of sorted vectors) and what problems does it solve?
- How does a persistent segment tree differ from a standard one?
