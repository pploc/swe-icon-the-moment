import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { questions, topics } from '@/generated/content'
import { QuestionList } from '@/components/QuestionList'
import NotFound from '@/pages/NotFound'

export default function TopicPage() {
  const { topicId } = useParams()
  const [role, setRole] = useState('all')
  const [filter, setFilter] = useState('')

  const topic = topics.find((t) => t.id === topicId)

  // Only the roles actually used by this topic's questions are worth showing.
  const roles = useMemo(() => {
    if (!topic) return []
    const found = new Set<string>()
    for (const q of questions) {
      if (q.topics.includes(topic.id)) q.roles.forEach((r) => found.add(r))
    }
    return [...found].sort()
  }, [topic])

  const matches = useMemo(() => {
    if (!topic) return []
    const needle = filter.trim().toLowerCase()
    return questions.filter((q) => {
      if (!q.topics.includes(topic.id)) return false
      if (role !== 'all' && !q.roles.includes(role)) return false
      if (!needle) return true
      const haystack = `${q.title} ${q.excerpt} ${q.tags.join(' ')}`.toLowerCase()
      return haystack.includes(needle)
    })
  }, [topic, role, filter])

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
        {roles.length > 1 &&
          ['all', ...roles].map((option) => (
            <button
              key={option}
              onClick={() => setRole(option)}
              className={`border px-2.5 py-1 font-mono text-xs uppercase transition-colors ${
                role === option
                  ? 'border-ember-500 bg-ember-500 font-semibold text-carbon-950'
                  : 'border-carbon-700 text-carbon-300 hover:border-ember-500 hover:text-ember-400'
              }`}
            >
              {option}
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
