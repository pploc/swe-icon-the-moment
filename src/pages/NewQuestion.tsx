import { QuestionForm } from '@/components/QuestionForm'
import { EMPTY_FIELDS } from '@/lib/question-md'

export default function NewQuestion() {
  return (
    <div>
      <h1 className="font-mono text-xs font-semibold tracking-widest text-ember-500 uppercase">
        ■ Add a question
      </h1>

      <div className="mt-4">
        <QuestionForm mode="create" initial={EMPTY_FIELDS} />
      </div>
    </div>
  )
}
