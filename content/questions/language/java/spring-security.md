---
title: How does Spring Security authentication and authorization work?
topics: [java]
roles: [backend]
tags: [spring-security, authentication, authorization, filter-chain, JWT, OAuth2]
time: 25
updated: 2026-07-27
---

## Question

Walk through Spring Security's architecture: the `SecurityFilterChain`, how authentication flows (UsernamePasswordAuthenticationFilter → AuthenticationManager → UserDetailsService), and how method-level authorization with `@PreAuthorize` works. Include JWT stateless setup.

## Answer

**Security filter chain:**

Spring Security is a chain of servlet filters. Every HTTP request passes through them:

```mermaid
flowchart LR
    Request --> SC["SecurityContextPersistenceFilter\n("load SecurityContext")"]
    SC --> CSRF["CsrfFilter"]
    CSRF --> Session["SessionManagementFilter"]
    Session --> Auth["UsernamePasswordAuthenticationFilter\nor JWT filter"]
    Auth --> AccessControl["FilterSecurityInterceptor\n("authorization check")"]
    AccessControl --> Servlet["DispatcherServlet → Controller"]

```

**Authentication flow (form login):**

1. `UsernamePasswordAuthenticationFilter` extracts credentials.
2. Creates `UsernamePasswordAuthenticationToken(username, password)`.
3. Delegates to `AuthenticationManager.authenticate()`.
4. `AuthenticationManager` → `DaoAuthenticationProvider`.
5. `DaoAuthenticationProvider` calls `UserDetailsService.loadUserByUsername()`.
6. Compares stored (BCrypt-hashed) password with submitted.
7. On success: `SecurityContextHolder.getContext().setAuthentication(token)`.

**Custom `UserDetailsService`:**
```java
@Service
public class MyUserDetailsService implements UserDetailsService {
    @Override
    public UserDetails loadUserByUsername(String username) {
        User user = userRepo.findByEmail(username)
            .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        return org.springframework.security.core.userdetails.User
            .withUsername(user.getEmail())
            .password(user.getPasswordHash())    // BCrypt
            .roles(user.getRoles().toArray(new String[0]))
            .build();
    }
}
```

**JWT stateless setup:**
```java
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    return http
        .csrf(csrf -> csrf.disable())
        .sessionManagement(s -> s.sessionCreationPolicy(STATELESS))
        .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
        .authorizeHttpRequests(auth -> auth
            .requestMatchers("/api/auth/**").permitAll()
            .requestMatchers("/api/admin/**").hasRole("ADMIN")
            .anyRequest().authenticated()
        )
        .build();
}
```

**`@PreAuthorize` (method-level):**
```java
@PreAuthorize("hasRole('ADMIN') or #userId == authentication.principal.id")
public void deleteUser(Long userId) { ... }

@PostAuthorize("returnObject.ownerId == authentication.principal.id")
public Document getDocument(Long id) { ... }
```
Requires `@EnableMethodSecurity` on a config class.

**`SecurityContextHolder`:** Stores `Authentication` in a `ThreadLocal` (default strategy). Available anywhere in the request thread:
```java
Authentication auth = SecurityContextHolder.getContext().getAuthentication();
String username = auth.getName();
```

**Password encoding:**
```java
@Bean
public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder(12);  // cost factor 12
}
```

## Follow-ups

- How does `OAuth2LoginConfigurer` integrate with external providers (Google, GitHub)?
- What is the difference between `permitAll()` and `anonymous()`?
- How do you propagate the `SecurityContext` to async threads (`@Async`, `CompletableFuture`)?
