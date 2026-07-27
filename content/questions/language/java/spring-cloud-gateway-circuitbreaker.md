---
title: How do you configure Spring Cloud Gateway Resilience4j Circuit Breakers and Rate Limiters?
topics: [java]
roles: [backend, infra]
tags: [spring-cloud-gateway, resilience4j, circuitbreaker, rate-limiter, microservices]
time: 25
updated: 2026-07-27
---

## Question

Explain Resilience4j integration in Spring Cloud Gateway: `CircuitBreaker` gateway filter, fallback URI forwarding, dynamic state transitions (CLOSED, OPEN, HALF_OPEN), sliding window metrics, and request rate limiting.

## Answer

**Why Resilience4j in API Gateways?**
An API Gateway routes external traffic to dozens of downstream microservices. If one downstream service slows down or fails, gateway threads can get exhausted, causing a cascading failure across all API endpoints. Incorporating Resilience4j Circuit Breakers at the gateway layer isolates failing services instantly.

```mermaid
flowchart LR
    Client["Client Request"] --> Gateway["Spring Cloud Gateway"]
    Gateway --> CB{"Resilience4j\nCircuit Breaker"}
    CB -->|State: CLOSED\n("Healthy")| Service["Downstream Service"]
    CB -->|State: OPEN\n("Failure Threshold Exceeded")| Fallback["Forward to /fallback Endpoint"]
    Fallback --> Response["Return Instant Degraded Response 503/200"]


```

**1. Dependencies (`pom.xml`):**
```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-circuitbreaker-reactor-resilience4j</artifactId>
</dependency>
```

**2. Gateway Route Configuration with CircuitBreaker Filter:**
```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: payment_service_route
          uri: lb://PAYMENT-SERVICE
          predicates:
            - Path=/api/v1/payments/**
          filters:
            - name: CircuitBreaker
              args:
                name: paymentCircuitBreaker
                fallbackUri: forward:/fallback/payment-service
```

**3. Resilience4j Configuration (`application.yml`):**
```yaml
resilience4j:
  circuitbreaker:
    configs:
      default:
        slidingWindowType: COUNT_BASED       # COUNT_BASED or TIME_BASED
        slidingWindowSize: 10                # Analyze last 10 requests
        failureRateThreshold: 50             # Open circuit if >= 50% fail
        slowCallRateThreshold: 50            # Open circuit if >= 50% are slow
        slowCallDurationThreshold: 2000ms    # Calls taking > 2s are 'slow'
        waitDurationInOpenState: 10000ms     # Stay OPEN for 10s before testing HALF_OPEN
        permittedNumberOfCallsInHalfOpenState: 3 # Test 3 calls in HALF_OPEN
        automaticTransitionFromOpenToHalfOpenEnabled: true
    instances:
      paymentCircuitBreaker:
        baseConfig: default
```

**4. Implementing Fallback Controller:**
When the circuit is OPEN or times out, the `CircuitBreaker` filter forwards the request internally to `forward:/fallback/payment-service`.

```java
@RestController
@RequestMapping("/fallback")
public class GatewayFallbackController {

    @GetMapping("/payment-service")
    @PostMapping("/payment-service")
    public Mono<ResponseEntity<Map<String, Object>>> paymentServiceFallback(ServerWebExchange exchange) {
        // Extract original exception passed by Resilience4j
        Throwable exception = exchange.getAttribute(
            ServerWebExchangeUtils.CIRCUITBREAKER_EXECUTION_EXCEPTION_ATTR
        );

        String errorDetail = (exception != null) ? exception.getMessage() : "Service Unavailable";

        Map<String, Object> response = Map.of(
            "timestamp", Instant.now().toString(),
            "status", HttpStatus.SERVICE_UNAVAILABLE.value(),
            "error", "Payment Service Degraded",
            "message", "Payment service is currently experiencing issues. Please try again later.",
            "detail", errorDetail
        );

        return Mono.just(ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(response));
    }
}
```

**Circuit Breaker State Machine:**
1. **CLOSED (Normal):** All requests routed to downstream service. Failure rate monitored.
2. **OPEN (Failing):** Failure rate exceeds threshold ($\ge 50\%$). ALL requests immediately routed to fallback WITHOUT calling downstream service. Saves network resources.
3. **HALF_OPEN (Trial):** After `waitDurationInOpenState` (10s), automatically switches to HALF_OPEN. Sends 3 trial requests:
   - If trial succeeds $\rightarrow$ Transitions back to **CLOSED**.
   - If trial fails $\rightarrow$ Transitions back to **OPEN**.

## Follow-ups

- What is the difference between Count-Based sliding window vs Time-Based sliding window in Resilience4j?
- How do you expose Resilience4j circuit breaker state metrics (`resilience4j.circuitbreaker.state`) to Prometheus?
- How do you configure dynamic bulkheading in Resilience4j to limit concurrent execution counts?
