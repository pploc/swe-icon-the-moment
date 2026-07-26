import { useCallback, type MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * Rendered Markdown contains real <a href> links to other questions (from
 * follow-ups and [[slug]] references). Without this they would trigger a full
 * page load; here they route client-side instead.
 *
 * Spread the result onto the element wrapping `.prose` content.
 */
export function useInternalLinks() {
  const navigate = useNavigate()

  const onClick = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      // Leave modified clicks alone — they mean "open in a new tab".
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey) return

      const anchor = (event.target as HTMLElement).closest('a')
      if (!anchor || anchor.target === '_blank') return

      const href = anchor.getAttribute('href')
      if (!href || !href.startsWith(import.meta.env.BASE_URL)) return

      const url = new URL(anchor.href)
      if (url.origin !== window.location.origin) return

      event.preventDefault()
      const base = import.meta.env.BASE_URL.replace(/\/$/, '')
      navigate(`${url.pathname.slice(base.length)}${url.search}`)
    },
    [navigate],
  )

  return { onClick }
}
