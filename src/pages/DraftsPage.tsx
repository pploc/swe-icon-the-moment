import { Link } from 'react-router-dom'
import { questions } from '@/generated/content'
import { QuestionList } from '@/components/QuestionList'

export default function DraftsPage() {
  const drafts = questions.filter((q) => q.draft)

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-mono text-xs font-semibold tracking-widest text-ember-500 uppercase">
        ■ Drafts
      </h1>
      <p className="mt-2 text-sm text-carbon-300">
        Questions whose answer is missing or still a placeholder. They stay
        published — visible gaps get filled, buried ones don't.
      </p>

      <div className="mt-6">
        <QuestionList
          questions={drafts}
          showTopics
          empty="Nothing is unfinished — every question has an answer."
        />
      </div>

      {drafts.length > 0 && (
        <p className="mt-4 font-mono text-xs text-carbon-400">
          {drafts.length} to finish · open one and hit{' '}
          <Link to={`/q/${drafts[0].slug}/edit`} className="text-ember-400 hover:underline">
            edit
          </Link>{' '}
          to write the answer.
        </p>
      )}
    </div>
  )
}
