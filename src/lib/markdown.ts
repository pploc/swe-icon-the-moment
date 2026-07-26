import MarkdownIt from 'markdown-it'
import {
  applyMarkdownPlugins,
  escapeHtml,
  markdownOptions,
  mermaidFence,
} from '../../shared/markdown.mjs'
import { buildIndex, prepareBody } from '../../shared/links.mjs'
import { questions } from '@/generated/content'

/**
 * Browser-side renderer for the editor preview. Same plugin set as the build,
 * minus Shiki — code blocks render unhighlighted here, which keeps the lazy
 * chunk small. Published pages still get full highlighting.
 */
let renderer: MarkdownIt | null = null
let linkIndex: ReturnType<typeof buildIndex> | null = null

export function render(markdown: string, selfSlug?: string): string {
  renderer ??= applyMarkdownPlugins(
    new MarkdownIt({
      ...markdownOptions,
      highlight(code: string, lang: string) {
        if (lang === 'mermaid') return mermaidFence(code)
        return `<pre><code>${escapeHtml(code)}</code></pre>`
      },
    }),
  )
  linkIndex ??= buildIndex(questions)

  // Same preparation the build runs, so the preview shows the same links.
  return renderer.render(
    prepareBody(markdown, {
      index: linkIndex,
      base: import.meta.env.BASE_URL,
      selfSlug,
    }),
  )
}
