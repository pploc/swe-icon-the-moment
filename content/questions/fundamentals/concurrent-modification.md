---
title: How do you handle ConcurrentModificationException in Java?
topics: [concurrency]
roles: [backend]
tags: [concurrent-modification, fail-fast, iterator, copy-on-write, java]
time: 15
updated: 2026-07-27
---

## Question

Explain the `ConcurrentModificationException`: when it's thrown, why it's "fail-fast" not a correctness guarantee, and the three correct approaches to iterate-while-modify.

## Answer

**What triggers it:** Modifying a collection (add/remove) while iterating it with the collection's own iterator. The iterator checks a `modCount` field; if it changed since the iterator was created, it throws `CME`.

```java
List<String> list = new ArrayList<>();
for (String s : list) {
    if (s.isEmpty()) list.remove(s);  // CME! modCount changed
}
```

**"Fail-fast" doesn't mean thread-safety:** CME is a best-effort detection. The iterator *may* throw CME; it's not guaranteed. Don't use CME as a thread-safety mechanism.

**Solution 1 — Iterator's own `remove()`:**
```java
Iterator<String> it = list.iterator();
while (it.hasNext()) {
    if (it.next().isEmpty()) it.remove();  // safe — iterator tracks modCount
}
```

**Solution 2 — Collect then remove (avoid mutation during iteration):**
```java
List<String> toRemove = list.stream()
    .filter(String::isEmpty)
    .collect(Collectors.toList());
list.removeAll(toRemove);
// Or: list.removeIf(String::isEmpty);  // Java 8, uses iterator.remove() internally
```

**Solution 3 — Copy-on-write (`CopyOnWriteArrayList`):**
```java
CopyOnWriteArrayList<String> list = new CopyOnWriteArrayList<>();
// Iterator operates on a snapshot; modifications create a new backing array
// No CME ever; safe for concurrent read+modify
// High cost: every write copies the entire array → only for read-heavy, rarely-written lists
```

**Thread-safe collections and CME:**
- `ConcurrentHashMap` iterators are **weakly consistent** — they don't throw CME; they may or may not reflect concurrent modifications.
- `CopyOnWriteArrayList` iterators operate on a snapshot — never see concurrent modifications, never throw CME.
- `Collections.synchronizedList` — synchronized, but still throws CME if you remove inside a `for-each` without manual synchronization on the list.

## Follow-ups

- Why does `HashMap` use `modCount` and `ArrayList` also use `modCount`? Are they the same counter?
- What is a "weakly consistent" iterator and which Java collections provide it?
- How does `CopyOnWriteArrayList` work internally and what is its memory overhead?
