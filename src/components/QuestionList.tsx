import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Tag, TopicChip } from '@/components/badges'
import type { QuestionMeta } from '@/lib/types'

/** Wraps each search term in <mark> without letting user input reach innerHTML. */
function highlight(text: string, terms: string[]): ReactNode {
  if (terms.length === 0) return text

  const pattern = new RegExp(
    `(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
    'gi',
  )

  return text.split(pattern).map((part, index) =>
    index % 2 === 1 ? (
      <mark key={index} className="bg-ember-500/30 text-inherit">
        {part}
      </mark>
    ) : (
      part
    ),
  )
}

export function QuestionList({
  questions,
  showTopics = false,
  terms = [],
  empty = 'No questions match.',
}: {
  questions: QuestionMeta[]
  showTopics?: boolean
  terms?: string[]
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
                {highlight(q.title, terms)}
              </span>
              {q.draft && (
                <span className="border border-ember-500 px-1 py-px font-mono text-[10px] tracking-wide text-ember-400 uppercase">
                  draft
                </span>
              )}
              {q.time !== null && (
                <span className="font-mono text-[11px] text-carbon-400">~{q.time}min</span>
              )}
            </div>
            {q.excerpt && (
              <p className="mt-1 line-clamp-2 text-sm text-carbon-400">
                {highlight(q.excerpt, terms)}…
              </p>
            )}
            {(showTopics || q.tags.length > 0) && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {showTopics && q.topics.map((t) => <TopicChip key={t} topicId={t} />)}
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
