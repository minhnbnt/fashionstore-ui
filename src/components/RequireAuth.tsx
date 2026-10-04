import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'

import { useSession } from '@/lib/auth'

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useSession()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
        Đang tải…
      </div>
    )
  }

  if (!session) {
    return (
      <Navigate
        to="/login"
        state={{ from: `${location.pathname}${location.search}` }}
        replace
      />
    )
  }

  return children
}
