import { useEffect, useMemo, useState } from 'react'
import { topics } from '@/generated/content'
import { GitHubConnect } from '@/components/GitHubConnect'
import { useMermaid } from '@/lib/useMermaid'
import { editUrl, newFileUrl } from '@/lib/repo'
import {
  commitFile,
  getToken,
  proposeViaPullRequest,
  verifyToken,
  type Identity,
} from '@/lib/github'
import {
  composeMarkdown,
  missingFields,
  previewMarkdown,
  slugify,
  type QuestionFields,
} from '@/lib/question-md'

const ROLES = ['backend', 'infra', 'sre', 'platform', 'fullstack']

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
const buttonClass =
  'border border-carbon-700 px-4 py-2 font-mono text-xs font-semibold tracking-wide text-carbon-300 uppercase transition-colors hover:border-ember-500 hover:text-ember-400'
const primaryClass =
  'border border-ember-500 bg-ember-500 px-4 py-2 font-mono text-xs font-bold tracking-wide text-carbon-950 uppercase transition-colors hover:border-ember-400 hover:bg-ember-400 disabled:cursor-not-allowed disabled:border-carbon-700 disabled:bg-transparent disabled:text-carbon-400'

const CHEATSHEET = `**bold**  _italic_  ~~strike~~  \`code\`  ==mark==  ++ins++  H~2~O  x^2^  :rocket:
# Heading      > blockquote      ---  (rule)      [link](url)      ![img](url)
- bullet   1. numbered   - [x] task   Term / : definition   *[ABBR]: expansion
| table | col |  ·  footnote[^1]  ·  $inline math$  ·  $$block math$$
\`\`\`sql … \`\`\` fenced code (highlighted)   ·   \`\`\`mermaid … \`\`\` diagram
::: warning Title … ::: callout (note · tip · info · warning · danger)
<details><summary>…</summary> raw HTML also works`

function toggled(list: string[], value: string): string[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value]
}

type SaveState =
  | { status: 'idle' }
  | { status: 'saving' }
  | { status: 'saved'; commitUrl: string }
  | { status: 'proposed'; pullRequestUrl: string }
  | { status: 'error'; message: string }

