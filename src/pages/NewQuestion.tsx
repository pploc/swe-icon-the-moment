import { QuestionForm } from '@/components/QuestionForm'
import { EMPTY_FIELDS } from '@/lib/question-md'

export default function NewQuestion() {
  return (
    <div>
      <h1 className="font-mono text-xs font-semibold tracking-widest text-ember-500 uppercase">
        ■ Add a question
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-carbon-300">
        Every question is a Markdown file in the repo. Write it here — the
        preview shows exactly how it will render. Connect a GitHub token to
        publish in one click; maintainers commit straight to{' '}
        <span className="font-mono">main</span>, everyone else opens a pull
        request.
      </p>

      <div className="mt-8">
        <QuestionForm mode="create" initial={EMPTY_FIELDS} />
      </div>
    </div>
  )
}
