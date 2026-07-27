---
title: How does Spring Boot handle REST API design — controllers, validation, error handling?
topics: [java]
roles: [backend]
tags: [spring-mvc, rest, controller, validation, exception-handler, ResponseEntity]
time: 20
updated: 2026-07-27
---

## Question

Walk through building a production-quality REST controller: request mapping, path/query/body parameter binding, Bean Validation, global exception handling with `@ControllerAdvice`, and consistent error response format.

## Answer

**Controller anatomy:**
```java
@RestController
@RequestMapping("/api/v1/orders")
@Validated
public class OrderController {
    private final OrderService orderService;
    
    // Path variable
    @GetMapping("/{id}")
    public ResponseEntity<OrderDTO> getOrder(@PathVariable Long id) {
        return orderService.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }
    
    // Query parameters
    @GetMapping
    public Page<OrderDTO> listOrders(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") @Max(100) int size,
            @RequestParam(required = false) OrderStatus status) {
        return orderService.findAll(PageRequest.of(page, size), status);
    }
    
    // Request body with validation
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrderDTO createOrder(@RequestBody @Valid CreateOrderRequest req) {
        return orderService.create(req);
    }
    
    // PUT for full update
    @PutMapping("/{id}")
    public OrderDTO updateOrder(@PathVariable Long id,
                                @RequestBody @Valid UpdateOrderRequest req) {
        return orderService.update(id, req);
    }
    
    // PATCH for partial update
    @PatchMapping("/{id}/status")
    public OrderDTO updateStatus(@PathVariable Long id,
                                 @RequestBody @Valid StatusUpdateRequest req) {
        return orderService.updateStatus(id, req.getStatus());
    }
    
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteOrder(@PathVariable Long id) {
        orderService.delete(id);
    }
}
```

**Bean Validation on request body:**
```java
public record CreateOrderRequest(
    @NotNull @Positive Long customerId,
    @NotEmpty List<@Valid OrderItemRequest> items,
    @NotNull @Future LocalDateTime deliveryDate
) {}
```

**Global exception handler:**
```java
@ControllerAdvice
public class GlobalExceptionHandler {
    
    @ExceptionHandler(ResourceNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ProblemDetail handleNotFound(ResourceNotFoundException ex) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
    }
    
    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ProblemDetail handleValidation(MethodArgumentNotValidException ex) {
        ProblemDetail pd = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
        pd.setTitle("Validation Failed");
        Map<String, String> errors = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors()
          .forEach(e -> errors.put(e.getField(), e.getDefaultMessage()));
        pd.setProperty("errors", errors);
        return pd;
    }
    
    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ProblemDetail handleAll(Exception ex) {
        log.error("Unexpected error", ex);
        return ProblemDetail.forStatusAndDetail(
            HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred");
    }
}
```

**`ProblemDetail` (RFC 9457 — Spring Boot 3+):**
Standard error format. Fields: `type`, `title`, `status`, `detail`, `instance`.

**`@ResponseBody` vs `@RestController`:** `@RestController` = `@Controller` + `@ResponseBody` on every method. All return values automatically serialized as JSON (via Jackson).

## Follow-ups

- How do you implement API versioning in Spring Boot? (URL `/v1/`, headers, media type.)
- What is `HttpMessageConverter` and how does Spring choose which one to use?
- How do you return paginated responses with `Page<T>` and what does the response look like?
