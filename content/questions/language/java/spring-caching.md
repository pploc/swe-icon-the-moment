---
title: How does Spring Caching (@Cacheable) work and how do you configure it?
topics: [java]
roles: [backend]
tags: [spring-cache, "@Cacheable", "@CacheEvict", redis, caffeine, cache-abstraction]
time: 20
updated: 2026-07-27
---

## Question

Explain Spring's caching abstraction: `@Cacheable`, `@CacheEvict`, `@CachePut`, cache key generation, and how to configure Redis or Caffeine as the backing store with TTL.

## Answer

**Spring cache abstraction:** Declarative caching using annotations. The underlying store (Caffeine, Redis, Hazelcast, EhCache) is pluggable — same annotations work regardless of backend.

**Enable caching:**
```java
@SpringBootApplication
@EnableCaching
public class MyApp { ... }
```

**Core annotations:**

```java
@Service
public class ProductService {
    
    // Cache the result; don't call method if cache hit
    @Cacheable(value = "products", key = "#id")
    public ProductDTO findById(Long id) {
        return productRepo.findById(id).map(this::toDTO).orElseThrow();
    }
    
    // Cache with condition: only cache active products
    @Cacheable(value = "products", key = "#id", condition = "#result.active == true")
    public ProductDTO findByIdIfActive(Long id) { ... }
    
    // Update the cache entry (always executes method; updates cache with result)
    @CachePut(value = "products", key = "#product.id")
    public ProductDTO updateProduct(ProductDTO product) {
        return productRepo.save(toEntity(product)).toDTO();
    }
    
    // Remove from cache on delete
    @CacheEvict(value = "products", key = "#id")
    public void deleteProduct(Long id) {
        productRepo.deleteById(id);
    }
    
    // Clear entire cache
    @CacheEvict(value = "products", allEntries = true)
    public void clearCache() {}
}
```

**Caffeine (in-process, L1):**
```yaml
spring:
  cache:
    type: caffeine
    caffeine:
      spec: maximumSize=1000,expireAfterWrite=60s
```

**Redis (distributed, L2):**
```yaml
spring:
  cache:
    type: redis
  data:
    redis:
      host: localhost
      port: 6379

# TTL per cache
spring.cache.redis.time-to-live: 60000     # 60s default
```

**Per-cache TTL with RedisCacheConfiguration:**
```java
@Configuration
public class CacheConfig {
    @Bean
    public RedisCacheManagerBuilderCustomizer redisCacheManagerCustomizer() {
        return builder -> builder
            .withCacheConfiguration("products",
                RedisCacheConfiguration.defaultCacheConfig()
                    .entryTtl(Duration.ofMinutes(10))
                    .disableCachingNullValues())
            .withCacheConfiguration("sessions",
                RedisCacheConfiguration.defaultCacheConfig()
                    .entryTtl(Duration.ofHours(2)));
    }
}
```

**Cache key generation:**
```java
@Cacheable(value = "search", key = "{#query, #page, #size}")  // composite key
@Cacheable(value = "user-orders", key = "#root.methodName + ':' + #userId")

// Custom key generator:
@Bean
public KeyGenerator myKeyGenerator() {
    return (target, method, params) -> method.getName() + Arrays.toString(params);
}
```

**Self-invocation problem:** Like `@Transactional`, `@Cacheable` uses AOP. Calling `this.findById()` from within the same bean bypasses the cache.

## Follow-ups

- How do you implement a two-level cache (L1=Caffeine in-process, L2=Redis shared)?
- What is cache stampede and how do you prevent it? (Only one thread regenerates; others wait.)
- How do you serialize complex objects (with `LocalDate`, etc.) correctly for Redis caching?
