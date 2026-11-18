import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router'

import {
  ArrowSquareOut,
  CalendarBlank,
  ChartBar,
  GearSix,
  List,
  Package,
  Prohibit,
  Receipt,
  SignOut,
  SquaresFour,
  Storefront,
  Users,
} from '@phosphor-icons/react'

import NotificationBell from '@/components/NotificationBell'
import Drawer from '@/components/ui/Drawer'
import ThemeToggle from '@/components/ui/ThemeToggle'
import UserAvatar from '@/components/UserAvatar'
import { useSignOut } from '@/hooks/useAuthMutations'
import { useSessionQuery } from '@/hooks/useSession'
import { notify } from '@/lib/notifications'
import { cn, sectionLabelClass, sidebarItemClass } from '@/lib/ui/styles'

import type { Icon } from '@phosphor-icons/react'

interface AdminNavItem {
  to: string
  label: string
  icon: Icon
  end: boolean
}

interface AdminNavGroup {
  title: string
  items: AdminNavItem[]
}

const NAV_GROUPS: AdminNavGroup[] = [
  {
    title: 'TỔNG QUAN',
    items: [{ to: '/admin', label: 'Tổng quan', icon: ChartBar, end: true }],
  },
  {
    title: 'VẬN HÀNH SÀN',
    items: [
      { to: '/admin/shops', label: 'Gian hàng', icon: Storefront, end: false },
      { to: '/admin/users', label: 'Tài khoản', icon: Users, end: false },
      { to: '/admin/orders', label: 'Đơn hàng', icon: Receipt, end: false },
    ],
  },
  {
    title: 'KIỂM DUYỆT',
    items: [
      { to: '/admin/products', label: 'Sản phẩm', icon: Package, end: true },
      { to: '/admin/products/keywords', label: 'Từ khóa cấm', icon: Prohibit, end: false },
    ],
  },
  {
    title: 'NỘI DUNG & CẤU HÌNH',
    items: [
      { to: '/admin/content', label: 'Nội dung sàn', icon: SquaresFour, end: false },
      { to: '/admin/holidays', label: 'Lịch nghỉ lễ', icon: CalendarBlank, end: false },
      { to: '/admin/settings', label: 'Cấu hình hệ thống', icon: GearSix, end: false },
    ],
  },
]

function AdminSidebarNav(props: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Điều hướng quản trị" className="space-y-5">
      {NAV_GROUPS.map(function (group) {
        return (
          <div key={group.title} className="space-y-1.5">
            <p className={cn(sectionLabelClass(), 'px-3 text-[11px]')}>{group.title}</p>
            <div className="space-y-1">
              {group.items.map(function (item) {
                const ItemIcon = item.icon
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={props.onNavigate}
                    className={function ({ isActive }) {
                      return sidebarItemClass(isActive)
                    }}
                  >
                    <ItemIcon size={18} weight="bold" className="shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                )
              })}
            </div>
          </div>
        )
      })}
    </nav>
  )
}

