import { useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router'

import { useGetAdminStats } from '@generated/endpoints/admin-stats/admin-stats'
import {
  ArrowSquareOut,
  CalendarBlank,
  ChartBar,
  GearSix,
  Package,
  Prohibit,
  Receipt,
  SignOut,
  SquaresFour,
  Storefront,
  Users,
} from '@phosphor-icons/react'

import NotificationBell from '@/components/NotificationBell'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import ThemeToggle from '@/components/ui/ThemeToggle'
import WorkspaceShell from '@/components/ui/WorkspaceShell'
import UserAvatar from '@/components/UserAvatar'
import { useSignOut } from '@/hooks/useAuthMutations'
import { useSessionQuery } from '@/hooks/useSession'
import { takeData } from '@/lib/api/apiAdapters'
import { notify } from '@/lib/notifications'
import {
  cn,
  dangerButtonClass,
  FOCUS_RING_CLASS,
  secondaryButtonClass,
  sectionLabelClass,
  sidebarItemClass,
} from '@/lib/ui/styles'

import type { BreadcrumbItem } from '@/components/ui/Breadcrumb'
import type { Icon } from '@phosphor-icons/react'

type QueueBadgeKey = 'pendingShops' | 'openProductReports' | 'pendingOrders'

interface AdminNavItem {
  to: string
  label: string
  icon: Icon
  end: boolean
  badgeKey?: QueueBadgeKey
  badgeTone?: 'warning' | 'danger'
}

interface AdminNavGroup {
  title: string
  items: AdminNavItem[]
}

interface QueueCounts {
  pendingShops: number
  openProductReports: number
  pendingOrders: number
}

const NAV_GROUPS: AdminNavGroup[] = [
  {
    title: 'TỔNG QUAN',
    items: [{ to: '/admin', label: 'Tổng quan', icon: ChartBar, end: true }],
  },
  {
    title: 'VẬN HÀNH SÀN',
    items: [
      {
        to: '/admin/shops',
        label: 'Gian hàng',
        icon: Storefront,
        end: false,
        badgeKey: 'pendingShops',
        badgeTone: 'warning',
      },
      { to: '/admin/users', label: 'Tài khoản', icon: Users, end: false },
      {
        to: '/admin/orders',
        label: 'Đơn hàng',
        icon: Receipt,
        end: false,
        badgeKey: 'pendingOrders',
        badgeTone: 'warning',
      },
    ],
  },
  {
    title: 'KIỂM DUYỆT',
    items: [
      {
        to: '/admin/products',
        label: 'Sản phẩm',
        icon: Package,
        end: true,
        badgeKey: 'openProductReports',
        badgeTone: 'danger',
      },
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

function formatBadgeCount(count: number): string {
  if (count > 99) {
    return '99+'
  }
  return String(count)
}

function navBadgeClass(isActive: boolean, tone: 'warning' | 'danger' | undefined): string {
  const base = 'ml-auto shrink-0 rounded-full px-2 py-0.5 text-[11px] font-extrabold tabular-nums'
  if (isActive) {
    return cn(base, 'bg-white/20 text-white')
  }
  if (tone === 'danger') {
    return cn(base, 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300')
  }
  return cn(base, 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300')
}

function deriveAdminBreadcrumbs(pathname: string, pageTitle: string): BreadcrumbItem[] {
  const root: BreadcrumbItem = { label: 'Quản trị', to: '/admin' }

  if (pathname === '/admin' || pathname === '/admin/') {
    return [root, { label: 'Tổng quan' }]
  }
  if (pathname === '/admin/shops') {
    return [root, { label: 'Gian hàng' }]
  }
  if (pathname.startsWith('/admin/shops/')) {
    return [root, { label: 'Gian hàng', to: '/admin/shops' }, { label: pageTitle }]
  }
  if (pathname === '/admin/users') {
    return [root, { label: 'Tài khoản' }]
  }
  if (pathname.startsWith('/admin/users/')) {
    return [root, { label: 'Tài khoản', to: '/admin/users' }, { label: pageTitle }]
  }
  if (pathname === '/admin/orders') {
    return [root, { label: 'Đơn hàng' }]
  }
  if (pathname === '/admin/products') {
    return [root, { label: 'Sản phẩm' }]
  }
  if (pathname === '/admin/products/keywords') {
    return [root, { label: 'Sản phẩm', to: '/admin/products' }, { label: 'Từ khóa cấm' }]
  }
  if (pathname === '/admin/content') {
    return [root, { label: 'Nội dung sàn' }]
  }
  if (pathname === '/admin/holidays') {
    return [root, { label: 'Lịch nghỉ lễ' }]
  }
  if (pathname === '/admin/settings') {
    return [root, { label: 'Cấu hình hệ thống' }]
  }
  return [root, { label: pageTitle }]
}

function AdminSidebarNav(props: { counts: QueueCounts; onNavigate?: () => void }) {
  return (
    <nav aria-label="Điều hướng quản trị" className="space-y-5">
      {NAV_GROUPS.map(function (group) {
        return (
          <div key={group.title} className="space-y-1.5">
            <p className={cn(sectionLabelClass(), 'px-3 text-[11px]')}>{group.title}</p>
            <div className="space-y-1">
              {group.items.map(function (item) {
                const ItemIcon = item.icon
                let badgeCount = 0
                if (item.badgeKey !== undefined) {
                  badgeCount = props.counts[item.badgeKey]
                }
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
                    {function ({ isActive }) {
                      return (
                        <>
                          <ItemIcon size={18} weight="bold" className="shrink-0" />
                          <span className="truncate">{item.label}</span>
                          {badgeCount > 0 && (
                            <span
                              aria-label={`${badgeCount} mục cần xử lý`}
                              className={navBadgeClass(isActive, item.badgeTone)}
                            >
                              {formatBadgeCount(badgeCount)}
                            </span>
                          )}
                        </>
                      )
                    }}
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
  breadcrumbs?: BreadcrumbItem[]
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [confirmSignOutOpen, setConfirmSignOutOpen] = useState(false)
  const location = useLocation()
  const { data: session } = useSessionQuery()
  const signOut = useSignOut()
  const navigate = useNavigate()
  const statsQuery = useGetAdminStats({ query: { staleTime: 60_000 } })

  const queueCounts: QueueCounts = {
    pendingShops: 0,
    openProductReports: 0,
    pendingOrders: 0,
  }
  if (statsQuery.isSuccess && statsQuery.data.status === 200) {
    const stats = takeData(statsQuery.data)
    queueCounts.pendingShops = stats.pendingShops ?? 0
    queueCounts.openProductReports = stats.openProductReports ?? 0
    queueCounts.pendingOrders = stats.pendingOrders ?? 0
  }

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

  function requestSignOut() {
    setMobileMenuOpen(false)
    setConfirmSignOutOpen(true)
  }

  function confirmSignOut() {
    signOut.mutate(undefined, {
      onSuccess: function () {
        setConfirmSignOutOpen(false)
        notify.success('Đã đăng xuất', 'Phiên quản trị đã kết thúc.')
        void navigate('/', { replace: true })
      },
      onError: function (err) {
        notify.fromError(err, undefined, 'Không thể đăng xuất. Vui lòng thử lại.')
      },
    })
  }

  const breadcrumbs = props.breadcrumbs ?? deriveAdminBreadcrumbs(location.pathname, props.title)

  const brandSlot = (
    <Link
      to="/admin"
      className={cn('flex cursor-pointer items-center gap-2.5 rounded-full', FOCUS_RING_CLASS)}
    >
      <span className="flex items-center gap-1 text-2xl font-extrabold tracking-tighter text-[#17203a] dark:text-[#e2e8f0]">
        <span>DHMQ</span>
        <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-[#312e81] via-[#1d4ed8] to-[#38bdf8]" />
      </span>
      <span className="rounded-full bg-gradient-to-r from-[#312e81] via-[#1d4ed8] to-[#38bdf8] px-2.5 py-0.5 text-[11px] font-extrabold tracking-wider text-white uppercase shadow-xs">
        Admin
      </span>
    </Link>
  )

  const topbarActions = (
    <>
      <NotificationBell categories={['ORDER', 'ACTIVITY']} />

      <ThemeToggle
        className={cn(
          'relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-zinc-600 transition hover:bg-sky-100 hover:text-[#17203a] dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-white',
          FOCUS_RING_CLASS,
        )}
      />

      <Link
        to="/"
        className={cn(
          'hidden cursor-pointer items-center gap-1.5 rounded-full border border-zinc-300 bg-white/85 px-3.5 py-2 text-xs font-bold text-[#17203a] transition hover:border-blue-600 hover:text-blue-700 sm:inline-flex dark:border-white/15 dark:bg-white/10 dark:text-[#e2e8f0] dark:hover:border-sky-400 dark:hover:text-sky-300',
          FOCUS_RING_CLASS,
        )}
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
        onClick={requestSignOut}
        disabled={signOut.isPending}
        aria-label="Đăng xuất"
        title="Đăng xuất"
        className={cn(
          'inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full border border-zinc-300 bg-white/85 px-3 text-xs font-bold text-rose-600 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:bg-white/10 dark:text-rose-400 dark:hover:bg-rose-500/15',
          FOCUS_RING_CLASS,
        )}
      >
        <SignOut size={16} weight="bold" />
        <span className="hidden xl:inline">Đăng xuất</span>
      </button>
    </>
  )

  const mobileDrawerContent = (
    <div className="flex h-full flex-col justify-between gap-6">
      <AdminSidebarNav
        counts={queueCounts}
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
          className={cn(secondaryButtonClass(), 'w-full text-xs')}
        >
          <span>Về trang mua sắm</span>
          <ArrowSquareOut size={15} weight="bold" />
        </Link>
        <button
          type="button"
          onClick={requestSignOut}
          disabled={signOut.isPending}
          className={cn(dangerButtonClass(), 'w-full text-xs')}
        >
          <SignOut size={15} weight="bold" />
          <span>Đăng xuất</span>
        </button>
      </div>
    </div>
  )

  return (
    <>
      <WorkspaceShell
        brandSlot={brandSlot}
        topbarActions={topbarActions}
        sidebarContent={<AdminSidebarNav counts={queueCounts} />}
        mobileDrawerTitle="Menu Quản trị DHMQ"
        mobileDrawerContent={mobileDrawerContent}
        mobileMenuOpen={mobileMenuOpen}
        onOpenMobileMenu={function () {
          setMobileMenuOpen(true)
        }}
        onCloseMobileMenu={function () {
          setMobileMenuOpen(false)
        }}
        mobileMenuAriaLabel="Mở menu quản trị"
        breadcrumbs={breadcrumbs}
        pageTitle={props.title}
        pageDescription={props.description}
        pageActions={props.actions}
      >
        {props.children}
      </WorkspaceShell>

      <ConfirmDialog
        open={confirmSignOutOpen}
        title="Đăng xuất phiên quản trị?"
        description="Phiên làm việc hiện tại sẽ kết thúc và bạn sẽ được chuyển về trang mua sắm."
        confirmLabel="Đăng xuất"
        variant="danger"
        isPending={signOut.isPending}
        onConfirm={confirmSignOut}
        onCancel={function () {
          setConfirmSignOutOpen(false)
        }}
      />
    </>
  )
}
