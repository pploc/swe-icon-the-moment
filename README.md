# SWE-ITM — backend & infra interview bank

A static, searchable bank of backend & infrastructure engineering interview
questions. Every question is a Markdown file in this repo; the site is built
with Vite + React + Tailwind and deployed to GitHub Pages by CI. **No
database** — git is the database.

**Live site:** https://pploc.github.io/swe-icon-the-moment/

## Add or edit a question

**From the site.** [+ Add question](https://pploc.github.io/swe-icon-the-moment/new)
opens a form with a live Markdown preview; every question page has an **Edit**
button that loads the original Markdown into the same form. How your change
lands depends on who you are:

| You | What the save button does |
| --- | --- |
| Maintainer with a connected token | Commits straight to `main`; the site redeploys in ~1 min |
| Anyone else with a connected token | Pushes to your fork and opens a **pull request** |
| No token connected | Opens GitHub's editor pre-filled — non-collaborators get GitHub's fork-and-PR flow automatically |

Tokens are optional, [fine-grained](https://github.com/settings/personal-access-tokens/new),
stored only in your browser's localStorage, and sent only to api.github.com.
Maintainers need `Contents: read & write` on this repo; contributors just need
a token that can read it.

**By hand.** Copy [`content/questions/_template.md`](content/questions/_template.md)
into `content/questions/` — the filename becomes the URL slug
(`cache-stampede.md` → `/q/cache-stampede`) — fill in the frontmatter, and push:

```yaml
---
title: A hot cache key expires — how do you survive the stampede?
topics: [caching, performance]   # required, ≥1 id from content/topics.yaml
roles: [backend, sre]
tags: [redis, stampede]
companies: []
time: 20
updated: 2026-07-26
---
```

The body uses three sections; the site hides `## Answer` behind a "Reveal
answer" button:

```markdown
## Question
...
## Answer
...
## Follow-ups
...
```

The build **fails loudly** on mistakes — missing title, unknown topic id,
duplicate slug — so a broken PR can't reach the live site.

## Supported Markdown

Everything CommonMark and GitHub-flavoured Markdown offer, plus a few
extensions. All of it renders identically in the in-page preview and on the
published page:

| Feature | Syntax |
| --- | --- |
| Emphasis | `**bold**` `_italic_` `~~strike~~` `==mark==` `++ins++` |
| Code | `` `inline` `` and fenced blocks — syntax highlighted via Shiki |
| Diagrams | ` ```mermaid ` fences (flowchart, sequence, ER, state, gantt…) |
| Math | `$inline$` and `$$block$$` (KaTeX) |
| Tables | GFM pipe tables |
| Task lists | `- [x] done` / `- [ ] open` |
| Footnotes | `text[^1]` + `[^1]: note` |
| Definition lists | `Term` / `: definition` |
| Abbreviations | `*[TCP]: Transmission Control Protocol` |
| Sub/superscript | `H~2~O`, `x^2^` |
| Callouts | `::: warning Title` … `:::` (note · tip · info · warning · danger) |
| Emoji | `:rocket:` |
| Raw HTML | `<details><summary>…</summary>` and friends |

Headings get anchor links automatically. Diagram and math rendering are
lazy-loaded, so pages that don't use them stay light.

## Add a topic

Append an entry to [`content/topics.yaml`](content/topics.yaml):

```yaml
- id: my-new-topic        # kebab-case, referenced by questions
  name: My New Topic
  group: backend          # fundamentals | backend | infrastructure | career
  icon: 🧩
  blurb: One line shown on the topic card.
```

New groups can be added in the same file under `groups:`.

## Develop locally

```bash
npm install
npm run dev             # builds content, starts Vite, live-reloads on .md changes
npm run build           # full production build into dist/
npm run content:check   # validate content without building
```

Requires Node 20.19+.

## How it works

```
content/questions/**.md ─┐
content/topics.yaml ─────┤─ scripts/build-content.mjs ──► src/generated/content.ts   (metadata)
                         │        (runs at build time)    public/data/q/<slug>.json  (HTML + source)
                         └───────────────────────────────► public/data/search.json    (search corpus)
```

Markdown is rendered at build time (markdown-it + Shiki), so reading a question
ships no parser or highlighter. [`shared/markdown.mjs`](shared/markdown.mjs)
holds the one plugin list both the build and the editor preview use — that's
what keeps the preview honest. Each question's original Markdown is emitted
alongside its HTML so the in-page editor can load it without hitting GitHub.
Search is client-side (MiniSearch) over a prebuilt corpus.

Deployment is `.github/workflows/deploy.yml`; pull requests are validated by
`.github/workflows/ci.yml`. One-time repo setup: **Settings → Pages → Source →
"GitHub Actions"**.
