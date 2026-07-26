import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { questions, topics } from '@/generated/content'
import { useMermaid } from '@/lib/useMermaid'
import { useInternalLinks } from '@/lib/useInternalLinks'
import { useQuestionBody } from '@/lib/useQuestionBody'
import {
  buildQueue,
  exportProgress,
  formatDue,
  importProgress,
  loadAll,
  previewInterval,
  resetAll,
  saveAll,
  schedule,
  stats,
  type CardMap,
  type Rating,
} from '@/lib/srs'

const RATINGS: { key: Rating; label: string; hint: string; className: string }[] = [
  {
    key: 'again',
    label: 'Again',
    hint: '1',
    className: 'border-signal-danger text-signal-danger hover:bg-signal-danger hover:text-carbon-950',
  },
  {
    key: 'hard',
    label: 'Hard',
    hint: '2',
    className: 'border-carbon-600 text-carbon-300 hover:bg-carbon-600 hover:text-carbon-50',
  },
  {
    key: 'good',
    label: 'Good',
    hint: '3',
    className: 'border-ember-500 text-ember-400 hover:bg-ember-500 hover:text-carbon-950',
  },
  {
    key: 'easy',
    label: 'Easy',
    hint: '4',
    className: 'border-signal-tip text-signal-tip hover:bg-signal-tip hover:text-carbon-950',
  },
]

const chipClass = (active: boolean) =>
  `border px-2 py-0.5 font-mono text-xs transition-colors ${
    active
      ? 'border-ember-500 bg-ember-500 font-semibold text-carbon-950'
      : 'border-carbon-700 text-carbon-300 hover:border-ember-500 hover:text-ember-400'
  }`

function StatTile({ value, label }: { value: number; label: string }) {
  return (
    <div className="border border-carbon-700 bg-carbon-900 px-4 py-3">
      <p className="font-mono text-2xl font-bold text-ember-500">{value}</p>
      <p className="font-mono text-[11px] tracking-wide text-carbon-400 uppercase">{label}</p>
    </div>
  )
}

