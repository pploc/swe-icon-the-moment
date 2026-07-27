---
title: What is the actor model and how does it differ from shared-memory concurrency?
topics: [concurrency]
roles: [backend]
tags: [actor-model, akka, erlang, message-passing, concurrency]
time: 20
updated: 2026-07-27
---

## Question

Explain the actor model of concurrency: its core rules, how actors communicate, what properties it provides, and when it's a better choice than shared-memory + locks.

## Answer

**Actor model fundamentals:**

An **actor** is the fundamental unit of concurrency. Each actor has:
- **Private state** — only the actor itself reads or writes it.
- **A mailbox (message queue)** — other actors send messages here.
- **Behavior** — a function that processes incoming messages one at a time.

**Three things an actor can do when processing a message:**
1. Send messages to other actors.
2. Create new actors.
3. Update its private state (designate new behavior for the next message).

```mermaid
flowchart LR
    A["Actor A\n("state: balance=100")"] -->|"msg: Deposit 50"| B["Actor A's mailbox"]
    B -->|"processed sequentially"| A
    A -->|"send: confirm(150)"| C["Actor B mailbox"]
    D["Actor C"] -->|"msg: Withdraw 30"| B

```

**No shared mutable state:** Since actors communicate only via messages and process them sequentially, there are no races. No locks needed.

**Properties:**
- **Location transparency:** An actor reference (address) works the same whether the actor is in the same process, another JVM, or another machine.
- **Fault tolerance:** Supervisors monitor children; on failure, they can restart, stop, or escalate. Erlang's "let it crash" philosophy.
- **Distribution:** Actors naturally extend to distributed systems — messages already cross a boundary.

**Akka (Java/Scala) example:**
```scala
class BankAccount extends Actor {
  var balance = 0
  def receive = {
    case Deposit(n)  => balance += n; sender() ! Confirmed(balance)
    case Withdraw(n) => if (balance >= n) { balance -= n; sender() ! Ok } else sender() ! Insufficient
  }
}
```

**When actors beat locks:**
- Many independent entities with private state (game characters, user sessions, IoT devices).
- Distributed systems (actors naturally span nodes).
- Failure domains — supervisors restart crashed actors.
- Event-driven systems with complex state machines.

**When locks are simpler:**
- Shared read-heavy data (use RWLock — actors can't batch reads as efficiently).
- Low-concurrency scenarios — actor overhead isn't worth it.
- Latency-sensitive tight loops — message serialization adds overhead.

## Follow-ups

- How does Erlang's supervision tree implement the "let it crash" philosophy?
- What is the difference between Akka typed actors and untyped actors?
- How does Go's CSP model compare to the actor model? (CSP: anonymous channels; Actor: named mailboxes.)
