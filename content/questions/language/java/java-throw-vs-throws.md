---
title: What is the difference between throw and throws in Java?
topics: [java]
roles: [backend]
tags: [java, core, throw, throws, exception-handling, syntax]
time: 15
updated: 2026-07-27
---

## Question

Compare `throw` and `throws` in Java: syntax, purpose, location in code, checked vs unchecked exception declarations, and handling exception re-throwing.

## Answer

**Overview:**
In Java exception handling, `throw` and `throws` serve completely different roles:
- **`throw` (Action Keyword):** Used inside a method body to **explicitly instantiate and throw** a single exception object.
- **`throws` (Declaration Keyword):** Used in a method signature to **declare** the types of checked exceptions that the method might propagate up to its caller.

```mermaid
flowchart LR
    Signature["public void readFile() throws IOException"] -->|Method Signature: throws| Dec["Declares potential checked exceptions to caller"]
    Body["throw new IOException("'File missing'");"] -->|Method Body: throw| Exec["Explicitly triggers/instantiates exception"]

```

**1. `throw` Keyword (Executing an Exception):**
- **Location:** Inside method or block body.
- **Syntax:** `throw exception_instance;`
- Followed by an **instance** of `Throwable` (e.g., `new IllegalArgumentException()`).
- Immediately halts current method execution and transfers control to the nearest matching `catch` block up the call stack.

```java
public void validateAge(int age) {
    if (age < 18) {
        // Explicitly throwing an exception instance
        throw new IllegalArgumentException("Age must be at least 18");
    }
}
```

**2. `throws` Keyword (Declaring Exception Contract):**
- **Location:** In the method signature declaration.
- **Syntax:** `void methodName() throws Exception1, Exception2`
- Followed by exception **class names** (comma-separated).
- Informs callers and the compiler: *"Calling this method might result in these checked exceptions. You MUST handle them (`try-catch`) or declare them in your own signature."*

```java
// Method signature declaring checked IOException
public String readConfigFile(String path) throws IOException, FileNotFoundException {
    FileReader reader = new FileReader(path); // Might throw FileNotFoundException
    BufferedReader bufferedReader = new BufferedReader(reader);
    return bufferedReader.readLine(); // Might throw IOException
}
```

**Checked vs Unchecked Exception Declaration:**
- **Checked Exceptions (`IOException`, `SQLException`):** MUST be declared in the method signature using `throws` if not caught internally.
- **Unchecked Exceptions (`NullPointerException`, `IllegalArgumentException`):** Do NOT need to be declared with `throws` (though can be documented in javadoc).

**Re-throwing Exceptions:**
Catching an exception, performing logging or auditing, and re-throwing it using `throw`:

```java
public void processTransaction(Transaction tx) throws TransactionException {
    try {
        executePayment(tx);
    } catch (PaymentException e) {
        log.error("Payment failed for transaction: {}", tx.getId(), e);
        
        // Re-throwing a wrapped custom exception using 'throw'
        throw new TransactionException("Failed to process transaction", e);
    }
}
```

**Comparison Matrix:**

| Feature | `throw` | `throws` |
|---|---|---|
| **Purpose** | Explicitly raises an exception | Declares potential checked exceptions |
| **Location** | Inside method / block body | In method signature |
| **Followed By** | Exception **instance** (`new Exception()`) | Exception **class names** (`IOException`) |
| **Count** | Can throw only **1** exception at a time | Can declare **multiple** comma-separated classes |
| **Control Flow** | Halts execution immediately | Does not affect execution directly |

## Follow-ups

- What happens if a main method declares `public static void main(String[] args) throws Exception`?
- Can a subclass method override a parent method and declare FEWER exceptions in its `throws` clause? (Yes).
- How does Java 7 multi-catch (`catch (IOException | SQLException e)`) simplify re-throwing exceptions?
