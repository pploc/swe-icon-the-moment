import { Link } from 'react-router-dom'
import { topics } from '@/generated/content'

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
  return <span className="px-1 font-mono text-[11px] text-carbon-400">#{label}</span>
}
