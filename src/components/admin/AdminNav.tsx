import { NavLink } from 'react-router'

import { CalendarBlank, ChartBar, Package, Receipt } from '@phosphor-icons/react'

const LINKS = [
  { to: '/admin', label: 'Tổng quan', icon: ChartBar, end: true },
  { to: '/admin/products', label: 'Kiểm duyệt sản phẩm', icon: Package, end: false },
  { to: '/admin/orders', label: 'Giám sát đơn hàng', icon: Receipt, end: false },
  { to: '/admin/holidays', label: 'Lịch nghỉ lễ', icon: CalendarBlank, end: false },
]

function linkClass({ isActive }: { isActive: boolean }): string {
  const base = 'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition'
  if (isActive) {
    return `${base} bg-indigo-600 text-white dark:bg-indigo-500`
  }
  return `${base} text-zinc-600 hover:bg-white/70 dark:text-zinc-300 dark:hover:bg-white/10`
}

export default function AdminNav() {
  return (
    <nav aria-label="Quản trị" className="glass mb-6 flex w-fit flex-wrap gap-1 rounded-full p-1">
      {LINKS.map(function (link) {
        const LinkIcon = link.icon
        return (
          <NavLink key={link.to} to={link.to} end={link.end} className={linkClass}>
            <LinkIcon size={16} weight="bold" />
            {link.label}
          </NavLink>
        )
      })}
    </nav>
  )
}
