import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { questions } from '@/generated/content'
import { QuestionForm } from '@/components/QuestionForm'
import NotFound from '@/pages/NotFound'
import type { QuestionBody } from '@/lib/types'
import type { QuestionFields } from '@/lib/question-md'

export default function EditQuestion() {
  const { slug } = useParams()
  const meta = questions.find((q) => q.slug === slug)

  const [body, setBody] = useState<QuestionBody | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!meta) return
    let cancelled = false
    fetch(`${import.meta.env.BASE_URL}data/q/${meta.slug}.json`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`${res.status}`))))
      .then((loaded: QuestionBody) => {
        if (!cancelled) setBody(loaded)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [meta])

  // The form owns its state, so the initial value must be stable.
  const initial = useMemo<QuestionFields | null>(() => {
    if (!meta || !body) return null
    return {
      title: meta.title,
      topics: meta.topics,
      roles: meta.roles,
      tags: meta.tags.join(', '),
      companies: meta.companies.join(', '),
      time: meta.time === null ? '' : String(meta.time),
      body: body.raw,
    }
  }, [meta, body])

  if (!meta) return <NotFound />

  return (
    <div>
      <nav className="mb-6 font-mono text-xs text-carbon-400">
        <Link to="/" className="hover:text-ember-400">
          topics
        </Link>{' '}
        <span className="text-ember-500">/</span>{' '}
        <Link to={`/q/${meta.slug}`} className="hover:text-ember-400">
          {meta.slug}
        </Link>{' '}
        <span className="text-ember-500">/</span> edit
      </nav>

      <h1 className="font-mono text-xs font-semibold tracking-widest text-ember-500 uppercase">
        ■ Edit question
      </h1>

      <div className="mt-4">
        {failed && (
          <p className="border border-dashed border-carbon-700 px-4 py-8 text-center font-mono text-sm text-carbon-400">
            Couldn't load the source of this question. Try reloading.
          </p>
        )}
        {!failed && !initial && (
          <p className="font-mono text-sm text-carbon-400">loading…</p>
        )}
        {initial && (
          <QuestionForm
            mode="edit"
            initial={initial}
            fixedSlug={meta.slug}
            source={meta.source}
          />
        )}
      </div>
    </div>
  )
}
