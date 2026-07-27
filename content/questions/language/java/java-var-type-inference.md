---
title: How does Local Variable Type Inference (var) work in Java?
topics: [java]
roles: [backend]
tags: [java, var, type-inference, java10, readability]
time: 15
updated: 2026-07-27
---

## Question

Explain Local Variable Type Inference (`var`) introduced in Java 10 (JEP 286): static typing guarantees, compilation bytecode generation, allowed vs forbidden contexts, non-denotable types, and best practices.

## Answer

**What is `var` in Java?**
Introduced in Java 10, `var` allows developers to omit explicit manifest type declarations for local variables with initializers, letting the compiler infer the exact type at compile time.

**CRITICAL MISCONCEPTION: `var` is NOT Dynamic Typing!**
Java remains **100% statically typed**. `var` is NOT `variant` or `dynamic` (like JavaScript or Python).
- The compiler determines the exact type of the variable at compile time based on the right-hand side initializer expression.
- The compiled `.class` bytecode contains the exact explicit type. There is ZERO runtime performance cost!

```java
// Java Source Code
var name = "Alice";
var list = new ArrayList<String>();

// Compiled Bytecode Equivalent (Identical!)
String name = "Alice";
ArrayList<String> list = new ArrayList<String>();
```

**1. Allowed Contexts for `var`:**
- Local variables with initializers inside methods, constructors, or initializer blocks.
- Loop variables in `for` loops and enhanced `for-each` loops.
- Lambda parameters (Java 11+ JEP 323, allowed for adding annotations like `@NotNull var x`).
- Try-with-resources resource declarations.

```java
// Allowed Examples
var userMap = Map.of(1L, "Alice", 2L, "Bob");

for (var entry : userMap.entrySet()) {
    System.out.println(entry.getKey() + ": " + entry.getValue());
}

try (var reader = Files.newBufferedReader(path)) {
    var line = reader.readLine();
}

// Lambda parameter with annotation (Java 11)
BiFunction<String, String, String> concat = (@NotNull var a, @NotNull var b) -> a + b;
```

**2. FORBIDDEN Contexts for `var`:**
`var` can ONLY be used for local variables with initializers.

```java
// FORBIDDEN Examples (Compiler Errors!)
public class User {
    private var username = "Alice"; // 1. NO field declarations!
}

public var getUser() { return "Alice"; } // 2. NO method return types!

public void setUser(var name) {} // 3. NO method parameter types!

var x; // 4. NO declaration without initializer!

var list = null; // 5. NO initializing with null (type cannot be inferred)!

var lambda = () -> System.out.println("Hi"); // 6. NO standalone lambda initializers!

var array = {1, 2, 3}; // 7. NO array initializer without explicit array type!
// FIX: var array = new int[]{1, 2, 3};
```

**3. Non-Denotable Types & Anonymous Classes:**
`var` can capture anonymous class types and intersection types that cannot be named explicitly in standard Java syntax (non-denotable types):

```java
// Anonymous class with custom method 'greet()'
var person = new Object() {
    String name = "Alice";
    public void greet() {
        System.out.println("Hello " + name);
    }
};

// Valid! Compiler knows 'person' has method greet()!
person.greet(); // Traditional 'Object person' would cause a compiler error here!
```

**Best Practices for `var`:**
1. **Use when type is obvious from initializer:**
   ```java
   var customer = new Customer(); // Good: redundant explicit type removed
   var stream = list.stream();   // Good
   ```
2. **Avoid when initializer lacks clarity:**
   ```java
   var result = process(); // BAD! What is 'result'? Hard to read without IDE hover.
   // BETTER:
   QueryResult result = process();
   ```
3. **Beware with Generic Diamond Operator:**
   ```java
   var list = new ArrayList<>(); // Inferred as ArrayList<Object>! Probably not what you wanted.
   // FIX:
   var list = new ArrayList<String>(); // Inferred as ArrayList<String>
   ```

## Follow-ups

- Is `var` a reserved keyword in Java? (No, `var` is a *restricted type name*; code can still use `int var = 5;` for backward compatibility.)
- How does `var` behave with primitive type widening (e.g. `var x = 10;` vs `var x = 10.0;`)?
- Why did Java 11 add syntax for `var` in lambda parameters if type inference already existed?
