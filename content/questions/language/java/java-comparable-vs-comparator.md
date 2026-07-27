---
title: How do Comparable and Comparator compare for sorting in Java?
topics: [java]
roles: [backend]
tags: [java, core, comparable, comparator, sorting, collections]
time: 15
updated: 2026-07-27
---

## Question

Compare `Comparable<T>` and `Comparator<T>` in Java: Natural Ordering vs Custom Ordering, `compareTo()` vs `compare()` contracts, Lambda Comparators, null handling (`nullsFirst`, `nullsLast`), and comparator chaining (`comparing().thenComparing()`).

## Answer

**Natural vs Custom Ordering:**
In Java, sorting objects in arrays (`Arrays.sort()`) or collections (`Collections.sort()`, `TreeSet`, `TreeMap`) requires defining element order.

- **`Comparable<T>` (Natural Ordering):** Implemented BY the domain class itself (`class Person implements Comparable<Person>`). Defines the single default / natural sort order for objects of that class.
- **`Comparator<T>` (Custom / External Ordering):** Implemented as a separate class or inline Lambda expression. Defines alternative, multiple, or dynamic sort orders without modifying the domain class.

```mermaid
flowchart TD
    subgraph Comparable (Natural Order)
        Class[Person Class] -->|Implements| Comp[Comparable Interface]
        Comp -->|Single Method| CompareTo["compareTo(Person other)\nDefines natural sort order"]
    end
    subgraph Comparator (Custom / External Order)
        External[External Code / Lambda] -->|Passes| Comp2[Comparator Interface]
        Comp2 -->|Single Method| Compare["compare(Person p1, Person p2)\nDefines alternative sort order"]
    end
```

**1. `Comparable<T>` Implementation:**
```java
public class Person implements Comparable<Person> {
    private final String name;
    private final int age;

    public Person(String name, int age) {
        this.name = name;
        this.age = age;
    }

    // Natural sort order: by Age ascending
    @Override
    public int compareTo(Person other) {
        return Integer.compare(this.age, other.age);
    }
}

// Usage:
List<Person> people = new ArrayList<>(...);
Collections.sort(people); // Uses Person.compareTo() natural order
```

**Return Value Contract for `compareTo()` and `compare()`:**
- Returns **Negative Integer** ($< 0$): `this` (or `p1`) is LESS than `other` (or `p2`) $\rightarrow$ placed before.
- Returns **Zero** ($0$): `this` (or `p1`) is EQUAL to `other` (or `p2`).
- Returns **Positive Integer** ($> 0$): `this` (or `p1`) is GREATER than `other` (or `p2`) $\rightarrow$ placed after.

**CRITICAL BUG WARNING — Integer Subtraction in Comparators:**
```java
// BAD! Integer overflow risk!
public int compare(Person p1, Person p2) {
    return p1.getScore() - p2.getScore(); // If p1.score is Integer.MIN_VALUE, subtraction overflows!
}

// GOOD: Always use primitive wrapper compare methods
public int compare(Person p1, Person p2) {
    return Integer.compare(p1.getScore(), p2.getScore());
}
```

**2. Modern Lambda Comparators & Chaining (Java 8+):**
Instead of writing verbose anonymous classes, use `Comparator.comparing()` and `thenComparing()`:

```java
// Multi-field sorting: Sort by Name ascending, then by Age descending
Comparator<Person> customComparator = Comparator
    .comparing(Person::getName)
    .thenComparing(Person::getAge, Comparator.reverseOrder());

List<Person> people = getPeople();
people.sort(customComparator); // Uses List.sort(Comparator)
```

**3. Null-Safe Sorting (`nullsFirst` / `nullsLast`):**
Calling `compareTo()` on or against `null` elements in a collection causes a `NullPointerException`. `Comparator` provides null-safe factory wrappers:

```java
// Nulls placed at the BEGINNING of the sorted list
Comparator<Person> nullSafeNameComparator = Comparator.comparing(
    Person::getName,
    Comparator.nullsFirst(String::compareTo)
);

// Entire object can be null:
Comparator<Person> nullSafePersonComparator = Comparator.nullsLast(
    Comparator.comparing(Person::getAge)
);
```

**Comparison Matrix:**

| Feature | `Comparable<T>` | `Comparator<T>` |
|---|---|---|
| **Package** | `java.lang` | `java.util` |
| **Method** | `int compareTo(T o)` | `int compare(T o1, T o2)` |
| **Modifies Class?** | Must modify domain class source code | Does NOT modify domain class |
| **Number of Sort Orders** | Only 1 (Natural order) | Unlimited (multiple custom orderings) |
| **Lambda Support** | No (requires class implementation) | **Yes** (Functional Interface) |

## Follow-ups

- Why should `compareTo()` consistency with `equals()` be maintained (`a.compareTo(b) == 0` iff `a.equals(b)`)?
- How does `TreeSet` handle duplicate elements when using a custom `Comparator` vs `equals()`?
- How do `Collections.reverseOrder()` and `Comparator.reversed()` differ?
