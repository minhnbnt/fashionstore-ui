import { Navigate, useLocation } from 'react-router'

import { useSessionQuery } from '../hooks/useSession'

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSessionQuery()
  const location = useLocation()

  if (isPending) {
    return <p className="mx-auto max-w-[1400px] px-4 py-24 text-center">Đang tải…</p>
  }
  if (session === null || session === undefined) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <>{children}</>
}
