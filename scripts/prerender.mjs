/**
 * Turns the single-page build into one real HTML file per route.
 *
 * Without this, GitHub Pages answers every deep link with 404.html — the app
 * still boots and routes correctly, but the *status code* is 404, so crawlers
 * refuse to index the page and link unfurlers show nothing. Each page also gets
 * its own title, description and Open Graph tags, which fixes browser tabs and
 * shared links.
 *
 * The app itself still renders on the client; these files only carry the head
 * metadata plus a <noscript> copy of the content.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const DIST = path.join(ROOT, 'dist')
const SITE = (
  process.env.SITE_URL ?? 'https://pploc.github.io/swe-icon-the-moment'
).replace(/\/$/, '')

const SITE_NAME = 'SWE-ITM'
const TAGLINE = 'backend & infra interview questions'

const manifest = JSON.parse(
  await fs.readFile(path.join(ROOT, '.content-manifest.json'), 'utf8'),
)
const template = await fs.readFile(path.join(DIST, 'index.html'), 'utf8')

/** Browser tabs read "SWE-ITM: <page>", so the brand stays visible when truncated. */
const pageTitle = (text) => `${SITE_NAME}: ${text}`

function escapeAttr(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** One sentence, trimmed at a word boundary — used for meta descriptions. */
function summarise(text, limit = 155) {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= limit) return clean
  return `${clean.slice(0, clean.lastIndexOf(' ', limit))}…`
}

function buildPage({ title, description, url, noscript = '', noindex = false }) {
  const head = [
    `<link rel="canonical" href="${escapeAttr(url)}" />`,
    `<meta property="og:type" content="article" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:title" content="${escapeAttr(title)}" />`,
    `<meta property="og:description" content="${escapeAttr(description)}" />`,
    `<meta property="og:url" content="${escapeAttr(url)}" />`,
    `<meta name="twitter:card" content="summary" />`,
    noindex ? `<meta name="robots" content="noindex" />` : '',
  ].filter(Boolean)

  return template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeAttr(title)}</title>`)
    .replace(
      /<meta\s+name="description"[\s\S]*?\/>/,
      `<meta name="description" content="${escapeAttr(description)}" />`,
    )
    .replace('</head>', `  ${head.join('\n    ')}\n  </head>`)
    .replace(
      '<div id="root"></div>',
      `<div id="root"></div>${noscript ? `\n    <noscript>${noscript}</noscript>` : ''}`,
    )
}

/** Writes both `/x.html` and `/x/index.html` so Pages resolves either form. */
async function write(routePath, html) {
  const flat = path.join(DIST, `${routePath}.html`)
  await fs.mkdir(path.dirname(flat), { recursive: true })
  await fs.writeFile(flat, html)

  const nested = path.join(DIST, routePath, 'index.html')
  await fs.mkdir(path.dirname(nested), { recursive: true })
  await fs.writeFile(nested, html)
}

const urls = []

function record(routePath, lastmod) {
  urls.push({ loc: `${SITE}${routePath}`, lastmod })
}

// --- home -------------------------------------------------------------------

await fs.writeFile(
  path.join(DIST, 'index.html'),
  buildPage({
    title: pageTitle(TAGLINE),
    description: `A searchable bank of ${manifest.questions.length} backend and infrastructure engineering interview questions across ${manifest.topics.length} topics.`,
    url: `${SITE}/`,
    noscript: `<h1>${SITE_NAME}</h1><ul>${manifest.topics
      .map((t) => `<li><a href="${SITE}/topic/${t.id}">${escapeAttr(t.name)}</a></li>`)
      .join('')}</ul>`,
  }),
)
record('/', null)

// --- questions --------------------------------------------------------------

for (const question of manifest.questions) {
  const body = JSON.parse(
    await fs.readFile(path.join(DIST, 'data', 'q', `${question.slug}.json`), 'utf8'),
  )

  const noscript = [
    `<h1>${escapeAttr(question.title)}</h1>`,
    body.html.question,
    body.html.answer ? `<h2>Answer</h2>${body.html.answer}` : '',
    body.html.followups ? `<h2>Follow-ups</h2>${body.html.followups}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  await write(
    `/q/${question.slug}`,
    buildPage({
      title: pageTitle(question.title),
      description: summarise(question.excerpt || question.title),
      url: `${SITE}/q/${question.slug}`,
      noscript,
    }),
  )
  record(`/q/${question.slug}`, question.updated)

  // The editor is app-only: reachable, but not something to index.
  await write(
    `/q/${question.slug}/edit`,
    buildPage({
      title: pageTitle(`Edit — ${question.title}`),
      description: `Edit "${question.title}".`,
      url: `${SITE}/q/${question.slug}/edit`,
      noindex: true,
    }),
  )
}

// --- topics -----------------------------------------------------------------

for (const topic of manifest.topics) {
  await write(
    `/topic/${topic.id}`,
    buildPage({
      title: pageTitle(topic.name),
      description: `${topic.blurb} ${topic.count} interview question${topic.count === 1 ? '' : 's'}.`,
      url: `${SITE}/topic/${topic.id}`,
      noscript: `<h1>${escapeAttr(topic.name)}</h1><ul>${manifest.questions
        .filter((q) => q.topics.includes(topic.id))
        .map((q) => `<li><a href="${SITE}/q/${q.slug}">${escapeAttr(q.title)}</a></li>`)
        .join('')}</ul>`,
    }),
  )
  record(`/topic/${topic.id}`, null)
}

// --- app-only routes --------------------------------------------------------

// Keep in sync with the routes in src/main.tsx — a route missing here still
// works (404.html boots the app) but answers with a 404 status.
const APP_ROUTES = [
  ['/search', 'Search', 'Full-text search across every question and answer.'],
  ['/practice', 'Practice', 'Spaced-repetition drilling over the question bank.'],
  ['/new', 'Add a question', 'Write a new interview question.'],
  ['/drafts', 'Drafts', 'Questions that still need an answer.'],
]

for (const [route, title, description] of APP_ROUTES) {
  await write(
    route,
    buildPage({
      title: pageTitle(title),
      description,
      url: `${SITE}${route}`,
      noindex: route !== '/search',
    }),
  )
}

// --- fallback, sitemap, robots ----------------------------------------------

// Anything unrecognised still boots the app; it just shouldn't be indexed.
await fs.writeFile(
  path.join(DIST, '404.html'),
  buildPage({
    title: pageTitle('Not found'),
    description: TAGLINE,
    url: `${SITE}/404`,
    noindex: true,
  }),
)

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    ({ loc, lastmod }) =>
      `  <url><loc>${loc}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`,
  )
  .join('\n')}
</urlset>
`
await fs.writeFile(path.join(DIST, 'sitemap.xml'), sitemap)

await fs.writeFile(
  path.join(DIST, 'robots.txt'),
  `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`,
)

console.log(
  `✓ prerendered ${urls.length} indexable pages (+ editor routes), sitemap.xml, robots.txt`,
)