export default function PracticePage() {
  const [cards, setCards] = useState<CardMap>(() => loadAll())
  const [phase, setPhase] = useState<'setup' | 'running' | 'done'>('setup')
  const [onlyDue, setOnlyDue] = useState(true)
  const [picked, setPicked] = useState<string[]>([])
  const [limit, setLimit] = useState(20)

  const [queue, setQueue] = useState<string[]>([])
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [tally, setTally] = useState<Record<Rating, number>>({
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
  })
  const [requeued, setRequeued] = useState<Record<string, number>>({})
  const [elapsed, setElapsed] = useState(0)
  const [notice, setNotice] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const internalLinks = useInternalLinks()

  const pool = useMemo(
    () =>
      questions
        .filter((q) => picked.length === 0 || q.topics.some((t) => picked.includes(t)))
        .map((q) => q.slug),
    [picked],
  )

  const poolStats = useMemo(() => stats(pool, cards), [pool, cards])

  const slug = queue[index]
  const meta = questions.find((q) => q.slug === slug)
  const body = useQuestionBody(phase === 'running' ? slug : undefined)

  useMermaid([body, revealed, slug])

  // A stopwatch per card — the frontmatter `time` is the target to beat.
  useEffect(() => {
    if (phase !== 'running') return
    setElapsed(0)
    const timer = setInterval(() => setElapsed((seconds) => seconds + 1), 1000)
    return () => clearInterval(timer)
  }, [slug, phase])

  function start() {
    const next = buildQueue({ slugs: pool, cards, onlyDue, limit })
    if (next.length === 0) return
    setQueue(next)
    setIndex(0)
    setRevealed(false)
    setRequeued({})
    setTally({ again: 0, hard: 0, good: 0, easy: 0 })
    setPhase('running')
  }

  const rate = useCallback(
    (rating: Rating) => {
      if (!slug) return

      const updated = { ...cards, [slug]: schedule(cards[slug], rating) }
      setCards(updated)
      saveAll(updated)
      setTally((current) => ({ ...current, [rating]: current[rating] + 1 }))

      // "Again" comes back before the session ends, but at most twice, so a
      // stubborn card can't trap you in a loop.
      let nextQueue = queue
      if (rating === 'again' && (requeued[slug] ?? 0) < 2) {
        nextQueue = [...queue, slug]
        setQueue(nextQueue)
        setRequeued((current) => ({ ...current, [slug]: (current[slug] ?? 0) + 1 }))
      }

      if (index + 1 >= nextQueue.length) setPhase('done')
      else {
        setIndex(index + 1)
        setRevealed(false)
      }
    },
    [cards, index, queue, requeued, slug],
  )

  // Space reveals, 1–4 rate, Esc ends the session.
  useEffect(() => {
    if (phase !== 'running') return
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return

      if (!revealed && (event.key === ' ' || event.key === 'Enter')) {
        event.preventDefault()
        setRevealed(true)
        return
      }
      if (revealed) {
        const rating = { '1': 'again', '2': 'hard', '3': 'good', '4': 'easy' }[event.key]
        if (rating) {
          event.preventDefault()
          rate(rating as Rating)
          return
        }
      }
      if (event.key === 'Escape') setPhase('done')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [phase, revealed, rate])

  function onImport(file: File) {
    file
      .text()
      .then((text) => {
        const merged = importProgress(text)
        setCards(loadAll())
        setNotice(`Imported ${merged} card${merged === 1 ? '' : 's'}.`)
      })
      .catch((error: Error) => setNotice(error.message))
  }

  function download() {
    const url = URL.createObjectURL(new Blob([exportProgress()], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'swe-itm-progress.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  // --- setup ----------------------------------------------------------------

  if (phase === 'setup') {
    const available = buildQueue({ slugs: pool, cards, onlyDue, limit }).length

    return (
      <div className="mx-auto max-w-4xl animate-rise">
        <h1 className="font-mono text-xs font-semibold tracking-widest text-ember-500 uppercase">
          ■ Practice
        </h1>
        <p className="mt-2 text-sm text-carbon-300">
          Answer from memory, then rate yourself. Cards you find hard come back
          sooner; ones you know drift further out. Progress is stored in this
          browser.
        </p>

        <div className="stagger mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile value={poolStats.due} label="due now" />
          <StatTile value={poolStats.unseen} label="unseen" />
          <StatTile value={poolStats.learning} label="learning" />
          <StatTile value={poolStats.known} label="known" />
        </div>

        <div className="mt-6 space-y-4 border border-carbon-700 bg-carbon-900 p-4">
          <div>
            <span className="mb-1.5 block font-mono text-[11px] tracking-wide text-carbon-400 uppercase">
              Scope
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => setOnlyDue(true)} className={chipClass(onlyDue)}>
                due &amp; unseen
              </button>
              <button onClick={() => setOnlyDue(false)} className={chipClass(!onlyDue)}>
                everything
              </button>
            </div>
          </div>

          <div>
            <span className="mb-1.5 block font-mono text-[11px] tracking-wide text-carbon-400 uppercase">
              Topics {picked.length === 0 && <span className="normal-case">(all)</span>}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {topics.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() =>
                    setPicked((current) =>
                      current.includes(topic.id)
                        ? current.filter((id) => id !== topic.id)
                        : [...current, topic.id],
                    )
                  }
                  className={chipClass(picked.includes(topic.id))}
                >
                  {topic.icon} {topic.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="mb-1.5 block font-mono text-[11px] tracking-wide text-carbon-400 uppercase">
              Session length
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[10, 20, 50, 999].map((size) => (
                <button
                  key={size}
                  onClick={() => setLimit(size)}
                  className={chipClass(limit === size)}
                >
                  {size === 999 ? 'no limit' : size}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-carbon-700 pt-4">
            <button
              onClick={start}
              disabled={available === 0}
              className="border border-ember-500 bg-ember-500 px-5 py-2 font-mono text-sm font-bold tracking-wide text-carbon-950 uppercase transition-colors hover:border-ember-400 hover:bg-ember-400 disabled:cursor-not-allowed disabled:border-carbon-700 disabled:bg-transparent disabled:text-carbon-400"
            >
              Start · {available} card{available === 1 ? '' : 's'}
            </button>
            {available === 0 && (
              <span className="font-mono text-xs text-carbon-400">
                nothing due — switch scope to “everything” to drill anyway
              </span>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 font-mono text-xs text-carbon-400">
          <span>Progress lives in this browser:</span>
          <button onClick={download} className="underline hover:text-ember-400">
            export
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="underline hover:text-ember-400"
          >
            import
          </button>
          <button
            onClick={() => {
              if (!window.confirm('Reset all practice progress?')) return
              resetAll()
              setCards({})
              setNotice('Progress reset.')
            }}
            className="underline hover:text-signal-danger"
          >
            reset
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) onImport(file)
              event.target.value = ''
            }}
          />
          {notice && <span className="text-ember-400">{notice}</span>}
        </div>
      </div>
    )
  }

  // --- done -----------------------------------------------------------------

  if (phase === 'done') {
    const reviewed = Object.values(tally).reduce((sum, count) => sum + count, 0)
    const nextDue = Object.entries(cards)
      .filter(([cardSlug]) => pool.includes(cardSlug))
      .map(([, card]) => card.due)
      .filter((due) => due > Date.now())
      .sort((a, b) => a - b)[0]

    return (
      <div className="mx-auto max-w-2xl animate-rise text-center">
        <h1 className="font-mono text-xs font-semibold tracking-widest text-ember-500 uppercase">
          ■ Session complete
        </h1>
        <p className="mt-4 font-mono text-5xl font-bold text-ember-500">{reviewed}</p>
        <p className="font-mono text-xs tracking-wide text-carbon-400 uppercase">
          cards reviewed
        </p>

        <div className="stagger mt-8 grid grid-cols-4 gap-2">
          {RATINGS.map((rating) => (
            <div key={rating.key} className="border border-carbon-700 bg-carbon-900 px-2 py-3">
              <p className="font-mono text-xl font-bold">{tally[rating.key]}</p>
              <p className="font-mono text-[11px] text-carbon-400 uppercase">{rating.label}</p>
            </div>
          ))}
        </div>

        {nextDue && (
          <p className="mt-6 font-mono text-xs text-carbon-400">
            next review {formatDue(nextDue)}
          </p>
        )}

        <div className="mt-8 flex justify-center gap-3">
          <button
            onClick={() => setPhase('setup')}
            className="border border-ember-500 bg-ember-500 px-4 py-2 font-mono text-xs font-bold tracking-wide text-carbon-950 uppercase transition-colors hover:border-ember-400 hover:bg-ember-400"
          >
            Practice more
          </button>
          <Link
            to="/"
            className="border border-carbon-700 px-4 py-2 font-mono text-xs font-semibold tracking-wide text-carbon-300 uppercase transition-colors hover:border-ember-500 hover:text-ember-400"
          >
            Dashboard
          </Link>
        </div>
      </div>
    )
  }

  // --- running --------------------------------------------------------------

  const progress = ((index + (revealed ? 0.5 : 0)) / queue.length) * 100
  const overtime = meta?.time != null && elapsed > meta.time * 60

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4">
        <div className="flex items-center justify-between font-mono text-xs text-carbon-400">
          <span>
            {index + 1} / {queue.length}
          </span>
          <span className={overtime ? 'text-ember-400' : ''}>
            {String(Math.floor(elapsed / 60)).padStart(2, '0')}:
            {String(elapsed % 60).padStart(2, '0')}
            {meta?.time != null && <span className="text-carbon-400"> / {meta.time}min</span>}
          </span>
          <button onClick={() => setPhase('done')} className="hover:text-ember-400">
            end session
          </button>
        </div>
        <div className="mt-2 h-0.5 bg-carbon-800">
          <div
            className="h-full bg-ember-500 transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {meta && (
        <article key={slug} className="animate-rise">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{meta.title}</h1>
          <p className="mt-2 font-mono text-[11px] text-carbon-400">
            {meta.topics.join(' · ')}
            {cards[meta.slug]?.reps ? ` · seen ${cards[meta.slug].reps}×` : ' · new'}
          </p>

          {body.status === 'loading' && (
            <p className="mt-8 font-mono text-sm text-carbon-400">loading…</p>
          )}

          {body.status === 'ready' && (
            <>
              {body.body.html.question && (
                <div
                  className="prose mt-6"
                  dangerouslySetInnerHTML={{ __html: body.body.html.question }}
                />
              )}

              {!revealed ? (
                <button
                  onClick={() => setRevealed(true)}
                  className="mt-8 w-full border border-ember-500 bg-ember-500 px-4 py-3 font-mono text-sm font-bold tracking-widest text-carbon-950 uppercase transition-colors hover:border-ember-400 hover:bg-ember-400"
                >
                  Show answer <span className="opacity-60">space</span>
                </button>
              ) : (
                <div className="animate-reveal">
                  <section className="mt-8 border-t border-carbon-700 pt-6">
                    <h2 className="mb-3 font-mono text-xs font-semibold tracking-widest text-ember-500 uppercase">
                      ■ Answer
                    </h2>
                    <div
                      className="prose"
                      dangerouslySetInnerHTML={{ __html: body.body.html.answer }}
                    />
                  </section>

                  {body.body.html.followups && (
                    <section className="mt-6 border-t border-carbon-700 pt-6">
                      <h2 className="mb-3 font-mono text-xs font-semibold tracking-widest text-ember-500 uppercase">
                        ■ Follow-ups
                      </h2>
                      <div
                        {...internalLinks}
                        className="prose"
                        dangerouslySetInnerHTML={{ __html: body.body.html.followups }}
                      />
                    </section>
                  )}

                  <div className="sticky bottom-0 mt-8 grid grid-cols-2 gap-2 border-t border-carbon-700 bg-carbon-950/95 py-4 backdrop-blur sm:grid-cols-4">
                    {RATINGS.map((rating) => (
                      <button
                        key={rating.key}
                        onClick={() => rate(rating.key)}
                        className={`border px-3 py-2 font-mono text-xs font-semibold uppercase transition-colors ${rating.className}`}
                      >
                        <span className="opacity-60">{rating.hint}</span> {rating.label}
                        <span className="ml-1 font-normal opacity-70">
                          {previewInterval(cards[meta.slug], rating.key)}
                        </span>
                      </button>
                    ))}
                  </div>

                  <p className="mt-3 text-center">
                    <Link
                      to={`/q/${meta.slug}`}
                      className="font-mono text-xs text-carbon-400 hover:text-ember-400"
                    >
                      open full question →
                    </Link>
                  </p>
                </div>
              )}
            </>
          )}
        </article>
      )}
    </div>
  )
}
