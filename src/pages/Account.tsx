import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'

import { getMineQueryKey, useMine, useResubmitShop } from '@generated/endpoints/shops/shops'
import { useMe } from '@generated/endpoints/users/users'
import {
  ArrowClockwise,
  ArrowRight,
  Bank,
  CheckCircle,
  ClockCountdown,
  IdentificationCard,
  MapPin,
  PaperPlaneTilt,
  ShieldCheck,
  ShieldWarning,
  SignOut,
  Sparkle,
  Storefront,
  WarningOctagon,
} from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import { adminErrorMessage } from '@/lib/admin'
import { takeData } from '@/lib/apiAdapters'
import { getRoleFromSession, refreshAuthSession } from '@/lib/auth'

import AddressBook from '../components/AddressBook'
import StatusBadge from '../components/admin/StatusBadge'
import ChangePasswordForm from '../components/ChangePasswordForm'
import ShopKycRegistrationModal from '../components/ShopKycRegistrationModal'
import UserAvatar from '../components/UserAvatar'
import { useSignOut } from '../hooks/useAuthMutations'
import { useSessionQuery } from '../hooks/useSession'

import type { ShopResponse } from '@generated/model/shopResponse'
import type { UserResponse } from '@generated/model/userResponse'

function maskId(idNum: string | null | undefined): string {
  if (idNum === null || idNum === undefined || idNum.trim() === '') {
    return 'Chưa cung cấp'
  }
  if (idNum.length <= 4) {
    return idNum
  }
  const prefix = idNum.slice(0, 4)
  const suffix = idNum.slice(-2)
  return prefix + '******' + suffix
}

function formatSellerType(sellerType: string | null | undefined): string {
  if (sellerType === 'CORPORATE') {
    return 'Doanh nghiệp / Hộ kinh doanh'
  }
  return 'Cá nhân'
}

