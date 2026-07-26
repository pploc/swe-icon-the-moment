import { useEffect, useState } from 'react'
import {
  clearToken,
  getToken,
  setToken,
  verifyToken,
  TOKEN_SETUP_URL,
  type Identity,
} from '@/lib/github'

/**
 * Optional token setup. Without it the form still works via the
 * copy/open-on-GitHub route; with it, saving commits straight to the repo.
 */
export function GitHubConnect({
  identity,
  onIdentity,
}: {
  identity: Identity | null
  onIdentity: (identity: Identity | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Re-check a stored token once on mount so the UI reflects reality.
  useEffect(() => {
    if (!getToken() || identity) return
    verifyToken().then(onIdentity, () => onIdentity(null))
  }, [identity, onIdentity])

  function connect() {
    setBusy(true)
    setError('')
    setToken(value)
    verifyToken()
      .then((next) => {
        // A token without push access is still useful — those changes go
        // through a pull request instead of straight to main.
        onIdentity(next)
        setValue('')
        setOpen(false)
      })
      .catch((err: Error) => {
        setError(err.message)
        clearToken()
        onIdentity(null)
      })
      .finally(() => setBusy(false))
  }

  if (identity) {
    return (
      <p className="mt-3 font-mono text-xs text-carbon-400">
        <span className="text-ember-500">●</span>{' '}
        {identity.canWrite
          ? `saving directly as ${identity.login}`
          : `${identity.login} — changes open a pull request`}{' '}
        <button
          type="button"
          onClick={() => {
            clearToken()
            onIdentity(null)
          }}
          className="ml-2 underline hover:text-ember-400"
        >
          disconnect
        </button>
      </p>
    )
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="font-mono text-xs text-carbon-400 underline hover:text-ember-400"
      >
        {open ? 'hide token setup' : 'connect a GitHub token to save directly'}
      </button>

      {open && (
        <div className="mt-2 border border-carbon-700 bg-carbon-900 p-3">
          <p className="text-xs leading-relaxed text-carbon-300">
            Create a{' '}
            <a
              href={TOKEN_SETUP_URL}
              target="_blank"
              rel="noreferrer"
              className="text-ember-400 underline"
            >
              fine-grained token
            </a>
            . Maintainers: scope it to{' '}
            <span className="font-mono">swe-icon-the-moment</span> with{' '}
            <span className="font-mono">Contents: read &amp; write</span> to
            commit directly. Everyone else: any token that can read this repo
            works — your change is pushed to your own fork and opened as a pull
            request. Tokens live in this browser's localStorage and are sent only
            to api.github.com, so don't do this on a shared machine.
          </p>
          <div className="mt-2 flex gap-2">
            <input
              type="password"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="github_pat_…"
              aria-label="GitHub token"
              className="w-full border border-carbon-700 bg-carbon-950 px-3 py-2 font-mono text-xs placeholder:text-carbon-400 focus:border-ember-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={connect}
              disabled={busy || !value.trim()}
              className="shrink-0 border border-ember-500 px-3 py-2 font-mono text-xs font-semibold text-ember-400 uppercase transition-colors hover:bg-ember-500 hover:text-carbon-950 disabled:cursor-not-allowed disabled:border-carbon-700 disabled:text-carbon-400"
            >
              {busy ? '…' : 'Connect'}
            </button>
          </div>
          {error && <p className="mt-2 font-mono text-xs text-ember-400">{error}</p>}
        </div>
      )}
    </div>
  )
}
