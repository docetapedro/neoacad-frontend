import { useEffect } from 'react'
import { useThemeStore } from '@/stores/theme-store'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore((s) => s.theme)

  useEffect(() => {
    const root = document.documentElement

    const apply = (value: 'light' | 'dark') => {
      root.classList.toggle('dark', value === 'dark')
      root.style.colorScheme = value
    }

    if (theme === 'system') {
      const media = window.matchMedia('(prefers-color-scheme: dark)')
      apply(media.matches ? 'dark' : 'light')
      const listener = (e: MediaQueryListEvent) => apply(e.matches ? 'dark' : 'light')
      media.addEventListener('change', listener)
      return () => media.removeEventListener('change', listener)
    }

    apply(theme)
  }, [theme])

  return <>{children}</>
}
