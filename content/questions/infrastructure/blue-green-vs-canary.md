---
title: Blue/green vs canary vs rolling — pick a deployment strategy
topics: [cicd, sre]
roles: [infra, platform, sre]
tags: [deployment, canary, rollback, feature-flags]
time: 20
updated: 2026-07-26
---

## Question

Compare rolling, blue/green, and canary deployments. What does each cost,
what failure does each protect against, and what must be true of your
*application* for any of them to be safe?

## Answer

**Rolling** — replace instances a few at a time (Kubernetes default).
Cheap (no extra fleet), no traffic-shifting infra needed. But: two versions
run simultaneously for the whole rollout, "rollback" is another slow roll
forward-in-reverse, and a bad version can be 50% deployed before your alarms
fire.

**Blue/green** — full second fleet gets the new version; flip traffic
atomically (LB/DNS swap). Near-instant rollback (flip back), simple mental
model, great for risky big-bang changes. Costs 2× capacity during the window,
and the flip is all-or-nothing: 100% of users hit a bug at once. Watch
long-lived connections and in-flight jobs during the flip.

**Canary** — shift a slice (1% → 5% → 25% → 100%) while comparing the
canary's metrics (error rate, latency, business KPIs) against the baseline;
promote or roll back on the data — ideally automated (Argo Rollouts,
Flagger). Smallest blast radius and *evidence-driven* promotion, but needs
real traffic-splitting, good per-version metrics, and enough traffic for
statistics; sticky sessions complicate the split.

**The universal prerequisite — N and N+1 coexist.** Every strategy runs two
versions against shared state, so: **backwards/forwards-compatible schema
changes** (expand → migrate → contract; never break N while N+1 rolls),
compatible message/API contracts, and no "version 2 rewrites the cache
format" surprises. Also: rollback is only real if data written by N+1 can be
read by N.

Decision shorthand: default to rolling for routine low-risk services; canary
where you have the metrics and traffic; blue/green for rarely-deployed,
high-stakes, or hard-to-split systems.

## Follow-ups

- Where do feature flags fit — replacement or complement? (Decouple deploy from release; flags gate features, deploys gate binaries.)
- How would you automate the canary verdict? What metric would you *not* trust?
- The migration added a NOT NULL column and old pods started erroring — reconstruct the mistake and the correct sequence.
