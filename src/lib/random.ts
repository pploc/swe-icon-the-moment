import { questions } from '@/generated/content'

/** A random question slug, avoiding the one currently open where possible. */
export function randomSlug(exclude?: string): string | null {
  const pool = questions.filter((q) => q.slug !== exclude)
  const list = pool.length > 0 ? pool : questions
  if (list.length === 0) return null
  return list[Math.floor(Math.random() * list.length)].slug
}
