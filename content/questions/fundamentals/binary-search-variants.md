---
title: What are the off-by-one pitfalls in binary search, and how do you find the leftmost/rightmost occurrence?
topics: [dsa]
roles: [backend]
tags: [binary-search, off-by-one, sorted-array]
time: 20
updated: 2026-07-27
---

## Question

Binary search looks simple but is notoriously tricky to get right. Explain the classic pitfalls and then show how to implement "find first occurrence" and "find last occurrence" of a target in a sorted array with duplicates.

## Answer

**Classic pitfalls:**

1. **Integer overflow:** `mid = (lo + hi) / 2` overflows for large indices. Use `mid = lo + (hi - lo) / 2`.
2. **Off-by-one in loop condition:** `while (lo < hi)` vs `while (lo <= hi)` — the choice determines when to stop.
3. **Infinite loop:** `lo = mid` without shrinking the window when `lo == mid` and the condition doesn't advance.

**Template — find leftmost (first) occurrence:**

```
lo = 0, hi = n - 1
while lo < hi:
    mid = lo + (hi - lo) // 2
    if arr[mid] < target:
        lo = mid + 1
    else:
        hi = mid          # don't exclude mid; it might be the answer
return lo if arr[lo] == target else -1
```

**Template — find rightmost (last) occurrence:**

```
lo = 0, hi = n - 1
while lo < hi:
    mid = lo + (hi - lo + 1) // 2   # ceiling to avoid infinite loop
    if arr[mid] > target:
        hi = mid - 1
    else:
        lo = mid
return lo if arr[lo] == target else -1
```

**Why `+1` in ceiling mid?** When `hi = lo + 1`, floor mid = lo → `lo = mid = lo` → infinite loop. Ceiling mid = hi breaks the cycle.

```mermaid
flowchart LR
    A["[1,2,2,2,3"]  target=2"] --> B["lo=0 hi=4"]
    B --> C["mid=2 arr=2 → hi=2"]
    C --> D["mid=1 arr=2 → hi=1"]
    D --> E["lo=hi=1 → return 1 ✓ (first)"]

```

**Standard library equivalents:** Java `Arrays.binarySearch` returns any match (not leftmost). Python `bisect.bisect_left` / `bisect_right` give exact left/right insertion points.

## Follow-ups

- How would you binary-search on a **function** rather than an array (predicate search)?
- Search in a rotated sorted array — how do you adapt binary search?
- Binary search on the answer: explain "minimize the maximum load" problems.
