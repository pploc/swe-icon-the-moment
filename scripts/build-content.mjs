/**
 * Compiles content/ into the data the app consumes.
 *
 *   content/topics.yaml        ->  src/generated/content.ts   (topics + question metadata)
 *   content/questions/**.md    ->  public/data/q/<slug>.json  (rendered HTML, fetched on demand)
 *                              ->  public/data/search.json    (full-text search corpus)
 *
 * Markdown is rendered here, at build time, so the browser never ships a
 * Markdown parser or a syntax highlighter. Validation errors are fatal: a bad
 * frontmatter field fails the build (and therefore the PR) rather than
 * producing a broken page.
 *
 * Run with --check to validate without writing anything.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import matter from 'gray-matter'
import MarkdownIt from 'markdown-it'
import anchor from 'markdown-it-anchor'
import { parse as parseYaml } from 'yaml'
import { createHighlighter } from 'shiki'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const CONTENT_DIR = path.join(ROOT, 'content')
const QUESTIONS_DIR = path.join(CONTENT_DIR, 'questions')
const GENERATED_DIR = path.join(ROOT, 'src', 'generated')
const DATA_DIR = path.join(ROOT, 'public', 'data')

const CHECK_ONLY = process.argv.includes('--check')

const DIFFICULTIES = ['junior', 'mid', 'senior', 'staff']
const ROLES = ['backend', 'infra', 'sre', 'platform', 'fullstack']

const errors = []
const warnings = []

/** Records a fatal problem against a file instead of throwing, so one run reports every error. */
function fail(file, message) {
  errors.push(`${path.relative(ROOT, file)}: ${message}`)
}

function warn(file, message) {
  warnings.push(`${path.relative(ROOT, file)}: ${message}`)
}

// --- topic registry ---------------------------------------------------------

async function loadTopics() {
  const file = path.join(CONTENT_DIR, 'topics.yaml')
  const registry = parseYaml(await fs.readFile(file, 'utf8'))

  const groups = registry?.groups ?? {}
  const topics = registry?.topics ?? []

  if (!Array.isArray(topics) || topics.length === 0) {
    fail(file, 'no topics defined')
    return { groups, topics: [] }
  }

  const seen = new Set()
  for (const topic of topics) {
    for (const field of ['id', 'name', 'group', 'icon', 'blurb']) {
      if (!topic?.[field]) fail(file, `topic ${topic?.id ?? '<unnamed>'} is missing "${field}"`)
    }
    if (seen.has(topic.id)) fail(file, `duplicate topic id "${topic.id}"`)
    seen.add(topic.id)
    if (topic.group && !groups[topic.group]) {
      fail(file, `topic "${topic.id}" references unknown group "${topic.group}"`)
    }
  }

  return { groups, topics }
}

// --- markdown ---------------------------------------------------------------

async function createRenderer() {
  const highlighter = await createHighlighter({
    themes: ['github-light', 'github-dark'],
    langs: [
      'bash', 'sql', 'json', 'yaml', 'go', 'python', 'java', 'javascript',
      'typescript', 'rust', 'c', 'dockerfile', 'hcl', 'ini', 'diff', 'text',
    ],
  })

  const loaded = new Set(highlighter.getLoadedLanguages())

  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
    highlight(code, lang) {
      const language = loaded.has(lang) ? lang : 'text'
      return highlighter.codeToHtml(code, {
        lang: language,
        themes: { light: 'github-light', dark: 'github-dark' },
        defaultColor: false,
      })
    },
  }).use(anchor, { level: [2, 3], permalink: false })

  return md
}

/**
 * Splits a question body into its Question / Answer / Follow-ups sections so the
 * UI can hide the answer behind a reveal toggle. Files that use no headings are
 * treated as answer-only, with the frontmatter title acting as the question.
 */
function splitSections(body) {
  const lines = body.split(/\r?\n/)
  const sections = { question: [], answer: [], followups: [] }
  let current = 'question'
  let sawHeading = false

  for (const line of lines) {
    const heading = /^##\s+(.*\S)\s*$/.exec(line)
    if (heading) {
      const label = heading[1].toLowerCase().replace(/[^a-z]/g, '')
      if (label === 'question' || label === 'problem') {
        current = 'question'
        sawHeading = true
        continue
      }
      if (label === 'answer' || label === 'solution') {
        current = 'answer'
        sawHeading = true
        continue
      }
      if (label === 'followups' || label === 'followup' || label === 'probes') {
        current = 'followups'
        sawHeading = true
        continue
      }
    }
    sections[current].push(line)
  }

  if (!sawHeading) {
    return { question: '', answer: body.trim(), followups: '' }
  }

  return {
    question: sections.question.join('\n').trim(),
    answer: sections.answer.join('\n').trim(),
    followups: sections.followups.join('\n').trim(),
  }
}

