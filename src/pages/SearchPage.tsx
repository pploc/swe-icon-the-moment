import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import MiniSearch from 'minisearch'
import { questions, topics } from '@/generated/content'
import { QuestionList } from '@/components/QuestionList'

interface SearchDoc {
  slug: string
  title: string
  body: string
  tags: string
}

const ROLES = ['backend', 'infra', 'sre', 'platform', 'fullstack']

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

const chipClass = (active: boolean) =>
  `border px-2 py-0.5 font-mono text-xs transition-colors ${
    active
      ? 'border-ember-500 bg-ember-500 font-semibold text-carbon-950'
      : 'border-carbon-700 text-carbon-300 hover:border-ember-500 hover:text-ember-400'
  }`

export default function SearchPage() {
  const [params, setParams] = useSearchParams()
  const [input, setInput] = useState(params.get('q') ?? '')
  const [query, setQuery] = useState(params.get('q') ?? '')
  const [index, setIndex] = useState<MiniSearch<SearchDoc> | null>(null)
  const [failed, setFailed] = useState(false)
  const [topicFilter, setTopicFilter] = useState<string | null>(null)
  const [roleFilter, setRoleFilter] = useState<string | null>(null)

  useEffect(() => {
    loadIndex().then(setIndex, () => setFailed(true))
  }, [])

  // Results update as you type; the URL follows a beat later so the history
  // isn't one entry per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(input)
      setParams(input.trim() ? { q: input.trim() } : {}, { replace: true })
    }, 150)
    return () => clearTimeout(timer)
  }, [input, setParams])

  const hits = useMemo(() => {
    if (!index || !query.trim()) return []
    const bySlug = new Map(questions.map((q) => [q.slug, q]))
    return index
      .search(query)
      .map((hit) => bySlug.get(hit.id as string))
      .filter((q) => q !== undefined)
  }, [index, query])

  // Facet counts come from the unfiltered hits, so a count never reads zero
  // for a filter you can actually click.
  const topicCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const hit of hits) {
      for (const topic of hit.topics) counts.set(topic, (counts.get(topic) ?? 0) + 1)
    }
    return counts
  }, [hits])

  const roleCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const hit of hits) {
      for (const role of hit.roles) counts.set(role, (counts.get(role) ?? 0) + 1)
    }
    return counts
  }, [hits])

  const results = useMemo(
    () =>
      hits.filter(
        (hit) =>
          (!topicFilter || hit.topics.includes(topicFilter)) &&
          (!roleFilter || hit.roles.includes(roleFilter)),
      ),
    [hits, topicFilter, roleFilter],
  )

  const terms = useMemo(
    () => query.trim().toLowerCase().split(/\s+/).filter((t) => t.length > 1),
    [query],
  )

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-mono text-xs font-semibold tracking-widest text-ember-500 uppercase">
        ■ Search
      </h1>

      <input
        type="search"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="tcp handshake, cache stampede, raft…"
        aria-label="Search all questions"
        autoFocus
        className="mt-4 w-full border border-carbon-700 bg-carbon-900 px-4 py-3 text-lg placeholder:text-carbon-400 focus:border-ember-500 focus:outline-none"
      />

      {failed && (
        <p className="mt-6 font-mono text-sm text-carbon-400">
          Search index failed to load. Try reloading the page.
        </p>
      )}

      {!failed && !query.trim() && (
        <p className="mt-6 font-mono text-sm text-carbon-400">
          Full-text search across every question, answer, and follow-up. Results
          appear as you type.
        </p>
      )}

      {!failed && query.trim() && index && (
        <>
          {hits.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 font-mono text-[11px] text-carbon-400 uppercase">
                  topic
                </span>
                {topics
                  .filter((t) => topicCounts.has(t.id))
                  .map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTopicFilter(topicFilter === t.id ? null : t.id)}
                      className={chipClass(topicFilter === t.id)}
                    >
                      {t.icon} {t.name} {topicCounts.get(t.id)}
                    </button>
                  ))}
              </div>

              {ROLES.some((r) => roleCounts.has(r)) && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 font-mono text-[11px] text-carbon-400 uppercase">
                    role
                  </span>
                  {ROLES.filter((r) => roleCounts.has(r)).map((r) => (
                    <button
                      key={r}
                      onClick={() => setRoleFilter(roleFilter === r ? null : r)}
                      className={chipClass(roleFilter === r)}
                    >
                      {r} {roleCounts.get(r)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <p className="mt-4 mb-2 font-mono text-xs text-carbon-400">
            {results.length} result{results.length === 1 ? '' : 's'} for “{query}”
            {(topicFilter || roleFilter) && (
              <button
                onClick={() => {
                  setTopicFilter(null)
                  setRoleFilter(null)
                }}
                className="ml-2 underline hover:text-ember-400"
              >
                clear filters
              </button>
            )}
          </p>

          <QuestionList
            questions={results}
            showTopics
            terms={terms}
            empty="Nothing found — try fewer or different words."
          />
        </>
      )}
    </div>
  )
}
