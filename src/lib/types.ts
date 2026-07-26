export interface Group {
  name: string
  blurb: string
}

export interface Topic {
  id: string
  name: string
  group: string
  icon: string
  blurb: string
  count: number
}

export interface QuestionMeta {
  slug: string
  title: string
  topics: string[]
  roles: string[]
  tags: string[]
  /** True when the answer is missing or still a placeholder — see /drafts. */
  draft: boolean
  /** Slugs of questions sharing topics/tags, ranked at build time. */
  related: string[]
  time: number | null
  updated: string | null
  source: string
  excerpt: string
}

export interface QuestionSections {
  question: string
  answer: string
  followups: string
}

export interface QuestionBody {
  slug: string
  html: QuestionSections
  /** Original Markdown body, so the in-page editor can load it without GitHub. */
  raw: string
}
