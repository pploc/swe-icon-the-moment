---
title: How do you binary search in a rotated sorted array?
topics: [dsa]
roles: [backend]
tags: [binary-search, rotated-array, sorted, search]
time: 20
updated: 2026-07-27
---

## Question

A sorted array has been rotated at an unknown pivot (e.g., `[4,5,6,7,0,1,2]`). Find a target value in O(log n). Handle duplicates as a follow-up.

## Answer

**Key observation:** Even after rotation, at least one half of any split is always sorted. Use this to prune the search space.

```python
def search(nums, target):
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = lo + (hi - lo) // 2
        if nums[mid] == target:
            return mid
        # Left half is sorted
        if nums[lo] <= nums[mid]:
            if nums[lo] <= target < nums[mid]:
                hi = mid - 1   # target in sorted left
            else:
                lo = mid + 1   # target in right (rotated)
        # Right half is sorted
        else:
            if nums[mid] < target <= nums[hi]:
                lo = mid + 1   # target in sorted right
            else:
                hi = mid - 1   # target in left (rotated)
    return -1
```

```mermaid
flowchart TD
    A["[4,5,6,7,0,1,2] target=0"] --> B["mid=7, lo=4"]
    B --> C{Is left sorted?\nnums-lo-=4 ≤ nums-mid-=7?}
    C -- yes --> D{target 0 in [4,7)?}
    D -- no --> E["lo = mid+1, search [0,1,2]"]
    E --> F["mid=1, target=0 found at index 4 ✓"]
```

**Correctness:** At each step, we determine which half is sorted (guaranteed sorted because we compare endpoints). If the target falls in the sorted range, search there; otherwise search the other side.

**With duplicates** (e.g., `[1,3,1,1,1]`): When `nums[lo] == nums[mid]`, we can't tell which half is sorted. Shrink lo: `lo += 1`. This degrades to O(n) worst case.

**Find rotation pivot:** Binary search for the inflection point where `nums[i] > nums[i+1]`. The pivot + 1 is the minimum element index.

**Find minimum in rotated array:** Modified binary search: if `nums[mid] > nums[hi]`, minimum is in right half; else in left half including mid.

## Follow-ups

- What if the array was rotated multiple times? (Still the same algorithm — rotation count doesn't matter, only the sorted halves matter.)
- How do you handle the edge case of no rotation (already sorted)?
- Can you find the number of times the array was rotated? (= index of minimum element.)
