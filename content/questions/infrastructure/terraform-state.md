---
title: Why does Terraform need state, and how do you run it safely in a team?
topics: [cloud-iac]
difficulty: mid
roles: [infra, platform]
tags: [terraform, state, drift, locking]
time: 20
updated: 2026-07-26
---

## Question

Explain what Terraform state is for, what goes wrong when a team shares it
naively, and how you'd structure state and workflow for a platform team
managing production infra.

## Answer

**Why state exists:** Terraform must map "resource in my config" → "real
object in the cloud" (IDs, computed attributes, dependencies). Without state
it couldn't know that `aws_instance.web` *is* `i-0abc…`, detect deletions
from config, or plan without querying every provider for everything.

**What goes wrong shared naively:**

- Two `apply`s at once → corrupted state or duplicate/destroyed resources →
  **remote backend with locking** (S3+DynamoDB lock, GCS, Terraform Cloud)
  is table stakes.
- State on a laptop → lost, or leaks **secrets** (state stores attribute
  values in plaintext — treat it as sensitive: encrypt at rest, restrict
  access, never commit it).
- One giant state for everything → every plan is slow, every mistake has
  unlimited blast radius, one team's lock blocks all others.

**Team-grade setup:**

1. **Split state** by environment × domain (`prod/networking`,
   `prod/db`, `staging/…`) — small blast radius, parallel work. Wire
   cross-stack reads with `terraform_remote_state` or data sources.
2. **Apply only from CI** — plan on PR (posted for review), apply on merge
   with the pipeline's role; humans don't hold prod credentials. Plan output
   is part of code review.
3. **Handle drift deliberately** — scheduled `terraform plan` detects
   out-of-band changes; reconcile with `import`/config updates, don't let it
   accumulate.
4. **Modules + version pins** (providers, modules, TF itself) for repeatable
   plans.

Escape hatches worth knowing: `terraform state mv/rm`, `import`,
`-refresh-only` — moving/adopting resources without destroying them.

## Follow-ups

- Someone deleted a prod security group in the console. What exactly does the next plan show, and what are your options?
- When would you choose Terraform vs CloudFormation/CDK vs Pulumi vs clicking? Defend the boundary.
- How do you rotate a secret that's embedded in state?
