import { useCallback, useEffect, useState } from 'react'

import type { Theme } from '@/types/ui'

const STORAGE_KEY = 'net:theme'

function initialTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'dark'
  }
  const saved = window.localStorage.getItem(STORAGE_KEY)
  if (saved === 'light' || saved === 'dark') {
    return saved
  }
  return 'dark'
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initialTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    window.localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const toggle = useCallback(function () {
    setTheme(function (current) {
      if (current === 'dark') {
        return 'light'
      }
      return 'dark'
    })
  }, [])

  return { theme, toggle }
}
