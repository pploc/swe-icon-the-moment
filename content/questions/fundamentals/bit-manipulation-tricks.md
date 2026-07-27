---
title: What useful bit manipulation tricks should every engineer know?
topics: [dsa]
roles: [backend]
tags: [bit-manipulation, bitwise, tricks, xor, power-of-two]
time: 20
updated: 2026-07-27
---

## Question

Walk through the most useful bit manipulation tricks — isolating bits, clearing bits, XOR properties — and give the algorithm-relevant problems they solve.

## Answer

**Essential tricks:**

```
x & (x-1)      Remove the lowest set bit
                → check power of 2: x > 0 && (x & (x-1)) == 0
                → count set bits: iterate until x==0

x & (-x)       Isolate the lowest set bit (two's complement)
                → used in Fenwick tree to find "responsible range"

x ^ x = 0      XOR with self cancels
x ^ 0 = x      XOR with 0 is identity
                → find the single non-duplicate in array of pairs:
                  XOR all elements; pairs cancel, lone element remains

x >> 1         Divide by 2 (arithmetic right shift for signed)
x << 1         Multiply by 2

(x >> k) & 1  Check if bit k is set

x | (1 << k)  Set bit k
x & ~(1 << k) Clear bit k
x ^ (1 << k)  Toggle bit k
```

**Algorithm applications:**

1. **Count set bits (popcount):** Brian Kernighan's algorithm: loop `x &= x-1` until 0. O(number of set bits).
2. **Single number in array (all others appear twice):** XOR all elements.
3. **Single number appearing once (all others appear three times):** Count bit-by-bit mod 3.
4. **Subsets enumeration:** Iterate from 0 to 2^n-1; bit i set = include element i. Fundamental for bitmask DP.
5. **Swap without temp:** `a ^= b; b ^= a; a ^= b;` (works but don't use in production — obscure and broken when a==b by alias).
6. **Missing number in [0,n]:** XOR all indices 0..n with all array elements. Missing one remains.

```mermaid
flowchart LR
    A["x = 0b1011 0100"] --> B["x & x-1 = 0b1011 0000\n("lowest set bit removed")"]
    A --> C["x & -x = 0b0000 0100\n("only lowest set bit")"]

```

**Bitmask DP example:** `dp[mask]` represents state of visited nodes (TSP, matching). Enumerate all subsets of a set of size n in O(2^n).

**Caveat:** Signed integer overflow on left shift (UB in C); in Java all integers are two's complement, no UB. Use `>>>` for logical right shift in Java.

## Follow-ups

- How does the Fenwick tree use `x & (-x)` to navigate its structure?
- XOR swap is broken when `a` and `b` alias the same memory — why?
- How do you count set bits in O(1) using lookup tables or SIMD popcount?
