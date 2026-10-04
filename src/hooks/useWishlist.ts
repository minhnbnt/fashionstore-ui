import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'fashionstore:wishlist'

function loadWishlist(): Set<number> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw === null) {
      return new Set()
    }
    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed) === false) {
      return new Set()
    }
    return new Set((parsed as unknown[]).filter((id) => typeof id === 'number'))
  } catch {
    return new Set()
  }
}

export function useWishlist() {
  const [ids, setIds] = useState<Set<number>>(() => loadWishlist())

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]))
  }, [ids])

  const toggle = useCallback((id: number) => {
    setIds((current) => {
      const next = new Set(current)
      if (next.has(id)) {
        next.delete(id)
        return next
      }
      next.add(id)
      return next
    })
  }, [])

  return { ids, toggle }
}
