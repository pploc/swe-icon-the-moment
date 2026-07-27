---
title: How does Spring Boot Actuator help with observability in production?
topics: [java]
roles: [backend, infra]
tags: [actuator, health, metrics, micrometer, prometheus, liveness, readiness]
time: 20
updated: 2026-07-27
---

## Question

Walk through Spring Boot Actuator: the built-in endpoints (`/health`, `/metrics`, `/info`, `/env`), custom health indicators, Micrometer integration for Prometheus, and Kubernetes liveness/readiness probe configuration.

## Answer

**Adding Actuator:**
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

**Key endpoints (exposed by default on `/actuator/`):**

| Endpoint | Purpose |
|---|---|
| `/health` | Health status (UP/DOWN with details) |
| `/info` | App info (version, build, git commit) |
| `/metrics` | Available metrics + values |
| `/env` | Environment properties |
| `/loggers` | View/change log levels at runtime |
| `/threaddump` | JVM thread dump |
| `/heapdump` | JVM heap dump |
| `/conditions` | Auto-configuration report |
| `/beans` | All Spring beans |
| `/mappings` | All request mappings |

**Configuration:**
```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,loggers   # security: don't expose all
  endpoint:
    health:
      show-details: when-authorized  # only show details for authenticated users
  server:
    port: 8081  # separate management port from app port
```

**Custom health indicator:**
```java
@Component
public class DatabaseHealthIndicator implements HealthIndicator {
    private final DataSource dataSource;
    
    @Override
    public Health health() {
        try {
            dataSource.getConnection().isValid(1);
            return Health.up()
                .withDetail("database", "PostgreSQL")
                .withDetail("version", getVersion())
                .build();
        } catch (Exception e) {
            return Health.down(e).build();
        }
    }
}
```

**Micrometer + Prometheus:**
```xml
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-registry-prometheus</artifactId>
</dependency>
```
Exposes `/actuator/prometheus` in Prometheus format. Scrape with:
```yaml
# prometheus.yml
scrape_configs:
  - job_name: myapp
    static_configs:
      - targets: ['app:8081']
    metrics_path: /actuator/prometheus
```

**Custom metrics:**
```java
@Service
public class OrderService {
    private final Counter ordersPlaced;
    private final Timer orderProcessingTime;
    
    public OrderService(MeterRegistry registry) {
        ordersPlaced = Counter.builder("orders.placed")
            .tag("region", "us-east")
            .register(registry);
        orderProcessingTime = Timer.builder("orders.processing.duration")
            .register(registry);
    }
    
    public Order placeOrder(OrderRequest req) {
        return orderProcessingTime.record(() -> {
            Order o = process(req);
            ordersPlaced.increment();
            return o;
        });
    }
}
```

**Kubernetes probes:**
```yaml
management.endpoint.health.probes.enabled: true
# Adds:
# /actuator/health/liveness  → LivenessState
# /actuator/health/readiness → ReadinessState
```
```yaml
# k8s deployment:
livenessProbe:
  httpGet:
    path: /actuator/health/liveness
    port: 8081
readinessProbe:
  httpGet:
    path: /actuator/health/readiness
    port: 8081
```

## Follow-ups

- What is the difference between liveness and readiness probes in Spring Boot Actuator?
- How do you change log levels at runtime using the `/actuator/loggers` endpoint?
- How do you add Git commit info to `/actuator/info`?
