import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { QuestionForm } from '@/components/QuestionForm'
import { EMPTY_FIELDS } from '@/lib/question-md'

export default function NewQuestion() {
  const [params] = useSearchParams()

  // Follow-ups with no matching question link here with ?title= prefilled.
  const initial = useMemo(() => {
    const title = params.get('title')
    const topics = params.get('topics')?.split(',').filter(Boolean) ?? []
    if (!title && topics.length === 0) return EMPTY_FIELDS
    return {
      ...EMPTY_FIELDS,
      title: title ?? '',
      topics,
      body: `## Question\n\n${title ?? ''}\n\n## Answer\n\n## Follow-ups\n\n`,
    }
  }, [params])

  return (
    <div className="animate-rise">
      <h1 className="font-mono text-xs font-semibold tracking-widest text-ember-500 uppercase">
        ■ Add a question
      </h1>

      <div className="mt-4">
        <QuestionForm mode="create" initial={initial} />
      </div>
    </div>
  )
}
