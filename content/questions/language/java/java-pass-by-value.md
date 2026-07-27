---
title: Is Java Pass-by-Value or Pass-by-Reference?
topics: [java]
roles: [backend]
tags: [java, core, pass-by-value, memory, references, stack-heap]
time: 15
updated: 2026-07-27
---

## Question

Explain Java parameter passing semantics: is Java pass-by-value or pass-by-reference? Demonstrate what happens when passing primitives vs object references into methods, and common misconceptions.

## Answer

**The Absolute Rule:**
Java is **STRICTLY Pass-By-Value**. There is NO pass-by-reference in Java.

**What "Pass-By-Value" Means:**
When a method is invoked, a **copy of the value** of each argument is created on the call stack frame and passed into the method parameters.

- For **Primitive Types** (`int`, `double`, `boolean`), the value passed is a copy of the actual primitive value.
- For **Object Reference Types** (`String`, `List`, custom objects), the value passed is a **copy of the reference (memory address pointer)** pointing to the object on the heap!

```mermaid
flowchart TD
    subgraph Stack Frame (Caller)
        p["p = 0x100"]
    end
    subgraph Stack Frame("Method Call")
        param["person = 0x100("Copy of Address Pointer!")"]
    end
    subgraph Heap Memory
        Obj["Person Object (0x100)\n{"name: 'Alice'"}"]
    end
    
    p -->|Points to| Obj
    param -->|Points to SAME| Obj

```

**Proof 1: Modifying Object State inside Method (Mutates Heap Object)**
Because both the caller's reference variable and the method parameter copy point to the **same heap memory address**, mutating the object's internal fields inside the method affects the original object.

```java
public class Person {
    String name;
    public Person(String name) { this.name = name; }
}

public class Demo {
    public static void changeName(Person person) {
        person.name = "Bob"; // Modifies the object's internal state on the heap!
    }

    public static void main(String[] args) {
        Person p = new Person("Alice");
        changeName(p);
        System.out.println(p.name); // Prints "Bob"
    }
}
```

**Proof 2: Reassigning the Reference Parameter (Proves Pass-By-Value!)**
If Java were truly pass-by-reference, reassigning `person = new Person("Charlie")` inside the method would change the caller's variable `p` to point to Charlie. In Java, it does NOT!

```java
public class Demo {
    public static void swapReference(Person person) {
        // 'person' is a COPY of reference 'p'
        person = new Person("Charlie"); // Reassigning local copy parameter to new memory address 0x200!
        person.name = "David";
    }

    public static void main(String[] args) {
        Person p = new Person("Alice"); // p points to 0x100 ("Alice")
        swapReference(p);
        System.out.println(p.name); // PRINTS "Alice", NOT "Charlie" or "David"!
    }
}
```

```mermaid
flowchart TD
    subgraph Stack Frame (Caller)
        p["p = 0x100"]
    end
    subgraph Stack Frame("Method Call")
        param["person = 0x200("Reassigned locally!")"]
    end
    subgraph Heap Memory
        Obj1["Person Object (0x100)\n{"name: 'Alice'"}"]
        Obj2["Person Object (0x200)\n{"name: 'David'"}"]
    end
    
    p --> Obj1
    param --> Obj2

```

**Summary Table:**

| Parameter Type | What is Copied? | Can method modify original variable in caller? | Can method modify internal object fields? |
|---|---|---|---|
| Primitive (`int`, `boolean`) | Primitive data value | No | N/A (no fields) |
| Object Reference (`Person`, `List`) | Reference pointer (memory address) | No (cannot reassign reference `p`) | **Yes** (via getters/setters/fields) |

## Follow-ups

- Why is swap `swap(int a, int b)` impossible to implement in plain Java without wrapper classes or arrays?
- How does memory layout in Java (Stack vs Heap) support this pass-by-value model?
- Does `AtomicReference` or array wrappers allow simulating reference parameter mutation in Java?
