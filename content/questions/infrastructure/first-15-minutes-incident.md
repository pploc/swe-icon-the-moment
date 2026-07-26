---
title: You're paged at 3am — walk me through your first 15 minutes
topics: [sre]
difficulty: senior
roles: [sre, infra, backend]
tags: [incident-response, on-call, mitigation]
time: 20
updated: 2026-07-26
---

## Question

Checkout error rate just jumped from 0.1% to 20% and you're on call. Narrate
your first 15 minutes: what you do, in what order, and — just as important —
what you deliberately don't do yet.

## Answer

The discipline being tested: **mitigate first, understand later**, and
communicate while doing both.

**Minute 0–2: acknowledge and frame.** Ack the page. Confirm real user
impact from the symptom dashboard (error rate, affected endpoints/regions).
Declare an incident visibly (channel, status) — a one-line "investigating
elevated checkout errors, I'm IC" beats silence.

**Minute 2–7: hunt the trigger, starting with change.** The first question
is **"what changed?"** — the majority of incidents are self-inflicted.
Deploys in the last hour (yours *and* upstream services'), feature flags,
config pushes, infra changes, traffic anomalies. Meanwhile scan the error
itself: which dependency is in the stack traces, is one AZ/host/shard the
outlier, did latency spike before errors (saturation) or step (hard break)?

**Minute 7–15: mitigate with the safest reversible action.** Matching move
to trigger: recent deploy → **roll back now** (you do not need to understand
the bug to roll back); bad flag → flip it off; one bad host/AZ → drain it;
dependency down → fail open/degrade if the product allows. If the first
mitigation doesn't move the graph within minutes, say so and escalate — pull
in the owning team. Post a status update ("mitigation X applied, watching").

**Deliberately NOT doing:** root-causing in a debugger, reading code, fixing
forward with a hasty patch, restarting things at random hoping, or debugging
silently for 40 minutes without declaring. Evidence (graphs, timeline) gets
noted as you go — for the blameless postmortem *after* users are safe.

## Follow-ups

- When is rolling back the *wrong* move? (Irreversible migrations ridden along, data written in new format.)
- What makes a postmortem blameless and still useful? What's an action item smell?
- How do error budgets change the conversation between SRE and product after this incident?
