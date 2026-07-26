import { Link } from 'react-router-dom'
import { topics } from '@/generated/content'
import type { Difficulty } from '@/lib/types'

const DIFFICULTY_STYLES: Record<Difficulty, string> = {
  junior: 'text-carbon-300 border-carbon-600',
  mid: 'text-ember-300 border-ember-300/40',
  senior: 'text-ember-400 border-ember-400/60',
  staff: 'text-ember-500 border-ember-500',
}

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span
      className={`border px-1.5 py-0.5 font-mono text-[11px] tracking-wide uppercase ${DIFFICULTY_STYLES[difficulty]}`}
    >
      {difficulty}
    </span>
  )
}

export function TopicChip({ topicId }: { topicId: string }) {
  const topic = topics.find((t) => t.id === topicId)
  if (!topic) return null
  return (
    <Link
      to={`/topic/${topic.id}`}
      className="border border-carbon-700 bg-carbon-900 px-1.5 py-0.5 font-mono text-[11px] text-carbon-300 transition-colors hover:border-ember-500 hover:text-ember-400"
    >
      {topic.icon} {topic.name}
    </Link>
  )
}

export function Tag({ label }: { label: string }) {
  return (
    <span className="px-1 font-mono text-[11px] text-carbon-400">#{label}</span>
  )
}
