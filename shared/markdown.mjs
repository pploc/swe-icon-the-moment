/**
 * The Markdown feature set, shared by the build (scripts/build-content.mjs,
 * which renders with Shiki) and the in-page editor preview (src/lib/markdown.ts,
 * which renders without it). Keeping one plugin list here is what makes the
 * preview match the published page.
 */
import anchor from 'markdown-it-anchor'
import footnote from 'markdown-it-footnote'
import deflist from 'markdown-it-deflist'
import abbr from 'markdown-it-abbr'
import sub from 'markdown-it-sub'
import sup from 'markdown-it-sup'
import mark from 'markdown-it-mark'
import ins from 'markdown-it-ins'
import container from 'markdown-it-container'
import taskLists from 'markdown-it-task-lists'
import { full as emoji } from 'markdown-it-emoji'
import katexModule from '@vscode/markdown-it-katex'

/** Some CJS plugins arrive double-wrapped depending on the bundler. */
const interop = (mod) => (typeof mod === 'function' ? mod : mod.default)

const katex = interop(katexModule)

/** Callout blocks: `::: warning` … `:::`. */
const CALLOUTS = ['note', 'tip', 'info', 'warning', 'danger']

export function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** ```mermaid fences become diagram blocks, rendered client-side. */
export function mermaidFence(code) {
  return `<pre class="mermaid">${escapeHtml(code.trim())}</pre>`
}

/** Options every renderer shares (GFM tables, strikethrough, autolinks, HTML). */
export const markdownOptions = {
  html: true,
  linkify: true,
  typographer: true,
  breaks: false,
}

export function applyMarkdownPlugins(md) {
  md.use(anchor, {
    level: [2, 3, 4],
    permalink: anchor.permalink.linkInsideHeader({
      symbol: '#',
      placement: 'after',
      class: 'heading-anchor',
      ariaHidden: true,
    }),
  })
    .use(footnote)
    .use(deflist)
    .use(abbr)
    .use(sub)
    .use(sup)
    .use(mark)
    .use(ins)
    .use(taskLists, { label: true })
    .use(emoji)
    .use(katex)

  for (const name of CALLOUTS) {
    md.use(container, name, {
      render(tokens, idx) {
        const token = tokens[idx]
        if (!token.nesting) return `</div>\n`
        // `::: warning Custom title` — anything after the name is the title.
        const title = token.info.trim().slice(name.length).trim()
        return (
          `<div class="callout callout-${name}">` +
          `<p class="callout-title">${escapeHtml(title || name)}</p>\n`
        )
      },
    })
  }

  return md
}
