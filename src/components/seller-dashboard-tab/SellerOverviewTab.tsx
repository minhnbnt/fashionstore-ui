import {
  Package,
  Receipt,
  ArrowBendDownLeft,
  WarningCircle,
  ChartLineUp,
  Users,
  Percent,
  PlusCircle,
  ChatCircleDots,
  PaintBrushBroad,
  Wallet,
  CaretRight,
} from '@phosphor-icons/react'

import { formatVnd } from '../../lib/format'

interface Props {
  onNavigateTab: (tabId: string) => void
  shopName: string
  pendingOrdersCount: number
  confirmedOrdersCount: number
  pendingReturnsCount: number
  lowStockCount: number
}

export default function SellerOverviewTab({
  onNavigateTab,
  shopName,
  pendingOrdersCount,
  confirmedOrdersCount,
  pendingReturnsCount,
  lowStockCount,
}: Props) {
  const todoItems = [
    {
      label: 'Chờ xác nhận',
      count: pendingOrdersCount,
      tab: 'orders',
      icon: Receipt,
      color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40',
    },
    {
      label: 'Chờ giao hàng',
      count: confirmedOrdersCount,
      tab: 'orders',
      icon: Package,
      color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40',
    },
    {
      label: 'Đổi/Trả cần duyệt',
      count: pendingReturnsCount,
      tab: 'returns',
      icon: ArrowBendDownLeft,
      color: 'text-red-500 bg-red-50 dark:bg-red-950/40',
    },
    {
      label: 'Sản phẩm hết/sắp hết',
      count: lowStockCount,
      tab: 'inventory',
      icon: WarningCircle,
      color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40',
    },
  ]

  const metrics = [
    {
      label: 'Doanh số hôm nay',
      value: formatVnd(3720000),
      change: '+18.5% so với hôm qua',
      icon: ChartLineUp,
    },
    {
      label: 'Đơn hàng mới',
      value: '14 đơn',
      change: '+4 đơn so với hôm qua',
      icon: Receipt,
    },
    {
      label: 'Lượt truy cập shop',
      value: '1,280 lượt',
      change: '+240 lượt',
      icon: Users,
    },
    {
      label: 'Tỉ lệ chuyển đổi',
      value: '3.8%',
      change: 'Mục tiêu: > 3.0%',
      icon: Percent,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Banner Chào mừng */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900 via-blue-700 to-sky-400 p-6 text-white shadow-xl">
        <div className="relative z-10 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold tracking-wider uppercase backdrop-blur-md">
                Shop Yêu Thích ⭐
              </span>
              <span className="text-xs text-white/80">Điểm vận hành: 4.9/5.0</span>
            </div>
            <h2 className="mt-2 text-2xl font-black tracking-tight">Xin chào, {shopName}!</h2>
            <p className="mt-1 text-sm text-white/90">
              Hôm nay bạn có {pendingOrdersCount} đơn hàng mới cần xác nhận và {pendingReturnsCount}{' '}
              yêu cầu đổi trả cần xử lý.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={function () {
                onNavigateTab('products')
              }}
              className="flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-bold text-indigo-600 shadow-md transition hover:bg-indigo-50 dark:bg-[#11182a] dark:text-indigo-400"
            >
              <PlusCircle size={18} weight="bold" />
              Thêm sản phẩm mới
            </button>
            <button
              type="button"
              onClick={function () {
                onNavigateTab('chat')
              }}
              className="flex items-center gap-2 rounded-2xl bg-white/20 px-4 py-2.5 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white/30"
            >
              <ChatCircleDots size={18} weight="bold" />
              Tin nhắn khách
            </button>
          </div>
        </div>
      </div>

      {/* Việc cần làm (To-Do List) */}
      <div className="rounded-3xl border border-zinc-200/80 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-[#11182a]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
              Danh sách việc cần làm
            </h3>
            <p className="text-xs text-zinc-500">
              Các việc bạn cần xử lý ngay để bảo đảm trải nghiệm cho người mua
            </p>
          </div>
          <button
            type="button"
            onClick={function () {
              onNavigateTab('orders')
            }}
            className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline dark:text-indigo-400"
          >
            Xem tất cả đơn
            <CaretRight size={12} weight="bold" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {todoItems.map(function (item) {
            return (
              <button
                key={item.label}
                type="button"
                onClick={function () {
                  onNavigateTab(item.tab)
                }}
                className="group flex flex-col items-center justify-center rounded-2xl border border-zinc-100 p-4 text-center transition hover:border-indigo-200 hover:bg-indigo-50/30 dark:border-white/10 dark:hover:border-indigo-900/40 dark:hover:bg-indigo-900/20"
              >
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl ${item.color}`}
                >
                  <item.icon size={22} weight="bold" />
                </div>
                <span className="mt-3 text-2xl font-extrabold text-zinc-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
                  {item.count}
                </span>
                <span className="mt-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Chỉ số hôm nay */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map(function (m) {
          return (
            <div
              key={m.label}
              className="rounded-3xl border border-zinc-200/80 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-[#11182a]"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500">{m.label}</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40">
                  <m.icon size={18} weight="bold" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-black text-zinc-900 dark:text-white">{m.value}</p>
              <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">{m.change}</p>
            </div>
          )
        })}
      </div>

      {/* Lối tắt nghiệp vụ */}
      <div className="rounded-3xl border border-zinc-200/80 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-[#11182a]">
        <h3 className="text-base font-bold text-zinc-900 dark:text-white">
          Truy cập nhanh các chức năng
        </h3>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <button
            type="button"
            onClick={function () {
              onNavigateTab('revenue')
            }}
            className="flex items-center gap-3 rounded-2xl border border-zinc-100 p-3.5 text-left transition hover:bg-zinc-50 dark:border-white/10 dark:hover:bg-white/10"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40">
              <Wallet size={20} weight="bold" />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-900 dark:text-white">Ví người bán</p>
              <p className="text-[11px] text-zinc-500">Rút tiền & quyết toán</p>
            </div>
          </button>

          <button
            type="button"
            onClick={function () {
              onNavigateTab('decoration')
            }}
            className="flex items-center gap-3 rounded-2xl border border-zinc-100 p-3.5 text-left transition hover:bg-zinc-50 dark:border-white/10 dark:hover:bg-white/10"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40">
              <PaintBrushBroad size={20} weight="bold" />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-900 dark:text-white">Trang trí Shop</p>
              <p className="text-[11px] text-zinc-500">Giao diện kéo-thả</p>
            </div>
          </button>

          <button
            type="button"
            onClick={function () {
              onNavigateTab('chat')
            }}
            className="flex items-center gap-3 rounded-2xl border border-zinc-100 p-3.5 text-left transition hover:bg-zinc-50 dark:border-white/10 dark:hover:bg-white/10"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950/40">
              <ChatCircleDots size={20} weight="bold" />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-900 dark:text-white">Tin nhắn tự động</p>
              <p className="text-[11px] text-zinc-500">Auto-reply CSKH</p>
            </div>
          </button>

          <button
            type="button"
            onClick={function () {
              onNavigateTab('staff')
            }}
            className="flex items-center gap-3 rounded-2xl border border-zinc-100 p-3.5 text-left transition hover:bg-zinc-50 dark:border-white/10 dark:hover:bg-white/10"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40">
              <Users size={20} weight="bold" />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-900 dark:text-white">Phân quyền</p>
              <p className="text-[11px] text-zinc-500">Nhân viên & vai trò</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
