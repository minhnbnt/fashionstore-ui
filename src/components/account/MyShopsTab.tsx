import { Link } from 'react-router'

import { useGetMyShops } from '@generated/endpoints/seller-staff-roles/seller-staff-roles'
import {
  ArrowClockwise,
  ArrowRight,
  ClockCountdown,
  Crown,
  Key,
  Plus,
  Sparkle,
  Storefront,
  WarningCircle,
  WarningOctagon,
} from '@phosphor-icons/react'

import { takeData } from '@/lib/apiAdapters'
import { formatDateTime } from '@/lib/format'

import type { SellerShopMembershipResponse } from '@generated/model/sellerShopMembershipResponse'

interface MyShopsTabProps {
  onOpenRegisterModal: () => void
}

function getShopStatusBadge(status: string) {
  if (status === 'APPROVED') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100/80 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
        Đã duyệt
      </span>
    )
  }
  if (status === 'PENDING') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100/80 px-2.5 py-0.5 text-[11px] font-bold text-amber-900 dark:bg-amber-500/20 dark:text-amber-300">
        <ClockCountdown size={12} weight="bold" />
        Chờ duyệt eKYC
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100/80 px-2.5 py-0.5 text-[11px] font-bold text-rose-800 dark:bg-rose-500/20 dark:text-rose-300">
      <WarningOctagon size={12} weight="bold" />
      Bị từ chối
    </span>
  )
}

function getRoleBadge(membership: SellerShopMembershipResponse) {
  if (membership.role === 'OWNER') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500/10 to-orange-500/10 px-3 py-1 text-xs font-extrabold text-amber-800 ring-1 ring-amber-500/30 dark:from-amber-400/20 dark:to-orange-400/20 dark:text-amber-200 dark:ring-amber-400/30">
        <Crown size={14} weight="fill" className="text-amber-600 dark:text-amber-400" />
        Chủ gian hàng
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 ring-1 ring-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-400/20">
      <Key size={14} weight="bold" className="text-indigo-600 dark:text-indigo-400" />
      {membership.roleName}
    </span>
  )
}

function getMemberStatusBadge(status: string) {
  if (status === 'ACTIVE') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-sky-100/80 px-2.5 py-0.5 text-[11px] font-semibold text-sky-800 dark:bg-sky-500/20 dark:text-sky-300">
        Đang hoạt động
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-zinc-200 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-700 dark:bg-white/10 dark:text-zinc-400">
      Đã vô hiệu hóa
    </span>
  )
}

function canEnterShop(membership: SellerShopMembershipResponse): boolean {
  if (membership.shopStatus !== 'APPROVED') {
    return false
  }
  if (membership.memberStatus !== 'ACTIVE') {
    return false
  }
  return true
}