export default function AdminShell(props: {
  title: string
  description: string
  children: React.ReactNode
  actions?: React.ReactNode
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { data: session } = useSessionQuery()
  const signOut = useSignOut()
  const navigate = useNavigate()

  let adminEmail = ''
  if (
    session !== null &&
    session !== undefined &&
    session.user.email !== undefined &&
    session.user.email !== ''
  ) {
    adminEmail = session.user.email
  }

  let avatarSeed = 'DHMQ Admin'
  if (adminEmail !== '') {
    avatarSeed = adminEmail
  }

  function handleSignOut() {
    setMobileMenuOpen(false)
    signOut.mutate(undefined, {
      onSuccess: function () {
        notify.success('Đã đăng xuất', 'Phiên quản trị đã kết thúc.')
        void navigate('/', { replace: true })
      },
      onError: function (err) {
        notify.fromError(err, undefined, 'Không thể đăng xuất. Vui lòng thử lại.')
      },
    })
  }

  return (
    <div className="flex min-h-screen flex-col font-sans">
      {/* Topbar nổi dạng glass pill đồng nhất với hệ thống DHMQ */}
      <header className="sticky top-0 z-40">
        <div className="mx-auto max-w-[1600px] px-4">
          <div className="glass mt-3 flex h-16 items-center justify-between gap-3 rounded-full px-4 md:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Mở menu quản trị"
                onClick={function () {
                  setMobileMenuOpen(true)
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-700 transition hover:bg-indigo-100 lg:hidden dark:text-zinc-200 dark:hover:bg-white/10"
              >
                <List size={22} weight="bold" />
              </button>

              <Link to="/admin" className="flex items-center gap-2.5">
                <span className="flex items-center gap-1 text-2xl font-extrabold tracking-tighter text-[#17203a] dark:text-[#e2e8f0]">
                  <span>DHMQ</span>
                  <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-[#312e81] via-[#1d4ed8] to-[#38bdf8]" />
                </span>
                <span className="rounded-full bg-gradient-to-r from-[#312e81] via-[#1d4ed8] to-[#38bdf8] px-2.5 py-0.5 text-[11px] font-extrabold tracking-wider text-white uppercase shadow-xs">
                  Admin
                </span>
              </Link>
            </div>

            <div className="flex items-center gap-2 md:gap-3">
              <NotificationBell categories={['ORDER', 'ACTIVITY']} />

              <ThemeToggle className="relative flex h-10 w-10 items-center justify-center rounded-full text-zinc-600 transition hover:bg-indigo-100 dark:text-zinc-300 dark:hover:bg-white/10" />

              <Link
                to="/"
                className="hidden items-center gap-1.5 rounded-full border border-zinc-300 bg-white/80 px-3.5 py-2 text-xs font-bold text-[#17203a] transition hover:border-blue-600 hover:text-blue-700 sm:inline-flex dark:border-white/15 dark:bg-white/10 dark:text-[#e2e8f0] dark:hover:border-sky-400 dark:hover:text-sky-300"
              >
                <span>Về trang mua sắm</span>
                <ArrowSquareOut size={15} weight="bold" />
              </Link>

              <div className="hidden h-6 w-px bg-zinc-200/80 md:block dark:bg-white/10" />

              <div className="flex items-center gap-2">
                <UserAvatar name={avatarSeed} size={32} />
                {adminEmail !== '' && (
                  <span className="hidden max-w-[180px] truncate text-xs font-bold text-[#17203a] md:inline dark:text-[#e2e8f0]">
                    {adminEmail}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleSignOut}
                disabled={signOut.isPending}
                aria-label="Đăng xuất"
                title="Đăng xuất"
                className="inline-flex h-10 items-center gap-1.5 rounded-full border border-zinc-300 bg-white/80 px-3 text-xs font-bold text-rose-600 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:bg-white/10 dark:text-rose-400 dark:hover:bg-rose-500/15"
              >
                <SignOut size={16} weight="bold" />
                <span className="hidden xl:inline">Đăng xuất</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container: Sidebar cố định + Workspace */}
      <div className="mx-auto flex w-full max-w-[1600px] flex-1 gap-5 px-4 py-5">
        <aside className="sticky top-24 hidden max-h-[calc(100vh-112px)] w-64 shrink-0 flex-col overflow-y-auto rounded-3xl border border-zinc-200/80 bg-white/80 p-4 shadow-sm lg:flex dark:border-white/10 dark:bg-[#11182a]">
          <AdminSidebarNav />
        </aside>

        <Drawer
          open={mobileMenuOpen}
          side="left"
          title="Menu Quản trị DHMQ"
          widthClass="max-w-xs"
          onClose={function () {
            setMobileMenuOpen(false)
          }}
        >
          <div className="flex h-full flex-col justify-between gap-6">
            <AdminSidebarNav
              onNavigate={function () {
                setMobileMenuOpen(false)
              }}
            />

            <div className="space-y-2 border-t border-zinc-200/80 pt-4 dark:border-white/10">
              {adminEmail !== '' && (
                <div className="flex items-center gap-2.5 px-2 pb-1">
                  <UserAvatar name={avatarSeed} size={32} />
                  <span className="truncate text-xs font-bold text-[#17203a] dark:text-[#e2e8f0]">
                    {adminEmail}
                  </span>
                </div>
              )}
              <Link
                to="/"
                onClick={function () {
                  setMobileMenuOpen(false)
                }}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white/80 px-4 py-2 text-xs font-bold text-[#17203a] transition hover:bg-zinc-100 dark:border-white/15 dark:bg-white/10 dark:text-[#e2e8f0] dark:hover:bg-white/15"
              >
                <span>Về trang mua sắm</span>
                <ArrowSquareOut size={15} weight="bold" />
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signOut.isPending}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-rose-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-rose-700 disabled:opacity-50 dark:bg-rose-500 dark:hover:bg-rose-600"
              >
                <SignOut size={15} weight="bold" />
                <span>Đăng xuất</span>
              </button>
            </div>
          </div>
        </Drawer>

        <main className="min-w-0 flex-1 space-y-5 pb-10">
          <section className="rounded-3xl border border-zinc-200/80 bg-white/80 p-5 shadow-sm md:p-6 dark:border-white/10 dark:bg-[#11182a]">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <h1 className="text-2xl font-extrabold tracking-tight text-[#17203a] md:text-3xl dark:text-[#e2e8f0]">
                  {props.title}
                </h1>
                <p className="mt-1 max-w-2xl text-sm text-zinc-600 dark:text-zinc-300">
                  {props.description}
                </p>
              </div>
              {props.actions !== undefined && (
                <div className="flex shrink-0 flex-wrap items-center gap-2.5">{props.actions}</div>
              )}
            </div>
          </section>

          <div>{props.children}</div>
        </main>
      </div>
    </div>
  )
}
