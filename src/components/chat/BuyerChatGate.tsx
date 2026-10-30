import { Suspense, lazy } from 'react'
import { useLocation } from 'react-router'

import { useSessionQuery } from '@/hooks/useSession'
import { getRoleFromSession } from '@/lib/auth'

// Widget chat nặng (code + client chat.ts) nên lazy-load; gate tĩnh này giữ điều
// kiện ẩn/hiện để khách/guest/admin/seller không tải chunk chat vô ích.
const BuyerChatWidget = lazy(() => import('./BuyerChatWidget'))

/** Điều kiện hiện floating chat buyer — chỉ buyer đã đăng nhập, ngoài vùng seller/admin. */
export default function BuyerChatGate() {
  const session = useSessionQuery().data
  const location = useLocation()

  if (session === null || session === undefined) {
    return null
  }
  if (getRoleFromSession(session) === 'admin') {
    return null
  }
  const isSellerDashboard = location.pathname === '/shop' || location.pathname.startsWith('/shop/')
  if (isSellerDashboard || location.pathname.startsWith('/admin')) {
    return null
  }

  return (
    <Suspense fallback={null}>
      <BuyerChatWidget />
    </Suspense>
  )
}
