import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="font-mono text-6xl font-bold text-ember-500">404</p>
      <p className="mt-4 text-carbon-300">This page doesn’t exist.</p>
      <Link
        to="/"
        className="mt-6 inline-block border border-ember-500 px-4 py-2 font-mono text-xs font-semibold tracking-wide text-ember-400 uppercase transition-colors hover:bg-ember-500 hover:text-carbon-950"
      >
        Back to topics
      </Link>
    </div>
  )
}
