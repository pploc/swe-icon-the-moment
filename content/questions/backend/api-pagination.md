---
title: Offset vs cursor pagination — which and why?
topics: [api-design, databases]
difficulty: mid
roles: [backend]
tags: [pagination, rest, cursors]
time: 15
updated: 2026-07-26
---

## Question

You're designing `GET /orders` for an API that must page through millions of
rows. Compare offset-based and cursor-based pagination, and explain what
breaks with each as data grows and changes underneath the client.

## Answer

**Offset (`?limit=50&offset=10000`):**

- Simple, jump-to-page-N works, trivially maps to SQL.
- **Degrades linearly**: the database still has to walk and discard the first
  10,000 rows — deep pages get slower and slower.
- **Unstable under writes**: an insert while paging shifts every subsequent
  row → clients see duplicates or miss rows.

**Cursor / keyset (`?limit=50&after=<opaque token>`):**

- The token encodes the sort key of the last row seen; the query becomes
  `WHERE (created_at, id) < ($1, $2) ORDER BY created_at DESC, id DESC
  LIMIT 50` — an index seek, **O(page size) regardless of depth**, and stable
  under concurrent inserts.
- Requires a **deterministic, unique sort key** — that's why you tiebreak on
  `id`; sorting on `created_at` alone skips rows sharing a timestamp.
- Costs: no random page jumps, cursor is tied to one sort order, and the
  token should be **opaque** (base64 of the key, ideally signed) so clients
  can't construct or tamper with it.

**Rule of thumb:** admin UI with page numbers on small data → offset is fine.
Public API, infinite scroll, or big/hot tables → cursor. Also mention response
shape: return `next_cursor` (null when done) rather than making clients infer
it, and put a hard cap on `limit`.

## Follow-ups

- The client asks for "total count" — why is that expensive, and what do you offer instead? (Estimates, capped counts, async counts.)
- How do you paginate a feed merged from several sources?
- What changes if rows can be *deleted* while paging? (Keyset tolerates it; offset double-shifts.)
