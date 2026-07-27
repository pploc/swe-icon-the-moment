---
title: How do you achieve Zero-Downtime Deployments with Spring Boot?
topics: [java]
roles: [backend, infra]
tags: [spring-boot, zero-downtime, blue-green, flyway, database-migrations]
time: 25
updated: 2026-07-27
---

## Question

Explain the architecture of Zero-Downtime Deployments (Blue/Green & Rolling Updates) for Spring Boot applications: handling database schema backward compatibility, multi-phase Flyway migrations, HTTP session management, and Kubernetes Probe timing.

## Answer

**The Zero-Downtime Challenge:**
In modern CI/CD, deploying a new application version (V2) must happen without dropping a single HTTP request or failing active user transactions. During a rolling update, App V1 and App V2 run concurrently against the SAME production database!

```mermaid
flowchart TD
    subgraph Transition Phase (Both Versions Active!)
        V1[Spring Boot App V1\nOld Code] --> DB[(Shared Production DB)]
        V2[Spring Boot App V2\nNew Code] --> DB
    end
    Ingress[Load Balancer / K8s Ingress] -->|Traffic Shift| V1 & V2
```

**1. Database Schema Backward-Compatibility (Expand & Contract Pattern):**
The database schema must ALWAYS be compatible with BOTH V1 and V2 applications simultaneously.

**Example: Renaming column `phone` to `mobile_number`**

- **Phase 1 (Expand - Deploy DB Migration V1):**
  Add new column `mobile_number` and a DB Trigger/View to duplicate writes between `phone` and `mobile_number`.
  ```sql
  ALTER TABLE users ADD COLUMN mobile_number VARCHAR(20);
  UPDATE users SET mobile_number = phone WHERE mobile_number IS NULL;
  ```
- **Phase 2 (Deploy App V2):**
  Deploy Spring Boot V2. V2 reads and writes `mobile_number`. App V1 (still draining) reads and writes `phone`. Both work because DB trigger syncs changes!
- **Phase 3 (Contract - Deploy DB Migration V2):**
  After App V1 is 100% terminated, drop the old `phone` column and DB trigger.

**2. Distributed Session Management (Stateless or External Store):**
If App V1 stores user HTTP sessions in JVM local heap memory, shifting traffic to V2 logs users out (`401 Unauthorized`).
- **Solution A:** Make REST APIs strictly stateless using JWT tokens in `Authorization` headers.
- **Solution B:** Use `Spring Session Data Redis` to store sessions in an external shared Redis cluster:
```yaml
# application.yml
spring:
  session:
    store-type: redis
    redis:
      namespace: spring:session
```

**3. Kubernetes Probe Timing & Draining:**
Align Spring Boot Actuator Health Probes with K8s readiness and liveness checks:

```yaml
# application.yml
server:
  shutdown: graceful
spring:
  lifecycle:
    timeout-per-shutdown-phase: 30s
  boot:
    admin:
      client:
        instance:
          service-base-url: http://pod-ip:8080
```

```yaml
# Kubernetes Deployment Spec
spec:
  replicas: 5
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1        # Launch 1 new V2 Pod before killing V1
      maxUnavailable: 0  # NEVER allow fewer than 5 active pods
  template:
    spec:
      containers:
      - name: spring-app
        readinessProbe:
          httpGet:
            path: /actuator/health/readiness
            port: 8080
          initialDelaySeconds: 15
          periodSeconds: 5
        lifecycle:
          preStop:
            exec:
              command: ["sh", "-c", "sleep 10"] # Wait 10s for Kube-Proxy ingress removal
```

**4. Handling Flyway/Liquibase Migrations in Kubernetes:**
Do NOT run Flyway inside spring boot application startup if running multiple replica pods:
- If 10 pods start concurrently, 10 pods execute Flyway schema locks on DB startup!
- **Best Practice:** Run Flyway as an isolated Kubernetes `InitContainer` or CI/CD Pipeline Job BEFORE starting App V2 pods.

## Follow-ups

- What is Feature Toggling (using Togglz or LaunchDarkly) and how does it support canary deployments?
- How do you manage message queue format changes (Kafka/RabbitMQ) during rolling upgrades?
- How does `spring.jpa.hibernate.ddl-auto=validate` protect against schema mismatch during rolling updates?
