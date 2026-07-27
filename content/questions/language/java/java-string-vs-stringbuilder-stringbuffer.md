---
title: What is the difference between String, StringBuilder, and StringBuffer in Java?
topics: [java]
roles: [backend]
tags: [java, core, string, stringbuilder, stringbuffer, memory, immutability]
time: 15
updated: 2026-07-27
---

## Question

Compare `String`, `StringBuilder`, and `StringBuffer` in Java: immutability rationale, thread safety, performance in concatenation loops, and memory allocation.

## Answer

**Overview:**
Text handling in Java relies on three core classes:
- **`String`:** Immutable character sequence stored in the String Constant Pool or Heap.
- **`StringBuilder`:** Mutable character sequence. Fast, non-thread-safe.
- **`StringBuffer`:** Mutable character sequence. Thread-safe (`synchronized` methods).

```mermaid
flowchart TD
    CharSeq["CharSequence Interface"]
    CharSeq --> String["String\n("Immutable, Thread-Safe")"]
    CharSeq --> SB["StringBuilder\n("Mutable, NOT Thread-Safe, FAST")"]
    CharSeq --> SBuffer["StringBuffer\n("Mutable, Synchronized Thread-Safe, SLOWER")"]

```

**1. Immutability vs Mutability:**
- **`String`:** Immutable. Once created, internal character array cannot be modified. Any modification operation (`concat()`, `substring()`, `toLowerCase()`) creates a **new String object** on the heap.
- **`StringBuilder` & `StringBuffer`:** Mutable. Operations like `append()` or `insert()` modify the existing internal character buffer array in place without creating new objects.

**2. Concatenation Performance Trap:**
Using `String` concatenation inside loops creates $N$ intermediate String objects, causing severe GC pressure and $O(N^2)$ memory copying performance!

```java
// BAD: Creates 10,000 intermediate String objects on the heap! O(N^2)
String result = "";
for (int i = 0; i < 10000; i++) {
    result += i; // Compiles to creating a new StringBuilder per iteration!
}

// GOOD: Single StringBuilder modifies internal buffer in-place O(N)
StringBuilder sb = new StringBuilder();
for (int i = 0; i < 10000; i++) {
    sb.append(i);
}
String result = sb.toString();
```

**Comparison Matrix:**

| Feature | `String` | `StringBuilder` | `StringBuffer` |
|---|---|---|---|
| **Mutability** | **Immutable** | **Mutable** | **Mutable** |
| **Thread Safety** | Thread-Safe (by immutability) | **NOT Thread-Safe** | **Thread-Safe** (`synchronized`) |
| **Performance** | Slow for concatenation | **Fastest** (No locks) | Slower (Lock overhead) |
| **Storage** | String Pool / Heap | Heap | Heap |
| **Introduced** | Java 1.0 | Java 1.5 | Java 1.0 |

**When to Use Which:**
- Use `String` when text is constant or rarely modified (e.g. Map keys, DTO fields).
- Use `StringBuilder` for single-threaded string manipulations and loops (default choice for string assembly).
- Use `StringBuffer` ONLY in multi-threaded legacy code requiring shared mutable string buffers (rarely needed in modern Java).

## Follow-ups

- How does Java compiler automatically convert single-line String `+` concatenations into `StringBuilder` or `StringConcatFactory` (Java 9+ `invokedynamic`)?
- What is default initial capacity of `StringBuilder` (16 characters) and how does buffer expansion work?
- Why is `String` marked as a `final` class in Java?
