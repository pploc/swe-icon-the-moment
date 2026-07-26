import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { groups, questions, topics } from '@/generated/content'
import { Logo } from '@/components/Logo'
import { orderedGroupIds } from '@/lib/nav'
import { REPO_URL } from '@/lib/repo'
import { useTheme } from '@/lib/theme'

const SIDEBAR_KEY = 'itm:sidebar'

const isDesktop = () =>
  typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches

function mainLinkClass({ isActive }: { isActive: boolean }) {
  return `block border-l-2 px-3 py-2 font-mono text-xs font-semibold tracking-wide uppercase transition-colors ${
    isActive
      ? 'border-ember-500 bg-carbon-900 text-ember-400'
      : 'border-transparent text-carbon-300 hover:border-carbon-600 hover:text-carbon-50'
  }`
}

function topicLinkClass({ isActive }: { isActive: boolean }) {
  return `flex items-center gap-2.5 border-l-2 px-3 py-1.5 text-sm transition-colors ${
    isActive
      ? 'border-ember-500 bg-carbon-900 text-ember-400'
      : 'border-transparent text-carbon-300 hover:border-carbon-600 hover:text-carbon-50'
  }`
}

function Sidebar() {
  return (
    <nav className="space-y-7">
      <div className="space-y-1">
        <NavLink to="/" end className={mainLinkClass}>
          ▤ Dashboard
        </NavLink>
        <NavLink to="/search" className={mainLinkClass}>
          ⌕ Search
        </NavLink>
        <NavLink to="/new" className={mainLinkClass}>
          + Add question
        </NavLink>
      </div>

      {orderedGroupIds().map((groupId) => {
        const groupTopics = topics.filter((t) => t.group === groupId)
        if (groupTopics.length === 0) return null
        return (
          <div key={groupId}>
            <p className="mb-2 px-3 font-mono text-[11px] tracking-widest text-carbon-400 uppercase">
              {groups[groupId].name}
            </p>
            <div className="space-y-1">
              {groupTopics.map((topic) => (
                <NavLink
                  key={topic.id}
                  to={`/topic/${topic.id}`}
                  className={topicLinkClass}
                >
                  <span aria-hidden>{topic.icon}</span>
                  <span className="truncate">{topic.name}</span>
                  <span className="ml-auto font-mono text-[11px] text-carbon-400">
                    {topic.count}
                  </span>
                </NavLink>
              ))}
            </div>
          </div>
        )
      })}

      <p className="border-t border-carbon-700 px-3 pt-4 font-mono text-[11px] text-carbon-400">
        {questions.length} questions · {topics.length} topics
      </p>
    </nav>
  )
}

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const searchRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [theme, toggleTheme] = useTheme()

  // Open by default on desktop (remembering the last choice), closed on mobile
  // where the sidebar is an overlay.
  const [navOpen, setNavOpen] = useState(
    () => isDesktop() && window.localStorage.getItem(SIDEBAR_KEY) !== 'closed',
  )

  useEffect(() => {
    if (isDesktop()) {
      window.localStorage.setItem(SIDEBAR_KEY, navOpen ? 'open' : 'closed')
    }
  }, [navOpen])

  // Navigating on mobile dismisses the overlay; on desktop the choice sticks.
  useEffect(() => {
    if (!isDesktop()) setNavOpen(false)
  }, [location.pathname, location.search])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable
      if (event.metaKey || event.ctrlKey || event.altKey) return

      if (event.key === '[' && !typing) {
        event.preventDefault()
        setNavOpen((open) => !open)
      } else if (event.key === '/' && !typing) {
        event.preventDefault()
        searchRef.current?.focus()
      } else if (event.key === 'Escape' && !isDesktop()) {
        setNavOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  function onSearch(event: FormEvent) {
    event.preventDefault()
    const q = query.trim()
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`)
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-carbon-700 bg-carbon-950/95 backdrop-blur">
        <div className="relative flex h-14 items-center gap-3 px-3">
          <button
            onClick={() => setNavOpen((open) => !open)}
            aria-label={navOpen ? 'Hide navigation' : 'Show navigation'}
            aria-expanded={navOpen}
            title={`${navOpen ? 'Hide' : 'Show'} navigation  [`}
            className={`flex size-9 shrink-0 items-center justify-center border font-mono text-sm transition-colors ${
              navOpen
                ? 'border-ember-500 text-ember-400 hover:bg-ember-500 hover:text-carbon-950'
                : 'border-carbon-700 text-carbon-300 hover:border-ember-500 hover:text-ember-400'
            }`}
          >
            {navOpen ? '✕' : '☰'}
          </button>

          <Link
            to="/"
            className="group flex items-center gap-2.5"
            title="SWE-ITM — icon the moment"
          >
            <Logo />
            <span className="hidden font-mono text-[10px] tracking-widest text-carbon-400 uppercase 2xl:block">
              icon/the/moment
            </span>
          </Link>

          {/* Centred on the viewport, independent of the flanking controls. */}
          <form
            onSubmit={onSearch}
            className="absolute left-1/2 hidden w-full max-w-md -translate-x-1/2 md:block"
          >
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search questions…    /"
              aria-label="Search questions"
              className="w-full border border-carbon-700 bg-carbon-900 px-3 py-1.5 text-center text-sm placeholder:text-carbon-400 focus:border-ember-500 focus:text-left focus:outline-none"
            />
          </form>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Link
              to="/search"
              aria-label="Search"
              className="flex size-9 items-center justify-center border border-carbon-700 text-carbon-300 transition-colors hover:border-ember-500 hover:text-ember-400 md:hidden"
            >
              ⌕
            </Link>

            <button
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              className="flex size-9 items-center justify-center border border-carbon-700 text-carbon-300 transition-colors hover:border-ember-500 hover:text-ember-400"
            >
              {theme === 'dark' ? '☀' : '☾'}
            </button>

            <Link
              to="/new"
              className="hidden border border-ember-500 px-3 py-1.5 font-mono text-xs font-semibold tracking-wide text-ember-400 uppercase transition-colors hover:bg-ember-500 hover:text-carbon-950 sm:block"
            >
              + Add question
            </Link>
          </div>
        </div>
      </header>

      {navOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 lg:hidden"
          onClick={() => setNavOpen(false)}
        />
      )}

      <aside
        className={`fixed top-14 left-0 z-30 h-[calc(100vh-3.5rem)] w-80 overflow-y-auto border-r border-carbon-700 bg-carbon-950 px-3 py-6 transition-transform duration-200 ${
          navOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar />
      </aside>

      <div
        className={`flex min-h-[calc(100vh-3.5rem)] flex-col transition-[margin] duration-200 ${
          navOpen ? 'lg:ml-80' : 'ml-0'
        }`}
      >
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 lg:px-10">
          <Outlet />
        </main>

        <footer className="border-t border-carbon-700">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-6 font-mono text-xs text-carbon-400 lg:px-10">
            <span>
              <span className="text-ember-500">■</span> backend &amp; infra
              interview bank
            </span>
            <a href={REPO_URL} target="_blank" rel="noreferrer" className="hover:text-carbon-100">
              github
            </a>
            <Link to="/new" className="hover:text-carbon-100">
              add a question
            </Link>
            <span className="hidden sm:inline">
              <kbd className="border border-carbon-700 px-1">[</kbd> sidebar ·{' '}
              <kbd className="border border-carbon-700 px-1">/</kbd> search
            </span>
            <span className="ml-auto">content is markdown. site is static. no database.</span>
          </div>
        </footer>
      </div>
    </div>
  )
}
