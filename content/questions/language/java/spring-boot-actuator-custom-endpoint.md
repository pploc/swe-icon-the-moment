---
title: How do you build Custom Actuator Endpoints in Spring Boot?
topics: [java]
roles: [backend, infra]
tags: [actuator, spring-boot, custom-endpoint, Endpoint, ReadOperation]
time: 20
updated: 2026-07-27
---

## Question

Explain Spring Boot Actuator Custom Endpoints: `@Endpoint`, `@WebEndpoint`, `@JmxEndpoint`, operation annotations (`@ReadOperation`, `@WriteOperation`, `@DeleteOperation`), parameter passing, and security exposure settings.

## Answer

**What are Custom Actuator Endpoints?**
While Spring Boot Actuator provides built-in operational endpoints (`/health`, `/metrics`, `/env`), real-world production services often need to expose custom operational commands — such as clearing internal caches, triggering diagnostic dumps, or dynamically toggling feature flags — over Web (HTTP) and JMX management interfaces.

```mermaid
flowchart LR
    Admin[Admin / SRE / Monitoring System] -->|1. HTTP GET /actuator/feature-flags| WebEndpoint[@Endpoint Custom Bean]
    Admin -->|2. HTTP POST /actuator/feature-flags| WriteOp[@WriteOperation Toggle Flag]
    WebEndpoint --> JMX[Exposed automatically over JMX MBean too!]
```

**1. Creating a Custom `@Endpoint` Bean:**
An `@Endpoint` is technology-agnostic (exposed over both HTTP REST and JMX MBeans automatically).

```java
@Component
@Endpoint(id = "feature-flags") // Accessible at /actuator/feature-flags
public class FeatureFlagsEndpoint {

    private final Map<String, Boolean> featureFlags = new ConcurrentHashMap<>();

    public FeatureFlagsEndpoint() {
        featureFlags.put("new-checkout-flow", true);
        featureFlags.put("dark-mode", false);
        featureFlags.put("recommendation-engine", true);
    }

    // HTTP GET /actuator/feature-flags
    @ReadOperation
    public Map<String, Boolean> getAllFlags() {
        return featureFlags;
    }

    // HTTP GET /actuator/feature-flags/{name}
    @ReadOperation
    public Boolean getFlagByName(@Selector String name) {
        return featureFlags.getOrDefault(name, false);
    }

    // HTTP POST /actuator/feature-flags (JSON payload or query params)
    @WriteOperation
    public Map<String, Boolean> updateFlag(String name, boolean enabled) {
        featureFlags.put(name, enabled);
        return featureFlags;
    }

    // HTTP DELETE /actuator/feature-flags/{name}
    @DeleteOperation
    public Map<String, Boolean> deleteFlag(@Selector String name) {
        featureFlags.remove(name);
        return featureFlags;
    }
}
```

**Operation Annotations Mapping to Protocols:**

| Annotation | HTTP Method | JMX Operation | Purpose |
|---|---|---|---|
| **`@ReadOperation`** | `GET` | Read attribute / invoke method | Fetch current state or metrics |
| **`@WriteOperation`** | `POST` | Write attribute / invoke method | Modify state or configuration |
| **`@DeleteOperation`** | `DELETE` | Invoke method | Remove or reset state |

**2. Specialized Endpoints:**
- `@WebEndpoint(id = "...")`: Exposed ONLY via HTTP Web endpoints (not JMX).
- `@JmxEndpoint(id = "...")`: Exposed ONLY via JMX MBeans (not Web).
- `@EndpointExtension`: Extends an existing endpoint to add technology-specific output (e.g. `@WebEndpointExtension` to add Web-specific JSON formatting).

**3. Exposing Custom Endpoints in `application.yml`:**
By default, custom endpoints are DISABLED for web access for security reasons. They must be explicitly exposed in properties:

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,feature-flags # Expose custom 'feature-flags' endpoint
  endpoint:
    feature-flags:
      enabled: true
      cache:
        time-to-live: 10s # Cache GET response for 10 seconds
```

**4. Securing Custom Actuator Endpoints:**
Custom endpoints should be restricted to authorized admin users or accessible only on a separate internal management port:

```yaml
# Separate management port (e.g. App port 8080, Management port 8081)
management:
  server:
    port: 8081
```

```java
// Spring Security rule for Actuator endpoints
@Bean
public SecurityFilterChain managementSecurity(HttpSecurity http) throws Exception {
    http
        .securityMatcher(EndpointRequest.to("feature-flags"))
        .authorizeHttpRequests(auth -> auth.hasRole("ADMIN"))
        .httpBasic(Customizer.withDefaults());
    return http.build();
}
```

## Follow-ups

- What is the purpose of the `@Selector` annotation in Actuator custom endpoints?
- How do `@EndpointCloudFoundryExtension` or web extensions provide custom HTTP status codes in responses?
- How do you write integration tests for custom Actuator endpoints using `WebTestClient` or `MockMvc`?
