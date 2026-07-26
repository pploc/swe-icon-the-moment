# icon/the/moment — backend & infra interview bank

A static, searchable bank of backend & infrastructure engineering interview
questions. Every question is a Markdown file in this repo; the site is built
with Vite + React + Tailwind and deployed to GitHub Pages by CI. **No
database** — git is the database.

**Live site:** https://pploc.github.io/swe-icon-the-moment/

## Add a question

1. Copy [`content/questions/_template.md`](content/questions/_template.md)
   into `content/questions/` (any subfolder — folders are just organisation).
   The **filename becomes the URL slug**: `cache-stampede.md` → `/q/cache-stampede`.
2. Fill in the frontmatter — `title` and at least one `topics` entry are
   required, the rest is optional:

   ```yaml
   ---
   title: A hot cache key expires — how do you survive the stampede?
   topics: [caching, performance]   # ids from content/topics.yaml
   difficulty: senior               # junior | mid | senior | staff
   roles: [backend, sre]
   tags: [redis, stampede]
   time: 20
   updated: 2026-07-26
   ---
   ```

3. Write the body in three sections — the site hides `## Answer` behind a
   "Reveal answer" button:

   ```markdown
   ## Question
   ...code blocks, tables, images, and ```mermaid diagrams all render...
   ## Answer
   ...
   ## Follow-ups
   ...
   ```

4. Commit and push (or add the file straight from the GitHub web UI — the
   "+ Add question" button on the site takes you there). CI validates the
   file and redeploys automatically.

The build **fails loudly** on mistakes: missing title, unknown topic id,
duplicate slug, or an invalid difficulty won't reach the live site.

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
npm run dev        # builds content, starts Vite, live-reloads on .md changes
npm run build      # full production build into dist/
npm run content:check   # validate content without building
```

Requires Node 20.19+.

## How it works

```
content/questions/**.md ─┐
content/topics.yaml ─────┤─ scripts/build-content.mjs ──► src/generated/content.ts   (metadata)
                         │        (runs at build time)    public/data/q/<slug>.json  (rendered HTML)
                         └───────────────────────────────► public/data/search.json    (search corpus)
```

Markdown is rendered at build time (markdown-it + Shiki syntax highlighting),
so the browser ships no Markdown parser. Search is client-side (MiniSearch)
over a prebuilt corpus. Mermaid renders in the browser, lazy-loaded only on
pages that contain a diagram. Deployment is `.github/workflows/deploy.yml`;
pull requests are validated by `.github/workflows/ci.yml`.

One-time repo setup for deploys: **Settings → Pages → Source → “GitHub Actions”.**
