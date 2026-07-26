import { Link } from 'react-router-dom'
import { questions, topics } from '@/generated/content'
import { Logo } from '@/components/Logo'
import { REPO_URL } from '@/lib/repo'

const linkClass =
  'text-sm text-carbon-400 transition-colors hover:text-ember-400'

function Column({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 font-mono text-[11px] font-semibold tracking-widest text-carbon-300 uppercase">
        <span className="mr-1.5 text-ember-500">■</span>
        {title}
      </h2>
      <ul className="space-y-2">{children}</ul>
    </div>
  )
}

function Shortcut({ keys, label }: { keys: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <kbd className="border border-carbon-700 bg-carbon-900 px-1.5 py-0.5 text-[11px] text-carbon-300">
        {keys}
      </kbd>
      <span>{label}</span>
    </span>
  )
}

export function Footer() {
  const drafts = questions.filter((q) => q.draft).length

  return (
    <footer className="mt-16 border-t border-carbon-700">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 lg:px-10">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Link to="/" className="group inline-flex">
              <Logo />
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-carbon-400">
              A searchable bank of backend &amp; infrastructure engineering
              interview questions. Every question is a Markdown file in the
              repository — the site is static and there is no database.
            </p>
            <p className="mt-4 font-mono text-xs text-carbon-400">
              <span className="font-bold text-ember-500">{questions.length}</span>{' '}
              questions ·{' '}
              <span className="font-bold text-ember-500">{topics.length}</span> topics
            </p>
          </div>

          <Column title="Browse">
            <li>
              <Link to="/" className={linkClass}>
                Dashboard
              </Link>
            </li>
            <li>
              <Link to="/practice" className={linkClass}>
                Practice
              </Link>
            </li>
            <li>
              <Link to="/search" className={linkClass}>
                Search
              </Link>
            </li>
            {drafts > 0 && (
              <li>
                <Link to="/drafts" className={linkClass}>
                  Drafts <span className="text-carbon-600">({drafts})</span>
                </Link>
              </li>
            )}
          </Column>

          <Column title="Contribute">
            <li>
              <Link to="/new" className={linkClass}>
                Add a question
              </Link>
            </li>
            <li>
              <a href={REPO_URL} target="_blank" rel="noreferrer" className={linkClass}>
                Repository ↗
              </a>
            </li>
            <li>
              <a
                href={`${REPO_URL}#readme`}
                target="_blank"
                rel="noreferrer"
                className={linkClass}
              >
                How it works ↗
              </a>
            </li>
          </Column>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4 border-t border-carbon-800 pt-6 font-mono text-[11px] text-carbon-400">
          <div className="flex flex-wrap items-center gap-4">
            <Shortcut keys="⌘K" label="palette" />
            <Shortcut keys="/" label="search" />
            <Shortcut keys="[" label="sidebar" />
          </div>

          <div className="ml-auto flex items-center gap-4">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="border border-carbon-700 px-2.5 py-1 text-carbon-400 transition-colors hover:border-ember-500 hover:text-ember-400"
            >
              ↑ top
            </button>
          </div>
        </div>
      </div>
    </footer>
  )
}
