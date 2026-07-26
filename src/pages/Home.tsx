import { Link } from 'react-router-dom'
import { groups, questions, topics } from '@/generated/content'
import { orderedGroupIds } from '@/lib/nav'
import { useDueCount } from '@/lib/useDueCount'

export default function Home() {
  const groupIds = orderedGroupIds()
  const due = useDueCount()

  return (
    <div className="space-y-12">
      <section className="border border-carbon-700 bg-carbon-900 p-6 sm:p-10">
        <p className="font-mono text-xs tracking-widest text-ember-500 uppercase">
          ■ interview question bank
        </p>
        <h1 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
          Backend & infra interviews,{' '}
          <span className="text-ember-500">one Markdown file at a time.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-carbon-300">
          Every question is a <code className="font-mono text-ember-300">.md</code>{' '}
          file in the repo, assigned to at least one topic. Read the question,
          think, then reveal the answer.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-6 font-mono text-sm">
          <span>
            <span className="text-xl font-bold text-ember-500">{questions.length}</span>{' '}
            <span className="text-carbon-400">questions</span>
          </span>
          <span>
            <span className="text-xl font-bold text-ember-500">{topics.length}</span>{' '}
            <span className="text-carbon-400">topics</span>
          </span>
          {due > 0 && (
            <span>
              <span className="text-xl font-bold text-ember-500">{due}</span>{' '}
              <span className="text-carbon-400">due to review</span>
            </span>
          )}
          <div className="ml-auto flex gap-2">
            <Link
              to="/practice"
              className="self-center rounded-md border border-ember-500 bg-ember-500 px-4 py-2 text-xs font-semibold tracking-wide text-carbon-950 uppercase transition-colors hover:border-ember-400 hover:bg-ember-400"
            >
              ◈ {due > 0 ? `Practice ${due}` : 'Practice'}
            </Link>
            <Link
              to="/new"
              className="self-center rounded-md border border-ember-500 px-4 py-2 text-xs font-semibold tracking-wide text-ember-400 uppercase transition-colors hover:bg-ember-500 hover:text-carbon-950"
            >
              + Add
            </Link>
          </div>
        </div>
      </section>

      {groupIds.map((groupId) => {
        const group = groups[groupId]
        const groupTopics = topics.filter((t) => t.group === groupId)
        if (groupTopics.length === 0) return null

        return (
          <section key={groupId}>
            <div className="mb-4 flex items-baseline gap-3 border-b border-carbon-700 pb-3">
              <h2 className="text-lg font-bold tracking-tight">{group.name}</h2>
              <p className="hidden text-sm text-carbon-400 sm:block">{group.blurb}</p>
            </div>
            <div className="stagger grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {groupTopics.map((topic) => (
                <Link
                  key={topic.id}
                  to={`/topic/${topic.id}`}
                  className="group border border-carbon-700 bg-carbon-900 p-4 transition-colors hover:border-ember-500"
                >
                  <div className="flex items-center gap-2">
                    <span aria-hidden>{topic.icon}</span>
                    <span className="font-semibold group-hover:text-ember-400">
                      {topic.name}
                    </span>
                    <span className="ml-auto font-mono text-xs text-carbon-400">
                      {topic.count}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-carbon-400">{topic.blurb}</p>
                </Link>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
