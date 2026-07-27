---
title: Explain the edit distance (Levenshtein) problem and its DP recurrence
topics: [dsa]
roles: [backend]
tags: [edit-distance, levenshtein, dynamic-programming, string]
time: 20
updated: 2026-07-27
---

## Question

Given two strings, find the minimum number of insertions, deletions, and substitutions to convert one into the other (edit distance). Derive the DP recurrence and describe the space optimization.

## Answer

**Recurrence:** Let `dp[i][j]` = edit distance between `word1[0..i-1]` and `word2[0..j-1]`.

```
dp[0][j] = j   (insert j chars)
dp[i][0] = i   (delete i chars)

if word1[i-1] == word2[j-1]:
    dp[i][j] = dp[i-1][j-1]     # chars match, no cost
else:
    dp[i][j] = 1 + min(
        dp[i-1][j],     # delete from word1
        dp[i][j-1],     # insert into word1
        dp[i-1][j-1]    # substitute
    )
```

**Example:** `horse` → `ros` (answer: 3)

```
    ""  r  o  s
""   0  1  2  3
h    1  1  2  3
o    2  2  1  2
r    3  2  2  2
s    4  3  3  2
e    5  4  4  3
```

The 3 operations: delete h, delete r (→ orse→ose), substitute e→s? Actually: (horse→rorse via subst, rorse→rose delete r, rose→ros delete e). Many paths lead to the minimum.

**Space optimization:** Only two rows are needed at any time (current and previous). Reduce from O(m·n) to O(min(m,n)):

```python
prev = list(range(n+1))
for i in range(1, m+1):
    curr = [i] + [0]*n
    for j in range(1, n+1):
        if word1[i-1] == word2[j-1]:
            curr[j] = prev[j-1]
        else:
            curr[j] = 1 + min(prev[j], curr[j-1], prev[j-1])
    prev = curr
```

**Applications:** Spell checking, DNA sequence alignment, fuzzy search, diff tools.

**Weighted edit distance:** Different costs for insert/delete/substitute. Same recurrence with different constants — used in bioinformatics (substitution matrices like BLOSUM).

## Follow-ups

- How does edit distance relate to the Longest Common Subsequence? (LCS can derive edit distance: `edit_dist = m + n - 2*LCS`.)
- How would you reconstruct the actual sequence of edits, not just the count? (Backtrack through the DP table.)
- What is Jaro-Winkler distance and when is it used instead of Levenshtein?
