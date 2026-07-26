---
title: What happens when you type a URL and press enter?
topics: [networking]
difficulty: mid
roles: [backend, infra]
tags: [dns, tcp, tls, http]
time: 25
updated: 2026-07-26
---

## Question

From typing `https://example.com` to pixels on screen — walk through the
network path in as much depth as you can. Assume nothing is cached.

## Answer

Interviewers use this to probe depth; go as deep as you know on each layer:

1. **DNS** — the stub resolver checks its cache, then asks the recursive
   resolver, which walks root → `.com` TLD → authoritative servers and returns
   an A/AAAA record with a TTL. (Mention CDNs answering with a nearby edge IP.)
2. **TCP handshake** — SYN → SYN/ACK → ACK. Ports, sequence numbers, and the
   fact that this costs one RTT before any data moves.
3. **TLS handshake** — ClientHello (SNI, ALPN, supported ciphers) →
   ServerHello + certificate → key exchange. TLS 1.3 needs one RTT; the client
   validates the cert chain to a trusted root and checks the hostname.
4. **HTTP** — the request goes out (ALPN may have negotiated HTTP/2 or HTTP/3
   over QUIC). It likely hits a load balancer / reverse proxy first, which
   terminates TLS and forwards to an app server.
5. **Server side** — routing, app logic, database/cache calls, response with
   status, headers (`Cache-Control`, `Content-Encoding`), and body.
6. **Rendering** — browser parses HTML, discovers subresources, opens more
   requests (multiplexed on the same connection under h2/h3), builds
   DOM + CSSOM, and paints.

Signals of seniority: knowing *where the round trips are* (DNS + TCP + TLS ≈
2–3 RTTs before the first byte), what a load balancer changes about client
IPs (`X-Forwarded-For`, PROXY protocol), and where you'd look when this exact
path is slow (client DNS? TLS? server TTFB? — each has a different fix).

## Follow-ups

- Where exactly can you cache in this path, and what does each cache key on?
- What changes with HTTP/3? (QUIC over UDP, 0-RTT resumption, no TCP head-of-line blocking.)
- The site is slow only for users in one country — what's your first hypothesis?
