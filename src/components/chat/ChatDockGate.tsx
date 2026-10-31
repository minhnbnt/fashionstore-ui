import { Suspense, lazy } from 'react'
import { useLocation } from 'react-router'

import { useSessionQuery } from '@/hooks/useSession'
import { getRoleFromSession } from '@/lib/auth'

// ChatDock gộp cả trợ lý AI và chat shop; gate tĩnh này giữ điều kiện ẩn/hiện
// theo route/role để không tải chunk chat vô ích ở vùng seller/admin.
const ChatDock = lazy(() => import('./ChatDock'))

/** Điều kiện hiện ChatDock — ẩn ở vùng seller/admin và với role admin.
 *  Khách chưa đăng nhập vẫn thấy dock (chỉ có tab Trợ lý AI, tab Tin nhắn ẩn trong dock). */
export default function ChatDockGate() {
  const session = useSessionQuery().data
  const location = useLocation()

  if (session !== undefined && session !== null && getRoleFromSession(session) === 'admin') {
    return null
  }
  const isSellerDashboard = location.pathname === '/shop' || location.pathname.startsWith('/shop/')
  if (isSellerDashboard || location.pathname.startsWith('/admin')) {
    return null
  }

  return (
    <Suspense fallback={null}>
      <ChatDock />
    </Suspense>
  )
}
