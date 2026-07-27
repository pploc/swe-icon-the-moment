---
title: How do Strong, Soft, Weak, and Phantom References work in Java memory management?
topics: [java]
roles: [backend]
tags: [java, memory, reference-types, weakhashmap, phantom-reference, garbage-collection]
time: 25
updated: 2026-07-27
---

## Question

Explain Java Reference Types (`java.lang.ref`): Strong, Soft (`SoftReference`), Weak (`WeakReference`), and Phantom (`PhantomReference`). How do `WeakHashMap`, `ReferenceQueue`, and JDK 9+ `Cleaner` work for off-heap and native resource cleanup?

## Answer

**Java Reference Hierarchy:**
By default, object references in Java are **Strong References**. However, Java provides three weaker reference types in `java.lang.ref` allowing developers to interact with the Garbage Collector to manage memory sensitivity and resource cleanup.

```mermaid
flowchart TD
    Strong[1. Strong Reference\nobj = new Object()] -->|Normal App Code| NoGC[Never GC'd if reachable\nThrows OOM instead]
    Soft[2. SoftReference<T>] -->|Memory Sensitive| SoftGC[GC'd ONLY when JVM\nruns low on memory]
    Weak[3. WeakReference<T>] -->|Cache / Metadata| WeakGC[GC'd on NEXT GC cycle\nregardless of memory size]
    Phantom[4. PhantomReference<T>] -->|Resource Cleanup| PhantomGC[Enqueued in ReferenceQueue\nwhen object is finalized]
```

**1. Strong Reference:**
Standard object assignment: `String s = "Hello"`.
As long as a strong reference chain reaches an object, the GC will NEVER reclaim it. If the JVM runs out of memory, it throws `java.lang.OutOfMemoryError` instead of touching strongly reachable objects.

**2. Soft Reference (`SoftReference<T>`):**
An object referenced ONLY by soft references will survive normal GC cycles, but is guaranteed to be reclaimed by the GC **before the JVM throws an `OutOfMemoryError`**.
- **Primary Use Case:** In-memory caches (e.g., image caches, parsed templates). If memory gets tight, the JVM clears soft references automatically to prevent OOM crashes.

```java
SoftReference<byte[]> cacheRef = new SoftReference<>(new byte[10 * 1024 * 1024]);

// Later...
byte[] data = cacheRef.get();
if (data == null) {
    // Reclaim occurred! Reload data...
    data = loadData();
    cacheRef = new SoftReference<>(data);
}
```

**3. Weak Reference (`WeakReference<T>`) & `WeakHashMap`:**
An object referenced ONLY by weak references is reclaimed by the GC on the **very next GC cycle**, regardless of whether memory is high or low.
- **Primary Use Case — `WeakHashMap`:** A hash map where keys are wrapped in `WeakReference`. When a key object is no longer strongly referenced anywhere else in the application, the GC reclaims the key, and `WeakHashMap` automatically evicts the corresponding map entry!

```java
Map<KeyObject, ExtraMetadata> metadataMap = new WeakHashMap<>();

KeyObject key = new KeyObject("user_123");
metadataMap.put(key, new ExtraMetadata());

// When 'key' variable is set to null or goes out of scope...
key = null; 

System.gc(); // Next GC cycle reclaims 'key' and automatically purges entry from metadataMap!
```

**4. Phantom Reference (`PhantomReference<T>`) & `ReferenceQueue`:**
Unlike Soft/Weak references, calling `phantomRef.get()` **ALWAYS returns `null`**! You cannot access the referent object.
- **Primary Use Case:** Tracking when an object has been reclaimed by GC to perform post-mortem native resource cleanup (replacing `Object.finalize()`, which was deprecated in Java 9 due to performance and safety issues).

**Modern JDK 9+ `Cleaner` API:**
Replaces `finalize()` using PhantomReferences under the hood to clean up native C memory or file descriptors safely:

```java
public class NativeResource implements AutoCloseable {
    private static final Cleaner CLEANER = Cleaner.create();

    // Cleanable State must NOT hold a strong reference to the outer class!
    private static class State implements Runnable {
        private long nativeAddress;

        State(long nativeAddress) {
            this.nativeAddress = nativeAddress;
        }

        @Override
        public void run() {
            if (nativeAddress != 0) {
                System.out.println("Freeing C native memory at address: " + nativeAddress);
                freeCArray(nativeAddress); // Native C call
                nativeAddress = 0;
            }
        }
    }

    private final State state;
    private final Cleaner.Cleanable cleanable;

    public NativeResource(long nativeAddress) {
        this.state = new State(nativeAddress);
        // Register object and cleanup action with Cleaner
        this.cleanable = CLEANER.register(this, state);
    }

    @Override
    public void close() {
        cleanable.clean(); // Triggers State.run() explicitly or automatically on GC!
    }
}
```

## Follow-ups

- Why must the `Runnable` action passed to JDK `Cleaner` NEVER hold a reference to the outer object instance?
- How does `-XX:SoftRefLRUPolicyMSPerMB` control how long SoftReferences persist in memory before being cleared?
- How does `ThreadLocalMap` in Java's `ThreadLocal` class use `WeakReference` for its keys, and why can values still leak memory?
