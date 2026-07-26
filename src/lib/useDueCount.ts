import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { questions } from '@/generated/content'
import { loadAll, stats } from '@/lib/srs'

/**
 * How many cards are waiting. Recomputed on navigation, which is enough to keep
 * the badge honest after a practice session without polling localStorage.
 */
export function useDueCount(): number {
  const location = useLocation()
  const [due, setDue] = useState(0)

  useEffect(() => {
    const slugs = questions.map((q) => q.slug)
    setDue(stats(slugs, loadAll()).due)
  }, [location.pathname])

  return due
}
