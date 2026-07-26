/**
 * The SWE-ITM mark: a flat two-cell badge — solid ember "SWE", outlined "ITM".
 * Expects to sit inside a `group` element (link) for its hover states.
 */
export function Logo() {
  return (
    <span className="flex items-center font-mono text-sm font-bold tracking-tight select-none">
      <span className="rounded-l-xl rounded-r-none border border-ember-500 bg-ember-500 px-2 py-1 leading-none text-carbon-950 transition-colors group-hover:border-ember-400 group-hover:bg-ember-400">
        SWE
      </span>
      <span className="rounded-l-none rounded-r-xl border border-l-0 border-ember-500 px-2 py-1 leading-none text-ember-400 transition-colors group-hover:border-ember-400 group-hover:text-ember-300">
        ITM
      </span>
    </span>
  )
}
