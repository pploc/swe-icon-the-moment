---
title: Walk through the 0/1 Knapsack problem and its space optimization
topics: [dsa]
roles: [backend]
tags: [knapsack, dynamic-programming, dp, optimization]
time: 25
updated: 2026-07-27
---

## Question

Given n items each with a weight and value, and a knapsack of capacity W, find the maximum total value you can carry. Walk through the DP solution, prove correctness, and show the space optimization from O(nW) to O(W).

## Answer

**Subproblem:** `dp[i][w]` = max value using items 1..i with weight budget w.

**Recurrence:**
```
dp[0][w] = 0  (no items → no value)
dp[i][w] = dp[i-1][w]                          if wt[i] > w  (can't take item)
dp[i][w] = max(dp[i-1][w],                     (skip item i)
               dp[i-1][w - wt[i]] + val[i])    (take item i)
```

**Why it's correct:** At each step we make the binary choice to include item i or not. The previous row (items 1..i-1) provides optimal solutions for smaller subproblems — this is optimal substructure.

**Example:**

Items: `[(wt=2, val=6), (wt=2, val=10), (wt=3, val=12)]`, W=5.

```
    w=0  w=1  w=2  w=3  w=4  w=5
i=0   0    0    0    0    0    0
i=1   0    0    6    6    6    6
i=2   0    0   10   10   16   16
i=3   0    0   10   12   16   22   ← max=22
```

Answer: 22 (take items 2 and 3: wt=5, val=22).

**Space optimization to O(W):** Only the previous row is needed. Iterate w from W down to wt[i] to avoid using updated values (same item twice):

```python
dp = [0] * (W + 1)
for wt_i, val_i in items:
    for w in range(W, wt_i - 1, -1):   # MUST go right-to-left
        dp[w] = max(dp[w], dp[w - wt_i] + val_i)
```

**Why right-to-left?** If we go left-to-right, `dp[w - wt_i]` may already be updated with item i → effectively allows taking item i multiple times (→ unbounded knapsack). Right-to-left reads the "previous" value.

**Unbounded knapsack** (items can be reused): iterate w left-to-right.

## Follow-ups

- How does fractional knapsack differ? (Greedy by value/weight ratio — works because items are divisible.)
- Reconstruct which items were chosen, not just the max value. (Backtrack through the 2D DP table.)
- How do you handle W and weights being floats? (Scale to integers, or use a different formulation.)
