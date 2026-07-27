---
title: How does Java Reflection compare to Compile-Time Annotation Processing?
topics: [java]
roles: [backend]
tags: [java, reflection, annotation-processing, apt, lombok, performance]
time: 20
updated: 2026-07-27
---

## Question

Compare runtime Reflection (`java.lang.reflect`) with Compile-Time Annotation Processing (JSR 269): performance overhead, security implications, code generation capabilities, and how frameworks like MapStruct, Lombok, and Micronaut leverage APT over reflection.

## Answer

**Overview:**
Java frameworks historically relied heavily on runtime reflection to inspect annotations, instantiate beans, and invoke private methods. Modern Java frameworks (Micronaut, Quarkus) and code generation libraries (MapStruct, Lombok) shift work to compile-time annotation processing to achieve faster startup times and lower memory footprints.

**1. Runtime Reflection (`java.lang.reflect`):**
Executes at runtime by inspecting JVM class metadata.

```java
// Runtime Reflection Example
Class<?> clazz = Class.forName("com.example.UserService");
Constructor<?> cons = clazz.getDeclaredConstructor();
cons.setAccessible(true); // Bypass private access
Object instance = cons.newInstance();

Method method = clazz.getDeclaredMethod("process", String.class);
method.invoke(instance, "input");
```

**Reflection Drawbacks:**
- **Performance Overhead:** JIT optimization (inlining, devirtualization) is hindered; dynamic resolution check on every call.
- **Security:** Requires breaking encapsulation (`setAccessible(true)`), restricted in modern Java Modules (JPMS).
- **Type Safety:** Errors (missing method, type mismatch) occur at runtime during production execution.
- **Memory & Startup Time:** High reflection caching and class introspection on application startup (e.g., traditional Spring applications).

**2. Compile-Time Annotation Processing (APT / JSR 269):**
Hooks into `javac` during compilation. Scans AST (Abstract Syntax Tree), inspects annotations, and generates standard `.java` source files before compilation completes.

```mermaid
flowchart LR
    Source["Java Source Files\nwith Annotations"] --> Javac["javac Compiler"]
    Javac --> Processor["AnnotationProcessor\nProcess AST"]
    Processor --> GenCode["Generate New .java Files"]
    GenCode --> Javac2["Compile All .java Files"]
    Javac2 --> Bytecode[".class Files"]

```

**Comparison Matrix:**

| Feature | Runtime Reflection | Annotation Processing (APT) |
|---|---|---|
| **Execution Time** | Application Runtime | Compilation (`javac`) |
| **Performance Impact** | Slow (invocation & lookup overhead) | Zero runtime overhead (pure Java code generated) |
| **Error Detection** | Runtime exceptions | Compile-time errors & warnings |
| **GraalVM Native Image Support** | Requires complex JSON configuration | Out of the box (standard generated classes) |
| **Startup Speed** | Slower (class scanning & metadata caching) | Instant (no scanning needed) |

**Real-world Framework Implementations:**
- **Lombok:** Uses non-standard internal compiler AST manipulation (`com.sun.tools.javac`) to inject getters, setters, and constructors into existing classes.
- **MapStruct:** Standard JSR 269 processor that reads interface mapping methods (`@Mapping`) and generates type-safe implementation classes with plain Java getters/setters.
- **Micronaut / Quarkus:** Performs dependency injection (DI) and AOP bean generation entirely at compile time, eliminating Spring's runtime classpath scanning and reflection.

**Writing a Simple Custom Annotation Processor:**
```java
@SupportedAnnotationTypes("com.example.AutoLog")
@SupportedSourceVersion(SourceVersion.RELEASE_17)
public class AutoLogProcessor extends AbstractProcessor {

    @Override
    public boolean process(Set<? extends TypeElement> annotations, RoundEnvironment roundEnv) {
        for (Element element : roundEnv.getElementsAnnotatedWith(AutoLog.class)) {
            String className = element.getSimpleName().toString();
            processingEnv.getMessager().printMessage(
                Diagnostic.Kind.NOTE, "Found @AutoLog on: " + className);
            
            // Generate source code using JavaFileObject / JavaPoet library...
        }
        return true; // Claim annotations
    }
}
```

## Follow-ups

- How does MethodHandles and VarHandles (`java.lang.invoke`) bridge the gap between reflection and native performance?
- Why does GraalVM Native Image compilation prefer APT over runtime reflection?
- What is bytecode manipulation (ByteBuddy, ASM) and how does it differ from APT?
