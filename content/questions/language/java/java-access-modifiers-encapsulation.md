---
title: How do Access Modifiers and Encapsulation work in Java?
topics: [java]
roles: [backend]
tags: [java, core, access-modifiers, encapsulation, oop, security]
time: 15
updated: 2026-07-27
---

## Question

Explain Java Access Modifiers (`public`, `protected`, package-private default, `private`) across classes, packages, and subclasses, and how Encapsulation protects internal object state.

## Answer

**What are Access Modifiers?**
Access Modifiers in Java regulate the visibility and accessibility of classes, constructors, methods, and fields from other classes and packages.

```mermaid
flowchart TD
    Public["public\n("Visible Everywhere")"] --> Protected["protected\n("Same Package + Subclasses")"]
    Protected --> Default["package-private (default)\n("Same Package Only")"]
    Default --> Private["private\n("Same Class Only")"]

```

**Access Visibility Matrix:**

| Modifier | Same Class | Same Package | Subclass (Different Package) | World (Anywhere) |
|---|---|---|---|---|
| **`private`** | **Yes** | No | No | No |
| **Default (no modifier)** | **Yes** | **Yes** | No | No |
| **`protected`** | **Yes** | **Yes** | **Yes** | No |
| **`public`** | **Yes** | **Yes** | **Yes** | **Yes** |

**1. Detail on Each Access Modifier:**

- **`private` (Strict Restrictions):** Accessible ONLY within the top-level class declaring it. Fields should almost always be declared `private` to enforce **Encapsulation**.
- **Default (Package-Private - No Modifier):** Accessible by any class within the **same package**. Not accessible outside the package, even by subclasses.
- **`protected` (Inheritance Access):** Accessible by any class in the **same package**, plus any **subclass** in a different package (via inheritance).
- **`public` (Unrestricted):** Accessible from anywhere in the application. Top-level classes can only be `public` or package-private.

**2. Principles of Encapsulation:**
Encapsulation is one of the four fundamental OOP principles. It bundles data (fields) and code (methods) together into a single unit (class) while **hiding internal state** from external direct modification.

**Bad Example (Violates Encapsulation):**
```java
public class BankAccount {
    public double balance; // DANGER! Any external code can set balance = -1000000;
}
```

**Good Example (Encapsulated):**
```java
public class BankAccount {
    private double balance; // Private field protects internal state

    public BankAccount(double initialBalance) {
        if (initialBalance < 0) {
            throw new IllegalArgumentException("Initial balance cannot be negative");
        }
        this.balance = initialBalance;
    }

    public double getBalance() {
        return balance;
    }

    // Controlled mutation with business validation
    public void deposit(double amount) {
        if (amount <= 0) {
            throw new IllegalArgumentException("Deposit amount must be positive");
        }
        this.balance += amount;
    }
}
```

**Benefits of Encapsulation:**
1. **Control & Validation:** Prevents invalid or corrupted state by validating inputs before field mutation.
2. **Flexibility & Refactoring:** Internal implementation details can change (e.g. changing field storage representation) without breaking external code using getters/setters.
3. **Immutability:** Omitting setter methods creates read-only immutable objects.

## Follow-ups

- Can a top-level Java class be declared `private` or `protected`? (No, only `public` or default package-private).
- How do Java 9 Modules (JPMS) add another layer of accessibility control over `public` classes (`exports` / `opens`)?
- What is defensive copying and why is it needed even when fields are declared `private final`?
