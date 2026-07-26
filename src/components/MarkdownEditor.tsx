import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import {
  IconBold,
  IconCallout,
  IconCode,
  IconCodeBlock,
  IconDiagram,
  IconHeading,
  IconImage,
  IconItalic,
  IconLink,
  IconListBullet,
  IconListNumber,
  IconMath,
  IconQuote,
  IconRule,
  IconStrike,
  IconTable,
  IconTask,
} from '@/components/icons'

/** Wrap the selection, prefix each selected line, or drop in a block. */
type Action =
  | { kind: 'wrap'; before: string; after: string; placeholder: string }
  | { kind: 'lines'; prefix: string | ((index: number) => string) }
  | { kind: 'block'; text: string }

interface Tool {
  label: string
  hint: string
  icon: ReactNode
  action: Action
}

const TABLE_BLOCK = `| Column | Column |
| ------ | ------ |
| value  | value  |`

const MERMAID_BLOCK = `\`\`\`mermaid
flowchart LR
    A[Client] --> B[Service]
    B --> C[(Database)]
\`\`\``

const CALLOUT_BLOCK = `::: warning Heads up
Something worth flagging.
:::`

const TOOL_GROUPS: Tool[][] = [
  [
    {
      label: 'Bold',
      hint: 'Ctrl+B',
      icon: <IconBold />,
      action: { kind: 'wrap', before: '**', after: '**', placeholder: 'bold text' },
    },
    {
      label: 'Italic',
      hint: 'Ctrl+I',
      icon: <IconItalic />,
      action: { kind: 'wrap', before: '_', after: '_', placeholder: 'italic text' },
    },
    {
      label: 'Strikethrough',
      hint: '',
      icon: <IconStrike />,
      action: { kind: 'wrap', before: '~~', after: '~~', placeholder: 'struck text' },
    },
    {
      label: 'Inline code',
      hint: '',
      icon: <IconCode />,
      action: { kind: 'wrap', before: '`', after: '`', placeholder: 'code' },
    },
  ],
  [
    {
      label: 'Heading',
      hint: '',
      icon: <IconHeading />,
      action: { kind: 'lines', prefix: '### ' },
    },
    {
      label: 'Quote',
      hint: '',
      icon: <IconQuote />,
      action: { kind: 'lines', prefix: '> ' },
    },
    {
      label: 'Bulleted list',
      hint: '',
      icon: <IconListBullet />,
      action: { kind: 'lines', prefix: '- ' },
    },
    {
      label: 'Numbered list',
      hint: '',
      icon: <IconListNumber />,
      action: { kind: 'lines', prefix: (index) => `${index + 1}. ` },
    },
    {
      label: 'Task list',
      hint: '',
      icon: <IconTask />,
      action: { kind: 'lines', prefix: '- [ ] ' },
    },
  ],
  [
    {
      label: 'Link',
      hint: 'Ctrl+K',
      icon: <IconLink />,
      action: { kind: 'wrap', before: '[', after: '](https://)', placeholder: 'link text' },
    },
    {
      label: 'Image',
      hint: '',
      icon: <IconImage />,
      action: { kind: 'wrap', before: '![', after: '](https://)', placeholder: 'alt text' },
    },
    {
      label: 'Table',
      hint: '',
      icon: <IconTable />,
      action: { kind: 'block', text: TABLE_BLOCK },
    },
  ],
  [
    {
      label: 'Code block',
      hint: '',
      icon: <IconCodeBlock />,
      action: { kind: 'block', text: '```sql\nSELECT 1;\n```' },
    },
    {
      label: 'Diagram',
      hint: 'mermaid',
      icon: <IconDiagram />,
      action: { kind: 'block', text: MERMAID_BLOCK },
    },
    {
      label: 'Callout',
      hint: 'note · tip · info · warning · danger',
      icon: <IconCallout />,
      action: { kind: 'block', text: CALLOUT_BLOCK },
    },
    {
      label: 'Math',
      hint: 'KaTeX',
      icon: <IconMath />,
      action: { kind: 'block', text: '$$\n\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}\n$$' },
    },
    {
      label: 'Divider',
      hint: '',
      icon: <IconRule />,
      action: { kind: 'block', text: '---' },
    },
  ],
]

