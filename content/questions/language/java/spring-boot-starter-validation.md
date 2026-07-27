---
title: How do you build custom Validation Constraints and Group Validation in Spring Boot?
topics: [java]
roles: [backend]
tags: [spring-boot, validation, hibernate-validator, ConstraintValidator, Validated]
time: 20
updated: 2026-07-27
---

## Question

Explain Bean Validation (JSR 380 / Hibernate Validator) in Spring Boot: built-in constraints (`@NotNull`, `@Pattern`, `@Size`), writing custom `@ConstraintValidator` annotations, cross-field class-level validation, and Validation Groups (`@Validated`).

## Answer

**Bean Validation Architecture:**
Spring Boot Validation integrates Hibernate Validator (the reference implementation of Jakarta Validation / JSR 380) with Spring MVC and Spring `@Service` layers.

```mermaid
flowchart LR
    Request["HTTP Request Payload"] --> Controller["@Valid / @Validated Parameter"]
    Controller --> Validator["Hibernate Validator Engine"]
    Validator -->|Fails| Exception["MethodArgumentNotValidException"]
    Exception --> Advice["@ControllerAdvice Global Exception Handler"]
    Advice --> Response["ProblemDetail / JSON Error Response"]


```

**1. Custom Field Constraint Annotation:**
Let's build a custom `@ValidPhoneNumber` annotation to validate phone numbers.

**Step 1: Define Annotation**
```java
@Documented
@Constraint(validatedBy = PhoneNumberValidator.class) // Links to validator class
@Target({ ElementType.FIELD, ElementType.PARAMETER })
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidPhoneNumber {
    String message() default "Invalid phone number format";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
```

**Step 2: Implement `ConstraintValidator`**
```java
public class PhoneNumberValidator implements ConstraintValidator<ValidPhoneNumber, String> {
    private static final Pattern PHONE_PATTERN = Pattern.compile("^\\+?[1-9]\\d{1,14}$"); // E.164 format

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null || value.isBlank()) {
            return true; // Use @NotNull separately if nulls are prohibited
        }
        return PHONE_PATTERN.matcher(value).matches();
    }
}
```

**2. Cross-Field Class-Level Validation:**
When validation depends on comparing two fields in the same DTO (e.g., verifying `password` matches `confirmPassword`):

```java
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = FieldMatchValidator.class)
public @interface FieldMatch {
    String message() default "Fields do not match";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};

    String first();
    String second();

    @Target(ElementType.TYPE)
    @Retention(RetentionPolicy.RUNTIME)
    @interface List {
        FieldMatch[] value();
    }
}

public class FieldMatchValidator implements ConstraintValidator<FieldMatch, Object> {
    private String firstFieldName;
    private String secondFieldName;

    @Override
    public void initialize(FieldMatch constraintAnnotation) {
        this.firstFieldName = constraintAnnotation.first();
        this.secondFieldName = constraintAnnotation.second();
    }

    @Override
    public boolean isValid(Object value, ConstraintValidatorContext context) {
        Object firstObj = new BeanWrapperImpl(value).getPropertyValue(firstFieldName);
        Object secondObj = new BeanWrapperImpl(value).getPropertyValue(secondFieldName);

        return Objects.equals(firstObj, secondObj);
    }
}
```

**Usage on DTO:**
```java
@FieldMatch(first = "password", second = "confirmPassword", message = "Passwords must match")
public record RegisterUserRequest(
    @NotBlank String email,
    @NotBlank @ValidPhoneNumber String phone,
    @NotBlank String password,
    @NotBlank String confirmPassword
) {}
```

**3. Validation Groups (`@Validated`):**
Validation Groups allow applying different validation rules to the same DTO depending on the operation (e.g., `OnCreate` vs `OnUpdate`).

```java
public interface OnCreate {}
public interface OnUpdate {}

public record UserDto(
    @Null(groups = OnCreate.class) // ID must be null when creating
    @NotNull(groups = OnUpdate.class) // ID required when updating
    Long id,

    @NotBlank(groups = {OnCreate.class, OnUpdate.class})
    String name
) {}

@RestController
@RequestMapping("/api/users")
public class UserController {

    @PostMapping
    public UserDto create(@RequestBody @Validated(OnCreate.class) UserDto dto) {
        return userService.create(dto);
    }

    @PutMapping
    public UserDto update(@RequestBody @Validated(OnUpdate.class) UserDto dto) {
        return userService.update(dto);
    }
}
```

## Follow-ups

- What is the difference between `@Valid` (standard Jakarta) and `@Validated` (Spring specific)?
- How do you validate path variables and query parameters on `@RestController` methods?
- How do you customize localized error messages in `ValidationMessages.properties`?
