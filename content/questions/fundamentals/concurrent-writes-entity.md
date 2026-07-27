---
title: How do you handle concurrent writes to the same entity (optimistic concurrency in databases)?
topics: [concurrency]
roles: [backend]
tags: [optimistic-concurrency, version, etag, lost-update, write-skew, database]
time: 20
updated: 2026-07-27
---

## Question

Two HTTP requests arrive simultaneously to update the same user record. Walk through the lost update problem, how version columns solve it, how ETags apply in REST APIs, and what write skew is.

## Answer

**The lost update problem:**

```mermaid
sequenceDiagram
    participant C1 as Client 1
    participant DB as Database (balance=100)
    participant C2 as Client 2
    C1->>DB: SELECT balance → 100
    C2->>DB: SELECT balance → 100
    C1->>C1: compute 100 + 50 = 150
    C2->>C2: compute 100 - 30 = 70
    C1->>DB: UPDATE balance = 150 ✓
    C2->>DB: UPDATE balance = 70  ← Lost C1's deposit! Should be 120
```

**Solution 1 — Optimistic version column:**
```sql
SELECT balance, version FROM accounts WHERE id = 1;
-- application computes new_balance
UPDATE accounts
SET balance = new_balance, version = version + 1
WHERE id = 1 AND version = :read_version;  -- conflict guard
-- if rows_affected = 0: conflict, retry
```

**Solution 2 — Pessimistic `SELECT FOR UPDATE`:**
```sql
BEGIN;
SELECT balance FROM accounts WHERE id = 1 FOR UPDATE;  -- row-level lock
-- compute new_balance
UPDATE accounts SET balance = new_balance WHERE id = 1;
COMMIT;
```
Prevents concurrent reads by locking the row. No retry needed but reduces concurrency.

**ETag in REST APIs:**
```
GET /users/123
→ Response: ETag: "v5" + body

PUT /users/123
→ Request: If-Match: "v5"
→ Server checks: if current version != "v5" → 412 Precondition Failed
→ Client must GET fresh copy and retry
```

**Write skew (more subtle than lost update):**

Two transactions both read overlapping data, each makes a decision based on the read, then each writes non-overlapping data — but combined, the result violates a constraint:

```
T1: Read: Alice on-call=true, Bob on-call=true → both on call → safe to remove Alice
T2: Read: Alice on-call=true, Bob on-call=true → both on call → safe to remove Bob
T1: UPDATE alice.oncall = false
T2: UPDATE bob.oncall = false
Result: nobody on call! Violates "at least one person on call" invariant
```

Write skew requires **Serializable** isolation (or explicit `SELECT FOR UPDATE` to lock the invariant's rows). Snapshot isolation (MVCC) does NOT prevent write skew.

## Follow-ups

- What database isolation level prevents write skew? (Serializable — e.g., PostgreSQL's SSI.)
- How does optimistic concurrency relate to MVCC in PostgreSQL?
- How would you implement the "at least one on-call" invariant without serializable isolation?
