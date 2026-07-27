---
title: How do custom Java Annotations and Retention Policies work?
topics: [java]
roles: [backend]
tags: [java, annotations, retention, reflection, meta-annotations]
time: 15
updated: 2026-07-27
---

## Question

Explain Java Annotations: Meta-annotations (`@Retention`, `@Target`, `@Inherited`, `@Repeatable`), Retention Policies (`SOURCE`, `CLASS`, `RUNTIME`), and how to read runtime annotations using Reflection.

## Answer

**What is a Java Annotation?**
An annotation is a form of metadata added to Java code elements (classes, methods, fields, parameters) that provides instructions to the compiler, code analysis tools, or runtime frameworks.

**Meta-Annotations (Annotating Annotations):**

1. **`@Retention` (How long the annotation is kept):**
   - **`RetentionPolicy.SOURCE`:** Kept only in source code. Discarded during compilation (`javac`). Cannot be read via Reflection. *Examples:* `@Override`, `@SuppressWarnings`, Lombok annotations.
   - **`RetentionPolicy.CLASS` (Default):** Saved in `.class` bytecode files, but NOT loaded into JVM memory at runtime. Used by bytecode manipulation tools (ASM, ByteBuddy).
   - **`RetentionPolicy.RUNTIME`:** Saved in `.class` bytecode AND loaded into JVM memory at runtime. Accessible via Reflection (`clazz.getAnnotation()`). *Examples:* `@Autowired`, `@Entity`, `@Transactional`.

2. **`@Target` (Where the annotation can be applied):**
   - `ElementType.TYPE` (Class, Interface, Enum, Record)
   - `ElementType.METHOD`
   - `ElementType.FIELD`
   - `ElementType.PARAMETER`
   - `ElementType.TYPE_USE` (Java 8+ Type Annotations)

3. **`@Inherited`:** Allows child classes to inherit annotations placed on parent classes.
4. **`@Repeatable`:** Allows applying the same annotation multiple times to a single element.

```mermaid
flowchart LR
    Source[Source Code .java] -->|RetentionPolicy.SOURCE| Compiler[javac Compiler]
    Compiler -->|RetentionPolicy.CLASS| Bytecode[.class File]
    Bytecode -->|RetentionPolicy.RUNTIME| JVM[JVM Runtime Memory]
    JVM -->|Reflection| Framework[Spring / Reflection]
```

**Creating a Custom RUNTIME Annotation:**
```java
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.METHOD, ElementType.TYPE})
@Inherited
public @interface RateLimit {
    int requestsPerSecond() default 10;
    String key() default "";
    TimeUnit timeUnit() default TimeUnit.SECONDS;
}
```

**Reading Annotations via Reflection:**
```java
public class RateLimitAspect {

    public void processMethod(Object target, String methodName) throws Exception {
        Method method = target.getClass().getMethod(methodName);

        // Check if annotation is present
        if (method.isAnnotationPresent(RateLimit.class)) {
            RateLimit limit = method.getAnnotation(RateLimit.class);
            
            int rps = limit.requestsPerSecond();
            TimeUnit unit = limit.timeUnit();
            
            System.out.println("Applying rate limit: " + rps + " requests per " + unit);
        }
    }
}
```

**Repeatable Annotations Example:**
```java
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
@Repeatable(RoleChecks.class) // Container annotation
public @interface RoleCheck {
    String role();
}

@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface RoleChecks {
    RoleCheck[] value();
}

// Usage:
@RoleCheck(role = "ADMIN")
@RoleCheck(role = "MANAGER")
public void executeOperation() {}
```

## Follow-ups

- What is `AnnotatedElement` interface in Java Reflection API?
- Why are annotation attribute return types restricted to primitives, String, Class, Enums, Annotations, and 1D arrays?
- What is `@AliasFor` in Spring Framework and how does it extend Java's native meta-annotation capability?
