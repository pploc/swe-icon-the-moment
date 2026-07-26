import { useEffect, useState } from 'react'
import type { QuestionBody } from '@/lib/types'

export type BodyState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; body: QuestionBody }

/** Fetches a question's prerendered HTML. Shared by the reader and practice mode. */
export function useQuestionBody(slug: string | undefined): BodyState {
  const [state, setState] = useState<BodyState>({ status: 'loading' })

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    setState({ status: 'loading' })

    fetch(`${import.meta.env.BASE_URL}data/q/${slug}.json`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`${res.status}`))))
      .then((body: QuestionBody) => {
        if (!cancelled) setState({ status: 'ready', body })
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' })
      })

    return () => {
      cancelled = true
    }
  }, [slug])

  return state
}