export default function MyShopsTab({ onOpenRegisterModal }: MyShopsTabProps) {
  const query = useGetMyShops()

  let shops: SellerShopMembershipResponse[] = []
  if (query.data !== undefined) {
    const raw = takeData(query.data)
    if (Array.isArray(raw)) {
      shops = raw
    }
  }

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
              Gian hàng của tôi
            </h2>
            {query.isLoading === false && shops.length > 0 && (
              <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-extrabold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                {shops.length}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Quản lý tất cả gian hàng bạn sở hữu hoặc tham gia vận hành với tư cách nhân viên
          </p>
        </div>

        <button
          type="button"
          id="btn-register-more-shop"
          onClick={onOpenRegisterModal}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-2.5 text-xs font-bold text-orange-700 transition hover:bg-orange-100 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300 dark:hover:bg-orange-500/20"
        >
          <Plus size={14} weight="bold" />
          <span>Đăng ký thêm shop mới</span>
        </button>
      </div>

      {/* Loading State */}
      {query.isLoading && (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
          <ArrowClockwise size={28} className="animate-spin text-indigo-600 dark:text-indigo-400" />
          <p className="mt-3 text-xs font-medium">Đang tải danh sách gian hàng…</p>
        </div>
      )}

      {/* Error State */}
      {query.isError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          <div className="flex items-center justify-between">
            <span>Không thể tải danh sách gian hàng lúc này.</span>
            <button
              type="button"
              onClick={function () {
                void query.refetch()
              }}
              className="font-bold underline hover:no-underline"
            >
              Thử lại
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {query.isLoading === false && query.isError !== true && shops.length === 0 && (
        <div
          id="empty-my-shops"
          className="rounded-3xl border border-dashed border-zinc-200 bg-gradient-to-br from-zinc-50/50 via-white to-orange-50/30 p-8 text-center dark:border-zinc-800 dark:from-zinc-900/50 dark:via-zinc-900/30 dark:to-orange-950/10"
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400">
            <Storefront size={28} weight="bold" />
          </div>
          <h3 className="mt-4 text-base font-extrabold text-zinc-900 dark:text-white">
            Bạn chưa tham gia gian hàng nào
          </h3>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            Khởi tạo gian hàng thời trang độc bản trên nét để tiếp cận cộng đồng mua sắm trẻ trung,
            hoặc liên hệ chủ shop để nhận thư mời làm nhân viên vận hành.
          </p>
          <div className="mt-5">
            <button
              type="button"
              onClick={onOpenRegisterModal}
              className="btn-primary inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-xs font-bold shadow-md shadow-orange-500/20"
            >
              <Sparkle size={14} weight="fill" />
              <span>Đăng ký mở Shop ngay</span>
              <ArrowRight size={14} weight="bold" />
            </button>
          </div>
        </div>
      )}

      {/* Shop Cards Grid */}
      {query.isLoading === false && shops.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {shops.map(function (shop) {
            const canEnter = canEnterShop(shop)

            return (
              <div
                key={shop.shopId}
                className="group flex flex-col justify-between rounded-3xl border border-zinc-200/80 bg-white/70 p-6 backdrop-blur-md transition-all hover:border-indigo-300 hover:shadow-lg dark:border-white/10 dark:bg-zinc-900/60 dark:hover:border-indigo-500/40"
              >
                <div>
                  {/* Top Bar: Role & Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {getRoleBadge(shop)}
                      {shop.role === 'STAFF' && getMemberStatusBadge(shop.memberStatus)}
                    </div>
                    <div>{getShopStatusBadge(shop.shopStatus)}</div>
                  </div>

                  {/* Shop Details */}
                  <div className="mt-4 flex items-start gap-3.5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 to-sky-500 font-extrabold text-white shadow-md shadow-indigo-500/20">
                      {shop.shopName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-base font-extrabold text-zinc-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
                        {shop.shopName}
                      </h3>
                      <p className="truncate font-mono text-xs text-zinc-400 dark:text-zinc-500">
                        net.vn/shop/{shop.shopSlug}
                      </p>
                      <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                        Tham gia: {formatDateTime(shop.joinedAt)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer / Action */}
                <div className="mt-6 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                  {canEnter && (
                    <Link
                      to={`/shop?shopId=${shop.shopId}`}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                    >
                      <Storefront size={16} weight="bold" />
                      <span>Vào Kênh Người Bán</span>
                      <ArrowRight size={14} weight="bold" />
                    </Link>
                  )}

                  {shop.shopStatus === 'PENDING' && (
                    <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
                      <ClockCountdown size={16} weight="bold" className="shrink-0" />
                      <span>Hồ sơ đang chờ nét phê duyệt định danh (1-3 ngày làm việc).</span>
                    </div>
                  )}

                  {shop.shopStatus === 'REJECTED' && (
                    <div className="flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
                      <WarningCircle size={16} weight="bold" className="shrink-0" />
                      <span>Hồ sơ mở shop bị từ chối. Vui lòng kiểm tra lại thông tin eKYC.</span>
                    </div>
                  )}

                  {shop.shopStatus === 'APPROVED' && shop.memberStatus !== 'ACTIVE' && (
                    <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                      <WarningCircle size={16} weight="bold" className="shrink-0" />
                      <span>Tài khoản của bạn đã bị vô hiệu hóa tại gian hàng này.</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
