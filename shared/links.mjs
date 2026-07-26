/**
 * Turns follow-up prompts into real navigation.
 *
 * Two mechanisms, applied before Markdown is rendered so the build and the
 * editor preview produce identical HTML:
 *
 *   [[slug]] / [[slug|label]]  — an explicit link to another question, anywhere
 *                                in a body. Unknown slugs fail the build.
 *   ## Follow-ups bullets      — matched against question titles; a confident
 *                                match becomes a link, anything else gets a
 *                                small "+" that opens the editor pre-filled.
 */
const STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'do', 'does',
  'did', 'how', 'what', 'whats', 'why', 'when', 'where', 'which', 'who', 'you',
  'your', 'yours', 'would', 'could', 'should', 'can', 'cant', 'and', 'or', 'of',
  'to', 'in', 'for', 'on', 'with', 'it', 'its', 'this', 'that', 'these', 'those',
  'at', 'as', 'from', 'by', 'if', 'they', 'them', 'their', 'there', 'here',
  'about', 'into', 'than', 'then', 'so', 'but', 'not', 'no', 'yes', 'me', 'my',
  'we', 'us', 'our', 'i', 'have', 'has', 'had', 'will', 'may', 'might', 'must',
  'one', 'two', 'give', 'tell', 'walk', 'explain', 'describe', 'compare',
])

function tokenize(text) {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/[\s-]+/)
      .filter((word) => word.length >= 2 && !STOPWORDS.has(word)),
  )
}

/** Precomputes the token set for every question once per build. */
export function buildIndex(questions) {
  return questions.map((question) => ({
    slug: question.slug,
    title: question.title,
    tokens: tokenize(question.title),
  }))
}

function intersectionSize(a, b) {
  let count = 0
  for (const token of a) if (b.has(token)) count += 1
  return count
}

/**
 * Conservative on purpose: a wrong link is worse than a missing one, so a
 * match needs real overlap. Use [[slug]] when you want a guaranteed link.
 */
function findMatch(text, index, selfSlug) {
  const tokens = tokenize(text)
  if (tokens.size === 0) return null

  const lower = text.toLowerCase()
  let best = null

  for (const entry of index) {
    if (entry.slug === selfSlug || entry.tokens.size === 0) continue

    const overlap = intersectionSize(tokens, entry.tokens)
    const ratio = overlap / Math.min(tokens.size, entry.tokens.size)

    // A follow-up that quotes a title outright is always a match.
    const quoted = lower.includes(entry.title.toLowerCase().replace(/[?.!]+$/, ''))
    const confident = quoted || overlap >= 3 || (overlap >= 2 && ratio >= 0.4)
    if (!confident) continue

    const score = (quoted ? 10 : 0) + overlap + ratio
    if (!best || score > best.score) best = { slug: entry.slug, score }
  }

  return best?.slug ?? null
}

const questionUrl = (base, slug) => `${base}q/${slug}`

/** Trailing asides like "(Thread dumps, jstack…)" are notes, not part of a title. */
function asTitle(text) {
  return text
    .replace(/\s*\([^)]*\)\s*$/, '')
    .trim()
    .slice(0, 120)
}

const composeUrl = (base, title) =>
  `${base}new?title=${encodeURIComponent(asTitle(title))}`

function resolveWikiLinks(markdown, index, base, onError) {
  return markdown.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (match, slug, label) => {
    const target = index.find((entry) => entry.slug === slug.trim())
    if (!target) {
      onError?.(`unknown question link [[${slug.trim()}]]`)
      return match
    }
    return `[${(label ?? target.title).trim()}](${questionUrl(base, target.slug)})`
  })
}

/** Strips Markdown emphasis/code so matching sees the prose. */
function plain(text) {
  return text
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\*\*|__|[*_~]/g, '')
    .trim()
}

function linkFollowups(markdown, index, base, selfSlug) {
  return markdown
    .split('\n')
    .map((line) => {
      const bullet = /^(\s*[-*+]\s+)(.*\S)\s*$/.exec(line)
      if (!bullet) return line

      const [, prefix, text] = bullet
      // Leave anything the author already linked alone.
      if (/\]\(|\[\[/.test(text)) return line

      const match = findMatch(plain(text), index, selfSlug)
      if (match) return `${prefix}[${text}](${questionUrl(base, match)})`

      // No question covers this yet — offer to start one.
      return `${prefix}${text} [+](${composeUrl(base, plain(text))})`
    })
    .join('\n')
}

/**
 * Prepares a whole question body: wiki-links everywhere, plus follow-up
 * autolinking inside the `## Follow-ups` section only.
 */
export function prepareBody(markdown, { index, base = '/', selfSlug, onError } = {}) {
  const resolved = resolveWikiLinks(markdown, index ?? [], base, onError)

  const lines = resolved.split('\n')
  const out = []
  let inFollowups = false
  let buffer = []

  const flush = () => {
    if (buffer.length === 0) return
    out.push(linkFollowups(buffer.join('\n'), index ?? [], base, selfSlug))
    buffer = []
  }

  for (const line of lines) {
    const heading = /^##\s+(.*\S)\s*$/.exec(line)
    if (heading) {
      flush()
      const label = heading[1].toLowerCase().replace(/[^a-z]/g, '')
      inFollowups = label === 'followups' || label === 'followup' || label === 'probes'
      out.push(line)
      continue
    }
    if (inFollowups) buffer.push(line)
    else out.push(line)
  }
  flush()

  return out.join('\n')
}
