---
title: How does a hash map work under the hood?
topics: [dsa]
roles: [backend, infra]
tags: [hashing, collisions, complexity]
time: 15
updated: 2026-07-26
---

## Question

Walk me through what happens when you insert and look up a key in a hash map.
Why is lookup O(1) on average but O(n) in the worst case, and what do real
implementations do about it?

## Answer

A strong answer covers the full path of an operation:

1. **Hashing** — the key is run through a hash function to produce an integer,
   which is reduced to a bucket index (usually `hash % capacity` or a bit mask
   when capacity is a power of two).
2. **Collisions** — two keys can land in the same bucket. The two classic
   strategies are **chaining** (each bucket holds a linked list or tree of
   entries) and **open addressing** (probe other slots — linear, quadratic, or
   Robin Hood probing).
3. **Load factor & resizing** — when `entries / capacity` passes a threshold
   (~0.75 in Java, similar in Go/Python), the table allocates a bigger array
   and rehashes. Resizing is O(n) but amortised across inserts.
4. **Worst case** — if every key collides (bad hash function, or an attacker
   crafting keys), chaining degrades to a linked-list scan: O(n). Java 8+
   converts long chains to red-black trees (O(log n)); Python and Go use
   randomised/seeded hashes so attackers can't predict bucket placement
   (hash-flooding DoS defence).

Bonus points for mentioning that iteration order is unspecified in most
implementations, and why mutating a key's hash-relevant fields after insertion
breaks the map.

## Follow-ups

- Why do Java's `hashCode()` and `equals()` need to be consistent?
- How would you implement a hash map that must stay fast at a 0.95 load factor?
- What changes in a *concurrent* hash map? (Striped locks, CAS, resize coordination.)
