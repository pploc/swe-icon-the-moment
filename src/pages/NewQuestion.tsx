import { useMemo, useState } from 'react'
import { topics } from '@/generated/content'
import { newFileUrl } from '@/lib/repo'
import type { Difficulty } from '@/lib/types'

const DIFFICULTIES: Difficulty[] = ['junior', 'mid', 'senior', 'staff']
const ROLES = ['backend', 'infra', 'sre', 'platform', 'fullstack']

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function yamlString(text: string): string {
  return `"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

function toggled(set: ReadonlySet<string>, value: string): Set<string> {
  const next = new Set(set)
  if (next.has(value)) {
    next.delete(value)
  } else {
    next.add(value)
  }
  return next
}

const labelClass =
  'mb-1.5 block font-mono text-xs font-semibold tracking-wide text-carbon-300 uppercase'
const inputClass =
  'w-full border border-carbon-700 bg-carbon-900 px-3 py-2 text-sm placeholder:text-carbon-400 focus:border-ember-500 focus:outline-none'
const chipClass = (active: boolean) =>
  `border px-2.5 py-1 font-mono text-xs transition-colors ${
    active
      ? 'border-ember-500 bg-ember-500 font-semibold text-carbon-950'
      : 'border-carbon-700 text-carbon-300 hover:border-ember-500 hover:text-ember-400'
  }`

export default function NewQuestion() {
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set())
  const [difficulty, setDifficulty] = useState<Difficulty>('mid')
  const [roles, setRoles] = useState<Set<string>>(new Set())
  const [tags, setTags] = useState('')
  const [time, setTime] = useState('')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [followups, setFollowups] = useState('')
  const [copied, setCopied] = useState(false)

  const effectiveSlug = (slugTouched ? slug : slugify(title)) || 'new-question'

  const markdown = useMemo(() => {
    const lines = [
      '---',
      `title: ${yamlString(title.trim() || 'Untitled question')}`,
      `topics: [${[...selectedTopics].join(', ')}]`,
      `difficulty: ${difficulty}`,
    ]
    if (roles.size > 0) lines.push(`roles: [${[...roles].join(', ')}]`)
    const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean)
    if (tagList.length > 0) lines.push(`tags: [${tagList.join(', ')}]`)
    if (time.trim() && !Number.isNaN(Number(time))) lines.push(`time: ${Number(time)}`)
    lines.push(
      `updated: ${new Date().toISOString().slice(0, 10)}`,
      '---',
      '',
      '## Question',
      '',
      question.trim() || '…',
      '',
      '## Answer',
      '',
      answer.trim() || '…',
    )
    if (followups.trim()) lines.push('', '## Follow-ups', '', followups.trim())
    lines.push('')
    return lines.join('\n')
  }, [title, selectedTopics, difficulty, roles, tags, time, question, answer, followups])

  const firstTopic = topics.find((t) => selectedTopics.has(t.id))
  const filename = `${firstTopic?.group ?? 'backend'}/${effectiveSlug}.md`

  const problems: string[] = []
  if (!title.trim()) problems.push('a title')
  if (selectedTopics.size === 0) problems.push('at least one topic')
  if (!question.trim()) problems.push('the question text')
  if (!answer.trim()) problems.push('the answer')
  const valid = problems.length === 0

  function copyMarkdown() {
    navigator.clipboard.writeText(markdown).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  function downloadMarkdown() {
    const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `${effectiveSlug}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <h1 className="font-mono text-xs font-semibold tracking-widest text-ember-500 uppercase">
        ■ Add a question
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-carbon-300">
        This site is static — every question is a Markdown file in the repo.
        Fill in the form, then <strong className="text-carbon-50">Open on GitHub</strong>:
        the file arrives pre-filled in GitHub's editor, you commit it (or GitHub
        opens a pull request for you), CI validates it, and the site redeploys
        itself in about a minute.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-8 xl:grid-cols-2">
        <div className="space-y-6">
          <div>
            <label htmlFor="nq-title" className={labelClass}>
              Title *
            </label>
            <input
              id="nq-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="How does TCP congestion control work?"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="nq-slug" className={labelClass}>
              Filename (URL slug)
            </label>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-carbon-400">
                content/questions/{firstTopic?.group ?? '…'}/
              </span>
              <input
                id="nq-slug"
                value={effectiveSlug}
                onChange={(e) => {
                  setSlugTouched(true)
                  setSlug(slugify(e.target.value))
                }}
                className={`${inputClass} font-mono`}
              />
              <span className="font-mono text-xs text-carbon-400">.md</span>
            </div>
          </div>

          <div>
            <span className={labelClass}>Topics * (pick at least one)</span>
            <div className="flex flex-wrap gap-1.5">
              {topics.map((topic) => (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => setSelectedTopics(toggled(selectedTopics, topic.id))}
                  className={chipClass(selectedTopics.has(topic.id))}
                >
                  {topic.icon} {topic.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-8">
            <div>
              <span className={labelClass}>Difficulty</span>
              <div className="flex gap-1.5">
                {DIFFICULTIES.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setDifficulty(level)}
                    className={chipClass(difficulty === level)}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className={labelClass}>Roles</span>
              <div className="flex flex-wrap gap-1.5">
                {ROLES.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setRoles(toggled(roles, role))}
                    className={chipClass(roles.has(role))}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label htmlFor="nq-tags" className={labelClass}>
                Tags
              </label>
              <input
                id="nq-tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="tcp, congestion, cubic"
                className={inputClass}
              />
            </div>
            <div className="w-28">
              <label htmlFor="nq-time" className={labelClass}>
                Minutes
              </label>
              <input
                id="nq-time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                inputMode="numeric"
                placeholder="15"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="nq-question" className={labelClass}>
              Question * (Markdown — code blocks and ```mermaid diagrams work)
            </label>
            <textarea
              id="nq-question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={5}
              placeholder="The full prompt, as the interviewer would pose it."
              className={`${inputClass} font-mono leading-relaxed`}
            />
          </div>

          <div>
            <label htmlFor="nq-answer" className={labelClass}>
              Answer * (hidden behind the reveal button on the site)
            </label>
            <textarea
              id="nq-answer"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={10}
              placeholder="What a strong answer covers."
              className={`${inputClass} font-mono leading-relaxed`}
            />
          </div>

          <div>
            <label htmlFor="nq-followups" className={labelClass}>
              Follow-ups (optional)
            </label>
            <textarea
              id="nq-followups"
              value={followups}
              onChange={(e) => setFollowups(e.target.value)}
              rows={4}
              placeholder={'- Probing questions an interviewer might add.'}
              className={`${inputClass} font-mono leading-relaxed`}
            />
          </div>
        </div>

        <div className="xl:sticky xl:top-20 xl:self-start">
          <div className="flex flex-wrap gap-2">
            {valid ? (
              <a
                href={newFileUrl(filename, markdown)}
                target="_blank"
                rel="noreferrer"
                className="border border-ember-500 bg-ember-500 px-4 py-2 font-mono text-xs font-bold tracking-wide text-carbon-950 uppercase transition-colors hover:border-ember-400 hover:bg-ember-400"
              >
                Open on GitHub →
              </a>
            ) : (
              <span
                className="cursor-not-allowed border border-carbon-700 px-4 py-2 font-mono text-xs font-bold tracking-wide text-carbon-400 uppercase"
                title={`Still needs: ${problems.join(', ')}`}
              >
                Open on GitHub →
              </span>
            )}
            <button
              type="button"
              onClick={copyMarkdown}
              className="border border-carbon-700 px-4 py-2 font-mono text-xs font-semibold tracking-wide text-carbon-300 uppercase transition-colors hover:border-ember-500 hover:text-ember-400"
            >
              {copied ? 'Copied ✓' : 'Copy markdown'}
            </button>
            <button
              type="button"
              onClick={downloadMarkdown}
              className="border border-carbon-700 px-4 py-2 font-mono text-xs font-semibold tracking-wide text-carbon-300 uppercase transition-colors hover:border-ember-500 hover:text-ember-400"
            >
              Download .md
            </button>
          </div>

          {!valid && (
            <p className="mt-3 font-mono text-xs text-carbon-400">
              still needs: {problems.join(', ')}
            </p>
          )}

          <p className="mt-3 font-mono text-xs text-carbon-400">
            → {`content/questions/${filename}`}
          </p>

          <pre className="mt-4 max-h-[70vh] overflow-auto border border-carbon-700 bg-carbon-900 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-carbon-300">
            {markdown}
          </pre>

          <p className="mt-3 text-xs text-carbon-400">
            Very long answers can exceed GitHub's URL limit for pre-filling —
            if the editor opens empty, use Copy markdown and paste it there.
          </p>
        </div>
      </div>
    </div>
  )
}
