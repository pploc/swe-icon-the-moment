import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { questions } from '@/generated/content'
import { Tag, TopicChip } from '@/components/badges'
import { useMermaid } from '@/lib/useMermaid'
import { useInternalLinks } from '@/lib/useInternalLinks'
import { sourceUrl } from '@/lib/repo'
import NotFound from '@/pages/NotFound'
import type { QuestionBody } from '@/lib/types'

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; body: QuestionBody }

export default function QuestionPage() {
  const { slug } = useParams()
  const meta = questions.find((q) => q.slug === slug)

  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [revealed, setRevealed] = useState(false)

  const internalLinks = useInternalLinks()

  const related = (meta?.related ?? [])
    .map((slug) => questions.find((q) => q.slug === slug))
    .filter((q) => q !== undefined)

  useMermaid([state, revealed])

  useEffect(() => {
    if (!meta) return
    let cancelled = false
    setState({ status: 'loading' })
    setRevealed(false)
    window.scrollTo(0, 0)

    fetch(`${import.meta.env.BASE_URL}data/q/${meta.slug}.json`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`${res.status}`))))
      .then((body: QuestionBody) => {
        if (!cancelled) setState({ status: 'ready', body })
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' })
      })

    return () => {
      cancelled = true
    }
  }, [meta])

  if (!meta) return <NotFound />

  return (
    <article className="mx-auto max-w-4xl">
      <nav className="mb-6 font-mono text-xs text-carbon-400">
        <Link to="/" className="hover:text-ember-400">
          topics
        </Link>{' '}
        <span className="text-ember-500">/</span>{' '}
        <Link to={`/topic/${meta.topics[0]}`} className="hover:text-ember-400">
          {meta.topics[0]}
        </Link>{' '}
        <span className="text-ember-500">/</span> {meta.slug}
      </nav>

      <header>
        <div className="flex items-start gap-4">
          <h1 className="flex-1 text-2xl font-bold tracking-tight sm:text-3xl">
            {meta.title}
          </h1>
          <Link
            to={`/q/${meta.slug}/edit`}
            className="mt-1 shrink-0 border border-carbon-700 px-3 py-1.5 font-mono text-xs font-semibold tracking-wide text-carbon-300 uppercase transition-colors hover:border-ember-500 hover:text-ember-400"
          >
            ✎ Edit
          </Link>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {meta.draft && (
            <span className="border border-ember-500 px-1.5 py-0.5 font-mono text-[11px] tracking-wide text-ember-400 uppercase">
              draft
            </span>
          )}
          {meta.topics.map((t) => (
            <TopicChip key={t} topicId={t} />
          ))}
          {meta.roles.map((role) => (
            <span key={role} className="font-mono text-[11px] text-carbon-400 uppercase">
              {role}
            </span>
          ))}
          {meta.time !== null && (
            <span className="font-mono text-[11px] text-carbon-400">~{meta.time}min</span>
          )}
          {meta.updated && (
            <span className="ml-auto font-mono text-[11px] text-carbon-400">
              updated {meta.updated}
            </span>
          )}
        </div>

        {meta.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {meta.tags.map((t) => (
              <Tag key={t} label={t} />
            ))}
          </div>
        )}
      </header>

      {state.status === 'loading' && (
        <p className="mt-10 font-mono text-sm text-carbon-400">loading…</p>
      )}

      {state.status === 'error' && (
        <p className="mt-10 border border-dashed border-carbon-700 px-4 py-8 text-center font-mono text-sm text-carbon-400">
          Failed to load this question. Try reloading the page.
        </p>
      )}

      {state.status === 'ready' && (
        <div className="mt-8 space-y-8">
          {state.body.html.question && (
            <section>
              <h2 className="mb-3 font-mono text-xs font-semibold tracking-widest text-ember-500 uppercase">
                ■ Question
              </h2>
              <div
                {...internalLinks}
                className="prose"
                dangerouslySetInnerHTML={{ __html: state.body.html.question }}
              />
            </section>
          )}

          {!revealed ? (
            <button
              onClick={() => setRevealed(true)}
              className="w-full border border-ember-500 bg-ember-500 px-4 py-3 font-mono text-sm font-bold tracking-widest text-carbon-950 uppercase transition-colors hover:border-ember-400 hover:bg-ember-400"
            >
              Reveal answer
            </button>
          ) : (
            <>
              <section className="border-t border-carbon-700 pt-6">
                <h2 className="mb-3 font-mono text-xs font-semibold tracking-widest text-ember-500 uppercase">
                  ■ Answer
                </h2>
                <div
                  {...internalLinks}
                  className="prose"
                  dangerouslySetInnerHTML={{ __html: state.body.html.answer }}
                />
              </section>

              {state.body.html.followups && (
                <section className="border-t border-carbon-700 pt-6">
                  <h2 className="mb-3 font-mono text-xs font-semibold tracking-widest text-ember-500 uppercase">
                    ■ Follow-ups
                  </h2>
                  <div
                    {...internalLinks}
                    className="prose"
                    dangerouslySetInnerHTML={{ __html: state.body.html.followups }}
                  />
                </section>
              )}
            </>
          )}
        </div>
      )}

      {related.length > 0 && (
        <section className="mt-12 border-t border-carbon-700 pt-6">
          <h2 className="mb-3 font-mono text-xs font-semibold tracking-widest text-ember-500 uppercase">
            ■ Related
          </h2>
          <ul className="divide-y divide-carbon-800 border border-carbon-700">
            {related.map((other) => (
              <li key={other.slug}>
                <Link
                  to={`/q/${other.slug}`}
                  className="group flex items-baseline gap-3 bg-carbon-900 px-4 py-2.5 transition-colors hover:bg-carbon-850"
                >
                  <span className="text-sm group-hover:text-ember-400">{other.title}</span>
                  <span className="ml-auto shrink-0 font-mono text-[11px] text-carbon-400">
                    {other.topics.join(' · ')}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="mt-12 flex flex-wrap gap-4 border-t border-carbon-700 pt-4 font-mono text-xs text-carbon-400">
        <Link to={`/q/${meta.slug}/edit`} className="hover:text-ember-400">
          edit in page
        </Link>
        <a href={sourceUrl(meta.source)} target="_blank" rel="noreferrer" className="hover:text-ember-400">
          view markdown source
        </a>
      </footer>
    </article>
  )
}
