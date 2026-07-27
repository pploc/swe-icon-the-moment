---
title: How do Functional Interfaces and Lambda Expressions work in Java?
topics: [java]
roles: [backend]
tags: [java, core, functional-interface, lambda, method-references, java8]
time: 20
updated: 2026-07-27
---

## Question

Explain `@FunctionalInterface` and Lambda Expressions in Java: single abstract method (SAM) rule, built-in functional interfaces (`Function`, `Predicate`, `Supplier`, `Consumer`), Method References (`::`), and effectively final local variables.

## Answer

**What is a Functional Interface?**
Introduced in Java 8, a **Functional Interface** is an interface that contains **EXACTLY ONE abstract method** (Single Abstract Method - SAM). It can contain any number of `default` or `static` methods.

The `@FunctionalInterface` annotation informs the compiler to generate an error if the interface declares more than one abstract method.

```mermaid
flowchart TD
    FI["@FunctionalInterface\n("Single Abstract Method SAM")"]
    FI --> Func["Function<T, R>\nInput T -> Output R\n(apply)"]
    FI --> Pred["Predicate<T>\nInput T -> boolean\n(test)"]
    FI --> Supp["Supplier<T>\nNo input -> Output T\n(get)"]
    FI --> Cons["Consumer<T>\nInput T -> void\n(accept)"]

```

**The 4 Core Built-in Functional Interfaces (`java.util.function`):**

1. **`Function<T, R>`:** Takes an argument of type `T` and returns a result of type `R` (`R apply(T t)`).
   ```java
   Function<String, Integer> stringLength = str -> str.length();
   int len = stringLength.apply("Hello"); // 5
   ```

2. **`Predicate<T>`:** Takes an argument of type `T` and returns a `boolean` (`boolean test(T t)`). Used for filtering.
   ```java
   Predicate<Integer> isEven = num -> num % 2 == 0;
   boolean result = isEven.test(4); // true
   ```

3. **`Supplier<T>`:** Takes NO arguments and returns a result of type `T` (`T get()`). Used for lazy initialization.
   ```java
   Supplier<Double> randomSupplier = () -> Math.random();
   double val = randomSupplier.get();
   ```

4. **`Consumer<T>`:** Takes an argument of type `T` and returns `void` (`void accept(T t)`). Used for side effects.
   ```java
   Consumer<String> printConsumer = str -> System.out.println("LOG: " + str);
   printConsumer.accept("System initialized");
   ```

**Primitive Specializations:**
To avoid autoboxing overhead (`Function<Integer, Double>`), Java provides primitive specializations: `IntPredicate`, `LongSupplier`, `DoubleConsumer`, `IntToDoubleFunction`.

**2. Method References (`::`):**
Method references provide a compact syntax for lambdas that simply invoke an existing method:

| Method Reference Type | Lambda Equivalent | Method Reference Syntax |
|---|---|---|
| Static Method | `x -> Math.abs(x)` | `Math::abs` |
| Instance Method of particular object | `x -> System.out.println(x)` | `System.out::println` |
| Instance Method of arbitrary object of a type | `str -> str.toUpperCase()` | `String::toUpperCase` |
| Constructor Reference | `() -> new ArrayList<>()` | `ArrayList::new` |

**3. Effectively Final Variable Constraint:**
A lambda expression can access local variables from its enclosing scope ONLY if the variable is `final` or **effectively final** (never mutated after assignment).

```java
public void process() {
    int factor = 2; // Effectively final
    
    List<Integer> numbers = List.of(1, 2, 3);
    List<Integer> scaled = numbers.stream()
            .map(n -> n * factor) // SAFE: 'factor' is not mutated
            .toList();

    // factor = 3; // UNCOMMENTING THIS CAUSES COMPILE ERROR in lambda map above!
}
```
*Why?* Local variables live on the stack and disappear when the method exits. The lambda captures a copy of the primitive value. If the variable could mutate, the captured copy and stack variable would become out of sync.

## Follow-ups

- What is the difference between `UnaryOperator<T>` and `Function<T, T>`?
- How does `BiFunction<T, U, R>` and `BiConsumer<T, U>` handle two input parameters?
- How does the JVM compile lambdas using `invokedynamic` and `LambdaMetafactory` instead of generating anonymous inner class `.class` files?
