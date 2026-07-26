export interface QuestionFields {
  title: string
  topics: string[]
  roles: string[]
  tags: string
  companies: string
  time: string
  question: string
  answer: string
  followups: string
}

export const EMPTY_FIELDS: QuestionFields = {
  title: '',
  topics: [],
  roles: [],
  tags: '',
  companies: '',
  time: '',
  question: '',
  answer: '',
  followups: '',
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

  lines.push(
    `updated: ${new Date().toISOString().slice(0, 10)}`,
    '---',
    '',
    '## Question',
    '',
    fields.question.trim() || '…',
    '',
    '## Answer',
    '',
    fields.answer.trim() || '…',
  )

  if (fields.followups.trim()) {
    lines.push('', '## Follow-ups', '', fields.followups.trim())
  }

  lines.push('')
  return lines.join('\n')
}

/** The Markdown a preview should render: all three sections, in page order. */
export function previewMarkdown(fields: QuestionFields): string {
  const parts = []
  if (fields.question.trim()) parts.push('## Question\n\n' + fields.question.trim())
  if (fields.answer.trim()) parts.push('## Answer\n\n' + fields.answer.trim())
  if (fields.followups.trim()) {
    parts.push('## Follow-ups\n\n' + fields.followups.trim())
  }
  return parts.join('\n\n') || '_Nothing to preview yet._'
}

export function missingFields(fields: QuestionFields): string[] {
  const problems: string[] = []
  if (!fields.title.trim()) problems.push('a title')
  if (fields.topics.length === 0) problems.push('at least one topic')
  if (!fields.question.trim()) problems.push('the question text')
  if (!fields.answer.trim()) problems.push('the answer')
  return problems
}
