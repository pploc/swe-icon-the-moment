---
title: What are Canonical, Compact, and Custom Constructors in Java Records?
topics: [java]
roles: [backend]
tags: [java, records, constructor, compact-constructor, defensive-copy]
time: 15
updated: 2026-07-27
---

## Question

Explain constructor options in Java Records: Canonical Constructor, Compact Constructor, Custom/Secondary Constructors, validation, field normalization, and defensive copies for mutable record components (`List`, `Date`).

## Answer

**Constructor Types in Java Records:**
Java Records automatically generate a **Canonical Constructor** matching the record component signature. Developers can customize construction using Compact Constructors or Secondary Constructors.

```mermaid
flowchart TD
    Record[Record Declaration: UserDto]
    Record -->|Compiler Generated| Canonical[Canonical Constructor\nUserDto(Long id, String email)]
    Record -->|Developer Validation| Compact[Compact Constructor\npublic UserDto { ... }]
    Record -->|Overloaded Factory| Secondary[Secondary Constructor\npublic UserDto(String email)]
```

**1. Compact Constructor (Validation & Normalization):**
A Compact Constructor omits the parameter list entirely (`public RecordName { ... }`). Component variables are implicitly available as local variables. Assignments to instance fields happen automatically at the end of the compact constructor block.

```java
public record UserRegistrationRequest(String username, String email, List<String> roles) {

    // Compact Constructor
    public UserRegistrationRequest {
        // 1. Validation
        Objects.requireNonNull(username, "Username required");
        Objects.requireNonNull(email, "Email required");

        if (username.length() < 3) {
            throw new IllegalArgumentException("Username must be at least 3 chars");
        }

        // 2. Normalization (Reassigning local parameter before implicit field assignment!)
        username = username.trim().toLowerCase();
        email = email.trim().toLowerCase();

        // 3. Defensive Copy for Mutable Components! (CRITICAL)
        roles = (roles == null) ? List.of() : List.copyOf(roles);
    }
}
```

**CRITICAL: Defensive Copying in Records:**
Records are intended to be immutable. However, if a record component is a mutable collection (`List<String>`), external code can modify the internal record state after construction unless a **defensive copy** is made!

```java
// DANGER — Without Defensive Copying:
List<String> mutableRoles = new ArrayList<>(List.of("USER"));
UserRegistrationRequest req = new UserRegistrationRequest("alice", "alice@example.com", mutableRoles);

mutableRoles.add("ADMIN"); // MODIFIES RECORD INTERNAL STATE! Mutability leak!

// FIX — Inside Compact Constructor:
// roles = List.copyOf(roles); // Creates an unmodifiable copy!
```

**2. Canonical Constructor (Explicit Declaration):**
You can write the full Canonical Constructor explicitly if needed:

```java
public record Point(int x, int y) {
    // Explicit Canonical Constructor
    public Point(int x, int y) {
        if (x < 0 || y < 0) {
            throw new IllegalArgumentException("Coordinates must be positive");
        }
        this.x = x; // Must assign all fields manually!
        this.y = y;
    }
}
```

**3. Secondary / Overloaded Constructors:**
Secondary constructors MUST delegate to the canonical constructor (or another constructor) using `this(...)` as the very first statement:

```java
public record Money(BigDecimal amount, String currency) {
    
    // Canonical Compact Constructor
    public Money {
        Objects.requireNonNull(amount, "Amount cannot be null");
        Objects.requireNonNull(currency, "Currency cannot be null");
        amount = amount.setScale(2, RoundingMode.HALF_UP);
    }

    // Secondary Constructor 1: Default currency to USD
    public Money(BigDecimal amount) {
        this(amount, "USD"); // Delegates to canonical constructor!
    }

    // Secondary Constructor 2: Overloaded double constructor
    public Money(double amount, String currency) {
        this(BigDecimal.valueOf(amount), currency); // Delegates!
    }
}
```

**Constructor Restrictions in Records:**
1. A Compact Constructor cannot contain explicit field assignments to `this.x = x;` (field assignments are inserted automatically by compiler at the end of the block).
2. A Secondary Constructor CANNOT assign fields directly; it MUST delegate to `this(...)`.

## Follow-ups

- How do accessor methods for mutable components (e.g. `roles()`) also require defensive copying?
- Can a record constructor throw checked exceptions?
- How does `List.copyOf()` differ from `Collections.unmodifiableList()` regarding null handling and defensive copying?
