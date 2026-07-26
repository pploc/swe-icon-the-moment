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

export type Difficulty = 'junior' | 'mid' | 'senior' | 'staff'

export interface QuestionMeta {
  slug: string
  title: string
  topics: string[]
  difficulty: Difficulty
  roles: string[]
  tags: string[]
  companies: string[]
  time: number | null
  updated: string | null
  source: string
  excerpt: string
}

export interface QuestionBody {
  slug: string
  html: {
    question: string
    answer: string
    followups: string
  }
}
