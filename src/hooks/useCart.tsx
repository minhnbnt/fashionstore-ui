import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import type { Product } from '@/lib/api'

export interface CartLine {
  id: number
  name: string
  price: number
  imageKey: string | null
  qty: number
}

interface CartValue {
  lines: CartLine[]
  count: number
  total: number
  add: (product: Product, qty: number) => void
  remove: (id: number) => void
  setQty: (id: number, qty: number) => void
  clear: () => void
}

const STORAGE_KEY = 'fashionstore:cart'

const CartContext = createContext<CartValue | null>(null)

function loadCart(): CartLine[] {
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (raw === null) {
    return []
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed) === false) {
      return []
    }
    return (parsed as CartLine[]).filter((line) => line.qty > 0)
  } catch {
    return []
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(() => loadCart())

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines))
  }, [lines])

  const add = useCallback((product: Product, qty: number) => {
    if (qty <= 0) {
      return
    }
    setLines((current) => {
      const found = current.find((line) => line.id === product.id)
      if (found === undefined) {
        return [
          ...current,
          {
            id: product.id,
            name: product.name,
            price: product.price,
            imageKey: product.imageKey,
            qty,
          },
        ]
      }
      return current.map((line) => {
        if (line.id === product.id) {
          return { ...line, qty: line.qty + qty }
        }
        return line
      })
    })
  }, [])

  const remove = useCallback((id: number) => {
    setLines((current) => current.filter((line) => line.id !== id))
  }, [])

  const setQty = useCallback((id: number, qty: number) => {
    if (qty <= 0) {
      setLines((current) => current.filter((line) => line.id !== id))
      return
    }
    setLines((current) =>
      current.map((line) => {
        if (line.id === id) {
          return { ...line, qty }
        }
        return line
      }),
    )
  }, [])

  const clear = useCallback(() => {
    setLines([])
  }, [])

  let count = 0
  let total = 0
  for (const line of lines) {
    count += line.qty
    total += line.price * line.qty
  }

  const value = useMemo<CartValue>(
    () => ({ lines, count, total, add, remove, setQty, clear }),
    [lines, count, total, add, remove, setQty, clear],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartValue {
  const value = useContext(CartContext)
  if (value === null) {
    throw new Error('useCart phải dùng bên trong CartProvider')
  }
  return value
}