export default function Account() {
  const { data: session } = useSessionQuery()
  const signOut = useSignOut()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [statusNotice, setStatusNotice] = useState<string | null>(null)
  const [resubmitId, setResubmitId] = useState<string | null>(null)
  const roleRefreshAttempted = useRef(false)

  const profileQuery = useMe()
  let profile: UserResponse | undefined
  if (profileQuery.data !== undefined) {
    profile = takeData(profileQuery.data)
  }

  useEffect(() => {
    if (profile?.role !== 'SHOP' || session === undefined || session === null) {
      return
    }
    if (getRoleFromSession(session) !== 'customer' || roleRefreshAttempted.current) {
      return
    }
    roleRefreshAttempted.current = true
    void refreshAuthSession().catch(function () {
      roleRefreshAttempted.current = false
    })
  }, [profile?.role, session])

  const mineQuery = useMine({
    query: {
      enabled: session !== null && session !== undefined && profile?.status === 'ACTIVE',
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

  const resubmit = useResubmitShop({
    mutation: {
      onSuccess: function () {
        setStatusNotice('Hồ sơ đã được gửi duyệt lại và xếp cuối hàng đợi.')
        setResubmitId(null)
        void queryClient.invalidateQueries({ queryKey: getMineQueryKey() })
      },
    },
  })

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

  function handleResubmit(shop: ShopResponse) {
    if (shop.id === undefined) {
      return
    }
    setStatusNotice(null)
    setResubmitId(shop.id)
    resubmit.mutate({ id: shop.id })
  }

  let userEmail = ''
  if (session !== null && session !== undefined && session.user.email) {
    userEmail = session.user.email
  }

  return (
    <main className="mx-auto max-w-[1400px] px-4 pt-[100px] pb-16">
      {profile?.status === 'LOCKED' && (
        <section className="mb-6 rounded-3xl border border-red-200 bg-red-50 p-5 dark:border-red-400/20 dark:bg-red-500/10">
          <div className="flex items-start gap-3">
            <ShieldWarning
              size={24}
              weight="bold"
              className="shrink-0 text-red-700 dark:text-red-200"
            />
            <div>
              <h2 className="font-extrabold text-red-800 dark:text-red-100">
                Tài khoản đang bị khóa
              </h2>
              <p className="mt-1 text-sm leading-6 text-red-700 dark:text-red-200">
                {profile.statusReason ?? 'Hãy liên hệ bộ phận hỗ trợ để được kiểm tra.'}
              </p>
              <p className="mt-2 text-xs text-red-600 dark:text-red-300">
                Bạn chỉ có thể xem trang này cho đến khi quản trị viên mở khóa.
              </p>
            </div>
          </div>
        </section>
      )}

      <AddressBook />

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
                <div className="mt-0.5 flex items-center gap-2">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Khách hàng thành viên</p>
                  <StatusBadge status={profile?.status} />
                </div>
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
          {mineQuery.isLoading === false &&
            currentShop !== null &&
            currentShop.status === 'PENDING' && (
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
                    ĐANG CHỜ DUYỆT HỒ SƠ & eKYC (PENDING)
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
                  <p className="mt-3 text-xs whitespace-pre-line text-zinc-600 dark:text-zinc-300">
                    {currentShop.description}
                  </p>
                )}

                {/* eKYC Anti-Fraud Details Summary */}
                <div className="mt-5 rounded-2xl border border-amber-200/80 bg-white/90 p-4 text-xs dark:border-amber-500/20 dark:bg-zinc-900/80">
                  <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200">
                    <ShieldCheck size={18} weight="fill" className="text-amber-600" />
                    <span>Hồ sơ định danh eKYC phòng chống gian lận & hàng giả</span>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <div className="flex items-start gap-2 rounded-xl bg-amber-50/70 p-2.5 dark:bg-amber-500/5">
                      <IdentificationCard
                        size={18}
                        className="mt-0.5 shrink-0 text-amber-700 dark:text-amber-400"
                      />
                      <div>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase">
                          Chủ sở hữu & CCCD
                        </p>
                        <p className="font-bold text-zinc-900 dark:text-white">
                          {currentShop.legalName || 'Chưa cập nhật'}
                        </p>
                        <p className="font-mono text-[11px] text-zinc-600 dark:text-zinc-300">
                          CCCD: {maskId(currentShop.idNumber)}
                        </p>
                        <p className="text-[11px] text-zinc-500">
                          {formatSellerType(currentShop.sellerType)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 rounded-xl bg-amber-50/70 p-2.5 dark:bg-amber-500/5">
                      <Bank
                        size={18}
                        className="mt-0.5 shrink-0 text-amber-700 dark:text-amber-400"
                      />
                      <div>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase">
                          Tài khoản đối soát
                        </p>
                        <p className="font-bold text-zinc-900 dark:text-white">
                          {currentShop.bankName || 'Chưa cung cấp'}
                        </p>
                        <p className="font-mono text-[11px] text-zinc-600 dark:text-zinc-300">
                          STK: {currentShop.bankAccount || '---'}
                        </p>
                        <p className="text-[11px] text-zinc-500">
                          Chủ TK: {currentShop.bankHolder || currentShop.legalName || '---'}
                        </p>
                      </div>
                    </div>

                    {currentShop.address && (
                      <div className="flex items-start gap-2 rounded-xl bg-amber-50/70 p-2.5 sm:col-span-2 dark:bg-amber-500/5">
                        <MapPin
                          size={18}
                          className="mt-0.5 shrink-0 text-amber-700 dark:text-amber-400"
                        />
                        <div>
                          <p className="text-[10px] font-bold text-zinc-500 uppercase">
                            Kho lấy hàng & Hotline
                          </p>
                          <p className="text-zinc-800 dark:text-zinc-200">
                            {currentShop.address}{' '}
                            {currentShop.phone && <span>- Hotline: {currentShop.phone}</span>}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 rounded-xl bg-amber-100/60 p-2.5 text-[11px] leading-relaxed text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
                    <p className="font-semibold">
                      🔒 Cảnh báo chống gian lận & rửa tiền theo chuẩn Shopee:
                    </p>
                    <p className="mt-0.5">
                      Tên chủ tài khoản ngân hàng nhận tiền doanh thu được hệ thống tự động khóa cố
                      định theo Họ tên trên Căn cước công dân. Hồ sơ đang được Ban thẩm định pháp
                      chế nét kiểm duyệt.
                    </p>
                  </div>
                </div>

                {/* Admin Approval Command Helper Box */}
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-100/60 p-3 text-xs text-amber-950 dark:border-amber-500/20 dark:bg-amber-950/40 dark:text-amber-200">
                  <p className="font-bold">
                    Lệnh duyệt mở shop & phê duyệt eKYC qua CLI (dành cho Admin):
                  </p>
                  <code
                    id="cmd-approve-shop"
                    className="mt-1 block overflow-x-auto rounded-lg bg-black/80 p-2 font-mono text-[11px] text-green-300"
                  >
                    UPDATE shop SET status = 'APPROVED', kyc_status = 'VERIFIED', approved_at =
                    now() WHERE id = '{currentShop.id}';
                  </code>
                </div>
              </div>
            )}

          {/* Case 4: Shop is in APPROVED state */}
          {mineQuery.isLoading === false &&
            currentShop !== null &&
            currentShop.status === 'APPROVED' && (
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
                  <span
                    id="badge-ekyc-verified"
                    className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300"
                  >
                    <ShieldCheck size={14} weight="fill" />
                    eKYC ĐÃ XÁC THỰC
                  </span>
                </div>

                <h3 className="mt-4 text-xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                  {currentShop.name}
                </h3>
                <p className="mt-1 font-mono text-xs text-emerald-700 dark:text-emerald-400">
                  net.vn/shop/{currentShop.slug}
                </p>

                {currentShop.description && (
                  <p className="mt-3 text-xs whitespace-pre-line text-zinc-600 dark:text-zinc-300">
                    {currentShop.description}
                  </p>
                )}

                {/* Verified Identity Summary */}
                <div className="mt-4 rounded-2xl bg-white/70 p-3.5 text-xs text-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300">
                  <div className="flex flex-wrap items-center gap-4">
                    <div>
                      <span className="text-[10px] font-bold text-zinc-400 uppercase">
                        Chủ gian hàng:
                      </span>{' '}
                      <span className="font-bold text-zinc-900 dark:text-white">
                        {currentShop.legalName || 'Chính chủ'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-zinc-400 uppercase">CCCD:</span>{' '}
                      <span className="font-mono">{maskId(currentShop.idNumber)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-zinc-400 uppercase">
                        Ngân hàng nhận doanh thu:
                      </span>{' '}
                      <span>
                        {currentShop.bankName} - {currentShop.bankAccount}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="mt-4 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                  Chúc mừng! Gian hàng của bạn đã chính thức hoạt động và đạt chứng chỉ định danh an
                  toàn trên sàn nét. Hãy truy cập ngay Kênh Người Bán để đăng tải sản phẩm, quản lý
                  kho và xử lý các đơn hàng đầu tiên.
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

          {/* Case 5: Shop is in REJECTED state */}
          {mineQuery.isLoading === false &&
            currentShop !== null &&
            currentShop.status === 'REJECTED' && (
              <div
                id="card-shop-rejected"
                className="mt-6 rounded-3xl border border-rose-300 bg-rose-50/70 p-6 dark:border-rose-500/30 dark:bg-rose-500/10"
              >
                <div className="flex items-center justify-between">
                  <span
                    id="badge-shop-status-rejected"
                    className="flex items-center gap-1.5 rounded-full bg-rose-200/80 px-3 py-1 text-xs font-extrabold text-rose-900 dark:bg-rose-400/20 dark:text-rose-200"
                  >
                    <WarningOctagon size={14} weight="bold" />
                    HỒ SƠ eKYC BỊ TỪ CHỐI (REJECTED)
                  </span>
                </div>

                <h3 className="mt-4 text-xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                  {currentShop.name}
                </h3>

                <div className="mt-3 rounded-2xl bg-white/90 p-4 text-xs text-rose-900 dark:bg-zinc-900/80 dark:text-rose-200">
                  <p className="font-bold">Lý do từ chối thẩm định danh tính:</p>
                  <p className="mt-1 leading-relaxed">
                    {currentShop.kycRejectionReason ||
                      'Thông tin định danh CCCD hoặc tài khoản ngân hàng không hợp lệ, hình ảnh mờ hoặc không trùng khớp với chủ tài khoản.'}
                  </p>
                </div>

                {currentShop.statusReason !== undefined && currentShop.statusReason !== null && (
                  <div className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-xs text-red-800 dark:bg-red-500/10 dark:text-red-100">
                    <p className="text-[10px] font-bold tracking-wide uppercase">
                      Phản hồi từ quản trị viên
                    </p>
                    <p className="mt-1 leading-relaxed">{currentShop.statusReason}</p>
                  </div>
                )}

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    id="btn-reapply-shop-registration"
                    onClick={function () {
                      setModalOpen(true)
                    }}
                    className="flex items-center gap-2 rounded-full bg-rose-700 px-5 py-2.5 text-xs font-bold text-white shadow-lg transition hover:bg-rose-800"
                  >
                    <span>Chỉnh sửa & Nộp lại hồ sơ xác thực eKYC</span>
                    <ArrowRight size={14} weight="bold" />
                  </button>
                  <button
                    type="button"
                    id="btn-resubmit-shop"
                    disabled={resubmit.isPending}
                    onClick={function () {
                      handleResubmit(currentShop)
                    }}
                    className="btn-primary inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold disabled:opacity-50"
                  >
                    <PaperPlaneTilt size={14} weight="bold" />
                    {resubmit.isPending && resubmitId === currentShop.id && <span>Đang gửi…</span>}
                    {resubmit.isPending === false && <span>Gửi duyệt lại hồ sơ</span>}
                  </button>
                </div>

                {resubmit.isError && resubmitId === currentShop.id && (
                  <p className="mt-3 text-xs text-rose-700 dark:text-rose-300">
                    {adminErrorMessage(resubmit.error)}
                  </p>
                )}
              </div>
            )}
        </div>
      </div>

      {/* Shop eKYC Registration Modal */}
      <ShopKycRegistrationModal
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
