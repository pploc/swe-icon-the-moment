---
title: How does Spring Boot configuration work — properties, YAML, and profiles?
topics: [java]
roles: [backend]
tags: [spring-boot, configuration, properties, yaml, profiles, ConfigurationProperties]
time: 20
updated: 2026-07-27
---

## Question

Walk through Spring Boot's configuration hierarchy: the 17+ property sources (env vars, system props, application.yaml, etc.), `@ConfigurationProperties` vs `@Value`, profiles, and how to externalize config for 12-factor app compliance.

## Answer

**Configuration source priority (higher = wins):**

```
1. Command-line args (--server.port=8081)
2. OS environment variables (SERVER_PORT=8081)
3. JVM system properties (-Dserver.port=8081)
4. application-{profile}.properties (active profile)
5. application.properties / application.yaml
6. @PropertySource files
7. Default values
```

**`application.yaml` example:**
```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost/mydb
    username: ${DB_USER}           # env var substitution
    password: ${DB_PASS}
  jpa:
    hibernate.ddl-auto: validate

myapp:
  feature-flags:
    new-checkout: true
  max-retry-attempts: 3
  timeout: 5s
```

**`@ConfigurationProperties` (preferred for structured config):**
```java
@ConfigurationProperties(prefix = "myapp")
@Validated    // enables Bean Validation on config
public class MyAppProperties {
    @NotNull
    private FeatureFlags featureFlags;
    
    @Min(1) @Max(10)
    private int maxRetryAttempts = 3;
    
    @DurationUnit(ChronoUnit.SECONDS)
    private Duration timeout;
    
    // getters + setters (or use records in Boot 3.x)
}
```

**`@Value` (simple single-value injection):**
```java
@Value("${myapp.max-retry-attempts:3}")  // with default
private int maxRetry;

@Value("#{T(java.lang.Math).PI}")        // SpEL expression
private double pi;
```

**Profiles:**
```yaml
# application-dev.yaml
spring.datasource.url: jdbc:h2:mem:testdb

# application-prod.yaml  
spring.datasource.url: jdbc:postgresql://prod-db:5432/mydb
```

```bash
# Activate:
--spring.profiles.active=prod
# or
SPRING_PROFILES_ACTIVE=prod
```

```java
@Bean
@Profile("dev")
public DataSource h2DataSource() { ... }  // only created in dev profile

@Profile("!prod")   // all profiles except prod
```

**Relaxed binding:** Spring Boot binds `SERVER_PORT`, `server.port`, `server-port` all to `serverPort`. Works across YAML, properties, env vars.

**Config server (12-factor):** In cloud environments, use Spring Cloud Config Server — externalize all config in Git. Services fetch on startup; can refresh without restart via `@RefreshScope` + `/actuator/refresh`.

## Follow-ups

- What is `@RefreshScope` and how does it enable config reload without restart?
- How do you encrypt sensitive properties (passwords) in `application.yaml`?
- What is the difference between `spring.config.import` and `@PropertySource`?
