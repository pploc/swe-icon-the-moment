import { useEffect, useMemo, useState } from 'react'
import { topics } from '@/generated/content'
import { GitHubConnect } from '@/components/GitHubConnect'
import { MarkdownEditor } from '@/components/MarkdownEditor'
import { IconEye, IconPencil } from '@/components/icons'
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
  slugify,
  type QuestionFields,
} from '@/lib/question-md'

const ROLES = ['backend', 'infra', 'sre', 'platform', 'fullstack']

const inputClass =
  'w-full border border-carbon-700 bg-carbon-900 px-3 py-1.5 text-sm placeholder:text-carbon-400 focus:border-ember-500 focus:outline-none'
const chipClass = (active: boolean) =>
  `border px-2 py-0.5 font-mono text-xs transition-colors ${
    active
      ? 'border-ember-500 bg-ember-500 font-semibold text-carbon-950'
      : 'border-carbon-700 text-carbon-300 hover:border-ember-500 hover:text-ember-400'
  }`
const ghostButton =
  'border border-carbon-700 px-3 py-1.5 font-mono text-xs font-semibold tracking-wide text-carbon-300 uppercase transition-colors hover:border-ember-500 hover:text-ember-400'
const primaryButton =
  'border border-ember-500 bg-ember-500 px-4 py-1.5 font-mono text-xs font-bold tracking-wide text-carbon-950 uppercase transition-colors hover:border-ember-400 hover:bg-ember-400 disabled:cursor-not-allowed disabled:border-carbon-700 disabled:bg-transparent disabled:text-carbon-400'
const fieldLabel = 'mb-1 block font-mono text-[11px] tracking-wide text-carbon-400 uppercase'

type SaveState =
  | { status: 'idle' }
  | { status: 'saving' }
  | { status: 'saved'; commitUrl: string }
  | { status: 'proposed'; pullRequestUrl: string }
  | { status: 'error'; message: string }

