import { ShieldCheck, Storefront } from '@phosphor-icons/react'

import { badgeToneClass, cn } from '@/lib/ui/styles'

// Badge vai trò dùng chung header và trang tài khoản; nhận cả 'customer' lẫn 'CUSTOMER'.
export default function RoleBadge({ role }: { role: string }) {
  const normalized = role.toLowerCase()
  if (normalized === 'admin') {
    return (
      <span
        className={cn(
          badgeToneClass('danger'),
          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold',
        )}
      >
        <ShieldCheck size={11} weight="bold" />
        Admin
      </span>
    )
  }
  if (normalized === 'shop') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700 dark:border-indigo-400/30 dark:bg-indigo-500/15 dark:text-indigo-300">
        <Storefront size={11} weight="bold" />
        Shop
      </span>
    )
  }
  return (
    <span
      className={cn(
        badgeToneClass('info'),
        'inline-flex rounded-full px-2 py-0.5 text-xs font-bold',
      )}
    >
      Khách hàng
    </span>
  )
}