/**
 * Writes into the textarea through execCommand where available so the browser's
 * own undo stack keeps working; falls back to React's value setter.
 */
function replaceSelection(
  el: HTMLTextAreaElement,
  start: number,
  end: number,
  text: string,
) {
  el.focus()
  el.setSelectionRange(start, end)

  let inserted = false
  try {
    inserted = document.execCommand('insertText', false, text)
  } catch {
    inserted = false
  }

  if (!inserted) {
    const next = el.value.slice(0, start) + text + el.value.slice(end)
    const setter = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      'value',
    )?.set
    setter?.call(el, next)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }
}

function applyAction(el: HTMLTextAreaElement, action: Action) {
  const { selectionStart: start, selectionEnd: end, value } = el
  const selected = value.slice(start, end)

  if (action.kind === 'wrap') {
    const inner = selected || action.placeholder
    replaceSelection(el, start, end, `${action.before}${inner}${action.after}`)
    const from = start + action.before.length
    el.setSelectionRange(from, from + inner.length)
    return
  }

  if (action.kind === 'lines') {
    // Grow the range to whole lines so prefixes land in the right place.
    const lineStart = value.lastIndexOf('\n', start - 1) + 1
    const lineEndIndex = value.indexOf('\n', end)
    const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex
    const block = value.slice(lineStart, lineEnd) || ''

    const prefixed = block
      .split('\n')
      .map((line, index) => {
        const prefix =
          typeof action.prefix === 'function' ? action.prefix(index) : action.prefix
        return line.startsWith(prefix) ? line.slice(prefix.length) : prefix + line
      })
      .join('\n')

    replaceSelection(el, lineStart, lineEnd, prefixed)
    el.setSelectionRange(lineStart, lineStart + prefixed.length)
    return
  }

  // Blocks always sit on their own lines, with breathing room around them.
  const before = value.slice(0, start)
  const lead = before === '' || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n'
  const after = value.slice(end)
  const tail = after.startsWith('\n') ? '\n' : '\n\n'
  const text = `${lead}${action.text}${tail}`

  replaceSelection(el, start, end, text)
  const cursor = start + lead.length + action.text.length
  el.setSelectionRange(cursor, cursor)
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  function run(action: Action) {
    if (ref.current) applyAction(ref.current, action)
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (!(event.ctrlKey || event.metaKey)) return
    const key = event.key.toLowerCase()
    const shortcut = { b: TOOL_GROUPS[0][0], i: TOOL_GROUPS[0][1], k: TOOL_GROUPS[2][0] }[key]
    if (!shortcut) return
    event.preventDefault()
    run(shortcut.action)
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-carbon-700 bg-carbon-850 px-2 py-1.5">
        {TOOL_GROUPS.map((group, index) => (
          <div key={index} className="flex items-center gap-0.5">
            {index > 0 && <span className="mx-1 h-5 w-px bg-carbon-700" />}
            {group.map((tool) => (
              <button
                key={tool.label}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => run(tool.action)}
                title={tool.hint ? `${tool.label} — ${tool.hint}` : tool.label}
                aria-label={tool.label}
                className="flex size-7 items-center justify-center text-carbon-300 transition-colors hover:bg-carbon-800 hover:text-ember-400"
              >
                {tool.icon}
              </button>
            ))}
          </div>
        ))}
      </div>

      <textarea
        ref={ref}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        spellCheck
        className="min-h-0 flex-1 resize-none bg-carbon-900 p-4 font-mono text-sm leading-relaxed text-carbon-100 placeholder:text-carbon-400 focus:outline-none"
      />
    </div>
  )
}
