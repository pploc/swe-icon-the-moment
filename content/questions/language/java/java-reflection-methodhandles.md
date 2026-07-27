---
title: How do MethodHandles and VarHandles compare to Java Reflection?
topics: [java]
roles: [backend]
tags: [java, reflection, methodhandles, varhandles, performance, invokedynamic]
time: 20
updated: 2026-07-27
---

## Question

Explain Java MethodHandles (`java.lang.invoke.MethodHandle`) and VarHandles (`java.lang.invoke.VarHandle`): how they compare to traditional Reflection (`java.lang.reflect`), security checks at lookup vs invocation time, JIT compiler inlining, and replacing `sun.misc.Unsafe`.

## Answer

**Evolution of Dynamic Access in Java:**
- **Java 1.1:** Traditional Reflection (`java.lang.reflect.Method`, `Field`).
- **Java 7:** MethodHandles (JEP 292 / `invokedynamic` infrastructure).
- **Java 9:** VarHandles (JEP 260 / replacing `sun.misc.Unsafe` field memory operations).

```mermaid
flowchart TD
    Reflection[Traditional Reflection\nMethod.invoke()\nSecurity check on EVERY call\nNo JIT inlining] --> MethodHandles[MethodHandles\nMethodHandle.invokeExact()\nSecurity check ONLY at lookup\nJIT inlinable like bytecode]
    MethodHandles --> VarHandles[VarHandles\nVarHandle.compareAndSet()\nReplaces sun.misc.Unsafe\nFine-grained atomic memory fences]
```

**1. `MethodHandle` vs Reflection:**
A `MethodHandle` is a typed, directly executable reference to an underlying method, constructor, or field.

**Key Difference — Security Checking Phase:**
- **Reflection (`Method.invoke`):** Performs access permission checks (`setAccessible(true)`), argument boxing, and type checking **on EVERY single invocation**. This causes significant runtime performance overhead and prevents JIT compiler inlining.
- **MethodHandles (`MethodHandle.invokeExact`):** Performs security access checks **ONCE** during lookup phase when `MethodHandles.lookup()` creates the handle. Subsequent invocations execute with performance near native Java bytecode execution, enabling full JIT inlining!

```java
public class MethodHandleDemo {
    public String greet(String name) {
        return "Hello, " + name;
    }

    public static void main(String[] args) throws Throwable {
        MethodHandleDemo instance = new MethodHandleDemo();

        // 1. Lookup Phase (Access checks happen HERE)
        MethodHandles.Lookup lookup = MethodHandles.lookup();
        MethodType type = MethodType.methodType(String.class, String.class); // Return type, Arg types
        MethodHandle mh = lookup.findVirtual(MethodHandleDemo.class, "greet", type);

        // 2. Invocation Phase (Fast, JIT inlinable!)
        String result = (String) mh.invokeExact(instance, "World");
        System.out.println(result); // Prints "Hello, World"
    }
}
```

**2. `VarHandle` (Replacing `sun.misc.Unsafe`):**
Introduced in Java 9, `VarHandle` provides a safe, standard alternative to `sun.misc.Unsafe` for performant atomic field access, atomic Compare-And-Swap (CAS), and fine-grained memory barriers.

```java
public class Counter {
    private volatile int count = 0;

    // VarHandle reference to 'count' field
    private static final VarHandle COUNT_HANDLE;

    static {
        try {
            COUNT_HANDLE = MethodHandles.lookup()
                .findVarHandle(Counter.class, "count", int.class);
        } catch (ReflectiveOperationException e) {
            throw new ExceptionInInitializerError(e);
        }
    }

    public void increment() {
        // Atomic CAS operation without Unsafe!
        int current;
        do {
            current = (int) COUNT_HANDLE.getVolatile(this);
        } while (!COUNT_HANDLE.compareAndSet(this, current, current + 1));
    }

    // Atomic Acquire / Release memory fence access
    public void setRelease(int val) {
        COUNT_HANDLE.setRelease(this, val); // Release fence write
    }
}
```

**VarHandle Memory Access Modes:**
- `get` / `set`: Plain access (no memory barrier).
- `getVolatile` / `setVolatile`: Standard `volatile` memory barrier semantics.
- `getAcquire` / `setRelease`: Acquire/Release memory barrier (lighter than volatile; prevents reordering).
- `compareAndSet` / `getAndAdd`: Atomic CAS and read-and-add operations.

**Comparison Summary:**

| Feature | Reflection (`Method`) | `MethodHandle` | `VarHandle` |
|---|---|---|---|
| **Primary Focus** | Class metadata inspection | Dynamic method invocation | Dynamic field & array memory access |
| **Security Check** | Per invocation | At lookup time only | At lookup time only |
| **JIT Inlining** | Poor | **Excellent** | **Excellent** |
| **Atomic/CAS Ops** | None | None | **Native Support (replaces Unsafe)** |

## Follow-ups

- What is the difference between `invokeExact()` vs `invoke()` on a `MethodHandle`?
- How does `invokedynamic` (indy) instruction in Java bytecode use Bootstrapping and MethodHandles for lambdas?
- What is `MethodHandles.privateLookupIn()` and how does it respect Java 9 JPMS Module boundaries?
