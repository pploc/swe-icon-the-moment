---
title: How do you deal with a flaky test suite?
topics: [testing, cicd]
roles: [backend, platform]
tags: [flaky-tests, ci, determinism]
time: 15
updated: 2026-07-26
---

## Question

CI is red ~15% of the time on changes that turn out to be fine, and the team
has started clicking "re-run" without reading failures. Diagnose the causes of
flaky tests and lay out a plan to get trust back.

## Answer

**Why flakiness is a real problem, not an annoyance:** once re-run-until-green
is normal, the suite stops being a signal — genuine failures ship because
nobody believes red anymore.

**The classic causes:**

- **Time** — real clocks, `sleep(100)` standing in for synchronisation,
  timezone/DST assumptions.
- **Async & ordering** — asserting before work completes; fix by awaiting
  *conditions* (polling with deadline) not durations.
- **Shared state** — tests coupled through a DB, global singletons, or files;
  order-dependent tests that pass alone and fail after a reshuffle.
- **Concurrency** — actual races in the code under test (the one honest kind
  of flake: it's a bug report).
- **Environment** — real network calls, ports already bound, CI boxes slower
  than laptops.
- **Unseeded randomness** and property tests without a printed seed.

**The plan:**

1. **Measure** — track pass rate per test; auto-detect flakes (fail→pass on
   retry with no diff) and rank by cost.
2. **Quarantine, visibly** — move flakes to a non-blocking lane with an owner
   and a deadline. Quarantine without follow-up is deletion in slow motion.
3. **Fix the top offenders** with the table above; deflake by running the
   test 100× locally (`--count`, stress mode) to confirm.
4. **Prevent regressions** — fake clocks and injected time, hermetic tests
   (testcontainers over shared staging), no naked sleeps in review, CI
   retries *allowed but recorded* — a retried pass is still flagged.

## Follow-ups

- Is auto-retry in CI ever acceptable? Defend the trade-off.
- A test only fails at 2am UTC. Hypotheses? (DST/date rollover, cron contention, cert expiry windows.)
- How do you keep integration tests hermetic when the service needs Postgres and Kafka?
