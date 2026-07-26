import { useCallback, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

const THEME_KEY = 'itm:theme'

/** Matches the inline script in index.html, which sets the theme pre-paint. */
export function currentTheme(): Theme {
  const attr = document.documentElement.dataset.theme
  return attr === 'light' ? 'light' : 'dark'
}

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
  try {
    window.localStorage.setItem(THEME_KEY, theme)
  } catch {
    // Private mode — the choice just won't persist.
  }
  window.dispatchEvent(new CustomEvent('itm:themechange', { detail: theme }))
}

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(currentTheme)

  useEffect(() => {
    const onChange = (event: Event) =>
      setTheme((event as CustomEvent<Theme>).detail)
    window.addEventListener('itm:themechange', onChange)
    return () => window.removeEventListener('itm:themechange', onChange)
  }, [])

  const toggle = useCallback(() => {
    apply(currentTheme() === 'dark' ? 'light' : 'dark')
  }, [])

  return [theme, toggle]
}
