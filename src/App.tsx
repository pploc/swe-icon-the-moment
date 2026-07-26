import { useState, type FormEvent } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { NEW_QUESTION_URL, REPO_URL } from '@/lib/repo'

export default function App() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  function onSearch(event: FormEvent) {
    event.preventDefault()
    const q = query.trim()
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-carbon-700 bg-carbon-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Link to="/" className="group flex items-center gap-2.5">
            <span className="block size-4 bg-ember-500 transition-colors group-hover:bg-ember-400" />
            <span className="font-mono text-sm font-bold tracking-tight whitespace-nowrap">
              icon<span className="text-ember-500">/</span>the
              <span className="text-ember-500">/</span>moment
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

          <a
            href={NEW_QUESTION_URL}
            target="_blank"
            rel="noreferrer"
            className="hidden shrink-0 border border-ember-500 px-3 py-1.5 font-mono text-xs font-semibold tracking-wide text-ember-400 uppercase transition-colors hover:bg-ember-500 hover:text-carbon-950 sm:block"
          >
            + Add question
          </a>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-carbon-700">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-6 font-mono text-xs text-carbon-400">
          <span>
            <span className="text-ember-500">■</span> backend & infra interview
            bank
          </span>
          <a href={REPO_URL} target="_blank" rel="noreferrer" className="hover:text-carbon-100">
            github
          </a>
          <a
            href={NEW_QUESTION_URL}
            target="_blank"
            rel="noreferrer"
            className="hover:text-carbon-100"
          >
            add a question
          </a>
          <span className="ml-auto">content is markdown. site is static. no database.</span>
        </div>
      </footer>
    </div>
  )
}
