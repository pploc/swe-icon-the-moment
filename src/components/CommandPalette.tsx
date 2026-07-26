import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { questions, topics } from '@/generated/content'
import { randomSlug } from '@/lib/random'
import { useTheme } from '@/lib/theme'

interface Item {
  id: string
  label: string
  hint: string
  kind: 'action' | 'topic' | 'question'
  run: () => void
}

/**
 * Ranks by where the match lands: a title that starts with the query beats one
 * that merely contains it, and a subsequence match ("cstamp") still counts.
 */
function score(text: string, query: string): number {
  const haystack = text.toLowerCase()
  if (!query) return 1
  const index = haystack.indexOf(query)
  if (index === 0) return 100
  if (index > 0) return 60 - Math.min(index, 30)

  let cursor = 0
  for (const char of query) {
    cursor = haystack.indexOf(char, cursor) + 1
    if (cursor === 0) return 0
  }
  return 20
}

export function CommandPalette() {
  const navigate = useNavigate()
  const [, toggleTheme] = useTheme()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen((current) => !current)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (!open) {
      setQuery('')
      setActive(0)
    }
  }, [open])

  const items = useMemo<Item[]>(() => {
    const go = (to: string) => () => {
      setOpen(false)
      navigate(to)
    }

    const actions: Item[] = [
      { id: 'a-home', label: 'Dashboard', hint: 'go', kind: 'action', run: go('/') },
      { id: 'a-new', label: 'Add a question', hint: 'go', kind: 'action', run: go('/new') },
      { id: 'a-practice', label: 'Practice', hint: 'drill', kind: 'action', run: go('/practice') },
      { id: 'a-search', label: 'Search', hint: 'go', kind: 'action', run: go('/search') },
      { id: 'a-drafts', label: 'Drafts', hint: 'go', kind: 'action', run: go('/drafts') },
      {
        id: 'a-random',
        label: 'Random question',
        hint: 'drill',
        kind: 'action',
        run: () => {
          const slug = randomSlug()
          setOpen(false)
          if (slug) navigate(`/q/${slug}`)
        },
      },
      {
        id: 'a-theme',
        label: 'Toggle light / dark',
        hint: 'theme',
        kind: 'action',
        run: () => {
          toggleTheme()
          setOpen(false)
        },
      },
    ]

    return [
      ...actions,
      ...topics.map<Item>((topic) => ({
        id: `t-${topic.id}`,
        label: `${topic.icon} ${topic.name}`,
        hint: `${topic.count} question${topic.count === 1 ? '' : 's'}`,
        kind: 'topic',
        run: go(`/topic/${topic.id}`),
      })),
      ...questions.map<Item>((question) => ({
        id: `q-${question.slug}`,
        label: question.title,
        hint: question.topics.join(' · '),
        kind: 'question',
        run: go(`/q/${question.slug}`),
      })),
    ]
  }, [navigate, toggleTheme])

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return items
      .map((item) => ({ item, rank: score(`${item.label} ${item.hint}`, needle) }))
      .filter((entry) => entry.rank > 0)
      .sort((a, b) => b.rank - a.rank)
      .slice(0, 40)
      .map((entry) => entry.item)
  }, [items, query])

  useEffect(() => setActive(0), [query])

  useEffect(() => {
    listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' })
  }, [active])

  if (!open) return null

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Escape') setOpen(false)
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((current) => Math.min(current + 1, matches.length - 1))
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((current) => Math.max(current - 1, 0))
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      matches[active]?.run()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-[12vh]"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl border border-carbon-700 bg-carbon-950"
        onClick={(event) => event.stopPropagation()}
      >
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Jump to a question, topic or action…"
          aria-label="Command palette"
          className="w-full border-b border-carbon-700 bg-carbon-900 px-4 py-3 text-sm placeholder:text-carbon-400 focus:outline-none"
        />

        <ul ref={listRef} className="max-h-[50vh] overflow-y-auto">
          {matches.map((item, index) => (
            <li key={item.id}>
              <button
                type="button"
                onMouseEnter={() => setActive(index)}
                onClick={item.run}
                className={`flex w-full items-baseline gap-3 px-4 py-2 text-left text-sm transition-colors ${
                  index === active ? 'bg-carbon-850 text-ember-400' : 'text-carbon-100'
                }`}
              >
                <span
                  className={`w-3 shrink-0 font-mono text-[11px] ${
                    index === active ? 'text-ember-500' : 'text-carbon-600'
                  }`}
                >
                  {item.kind === 'action' ? '⌘' : item.kind === 'topic' ? '▤' : '?'}
                </span>
                <span className="truncate">{item.label}</span>
                <span className="ml-auto shrink-0 truncate font-mono text-[11px] text-carbon-400">
                  {item.hint}
                </span>
              </button>
            </li>
          ))}
          {matches.length === 0 && (
            <li className="px-4 py-6 text-center font-mono text-xs text-carbon-400">
              nothing matches
            </li>
          )}
        </ul>

        <div className="flex gap-4 border-t border-carbon-700 px-4 py-2 font-mono text-[11px] text-carbon-400">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  )
}
