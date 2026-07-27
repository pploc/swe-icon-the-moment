---
title: How do Primitives, Wrapper Classes, and Autoboxing work in Java?
topics: [java]
roles: [backend]
tags: [java, core, primitives, autoboxing, unboxing, memory, cache-pool]
time: 20
updated: 2026-07-27
---

## Question

Compare Java primitive types (`int`, `double`, `boolean`) with Wrapper classes (`Integer`, `Double`, `Boolean`): memory layout differences, autoboxing/unboxing performance overhead, `NullPointerException` pitfalls, and the Integer Cache Pool (`-128 to 127`).

## Answer

**Primitives vs Wrapper Classes:**
Java has 8 primitive data types (`byte`, `short`, `int`, `long`, `float`, `double`, `boolean`, `char`) and corresponding object Wrapper classes (`Byte`, `Short`, `Integer`, `Long`, `Float`, `Double`, `Boolean`, `Character`).

```mermaid
flowchart LR
    subgraph Stack Allocation (Primitive)
        P[int x = 42] -->|4 bytes raw value| DirectMemory[Stack Memory]
    end
    subgraph Heap Allocation (Wrapper Object)
        Ref[Integer y = 42] -->|8-byte reference| HeapHeader[Object Header 12B + int 4B + Padding = 24 Bytes!]
    end
```

**Memory & Performance Comparison:**

| Feature | Primitive (`int`) | Wrapper Class (`Integer`) |
|---|---|---|
| **Memory Allocation** | Stack (or inside object fields on heap) | Object on Heap (High memory footprint) |
| **Size** | Exactly 4 bytes | ~24 bytes (12B header + 4B int + 8B ref) |
| **Nullability** | Cannot be `null` (default 0) | **Can be `null`** |
| **Generics Support** | No (`List<int>` illegal) | Yes (`List<Integer>`) |
| **Performance** | Extremely fast (direct CPU registers) | Slower (pointer dereferencing & GC overhead) |

**Autoboxing and Unboxing:**
Introduced in Java 5, the compiler automatically converts between primitives and wrappers:
- **Autoboxing:** Primitive $\rightarrow$ Wrapper (compiles to `Integer.valueOf(int)`).
- **Unboxing:** Wrapper $\rightarrow$ Primitive (compiles to `integer.intValue()`).

**1. Critical Trap: `NullPointerException` on Unboxing:**
If a wrapper object is `null` and the compiler attempts to unbox it into a primitive, a `NullPointerException` is thrown!

```java
public class UnboxingTrap {
    public static void main(String[] args) {
        Integer count = null;
        
        // UNBOXING TRAP! Compiles to count.intValue() -> Throws NullPointerException!
        int value = count; 
        
        // Ternary Operator Unboxing Trap:
        boolean flag = true;
        Integer num = null;
        // Result type is primitive 'int', forcing 'num' to unbox -> NPE!
        int result = flag ? 10 : num; 
    }
}
```

**2. Performance Overhead in Loops:**
Autoboxing inside tight loops creates millions of short-lived wrapper objects on the heap, triggering heavy GC pressure!

```java
// BAD: Autoboxing inside loop creates 1,000,000 Integer objects!
Long sum = 0L; // Wrapper Long!
for (long i = 0; i < 1_000_000; i++) {
    sum += i; // Unboxes sum, adds i, autoboxes result into NEW Long object!
}

// GOOD: Use primitive long
long sum = 0L;
for (long i = 0; i < 1_000_000; i++) {
    sum += i;
}
```

**3. The Integer Cache Pool (`-128 to 127`):**
To save memory, the JVM caches `Integer` objects for values between `-128` and `127` (inclusive) inside `IntegerCache`. `Integer.valueOf(x)` returns cached instances for values in this range.

```java
Integer a = 100;
Integer b = 100;
System.out.println(a == b); // TRUE! Both point to the SAME cached object instance (0x100)!

Integer c = 200;
Integer d = 200;
System.out.println(c == d); // FALSE! Outside cache range (-128 to 127); separate instances!

System.out.println(c.equals(d)); // TRUE! Always use equals() for object reference comparison!
```

**Tuning the Cache Range:**
You can increase the upper limit of the Integer Cache via JVM flag:
```bash
-XX:AutoBoxCacheMax=1000
```

## Follow-ups

- Do `Byte`, `Short`, `Long`, and `Character` wrapper classes also have cache pools?
- Why should you use `equals()` rather than `==` when comparing two `Long` wrapper objects?
- How do Primitive Streams (`IntStream`, `LongStream`, `DoubleStream`) eliminate autoboxing in stream pipelines?
