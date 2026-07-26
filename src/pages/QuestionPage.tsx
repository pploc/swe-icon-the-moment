import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { questions } from '@/generated/content'
import { DifficultyBadge, Tag, TopicChip } from '@/components/badges'
import { editUrl, sourceUrl } from '@/lib/repo'
import NotFound from '@/pages/NotFound'
import type { QuestionBody } from '@/lib/types'

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; body: QuestionBody }

/**
 * Renders any ```mermaid blocks in the visible HTML. The library (~1MB) is
 * imported lazily, so pages without diagrams never pay for it.
 */
function useMermaid(deps: unknown[]) {
  useEffect(() => {
    const nodes = document.querySelectorAll<HTMLElement>(
      'pre.mermaid:not([data-processed])',
    )
    if (nodes.length === 0) return

    let cancelled = false
    import('mermaid').then(({ default: mermaid }) => {
      if (cancelled) return
      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        themeVariables: {
          fontFamily: 'ui-monospace, Consolas, monospace',
          primaryColor: '#202020',
          primaryBorderColor: '#ff6b1a',
          primaryTextColor: '#f4f4f2',
          lineColor: '#8f8f8f',
        },
      })
      mermaid.run({ nodes: Array.from(nodes) }).catch(() => {})
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

export default function QuestionPage() {
  const { slug } = useParams()
  const meta = questions.find((q) => q.slug === slug)

  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [revealed, setRevealed] = useState(false)

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
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{meta.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <DifficultyBadge difficulty={meta.difficulty} />
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
                    className="prose"
                    dangerouslySetInnerHTML={{ __html: state.body.html.followups }}
                  />
                </section>
              )}
            </>
          )}
        </div>
      )}

      <footer className="mt-12 flex flex-wrap gap-4 border-t border-carbon-700 pt-4 font-mono text-xs text-carbon-400">
        <a href={sourceUrl(meta.source)} target="_blank" rel="noreferrer" className="hover:text-ember-400">
          view markdown source
        </a>
        <a href={editUrl(meta.source)} target="_blank" rel="noreferrer" className="hover:text-ember-400">
          suggest an edit
        </a>
      </footer>
    </article>
  )
}
