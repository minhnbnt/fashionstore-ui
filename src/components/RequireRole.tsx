import { Navigate, useLocation } from 'react-router'

import { useSessionQuery } from '../hooks/useSession'
import { getDefaultPathForRole, getRoleFromSession } from '../lib/auth'

import type { UserRole } from '../lib/auth'

interface Props {
  requiredRole: UserRole
  children: React.ReactNode
}

export default function RequireRole({ requiredRole, children }: Props) {
  const { data: session, isPending } = useSessionQuery()
  const location = useLocation()

  if (isPending) {
    return <p className="mx-auto max-w-[1400px] px-4 py-24 text-center">Đang tải…</p>
  }

  if (session === null || session === undefined) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  const userRole = getRoleFromSession(session)

  if (userRole !== requiredRole) {
    const correctPath = getDefaultPathForRole(userRole)
    return <Navigate to={correctPath} replace />
  }

  return <>{children}</>
}
