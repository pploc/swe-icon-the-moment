import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import MiniSearch from 'minisearch'
import { questions } from '@/generated/content'
import { QuestionList } from '@/components/QuestionList'

interface SearchDoc {
  slug: string
  title: string
  body: string
  tags: string
}

let indexPromise: Promise<MiniSearch<SearchDoc>> | null = null

/** The search corpus is fetched and indexed once, on first visit to /search. */
function loadIndex(): Promise<MiniSearch<SearchDoc>> {
  indexPromise ??= fetch(`${import.meta.env.BASE_URL}data/search.json`)
    .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`${res.status}`))))
    .then((docs: SearchDoc[]) => {
      const index = new MiniSearch<SearchDoc>({
        idField: 'slug',
        fields: ['title', 'body', 'tags'],
        searchOptions: {
          prefix: true,
          fuzzy: 0.2,
          boost: { title: 3, tags: 2 },
        },
      })
      index.addAll(docs)
      return index
    })
  return indexPromise
}

export default function SearchPage() {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const [input, setInput] = useState(query)
  const [index, setIndex] = useState<MiniSearch<SearchDoc> | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    loadIndex().then(setIndex, () => setFailed(true))
  }, [])

  useEffect(() => setInput(query), [query])

  const results = useMemo(() => {
    if (!index || !query.trim()) return []
    const bySlug = new Map(questions.map((q) => [q.slug, q]))
    return index
      .search(query)
      .map((hit) => bySlug.get(hit.id as string))
      .filter((q) => q !== undefined)
  }, [index, query])

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-mono text-xs font-semibold tracking-widest text-ember-500 uppercase">
        ■ Search
      </h1>

      <form
        className="mt-4"
        onSubmit={(e) => {
          e.preventDefault()
          setParams(input.trim() ? { q: input.trim() } : {})
        }}
      >
        <input
          type="search"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="tcp handshake, cache stampede, raft…"
          aria-label="Search all questions"
          autoFocus
          className="w-full border border-carbon-700 bg-carbon-900 px-4 py-3 text-lg placeholder:text-carbon-400 focus:border-ember-500 focus:outline-none"
        />
      </form>

      <div className="mt-6">
        {failed && (
          <p className="font-mono text-sm text-carbon-400">
            Search index failed to load. Try reloading the page.
          </p>
        )}
        {!failed && query.trim() && index && (
          <>
            <p className="mb-3 font-mono text-xs text-carbon-400">
              {results.length} result{results.length === 1 ? '' : 's'} for “{query}”
            </p>
            <QuestionList questions={results} showTopics empty="Nothing found — try fewer or different words." />
          </>
        )}
        {!failed && !query.trim() && (
          <p className="font-mono text-sm text-carbon-400">
            Full-text search across every question, answer, and follow-up.
          </p>
        )}
      </div>
    </div>
  )
}
