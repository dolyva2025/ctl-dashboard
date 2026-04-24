'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'navy'

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: 'light',
  toggle: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light')

  // Read saved preference after mount
  useEffect(() => {
    const saved = localStorage.getItem('ctl-theme') as Theme | null
    if (saved === 'navy') applyTheme('navy')
  }, [])

  function applyTheme(t: Theme) {
    setTheme(t)
    document.documentElement.classList.toggle('dark', t === 'navy')
    localStorage.setItem('ctl-theme', t)
  }

  function toggle() {
    applyTheme(theme === 'light' ? 'navy' : 'light')
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
