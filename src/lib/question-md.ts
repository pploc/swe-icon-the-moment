export interface QuestionFields {
  title: string
  topics: string[]
  roles: string[]
  tags: string
  companies: string
  time: string
  /** The whole Markdown body, headings included — one document, one editor. */
  body: string
}

/** New questions start from this scaffold so the sections are never forgotten. */
export const BODY_TEMPLATE = `## Question

## Answer

## Follow-ups

`

export const EMPTY_FIELDS: QuestionFields = {
  title: '',
  topics: [],
  roles: [],
  tags: '',
  companies: '',
  time: '',
  body: BODY_TEMPLATE,
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function yamlString(text: string): string {
  return `"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

function csv(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

/**
 * Mirrors the section split in scripts/build-content.mjs, so the form can warn
 * about an empty answer before the build does.
 */
export function splitSections(body: string): {
  question: string
  answer: string
  followups: string
} {
  const sections = { question: [] as string[], answer: [] as string[], followups: [] as string[] }
  let current: keyof typeof sections = 'question'
  let sawHeading = false

  for (const line of body.split(/\r?\n/)) {
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

  if (!sawHeading) return { question: '', answer: body.trim(), followups: '' }

  return {
    question: sections.question.join('\n').trim(),
    answer: sections.answer.join('\n').trim(),
    followups: sections.followups.join('\n').trim(),
  }
}

/** Renders the form state back into the exact Markdown file the build expects. */
export function composeMarkdown(fields: QuestionFields): string {
  const lines = [
    '---',
    `title: ${yamlString(fields.title.trim() || 'Untitled question')}`,
    `topics: [${fields.topics.join(', ')}]`,
  ]
  if (fields.roles.length > 0) lines.push(`roles: [${fields.roles.join(', ')}]`)

  const tags = csv(fields.tags)
  if (tags.length > 0) lines.push(`tags: [${tags.join(', ')}]`)

  const companies = csv(fields.companies)
  if (companies.length > 0) lines.push(`companies: [${companies.join(', ')}]`)

  if (fields.time.trim() && !Number.isNaN(Number(fields.time))) {
    lines.push(`time: ${Number(fields.time)}`)
  }

  lines.push(`updated: ${new Date().toISOString().slice(0, 10)}`, '---', '')

  return `${lines.join('\n')}\n${fields.body.trim()}\n`
}

export function missingFields(fields: QuestionFields): string[] {
  const problems: string[] = []
  const sections = splitSections(fields.body)
  if (!fields.title.trim()) problems.push('a title')
  if (fields.topics.length === 0) problems.push('at least one topic')
  if (!sections.question.trim()) problems.push('the question text')
  if (!sections.answer.trim()) problems.push('the answer')
  return problems
}
