---
title: JWTs vs server-side sessions — how do you decide?
topics: [security, api-design]
difficulty: mid
roles: [backend]
tags: [jwt, sessions, auth, revocation]
time: 20
updated: 2026-07-26
---

## Question

You're building auth for a web app with an API. Compare server-side sessions
with JWTs. Where does each win, what's the revocation problem, and what does a
sane production setup look like?

## Answer

**Server-side sessions** — random opaque ID in a cookie, state in a store
(Redis/DB):

- Revocation is trivial (delete the row), sessions can be listed and killed,
  nothing sensitive lives client-side.
- Cost: a store lookup per request and shared state across app nodes — which
  is rarely an actual problem at most companies' scale.

**JWTs** — signed, self-contained claims:

- Any service can verify locally with the public key: no lookup, no shared
  store — this is why they fit **service-to-service** auth and short-lived
  delegated access (OAuth2/OIDC) so well.
- **The revocation problem:** a signed token is valid until `exp`, full stop.
  Logout, password change, or a stolen token can't take effect server-side
  without reintroducing state (a denylist/version check) — which erases the
  main benefit.

**The production pattern that resolves the tension:** short-lived access
token (5–15 min JWT) + long-lived **refresh token stored server-side** and
revocable. Compromise windows stay small; logout kills the refresh token.

**Mistake checklist interviewers listen for:** JWTs in `localStorage` (XSS
grabs them — use `HttpOnly`, `Secure`, `SameSite` cookies), `alg=none`/HS-RS
confusion bugs, not validating `iss`/`aud`, huge tokens on every request, and
putting PII in claims (JWTs are only *encoded*, not encrypted).

Honest default: a monolith or classic web app → sessions. Multi-service,
multi-audience, or federation → OIDC with the short+refresh pattern.

## Follow-ups

- Exactly how does key rotation work for JWT verifiers? (`kid` header + JWKS endpoint.)
- Where do refresh tokens live in a browser app, given XSS?
- User is banned mid-session and must lose access within seconds — design it for both models.