/** Strips Markdown down to searchable prose. Good enough for a search corpus. */
function toPlainText(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^[#>\-*+\s]+/gm, ' ')
    .replace(/[*_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// --- questions --------------------------------------------------------------

async function walk(dir) {
  const found = []
  let entries
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return found
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) found.push(...(await walk(full)))
    else if (entry.isFile() && entry.name.endsWith('.md') && !entry.name.startsWith('_')) {
      found.push(full)
    }
  }
  return found
}

function asArray(value) {
  if (value == null) return []
  return Array.isArray(value) ? value : [value]
}

async function loadQuestions(md, topicIds) {
  const files = (await walk(QUESTIONS_DIR)).sort()
  const questions = []
  const slugs = new Map()

  for (const file of files) {
    const raw = await fs.readFile(file, 'utf8')
    const { data, content } = matter(raw)

    const slug = data.slug ?? path.basename(file, '.md')
    if (slugs.has(slug)) {
      fail(file, `slug "${slug}" already used by ${path.relative(ROOT, slugs.get(slug))}`)
      continue
    }
    slugs.set(slug, file)

    if (!data.title || typeof data.title !== 'string') {
      fail(file, 'frontmatter is missing a "title"')
      continue
    }

    const topics = asArray(data.topics)
    if (topics.length === 0) {
      fail(file, 'must be assigned to at least one topic')
      continue
    }
    for (const topic of topics) {
      if (!topicIds.has(topic)) {
        fail(file, `unknown topic "${topic}" — add it to content/topics.yaml or fix the typo`)
      }
    }

    const difficulty = data.difficulty ?? 'mid'
    if (!DIFFICULTIES.includes(difficulty)) {
      fail(file, `difficulty "${difficulty}" must be one of ${DIFFICULTIES.join(', ')}`)
    }

    const roles = asArray(data.roles)
    for (const role of roles) {
      if (!ROLES.includes(role)) warn(file, `unrecognised role "${role}"`)
    }

    const sections = splitSections(content)
    if (!sections.answer) warn(file, 'has no answer section yet')

    const searchBody = toPlainText(
      [sections.question, sections.answer, sections.followups].filter(Boolean).join('\n\n'),
    )

    questions.push({
      slug,
      title: data.title.trim(),
      topics,
      difficulty,
      roles,
      tags: asArray(data.tags),
      companies: asArray(data.companies),
      time: typeof data.time === 'number' ? data.time : null,
      updated: data.updated ? String(data.updated).slice(0, 10) : null,
      source: path.relative(ROOT, file).replace(/\\/g, '/'),
      excerpt: searchBody.slice(0, 180).trim(),
      html: {
        question: sections.question ? md.render(sections.question) : '',
        answer: sections.answer ? md.render(sections.answer) : '',
        followups: sections.followups ? md.render(sections.followups) : '',
      },
      searchBody,
    })
  }

  return questions
}

// --- emit -------------------------------------------------------------------

async function emit(groups, topics, questions) {
  await fs.rm(path.join(DATA_DIR, 'q'), { recursive: true, force: true })
  await fs.mkdir(path.join(DATA_DIR, 'q'), { recursive: true })
  await fs.mkdir(GENERATED_DIR, { recursive: true })

  // Rendered HTML is fetched per question so the initial bundle stays small.
  for (const question of questions) {
    await fs.writeFile(
      path.join(DATA_DIR, 'q', `${question.slug}.json`),
      JSON.stringify({ slug: question.slug, html: question.html }),
    )
  }

  await fs.writeFile(
    path.join(DATA_DIR, 'search.json'),
    JSON.stringify(
      questions.map((q) => ({
        slug: q.slug,
        title: q.title,
        body: q.searchBody,
        tags: [...q.tags, ...q.companies].join(' '),
      })),
    ),
  )

  const counts = new Map(topics.map((t) => [t.id, 0]))
  for (const question of questions) {
    for (const topic of question.topics) counts.set(topic, (counts.get(topic) ?? 0) + 1)
  }

  const meta = questions.map(({ html: _html, searchBody: _searchBody, ...rest }) => rest)

  const module = `// GENERATED by scripts/build-content.mjs — do not edit.
import type { Group, Topic, QuestionMeta } from '@/lib/types'

export const groups: Record<string, Group> = ${JSON.stringify(groups, null, 2)}

export const topics: Topic[] = ${JSON.stringify(
    topics.map((t) => ({ ...t, count: counts.get(t.id) ?? 0 })),
    null,
    2,
  )}

export const questions: QuestionMeta[] = ${JSON.stringify(meta, null, 2)}

export const builtAt = ${JSON.stringify(new Date().toISOString())}
`

  await fs.writeFile(path.join(GENERATED_DIR, 'content.ts'), module)
}

// --- main -------------------------------------------------------------------

const { groups, topics } = await loadTopics()
const topicIds = new Set(topics.map((t) => t.id))
const md = await createRenderer()
const questions = await loadQuestions(md, topicIds)

for (const message of warnings) console.warn(`  warn  ${message}`)

if (errors.length > 0) {
  console.error(`\n✗ content build failed with ${errors.length} error(s):\n`)
  for (const message of errors) console.error(`  ${message}`)
  console.error('')
  process.exit(1)
}

const orphans = topics.filter((t) => !questions.some((q) => q.topics.includes(t.id)))

if (CHECK_ONLY) {
  console.log(`✓ ${questions.length} questions across ${topics.length} topics — no errors`)
} else {
  await emit(groups, topics, questions)
  console.log(
    `✓ built ${questions.length} questions across ${topics.length} topics` +
      (orphans.length ? ` (${orphans.length} topic(s) still empty)` : ''),
  )
}