function toggled(list: string[], value: string): string[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value]
}

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
  const [detailsOpen, setDetailsOpen] = useState(mode === 'create')
  const [pane, setPane] = useState<'write' | 'preview'>('write')
  const [html, setHtml] = useState('')
  const [copied, setCopied] = useState(false)
  const [identity, setIdentity] = useState<Identity | null>(null)
  const [save, setSave] = useState<SaveState>({ status: 'idle' })

  useEffect(() => setFields(initial), [initial])

  useEffect(() => {
    if (getToken()) verifyToken().then(setIdentity, () => setIdentity(null))
  }, [])

  function update<K extends keyof QuestionFields>(key: K, value: QuestionFields[K]) {
    setFields((current) => ({ ...current, [key]: value }))
    setSave({ status: 'idle' })
  }

  const effectiveSlug = fixedSlug ?? (slugTouched ? slug : slugify(fields.title))
  const markdown = useMemo(() => composeMarkdown(fields), [fields])

  // The renderer is only pulled in once there is something to render.
  useEffect(() => {
    let cancelled = false
    import('@/lib/markdown').then(({ render }) => {
      if (!cancelled) setHtml(render(fields.body || '_Nothing to preview yet._'))
    })
    return () => {
      cancelled = true
    }
  }, [fields.body])

  useMermaid([html, pane])

  const problems = missingFields(fields)
  const valid = problems.length === 0
  const firstTopic = topics.find((t) => fields.topics.includes(t.id))
  const targetPath =
    source ??
    `content/questions/${firstTopic?.group ?? 'backend'}/${effectiveSlug || 'new-question'}.md`

  const selectedTopicNames = topics
    .filter((t) => fields.topics.includes(t.id))
    .map((t) => t.name)

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
        }).then(({ pullRequestUrl }) => setSave({ status: 'proposed', pullRequestUrl }))

    request.catch((error: Error) => setSave({ status: 'error', message: error.message }))
  }

  /** No token: hand off to GitHub's own editor. */
  function saveViaGitHubEditor() {
    copyMarkdown().finally(() => window.open(editUrl(source!), '_blank', 'noreferrer'))
  }

  const saveLabel = identity?.canWrite
    ? mode === 'create'
      ? 'Publish'
      : 'Save'
    : 'Propose (PR)'

  return (
    <div className="space-y-3">
      {/* Title + actions ---------------------------------------------------- */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={fields.title}
          onChange={(e) => update('title', e.target.value)}
          placeholder="Question title…"
          aria-label="Question title"
          className="min-w-64 flex-1 border-0 border-b border-carbon-700 bg-transparent px-1 py-2 text-xl font-bold tracking-tight placeholder:font-normal placeholder:text-carbon-400 focus:border-ember-500 focus:outline-none"
        />

        <div className="flex items-center gap-2">
          {identity ? (
            <button
              type="button"
              onClick={saveWithToken}
              disabled={!valid || save.status === 'saving'}
              className={primaryButton}
            >
              {save.status === 'saving' ? 'Saving…' : saveLabel}
            </button>
          ) : mode === 'create' ? (
            <a
              href={
                valid
                  ? newFileUrl(
                      `${firstTopic?.group ?? 'backend'}/${effectiveSlug || 'new-question'}.md`,
                      markdown,
                    )
                  : undefined
              }
              target="_blank"
              rel="noreferrer"
              aria-disabled={!valid}
              title={valid ? undefined : `Still needs: ${problems.join(', ')}`}
              className={
                valid
                  ? primaryButton
                  : 'cursor-not-allowed border border-carbon-700 px-4 py-1.5 font-mono text-xs font-bold tracking-wide text-carbon-400 uppercase'
              }
            >
              Open on GitHub →
            </a>
          ) : (
            <button
              type="button"
              onClick={saveViaGitHubEditor}
              disabled={!valid}
              className={primaryButton}
            >
              Copy &amp; open editor →
            </button>
          )}

          <button type="button" onClick={copyMarkdown} className={ghostButton}>
            {copied ? 'Copied ✓' : 'Copy'}
          </button>
          <button type="button" onClick={downloadMarkdown} className={ghostButton}>
            .md
          </button>
        </div>
      </div>

      {/* Metadata drawer ---------------------------------------------------- */}
      <div className="border border-carbon-700 bg-carbon-900">
        <button
          type="button"
          onClick={() => setDetailsOpen((open) => !open)}
          className="flex w-full items-center gap-3 px-3 py-2 text-left font-mono text-xs text-carbon-400 transition-colors hover:text-carbon-100"
        >
          <span className="text-ember-500">{detailsOpen ? '▾' : '▸'}</span>
          <span className="tracking-wide uppercase">Details</span>
          {!detailsOpen && (
            <span className="truncate text-carbon-400">
              {selectedTopicNames.length > 0 ? selectedTopicNames.join(' · ') : 'no topic yet'}
              {fields.roles.length > 0 && ` · ${fields.roles.join(', ')}`}
              {fields.time && ` · ${fields.time}min`}
            </span>
          )}
          <span className="ml-auto shrink-0 truncate font-mono text-[11px] text-carbon-400">
            {targetPath}
          </span>
        </button>

        {detailsOpen && (
          <div className="space-y-4 border-t border-carbon-700 p-4">
            <div>
              <span className={fieldLabel}>Topics * (at least one)</span>
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
              <span className={fieldLabel}>Roles</span>
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
              <div className="min-w-44 flex-1">
                <label htmlFor="qf-tags" className={fieldLabel}>
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
              <div className="min-w-44 flex-1">
                <label htmlFor="qf-companies" className={fieldLabel}>
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
                <label htmlFor="qf-time" className={fieldLabel}>
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
              {mode === 'create' && (
                <div className="min-w-44 flex-1">
                  <label htmlFor="qf-slug" className={fieldLabel}>
                    Filename
                  </label>
                  <input
                    id="qf-slug"
                    value={effectiveSlug}
                    onChange={(e) => {
                      setSlugTouched(true)
                      setSlug(slugify(e.target.value))
                    }}
                    className={`${inputClass} font-mono`}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Write | Preview ---------------------------------------------------- */}
      <div className="flex items-center gap-2 lg:hidden">
        {(
          [
            ['write', 'Write', <IconPencil key="w" />],
            ['preview', 'Preview', <IconEye key="p" />],
          ] as const
        ).map(([name, label, icon]) => (
          <button
            key={name}
            type="button"
            onClick={() => setPane(name)}
            className={`flex items-center gap-1.5 border px-3 py-1 font-mono text-xs uppercase transition-colors ${
              pane === name
                ? 'border-ember-500 bg-ember-500 font-semibold text-carbon-950'
                : 'border-carbon-700 text-carbon-300'
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      <div className="grid h-[calc(100vh-19rem)] min-h-[30rem] grid-cols-1 border border-carbon-700 lg:grid-cols-2">
        <div className={`min-h-0 ${pane === 'write' ? 'flex' : 'hidden'} flex-col lg:flex`}>
          <MarkdownEditor
            value={fields.body}
            onChange={(body) => update('body', body)}
            placeholder="## Question&#10;&#10;…"
          />
        </div>

        <div
          className={`min-h-0 ${
            pane === 'preview' ? 'flex' : 'hidden'
          } flex-col border-carbon-700 lg:flex lg:border-l`}
        >
          <div className="flex items-center gap-2 border-b border-carbon-700 bg-carbon-850 px-3 py-2 font-mono text-[11px] tracking-widest text-carbon-400 uppercase">
            <IconEye />
            Preview
          </div>
          <div
            className="prose min-h-0 flex-1 overflow-auto bg-carbon-900 p-5"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>

      {/* Status ------------------------------------------------------------- */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-64 flex-1">
          {!valid && (
            <p className="font-mono text-xs text-carbon-400">
              still needs: {problems.join(', ')}
            </p>
          )}

          {save.status === 'saved' && (
            <p className="border border-ember-500 bg-carbon-900 p-3 text-xs text-carbon-100">
              Committed to main.{' '}
              <a href={save.commitUrl} target="_blank" rel="noreferrer" className="text-ember-400 underline">
                View commit
              </a>{' '}
              — the site rebuilds in about a minute.
            </p>
          )}

          {save.status === 'proposed' && (
            <p className="border border-ember-500 bg-carbon-900 p-3 text-xs text-carbon-100">
              Pull request opened.{' '}
              <a href={save.pullRequestUrl} target="_blank" rel="noreferrer" className="text-ember-400 underline">
                View pull request
              </a>{' '}
              — CI validates it, and it goes live once a maintainer merges.
            </p>
          )}

          {save.status === 'error' && (
            <p className="border border-carbon-600 bg-carbon-900 p-3 font-mono text-xs text-ember-400">
              {save.message}
            </p>
          )}

          {mode === 'edit' && !identity && save.status === 'idle' && (
            <p className="text-xs text-carbon-400">
              GitHub can't pre-fill an edit, so this copies your Markdown and
              opens the editor — select all there, paste, commit. Connect a token
              to skip that.
            </p>
          )}
        </div>

        <GitHubConnect identity={identity} onIdentity={setIdentity} />
      </div>
    </div>
  )
}
