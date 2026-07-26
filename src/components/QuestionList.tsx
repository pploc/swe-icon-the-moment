import { Link } from 'react-router-dom'
import { DifficultyBadge, Tag, TopicChip } from '@/components/badges'
import type { QuestionMeta } from '@/lib/types'

export function QuestionList({
  questions,
  showTopics = false,
  empty = 'No questions match.',
}: {
  questions: QuestionMeta[]
  showTopics?: boolean
  empty?: string
}) {
  if (questions.length === 0) {
    return (
      <p className="border border-dashed border-carbon-700 px-4 py-8 text-center font-mono text-sm text-carbon-400">
        {empty}
      </p>
    )
  }

  return (
    <ul className="divide-y divide-carbon-800 border border-carbon-700">
      {questions.map((q) => (
        <li key={q.slug}>
          <Link
            to={`/q/${q.slug}`}
            className="group block bg-carbon-900 px-4 py-3.5 transition-colors hover:bg-carbon-850"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-carbon-50 group-hover:text-ember-400">
                {q.title}
              </span>
              <DifficultyBadge difficulty={q.difficulty} />
              {q.time !== null && (
                <span className="font-mono text-[11px] text-carbon-400">
                  ~{q.time}min
                </span>
              )}
            </div>
            {q.excerpt && (
              <p className="mt-1 line-clamp-2 text-sm text-carbon-400">
                {q.excerpt}…
              </p>
            )}
            {(showTopics || q.tags.length > 0) && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {showTopics &&
                  q.topics.map((t) => <TopicChip key={t} topicId={t} />)}
                {q.tags.slice(0, 5).map((t) => (
                  <Tag key={t} label={t} />
                ))}
              </div>
            )}
          </Link>
        </li>
      ))}
    </ul>
  )
}
