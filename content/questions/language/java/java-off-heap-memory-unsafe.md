---
title: How does Direct Off-Heap Memory and the Foreign Function & Memory API work?
topics: [java]
roles: [backend, infra]
tags: [java, off-heap, direct-byte-buffer, Panama, FFM-API, MemorySegment]
time: 25
updated: 2026-07-27
---

## Question

Explain Off-Heap Memory in Java: Direct ByteBuffers (`ByteBuffer.allocateDirect`), why off-heap memory avoids GC overhead and zero-copy I/O, the legacy `sun.misc.Unsafe`, and the modern Foreign Function & Memory (FFM / Project Panama) API (Java 22+).

## Answer

**What is Off-Heap Memory?**
Off-heap memory is memory allocated outside the standard JVM Garbage-Collected (GC) heap, directly from the operating system's native process memory space.

**Why Use Off-Heap Memory?**
1. **GC Overhead Elimination:** Millions of objects stored off-heap do NOT count toward JVM heap size (`-Xmx`). Avoids GC pauses and STW scans.
2. **Zero-Copy Native I/O:** OS network (`sendfile`/`epoll`) and disk drivers cannot directly access JVM heap memory due to GC object relocation. On-heap data must be copied to a temporary native buffer before syscalls. Off-heap memory avoids this extra copy!

```mermaid
flowchart TD
    subgraph On-Heap Transfer (2 Copies)
        HeapMem[JVM Heap Object] -->|1. Copy to Native Buffer| TempBuffer[Temp Native Buffer]
        TempBuffer -->|2. DMA Transfer| NIC1[Network Card / Disk]
    end
    subgraph Off-Heap Transfer (Zero-Copy)
        DirectBuffer[Direct Off-Heap Memory] -->|1. Direct DMA Transfer| NIC2[Network Card / Disk]
    end
```

**1. Traditional `ByteBuffer.allocateDirect()`:**
```java
// Allocates 10 MB off-heap memory
ByteBuffer directBuffer = ByteBuffer.allocateDirect(10 * 1024 * 1024);

directBuffer.putInt(42);
directBuffer.flip();
socketChannel.write(directBuffer); // Zero-copy write to OS socket!
```

**Direct Memory Management:**
- Max direct memory size: `-XX:MaxDirectMemorySize=2g` (defaults to `-Xmx`).
- Cleanup: Direct buffers use PhantomReferences/Cleaners. Explicit deallocation is impossible in traditional Java; native memory is freed only when the Java `DirectByteBuffer` wrapper object is GC'd.

**2. Modern Foreign Function & Memory API (FFM / Project Panama - Java 22):**
JEP 454 (FFM API) replaces unsafe practices (`sun.misc.Unsafe`, JNI) with a safe, efficient API for accessing off-heap memory (`MemorySegment`, `Arena`) and calling native C libraries directly from Java code.

```java
import java.lang.foreign.*;

public class FfmDemo {
    public void allocateAndAccessNativeMemory() {
        // Arenas control off-heap memory lifecycles explicitly!
        try (Arena arena = Arena.ofConfined()) { // Bound to try-with-resources block!
            
            // Allocate 100 native 64-bit integers off-heap
            MemorySegment segment = arena.allocate(ValueLayout.JAVA_LONG, 100);

            // Write values
            for (long i = 0; i < 100; i++) {
                segment.setAtIndex(ValueLayout.JAVA_LONG, i, i * 10);
            }

            // Read value
            long val = segment.getAtIndex(ValueLayout.JAVA_LONG, 5);
            System.out.println("Value at index 5: " + val); // Prints 50

        } // Off-heap memory is INSTANTLY freed here! Deterministic, zero-GC waiting!
    }
}
```

**Calling C Standard Library Functions directly from Java (FFM API):**
```java
public class NativeCallDemo {
    public static void main(String[] args) throws Throwable {
        Linker linker = Linker.nativeLinker();
        SymbolLookup stdlib = linker.defaultLookup();

        // Find C 'strlen' function
        MemorySegment strlenAddress = stdlib.find("strlen").orElseThrow();

        // Create method handle for strlen: size_t strlen(const char *s)
        MethodHandle strlen = linker.downcallHandle(
            strlenAddress,
            FunctionDescriptor.of(ValueLayout.JAVA_LONG, ValueLayout.ADDRESS)
        );

        try (Arena arena = Arena.ofConfined()) {
            MemorySegment cString = arena.allocateFrom("Hello Native World!");
            long length = (long) strlen.invokeExact(cString);
            System.out.println("String length from C strlen(): " + length); // Prints 19
        }
    }
}
```

**Off-Heap Framework Uses:**
- **Netty:** Uses `ByteBuf` direct buffers for high-throughput network I/O.
- **Apache Kafka:** Uses page cache and off-heap memory for zero-copy message streaming.
- **Chronicle Map / RocksDB:** High-performance in-memory off-heap key-value stores.

## Follow-ups

- What causes `OutOfMemoryError: Direct buffer memory` and how do you diagnose direct memory leaks?
- How does `sun.misc.Unsafe` differ from the new FFM API regarding memory safety (segfaults vs `IndexOutOfBoundsException`)?
- What are `MappedByteBuffer` and how do they map files directly to off-heap virtual memory (`mmap`)?
