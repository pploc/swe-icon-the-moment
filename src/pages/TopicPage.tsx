import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { questions, topics } from '@/generated/content'
import { QuestionList } from '@/components/QuestionList'
import NotFound from '@/pages/NotFound'
import type { Difficulty } from '@/lib/types'

const DIFFICULTIES: Difficulty[] = ['junior', 'mid', 'senior', 'staff']

export default function TopicPage() {
  const { topicId } = useParams()
  const [difficulty, setDifficulty] = useState<Difficulty | 'all'>('all')
  const [filter, setFilter] = useState('')

  const topic = topics.find((t) => t.id === topicId)

  const matches = useMemo(() => {
    if (!topic) return []
    const needle = filter.trim().toLowerCase()
    return questions.filter((q) => {
      if (!q.topics.includes(topic.id)) return false
      if (difficulty !== 'all' && q.difficulty !== difficulty) return false
      if (!needle) return true
      const haystack = `${q.title} ${q.excerpt} ${q.tags.join(' ')}`.toLowerCase()
      return haystack.includes(needle)
    })
  }, [topic, difficulty, filter])

  if (!topic) return <NotFound />

  return (
    <div>
      <nav className="mb-6 font-mono text-xs text-carbon-400">
        <Link to="/" className="hover:text-ember-400">
          topics
        </Link>{' '}
        <span className="text-ember-500">/</span> {topic.id}
      </nav>

      <div className="border border-carbon-700 bg-carbon-900 p-6">
        <h1 className="text-2xl font-bold tracking-tight">
          <span aria-hidden className="mr-2">
            {topic.icon}
          </span>
          {topic.name}
        </h1>
        <p className="mt-2 text-carbon-300">{topic.blurb}</p>
        <p className="mt-3 font-mono text-xs text-carbon-400">
          {topic.count} question{topic.count === 1 ? '' : 's'}
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {(['all', ...DIFFICULTIES] as const).map((level) => (
          <button
            key={level}
            onClick={() => setDifficulty(level)}
            className={`border px-2.5 py-1 font-mono text-xs uppercase transition-colors ${
              difficulty === level
                ? 'border-ember-500 bg-ember-500 font-semibold text-carbon-950'
                : 'border-carbon-700 text-carbon-300 hover:border-ember-500 hover:text-ember-400'
            }`}
          >
            {level}
          </button>
        ))}
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter within topic…"
          aria-label="Filter questions in this topic"
          className="ml-auto w-full border border-carbon-700 bg-carbon-900 px-3 py-1.5 text-sm placeholder:text-carbon-400 focus:border-ember-500 focus:outline-none sm:w-56"
        />
      </div>

      <div className="mt-4">
        <QuestionList
          questions={matches}
          empty={
            topic.count === 0
              ? 'No questions in this topic yet — be the first to add one.'
              : 'No questions match the current filters.'
          }
        />
      </div>
    </div>
  )
}
