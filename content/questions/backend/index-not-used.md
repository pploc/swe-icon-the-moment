---
title: Your query is slow despite an index — why?
topics: [databases, performance]
roles: [backend]
tags: [postgres, indexes, query-plans, btree]
time: 20
updated: 2026-07-26
---

## Question

A production query on a 200M-row Postgres table takes 30 seconds. There's an
index on the filtered column, but `EXPLAIN` shows a sequential scan. List the
reasons this happens and how you'd fix each one.

## Answer

The checklist a senior engineer walks through:

1. **The planner is right — the query isn't selective.** If the predicate
   matches ~10%+ of rows, a seq scan genuinely beats millions of random index
   probes. Fix the access pattern, not the planner.
2. **A function or cast defeats the index.** `WHERE lower(email) = …` or
   `WHERE varchar_col = 123` (implicit cast) can't use a plain B-tree on the
   column. Fix: expression index (`ON lower(email)`) or match the types.
3. **Leading-column rule.** A composite index on `(a, b)` doesn't help
   `WHERE b = …` alone. Fix: reorder or add an index.
4. **Wildcard/pattern shape.** `LIKE '%foo'` can't use a B-tree;
   `LIKE 'foo%'` can (with the right collation/operator class). Trigram (GIN)
   indexes handle infix search.
5. **Stale statistics.** After a bulk load, the planner may think the table is
   tiny or the value is rare. Fix: `ANALYZE`, tune autovacuum, raise the
   statistics target for skewed columns.
6. **Bloat / visibility.** Dead tuples make index-only scans impossible
   (heap fetches for visibility) and inflate costs. Fix: vacuum.
7. **`OR`, `NOT IN`, type-mismatched joins** — rewrite as `UNION`, `NOT
   EXISTS`, fix the join keys.

Then verify with `EXPLAIN (ANALYZE, BUFFERS)` — look at *actual* rows vs
estimated (a 1000× estimation error points at stats), and buffers read
(cold cache vs genuinely bad plan).

## Follow-ups

- Why are random index probes expensive? What changes on NVMe vs spinning disk?
- When is an index a net *loss*? (Write amplification, HOT-update defeat.)
- What does a covering index / index-only scan buy, and what breaks it?
