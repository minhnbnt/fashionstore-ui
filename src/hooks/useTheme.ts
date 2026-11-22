import { useCallback, useEffect, useSyncExternalStore } from 'react'

import type { Theme } from '@/types/ui'

const STORAGE_KEY = 'dhmq:theme'
const LEGACY_STORAGE_KEY = 'net:theme'

const listeners = new Set<() => void>()

function readTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'light'
  }
  const saved = window.localStorage.getItem(STORAGE_KEY)
  if (saved === 'light' || saved === 'dark') {
    return saved
  }
  const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY)
  if (legacy === 'light' || legacy === 'dark') {
    return legacy
  }
  if (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    return 'dark'
  }
  return 'light'
}

function getServerSnapshot(): Theme {
  return 'light'
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  if (typeof window === 'undefined') {
    return function () {
      listeners.delete(listener)
    }
  }
  function handleStorage(event: StorageEvent) {
    if (event.key === null || event.key === STORAGE_KEY || event.key === LEGACY_STORAGE_KEY) {
      listener()
    }
  }
  window.addEventListener('storage', handleStorage)
  return function () {
    listeners.delete(listener)
    window.removeEventListener('storage', handleStorage)
  }
}

function applyTheme(next: Theme) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, next)
    document.documentElement.classList.toggle('dark', next === 'dark')
  }
  for (const listener of listeners) {
    listener()
  }
}

export function useTheme(): { theme: Theme; toggle: () => void } {
  const theme = useSyncExternalStore(subscribe, readTheme, getServerSnapshot)

  useEffect(
    function () {
      document.documentElement.classList.toggle('dark', theme === 'dark')
    },
    [theme],
  )

  const toggle = useCallback(function () {
    const current = readTheme()
    if (current === 'dark') {
      applyTheme('light')
      return
    }
    applyTheme('dark')
  }, [])

  return { theme, toggle }
}
