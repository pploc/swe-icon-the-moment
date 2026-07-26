import { useEffect, useState, type FormEvent } from 'react'
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { groups, topics } from '@/generated/content'
import { Logo } from '@/components/Logo'
import { orderedGroupIds } from '@/lib/nav'
import { REPO_URL } from '@/lib/repo'

function mainLinkClass({ isActive }: { isActive: boolean }) {
  return `block border-l-2 px-2 py-1.5 font-mono text-xs font-semibold tracking-wide uppercase transition-colors ${
    isActive
      ? 'border-ember-500 bg-carbon-900 text-ember-400'
      : 'border-transparent text-carbon-300 hover:border-carbon-600 hover:text-carbon-50'
  }`
}

function topicLinkClass({ isActive }: { isActive: boolean }) {
  return `flex items-center gap-2 border-l-2 px-2 py-1 text-sm transition-colors ${
    isActive
      ? 'border-ember-500 bg-carbon-900 text-ember-400'
      : 'border-transparent text-carbon-300 hover:border-carbon-600 hover:text-carbon-50'
  }`
}

function Sidebar() {
  return (
    <nav className="space-y-6">
      <div className="space-y-0.5">
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
            <p className="mb-1.5 px-2 font-mono text-[11px] tracking-widest text-carbon-400 uppercase">
              {groups[groupId].name}
            </p>
            <div className="space-y-0.5">
              {groupTopics.map((topic) => (
                <NavLink
                  key={topic.id}
                  to={`/topic/${topic.id}`}
                  className={topicLinkClass}
                >
                  <span aria-hidden className="text-xs">
                    {topic.icon}
                  </span>
                  <span className="truncate">{topic.name}</span>
                  <span className="ml-auto font-mono text-[10px] text-carbon-400">
                    {topic.count}
                  </span>
                </NavLink>
              ))}
            </div>
          </div>
        )
      })}
    </nav>
  )
}

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const [query, setQuery] = useState('')
  const [navOpen, setNavOpen] = useState(false)

  useEffect(() => setNavOpen(false), [location.pathname, location.search])

  function onSearch(event: FormEvent) {
    event.preventDefault()
    const q = query.trim()
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-carbon-700 bg-carbon-950/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
          <button
            onClick={() => setNavOpen((open) => !open)}
            aria-label="Toggle navigation"
            className="flex size-9 shrink-0 items-center justify-center border border-carbon-700 text-carbon-300 transition-colors hover:border-ember-500 hover:text-ember-400 lg:hidden"
          >
            ☰
          </button>

          <Link
            to="/"
            className="group flex items-center gap-2.5"
            title="SWE-ITM — icon the moment"
          >
            <Logo />
            <span className="hidden font-mono text-[10px] tracking-widest text-carbon-400 uppercase xl:block">
              icon/the/moment
            </span>
          </Link>

          <form onSubmit={onSearch} className="ml-auto w-full max-w-xs">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search questions…"
              aria-label="Search questions"
              className="w-full border border-carbon-700 bg-carbon-900 px-3 py-1.5 text-sm placeholder:text-carbon-400 focus:border-ember-500 focus:outline-none"
            />
          </form>

          <Link
            to="/new"
            className="hidden shrink-0 border border-ember-500 px-3 py-1.5 font-mono text-xs font-semibold tracking-wide text-ember-400 uppercase transition-colors hover:bg-ember-500 hover:text-carbon-950 sm:block"
          >
            + Add question
          </Link>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1">
        {navOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/60 lg:hidden"
            onClick={() => setNavOpen(false)}
          />
        )}

        <aside
          className={`fixed inset-y-0 left-0 z-30 w-64 shrink-0 overflow-y-auto border-r border-carbon-700 bg-carbon-950 px-3 pt-20 pb-8 transition-transform lg:sticky lg:top-14 lg:z-auto lg:h-[calc(100vh-3.5rem)] lg:translate-x-0 lg:pt-6 ${
            navOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <Sidebar />
        </aside>

        <main className="min-w-0 flex-1 px-4 py-8 lg:px-8">
          <Outlet />
        </main>
      </div>

      <footer className="border-t border-carbon-700">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-6 font-mono text-xs text-carbon-400">
          <span>
            <span className="text-ember-500">■</span> backend & infra interview
            bank
          </span>
          <a href={REPO_URL} target="_blank" rel="noreferrer" className="hover:text-carbon-100">
            github
          </a>
          <Link to="/new" className="hover:text-carbon-100">
            add a question
          </Link>
          <span className="ml-auto">content is markdown. site is static. no database.</span>
        </div>
      </footer>
    </div>
  )
}
