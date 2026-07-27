---
title: How does Spring Data JPA work and what is the N+1 problem?
topics: [java]
roles: [backend]
tags: [spring-data-jpa, hibernate, n+1, lazy-loading, query, repository]
time: 25
updated: 2026-07-27
---

## Question

Explain Spring Data JPA: how repositories generate queries, Hibernate session/persistence context, lazy vs eager fetching, and the N+1 query problem — including how to detect and fix it.

## Answer

**Spring Data JPA repository:**
```java
public interface OrderRepository extends JpaRepository<Order, Long> {
    // Spring Data generates: SELECT * FROM orders WHERE customer_id = ?
    List<Order> findByCustomerId(Long customerId);
    
    // JPQL
    @Query("SELECT o FROM Order o WHERE o.status = :status AND o.createdAt > :date")
    List<Order> findRecentByStatus(@Param("status") Status s, @Param("date") LocalDateTime d);
    
    // Native SQL
    @Query(value = "SELECT * FROM orders WHERE total > ?1", nativeQuery = true)
    List<Order> findLargeOrders(BigDecimal amount);
}
```

**Persistence context (Hibernate session):** A first-level cache + change tracking unit. All entities loaded within a transaction are tracked — changes are automatically persisted on flush (end of transaction).

**Lazy vs Eager fetching:**

| Strategy | Behavior | Default for |
|---|---|---|
| `LAZY` | Load related entities only when accessed | `@OneToMany`, `@ManyToMany` |
| `EAGER` | Load related entities with the parent query | `@ManyToOne`, `@OneToOne` |

**N+1 problem:**
```java
// N+1 scenario:
List<Customer> customers = customerRepo.findAll();  // 1 query: SELECT * FROM customers
for (Customer c : customers) {
    c.getOrders().size();  // N queries: SELECT * FROM orders WHERE customer_id = ?
                           // One per customer!
}
// Total: 1 + N queries (e.g., 1 + 100 = 101 queries for 100 customers)
```

**Detecting N+1:**
```yaml
spring.jpa.show-sql: true
spring.jpa.properties.hibernate.format_sql: true
# Or use Hibernate Statistics:
spring.jpa.properties.hibernate.generate_statistics: true
# Watch for high query counts in logs
```

**Fixes:**

**1. JOIN FETCH (JPQL):**
```java
@Query("SELECT c FROM Customer c JOIN FETCH c.orders WHERE c.active = true")
List<Customer> findActiveCustomersWithOrders();
// Single query with JOIN — loads orders eagerly
```

**2. `@EntityGraph`:**
```java
@EntityGraph(attributePaths = {"orders", "orders.items"})
List<Customer> findByActiveTrue();
```

**3. Batch fetching:**
```java
@OneToMany
@BatchSize(size = 20)  // Hibernate fetches 20 collections per roundtrip
private List<Order> orders;
```

**4. Projection / DTO query:**
```java
@Query("SELECT new com.example.CustomerDTO(c.id, c.name, COUNT(o)) " +
       "FROM Customer c LEFT JOIN c.orders o GROUP BY c.id")
List<CustomerDTO> findCustomerSummaries();
```

## Follow-ups

- What is the difference between `save()` and `saveAndFlush()` in `JpaRepository`?
- What causes `LazyInitializationException` and how does `@Transactional` solve it?
- What is the `open-in-view` anti-pattern and why should you disable it in production?
