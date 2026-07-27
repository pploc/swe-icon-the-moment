---
title: How do you implement immutable objects for thread safety?
topics: [concurrency]
roles: [backend]
tags: [immutable, thread-safe, final, defensive-copy, value-objects]
time: 15
updated: 2026-07-27
---

## Question

Explain why immutable objects are inherently thread-safe, the rules for writing an immutable class in Java, and the common pitfalls that violate immutability without appearing to.

## Answer

**Why immutable = thread-safe:** If an object's state never changes after construction, there are no write operations — reads never conflict. No synchronization needed.

**Rules for an immutable class in Java:**

1. **Declare the class `final`** (prevents subclasses from adding mutable state).
2. **All fields `private final`** (no external modification).
3. **No setters.**
4. **Don't expose mutable objects directly** — make defensive copies in constructors and getters.
5. **Perform initialization in the constructor** — all fields set before object escapes.

```java
public final class Money {
    private final long cents;
    private final Currency currency;
    private final List<String> notes;  // mutable — must defensively copy!

    public Money(long cents, Currency currency, List<String> notes) {
        this.cents = cents;
        this.currency = currency;                             // Currency is immutable
        this.notes = Collections.unmodifiableList(new ArrayList<>(notes));  // defensive copy
    }

    public long getCents() { return cents; }
    public List<String> getNotes() { return notes; }  // unmodifiable view
}
```

**Common pitfalls:**

**1. Sharing a mutable object without copying:**
```java
private final Date created;
public Money(Date created) {
    this.created = created;  // WRONG — caller can mutate Date after construction
}
// Fix: this.created = new Date(created.getTime());
```

**2. Returning mutable internal state:**
```java
public Date getCreated() { return created; }  // WRONG — exposes mutable Date
// Fix: return new Date(created.getTime()); or use Instant (immutable)
```

**3. `final` field pointing to mutable collection:**
```java
private final List<String> tags = new ArrayList<>();  // field is final, but list is mutable!
// Fix: use List.of() or Collections.unmodifiableList()
```

**Java records (Java 16+):** Records are naturally immutable — all components are `private final`, accessor methods return the values directly, no setters.
```java
record Money(long cents, Currency currency) {}  // immutable by construction
```

**Value objects (DDD):** Money, PhoneNumber, Email — classic candidates for immutability. Compare by value, not identity.

## Follow-ups

- How does `Collections.unmodifiableList` differ from `List.of()`? (UnmodifiableList wraps a mutable list — mutations via the original reference still affect it. `List.of()` is truly immutable.)
- What is "escape analysis" in the JVM and how does it enable lock elision for immutable objects?
- How do Scala case classes and Rust's default immutability enforce immutability at the language level?
