import { useEffect } from 'react'
import { currentTheme } from '@/lib/theme'

const THEME_VARIABLES = {
  dark: {
    primaryColor: '#202020',
    primaryTextColor: '#f4f4f2',
    lineColor: '#8f8f8f',
    secondaryColor: '#181818',
    tertiaryColor: '#111111',
  },
  light: {
    primaryColor: '#f5f3ef',
    primaryTextColor: '#14120f',
    lineColor: '#6d6a63',
    secondaryColor: '#edeae4',
    tertiaryColor: '#ffffff',
  },
}

/**
 * Renders any ```mermaid blocks currently in the DOM, and re-renders them when
 * the site theme flips or when page content changes (e.g. revealing answers in Practice Mode).
 * Mermaid (~1MB) is imported lazily, so pages without diagrams never pay for it.
 */
export function useMermaid(deps: unknown[]) {
  useEffect(() => {
    let cancelled = false
    let timer: number

    function draw() {
      const blocks = Array.from(
        document.querySelectorAll<HTMLElement>('pre.mermaid'),
      )
      if (blocks.length === 0) return

      const pending: HTMLElement[] = []
      for (const block of blocks) {
        // Store original raw mermaid diagram text source
        block.dataset.source ??= block.textContent ?? ''

        // If block was previously rendered by Mermaid, restore raw source text so Mermaid can re-render it
        if (block.dataset.processed) {
          block.textContent = block.dataset.source
          delete block.dataset.processed
        }

        pending.push(block)
      }

      if (pending.length === 0) return

      const theme = currentTheme()
      import('mermaid').then(({ default: mermaid }) => {
        if (cancelled) return
        mermaid.initialize({
          startOnLoad: false,
          theme: theme === 'light' ? 'default' : 'dark',
          themeVariables: {
            fontFamily: "'JetBrains Mono Variable', ui-monospace, monospace",
            primaryBorderColor: '#ff6b1a',
            ...THEME_VARIABLES[theme],
          },
        })
        mermaid.run({ nodes: pending }).catch(() => {})
      })
    }

    // Schedule draw after DOM update to ensure dangerouslySetInnerHTML has rendered pre.mermaid
    timer = window.setTimeout(() => {
      if (!cancelled) draw()
    }, 50)

    const onThemeChange = () => draw()
    window.addEventListener('itm:themechange', onThemeChange)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
      window.removeEventListener('itm:themechange', onThemeChange)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
