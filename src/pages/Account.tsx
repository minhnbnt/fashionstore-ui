import { useState } from 'react'
import { useNavigate } from 'react-router'

import {
  ArrowClockwise,
  ArrowRight,
  CheckCircle,
  ClockCountdown,
  SignOut,
  Sparkle,
  Storefront,
} from '@phosphor-icons/react'

import { useMine } from '@generated/endpoints/shops/shops'
import { takeData } from '@/lib/apiAdapters'

import ChangePasswordForm from '../components/ChangePasswordForm'
import ShopRegistrationModal from '../components/ShopRegistrationModal'
import UserAvatar from '../components/UserAvatar'
import { useSignOut } from '../hooks/useAuthMutations'
import { useSessionQuery } from '../hooks/useSession'

import type { ShopResponse } from '@generated/model/shopResponse'

export default function Account() {
  const { data: session } = useSessionQuery()
  const signOut = useSignOut()
  const navigate = useNavigate()
  const [modalOpen, setModalOpen] = useState(false)
  const [statusNotice, setStatusNotice] = useState<string | null>(null)

  const mineQuery = useMine({
    query: {
      enabled: session !== null && session !== undefined,
    },
  })

  let shops: ShopResponse[] = []
  if (mineQuery.data !== undefined) {
    const raw = takeData(mineQuery.data)
    if (Array.isArray(raw)) {
      shops = raw
    }
  }

  let currentShop: ShopResponse | null = null
  if (shops.length > 0) {
    currentShop = shops[0] || null
  }

  function handleSignOut() {
    signOut.mutate(undefined, {
      onSuccess: function () {
        void navigate('/', { replace: true })
      },
    })
  }

  function handleShopCreated() {
    setModalOpen(false)
    setStatusNotice('Đăng ký mở shop thành công! Hồ sơ đang ở trạng thái chờ duyệt.')
    void mineQuery.refetch()
  }

  function handleCheckStatus() {
    void mineQuery.refetch()
    setStatusNotice('Đã cập nhật trạng thái mới nhất từ hệ thống.')
    setTimeout(function () {
      setStatusNotice(null)
    }, 4000)
  }

  let userEmail = ''
  if (session !== null && session !== undefined && session.user.email) {
    userEmail = session.user.email
  }

  return (
    <main className="mx-auto max-w-[1400px] px-4 pt-[100px] pb-16">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Account Profile & Preferences */}
        <div className="glass rounded-3xl p-6 md:p-8 lg:col-span-5">
          <p className="text-xs font-bold tracking-[0.18em] text-indigo-900 uppercase dark:text-indigo-200">
            Tài khoản cá nhân
          </p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tighter">Hồ sơ của tôi</h1>

          {session !== undefined && session !== null && (
            <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white/70 p-4 dark:bg-white/10">
              <UserAvatar name={userEmail || 'guest'} size={48} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-zinc-800 dark:text-zinc-100">
                  {userEmail}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Khách hàng thành viên</p>
              </div>
            </div>
          )}

          <div className="mt-5 space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-2xl bg-white/70 px-4 py-3 dark:bg-white/10">
              <span className="font-medium">Đơn hàng đã mua</span>
              <span className="text-xs text-zinc-400 dark:text-zinc-500">0 đơn</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-white/70 px-4 py-3 dark:bg-white/10">
              <span className="font-medium">Mã ưu đãi nét</span>
              <span className="text-xs text-zinc-400 dark:text-zinc-500">2 voucher</span>
            </div>
            <ChangePasswordForm />
          </div>

          <button
            type="button"
            id="btn-account-logout"
            onClick={handleSignOut}
            disabled={signOut.isPending}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border border-red-200 py-3 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-500/30 dark:hover:bg-red-500/10"
          >
            <SignOut size={16} weight="bold" />
            {signOut.isPending && <span>Đang đăng xuất…</span>}
            {signOut.isPending === false && <span>Đăng xuất</span>}
          </button>
        </div>

        {/* Right Column: Seller Center / Shop Registration */}
        <div id="seller-channel" className="glass rounded-3xl p-6 md:p-8 lg:col-span-7">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold tracking-[0.18em] text-orange-600 uppercase dark:text-orange-400">
                Kênh Người Bán
              </p>
              <h2 className="mt-1 text-2xl font-extrabold tracking-tighter">
                Quản lý Gian Hàng & Mở Shop
              </h2>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-300">
              <Storefront size={26} weight="bold" />
            </div>
          </div>

          {statusNotice !== null && (
            <div
              id="account-status-notice"
              className="mt-4 rounded-2xl bg-sky-50 px-4 py-3 text-xs font-semibold text-sky-800 dark:bg-sky-500/10 dark:text-sky-300"
            >
              {statusNotice}
            </div>
          )}

          {/* Case 1: Loading state */}
          {mineQuery.isLoading && (
            <div className="mt-6 flex items-center justify-center py-12 text-sm text-zinc-500">
              <ArrowClockwise size={20} className="mr-2 animate-spin text-orange-600" />
              <span>Đang kiểm tra hồ sơ gian hàng…</span>
            </div>
          )}

          {/* Case 2: No shop yet -> Register CTA */}
          {mineQuery.isLoading === false && currentShop === null && (
            <div
              id="card-no-shop"
              className="mt-6 rounded-3xl border border-orange-200/80 bg-gradient-to-br from-orange-50/70 via-white to-amber-50/50 p-6 dark:border-orange-500/20 dark:bg-zinc-800/60"
            >
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-xs font-extrabold text-orange-700 dark:bg-orange-500/20 dark:text-orange-300">
                  <Sparkle size={12} weight="fill" />
                  Miễn phí đăng ký
                </span>
                <span className="text-xs text-zinc-400">Theo chuẩn Shopee</span>
              </div>
              <h3 className="mt-3 text-xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                Bắt đầu kinh doanh thời trang cùng nét
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                Mở shop để tiếp cận hàng triệu khách hàng trẻ. Hệ thống cung cấp đầy đủ 11 phân hệ
                chuyên nghiệp: Quản lý sản phẩm & biến thể, Xử lý đơn hàng, Quản lý kho, Doanh thu,
                Trang trí gian hàng kéo-thả, và Phân quyền nhân viên.
              </p>
              <div className="mt-6">
                <button
                  type="button"
                  id="btn-open-shop-registration"
                  onClick={function () {
                    setModalOpen(true)
                  }}
                  className="btn-primary flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold shadow-lg shadow-orange-500/20"
                >
                  <Storefront size={18} weight="bold" />
                  <span>Đăng ký mở Shop ngay</span>
                  <ArrowRight size={16} weight="bold" />
                </button>
              </div>
            </div>
          )}

          {/* Case 3: Shop is in PENDING state */}
          {mineQuery.isLoading === false && currentShop !== null && currentShop.status === 'PENDING' && (
            <div
              id="card-shop-pending"
              className="mt-6 rounded-3xl border border-amber-300 bg-amber-50/60 p-6 dark:border-amber-500/30 dark:bg-amber-500/10"
            >
              <div className="flex items-center justify-between">
                <span
                  id="badge-shop-status-pending"
                  className="flex items-center gap-1.5 rounded-full bg-amber-200/80 px-3 py-1 text-xs font-extrabold text-amber-900 dark:bg-amber-400/20 dark:text-amber-200"
                >
                  <ClockCountdown size={14} weight="bold" />
                  ĐANG CHỜ DUYỆT HỒ SƠ (PENDING)
                </span>
                <button
                  type="button"
                  id="btn-check-shop-status"
                  onClick={handleCheckStatus}
                  className="flex items-center gap-1 text-xs font-bold text-amber-800 hover:underline dark:text-amber-300"
                >
                  <ArrowClockwise size={14} />
                  Làm mới
                </button>
              </div>

              <h3 className="mt-4 text-xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                {currentShop.name}
              </h3>
              <p className="mt-1 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                net.vn/shop/{currentShop.slug}
              </p>

              {currentShop.description && (
                <p className="mt-3 whitespace-pre-line text-xs text-zinc-600 dark:text-zinc-300">
                  {currentShop.description}
                </p>
              )}

              <div className="mt-5 rounded-2xl bg-white/80 p-4 text-xs text-zinc-600 dark:bg-zinc-900/60 dark:text-zinc-300">
                <p className="font-bold text-amber-900 dark:text-amber-200">
                  Hồ sơ mở gian hàng đã được tiếp nhận
                </p>
                <p className="mt-1 leading-relaxed">
                  Ban quản trị nét đang tiến hành xác minh thông tin gian hàng. Sau khi được duyệt, nút
                  truy cập Kênh Người Bán sẽ tự động kích hoạt.
                </p>
              </div>

              {/* Admin Approval Command Helper Box */}
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-100/60 p-3 text-xs text-amber-950 dark:border-amber-500/20 dark:bg-amber-950/40 dark:text-amber-200">
                <p className="font-bold">Lệnh duyệt mở shop qua CLI (dành cho Admin):</p>
                <code
                  id="cmd-approve-shop"
                  className="mt-1 block overflow-x-auto rounded-lg bg-black/80 p-2 font-mono text-[11px] text-green-300"
                >
                  UPDATE shop SET status = 'APPROVED', approved_at = now() WHERE id = '
                  {currentShop.id}';
                </code>
              </div>
            </div>
          )}

          {/* Case 4: Shop is in APPROVED state */}
          {mineQuery.isLoading === false && currentShop !== null && currentShop.status === 'APPROVED' && (
            <div
              id="card-shop-approved"
              className="mt-6 rounded-3xl border border-emerald-300 bg-emerald-50/70 p-6 dark:border-emerald-500/30 dark:bg-emerald-500/10"
            >
              <div className="flex items-center justify-between">
                <span
                  id="badge-shop-status-approved"
                  className="flex items-center gap-1.5 rounded-full bg-emerald-200/80 px-3 py-1 text-xs font-extrabold text-emerald-900 dark:bg-emerald-400/20 dark:text-emerald-200"
                >
                  <CheckCircle size={14} weight="fill" />
                  SHOP ĐÃ ĐƯỢC DUYỆT THÀNH CÔNG (APPROVED)
                </span>
              </div>

              <h3 className="mt-4 text-xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                {currentShop.name}
              </h3>
              <p className="mt-1 font-mono text-xs text-emerald-700 dark:text-emerald-400">
                net.vn/shop/{currentShop.slug}
              </p>

              {currentShop.description && (
                <p className="mt-3 whitespace-pre-line text-xs text-zinc-600 dark:text-zinc-300">
                  {currentShop.description}
                </p>
              )}

              <p className="mt-4 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                Chúc mừng! Gian hàng của bạn đã chính thức hoạt động trên sàn nét. Hãy truy cập ngay
                Kênh Người Bán để đăng tải sản phẩm, quản lý kho và xử lý các đơn hàng đầu tiên.
              </p>

              <div className="mt-6">
                <button
                  type="button"
                  id="btn-access-seller-center"
                  onClick={function () {
                    void navigate('/shop')
                  }}
                  className="flex items-center gap-2 rounded-full bg-emerald-700 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-700/25 transition hover:bg-emerald-800"
                >
                  <Storefront size={18} weight="bold" />
                  <span>Vào Kênh Người Bán (Shopee Seller Center)</span>
                  <ArrowRight size={16} weight="bold" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Shop Registration Modal */}
      <ShopRegistrationModal
        isOpen={modalOpen}
        userEmail={userEmail}
        onClose={function () {
          setModalOpen(false)
        }}
        onSuccess={handleShopCreated}
      />
    </main>
  )
}
