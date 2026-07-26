import type { QuestionFields } from '@/lib/question-md'

/** Unsent editor state, kept locally so closing the tab doesn't lose writing. */
const PREFIX = 'itm:draft:'
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000

interface StoredDraft {
  savedAt: number
  fields: QuestionFields
}

export function draftKey(mode: 'create' | 'edit', slug?: string): string {
  return `${PREFIX}${mode}:${slug ?? 'new'}`
}

export function loadDraft(key: string): StoredDraft | null {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const draft = JSON.parse(raw) as StoredDraft
    if (Date.now() - draft.savedAt > MAX_AGE_MS) {
      window.localStorage.removeItem(key)
      return null
    }
    return draft
  } catch {
    return null
  }
}

export function saveDraft(key: string, fields: QuestionFields): void {
  try {
    window.localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), fields }))
  } catch {
    // Quota or private mode — autosave is a convenience, not a guarantee.
  }
}

export function clearDraft(key: string): void {
  try {
    window.localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

export function sameFields(a: QuestionFields, b: QuestionFields): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

export function describeAge(savedAt: number): string {
  const minutes = Math.round((Date.now() - savedAt) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}
