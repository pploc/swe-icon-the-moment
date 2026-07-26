import MarkdownIt from 'markdown-it'
import {
  applyMarkdownPlugins,
  escapeHtml,
  markdownOptions,
  mermaidFence,
} from '../../shared/markdown.mjs'

/**
 * Browser-side renderer for the editor preview. Same plugin set as the build,
 * minus Shiki — code blocks render unhighlighted here, which keeps the lazy
 * chunk small. Published pages still get full highlighting.
 */
let renderer: MarkdownIt | null = null

export function render(markdown: string): string {
  renderer ??= applyMarkdownPlugins(
    new MarkdownIt({
      ...markdownOptions,
      highlight(code: string, lang: string) {
        if (lang === 'mermaid') return mermaidFence(code)
        return `<pre><code>${escapeHtml(code)}</code></pre>`
      },
    }),
  )
  return renderer.render(markdown)
}