export function QuestionForm({
  mode,
  initial,
  fixedSlug,
  source,
}: {
  mode: 'create' | 'edit'
  initial: QuestionFields
  fixedSlug?: string
  source?: string
}) {
  const [fields, setFields] = useState(initial)
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [tab, setTab] = useState<'preview' | 'markdown'>('preview')
  const [html, setHtml] = useState('')
  const [copied, setCopied] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [identity, setIdentity] = useState<Identity | null>(null)
  const [save, setSave] = useState<SaveState>({ status: 'idle' })

  useEffect(() => setFields(initial), [initial])

  // Restore a previously connected token on first render.
  useEffect(() => {
    if (getToken()) verifyToken().then(setIdentity, () => setIdentity(null))
  }, [])

  function update<K extends keyof QuestionFields>(key: K, value: QuestionFields[K]) {
    setFields((current) => ({ ...current, [key]: value }))
    setSave({ status: 'idle' })
  }

  const effectiveSlug = fixedSlug ?? (slugTouched ? slug : slugify(fields.title))
  const markdown = useMemo(() => composeMarkdown(fields), [fields])
  const preview = useMemo(() => previewMarkdown(fields), [fields])

  // The renderer is only pulled in when a preview is actually shown.
  useEffect(() => {
    if (tab !== 'preview') return
    let cancelled = false
    import('@/lib/markdown').then(({ render }) => {
      if (!cancelled) setHtml(render(preview))
    })
    return () => {
      cancelled = true
    }
  }, [preview, tab])

  useMermaid([html, tab])

  const problems = missingFields(fields)
  const valid = problems.length === 0
  const firstTopic = topics.find((t) => fields.topics.includes(t.id))
  const targetPath =
    source ??
    `content/questions/${firstTopic?.group ?? 'backend'}/${effectiveSlug || 'new-question'}.md`

  function copyMarkdown(): Promise<void> {
    return navigator.clipboard.writeText(markdown).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function downloadMarkdown() {
    const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `${effectiveSlug || 'question'}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  /**
   * Maintainers commit straight to main (the deploy workflow republishes the
   * site); everyone else gets a fork + pull request, so nothing lands unreviewed.
   */
  function saveWithToken() {
    const message = `${mode === 'create' ? 'Add' : 'Update'} question: ${fields.title.trim()}`
    setSave({ status: 'saving' })

    const request = identity?.canWrite
      ? commitFile({ path: targetPath, content: markdown, message }).then(
          ({ commitUrl }) => setSave({ status: 'saved', commitUrl }),
        )
      : proposeViaPullRequest({
          path: targetPath,
          content: markdown,
          message,
          body: `Submitted from the site's ${mode === 'create' ? 'add' : 'edit'} form.`,
        }).then(({ pullRequestUrl }) =>
          setSave({ status: 'proposed', pullRequestUrl }),
        )

    request.catch((error: Error) =>
      setSave({ status: 'error', message: error.message }),
    )
  }

  /**
   * Fallback when no token is connected: GitHub can pre-fill a *new* file from
   * the URL, but not an edit — so editing copies the Markdown to paste in.
   */
  function saveViaGitHubEditor() {
    copyMarkdown().finally(() => window.open(editUrl(source!), '_blank', 'noreferrer'))
  }

  const saveLabel = identity?.canWrite
    ? mode === 'create'
      ? 'Publish question'
      : 'Save changes'
    : mode === 'create'
      ? 'Propose question (PR)'
      : 'Propose changes (PR)'

  return (
    <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
      <div className="space-y-6">
        <div>
          <label htmlFor="qf-title" className={labelClass}>
            Title *
          </label>
          <input
            id="qf-title"
            value={fields.title}
            onChange={(e) => update('title', e.target.value)}
            placeholder="How does TCP congestion control work?"
            className={inputClass}
          />
        </div>

        <div>
          <span className={labelClass}>File</span>
          {mode === 'edit' ? (
            <p className="font-mono text-xs text-carbon-400">{source}</p>
          ) : (
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-carbon-400">
                content/questions/{firstTopic?.group ?? '…'}/
              </span>
              <input
                aria-label="Filename slug"
                value={effectiveSlug}
                onChange={(e) => {
                  setSlugTouched(true)
                  setSlug(slugify(e.target.value))
                }}
                className={`${inputClass} font-mono`}
              />
              <span className="font-mono text-xs text-carbon-400">.md</span>
            </div>
          )}
        </div>

        <div>
          <span className={labelClass}>Topics * (pick at least one)</span>
          <div className="flex flex-wrap gap-1.5">
            {topics.map((topic) => (
              <button
                key={topic.id}
                type="button"
                onClick={() => update('topics', toggled(fields.topics, topic.id))}
                className={chipClass(fields.topics.includes(topic.id))}
              >
                {topic.icon} {topic.name}
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
                onClick={() => update('roles', toggled(fields.roles, role))}
                className={chipClass(fields.roles.includes(role))}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="min-w-40 flex-1">
            <label htmlFor="qf-tags" className={labelClass}>
              Tags
            </label>
            <input
              id="qf-tags"
              value={fields.tags}
              onChange={(e) => update('tags', e.target.value)}
              placeholder="tcp, congestion"
              className={inputClass}
            />
          </div>
          <div className="min-w-40 flex-1">
            <label htmlFor="qf-companies" className={labelClass}>
              Companies
            </label>
            <input
              id="qf-companies"
              value={fields.companies}
              onChange={(e) => update('companies', e.target.value)}
              placeholder="optional"
              className={inputClass}
            />
          </div>
          <div className="w-24">
            <label htmlFor="qf-time" className={labelClass}>
              Minutes
            </label>
            <input
              id="qf-time"
              value={fields.time}
              onChange={(e) => update('time', e.target.value)}
              inputMode="numeric"
              placeholder="15"
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="qf-question" className={labelClass}>
              Question *
            </label>
            <button
              type="button"
              onClick={() => setShowHelp((open) => !open)}
              className="mb-1.5 font-mono text-[11px] text-carbon-400 hover:text-ember-400"
            >
              {showHelp ? 'hide' : 'markdown help'}
            </button>
          </div>
          {showHelp && (
            <pre className="mb-2 overflow-x-auto border border-carbon-700 bg-carbon-900 p-3 font-mono text-[11px] leading-relaxed text-carbon-400">
              {CHEATSHEET}
            </pre>
          )}
          <textarea
            id="qf-question"
            value={fields.question}
            onChange={(e) => update('question', e.target.value)}
            rows={6}
            placeholder="The full prompt, as the interviewer would pose it."
            className={`${inputClass} font-mono leading-relaxed`}
          />
        </div>

        <div>
          <label htmlFor="qf-answer" className={labelClass}>
            Answer * (hidden behind the reveal button on the site)
          </label>
          <textarea
            id="qf-answer"
            value={fields.answer}
            onChange={(e) => update('answer', e.target.value)}
            rows={14}
            placeholder="What a strong answer covers."
            className={`${inputClass} font-mono leading-relaxed`}
          />
        </div>

        <div>
          <label htmlFor="qf-followups" className={labelClass}>
            Follow-ups
          </label>
          <textarea
            id="qf-followups"
            value={fields.followups}
            onChange={(e) => update('followups', e.target.value)}
            rows={4}
            placeholder="- Probing questions an interviewer might add."
            className={`${inputClass} font-mono leading-relaxed`}
          />
        </div>
      </div>

      <div className="xl:sticky xl:top-20 xl:self-start">
        <div className="flex flex-wrap gap-2">
          {identity ? (
            <button
              type="button"
              onClick={saveWithToken}
              disabled={!valid || save.status === 'saving'}
              className={primaryClass}
            >
              {save.status === 'saving' ? 'Saving…' : saveLabel}
            </button>
          ) : mode === 'create' ? (
            valid ? (
              <a
                href={newFileUrl(
                  `${firstTopic?.group ?? 'backend'}/${effectiveSlug || 'new-question'}.md`,
                  markdown,
                )}
                target="_blank"
                rel="noreferrer"
                className={primaryClass}
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
            )
          ) : (
            <button
              type="button"
              onClick={saveViaGitHubEditor}
              disabled={!valid}
              className={primaryClass}
            >
              Copy &amp; open GitHub editor →
            </button>
          )}
          <button type="button" onClick={copyMarkdown} className={buttonClass}>
            {copied ? 'Copied ✓' : 'Copy markdown'}
          </button>
          <button type="button" onClick={downloadMarkdown} className={buttonClass}>
            Download .md
          </button>
        </div>

        {!valid && (
          <p className="mt-3 font-mono text-xs text-carbon-400">
            still needs: {problems.join(', ')}
          </p>
        )}

        {save.status === 'saved' && (
          <p className="mt-3 border border-ember-500 bg-carbon-900 p-3 text-xs text-carbon-100">
            Committed to main.{' '}
            <a
              href={save.commitUrl}
              target="_blank"
              rel="noreferrer"
              className="text-ember-400 underline"
            >
              View commit
            </a>{' '}
            — the site rebuilds and this page goes live in about a minute.
          </p>
        )}

        {save.status === 'proposed' && (
          <p className="mt-3 border border-ember-500 bg-carbon-900 p-3 text-xs text-carbon-100">
            Pull request opened.{' '}
            <a
              href={save.pullRequestUrl}
              target="_blank"
              rel="noreferrer"
              className="text-ember-400 underline"
            >
              View pull request
            </a>{' '}
            — CI validates it, and it goes live once a maintainer merges.
          </p>
        )}

        {save.status === 'error' && (
          <p className="mt-3 border border-carbon-600 bg-carbon-900 p-3 font-mono text-xs text-ember-400">
            {save.message}
          </p>
        )}

        <GitHubConnect identity={identity} onIdentity={setIdentity} />

        <p className="mt-3 font-mono text-xs text-carbon-400">→ {targetPath}</p>

        {mode === 'edit' && !identity && (
          <p className="mt-2 text-xs text-carbon-400">
            GitHub can't pre-fill an edit of an existing file, so this copies
            your version and opens the editor — select all (Ctrl+A) there, paste,
            and commit. Connect a token above to skip that step.
          </p>
        )}

        {mode === 'create' && !identity && (
          <p className="mt-2 text-xs text-carbon-400">
            Without a token this opens GitHub's editor with the file pre-filled.
            If you don't have write access, GitHub turns your commit into a pull
            request automatically.
          </p>
        )}

        <div className="mt-5 flex gap-2">
          {(['preview', 'markdown'] as const).map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setTab(name)}
              className={`border px-3 py-1 font-mono text-xs uppercase transition-colors ${
                tab === name
                  ? 'border-ember-500 bg-ember-500 font-semibold text-carbon-950'
                  : 'border-carbon-700 text-carbon-300 hover:border-ember-500 hover:text-ember-400'
              }`}
            >
              {name}
            </button>
          ))}
        </div>

        {tab === 'preview' ? (
          <div
            className="prose mt-4 max-h-[70vh] overflow-auto border border-carbon-700 bg-carbon-900 p-5"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <pre className="mt-4 max-h-[70vh] overflow-auto border border-carbon-700 bg-carbon-900 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-carbon-300">
            {markdown}
          </pre>
        )}
      </div>
    </div>
  )
}
