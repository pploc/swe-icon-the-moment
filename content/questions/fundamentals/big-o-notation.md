---
title: How do you analyze the time and space complexity of an algorithm?
topics: [dsa]
roles: [backend, infra]
tags: [big-o, complexity, analysis]
time: 20
updated: 2026-07-27
---

## Question

Given a piece of code, walk through how you determine its Big-O time and space complexity. What are the rules you apply, and what common mistakes do candidates make?

## Answer

**The core rules:**

1. **Drop constants** — O(2n) → O(n). We care about growth rate, not coefficient.
2. **Drop lower-order terms** — O(n² + n) → O(n²).
3. **Nested loops multiply** — two nested loops over n → O(n²).
4. **Sequential steps add** — two separate O(n) loops → O(n + n) = O(n).
5. **Recursive algorithms** — use the recurrence relation or Master Theorem.

**Master Theorem** for T(n) = aT(n/b) + f(n):

```mermaid
flowchart TD
    A["T(n) = aT(n/b) + f(n)"] --> B{"Compare f('n') vs n^log_b_a"}
    B -->|f("n") < n^log_b_a| C["O(n^log_b_a)\nMerge sort leaf-dominated"]
    B -->|f("n") = n^log_b_a| D["O(n^log_b_a · log n)\nMerge sort balanced"]
    B -->|f("n") > n^log_b_a| E["O(f(n))\nRoot-dominated"]



```

**Common mistakes:**

- Counting the wrong variable (e.g., n as array size vs n as value).
- Forgetting that string concatenation in a loop is O(n²) in languages with immutable strings (Java, Python).
- Confusing space used by the *call stack* (counts as space complexity) with heap allocation.
- Assuming hash map operations are always O(1) — worst case is O(n) with collisions.

**Space complexity** includes both auxiliary space (extra structures) and recursive stack depth. Quicksort is O(log n) space average, O(n) worst.

**Amortized analysis:** Dynamic array append is O(1) amortized — each element is moved at most twice over all operations even though occasional resizes cost O(n).

## Follow-ups

- What is the difference between best, average, and worst case? Give an example where all three differ.
- Explain amortized analysis for a stack with a "double and copy" resize.
- When is O(n log n) optimal for a comparison sort? (Information-theoretic lower bound.)
