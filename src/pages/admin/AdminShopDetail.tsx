import { useState } from 'react'
import { Link, useParams } from 'react-router'

import {
  getGetAdminShopQueryKey,
  getListAdminShopsQueryKey,
  useApproveShop,
  useGetAdminShop,
  useReinstateShop,
  useRejectShop,
  useSuspendShop,
} from '@generated/endpoints/admin-shops/admin-shops'
import { getGetAdminStatsQueryKey } from '@generated/endpoints/admin-stats/admin-stats'
import { getListAdminUsersQueryKey } from '@generated/endpoints/admin-users/admin-users'
import {
  Bank,
  CheckCircle,
  Clock,
  Cube,
  Envelope,
  Eye,
  IdentificationCard,
  LockKey,
  MapPin,
  Package,
  Phone,
  Storefront,
  User,
  Warning,
  XCircle,
} from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import AdminShell from '@/components/admin/AdminShell'
import HistoryTimeline from '@/components/admin/dashboard/HistoryTimeline'
import ReasonDialog from '@/components/admin/dialogs/ReasonDialog'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import MediaLightbox from '@/components/ui/MediaLightbox'
import { TableRowsSkeleton } from '@/components/ui/Skeleton'
import StatePanel from '@/components/ui/StatePanel'
import StatusBadge from '@/components/ui/StatusBadge'
import { adminErrorMessage, formatDateTime } from '@/lib/admin/admin'
import { PLACEHOLDER_IMAGE, takeData, urlOrPlaceholder } from '@/lib/api/apiAdapters'
import { notify } from '@/lib/notifications'
import {
  badgeToneClass,
  cn,
  FOCUS_RING_CLASS,
  PANEL_CLASS,
  primaryButtonClass,
} from '@/lib/ui/styles'

import type { ConfirmAction, ReasonAction } from '@/types/admin'
import type { AdminShopDetailResponse } from '@generated/model/adminShopDetailResponse'

const REJECT_REASONS = [
  'Ảnh CCCD bị mờ, lóa sáng hoặc mất góc, vui lòng chụp lại rõ nét',
  'Thông tin CCCD không trùng khớp với ảnh chụp giấy tờ',
  'Tên chủ tài khoản ngân hàng không trùng khớp với Họ tên trên CCCD',
  'Thông tin shop chưa đầy đủ, vui lòng bổ sung mô tả, logo hoặc ảnh bìa',
  'Tên hoặc nội dung shop có dấu hiệu gây nhầm lẫn thương hiệu',
  'Địa chỉ kho hoặc số điện thoại liên hệ chưa thể xác minh',
]

const SUSPEND_REASONS = [
  'Phát hiện dấu hiệu bán hàng giả hoặc xâm phạm thương hiệu',
  'Shop vi phạm chính sách vận hành nhiều lần',
  'Cần tạm dừng để xác minh khiếu nại của khách hàng',
]

/** Chuẩn hóa họ tên tiếng Việt (bỏ dấu, đ→d, thường hóa, gom khoảng trắng) để đối soát chính xác. */
function normalizePersonName(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return ''
  }
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function kycStatusMeta(status: string | null | undefined): {
  label: string
  tone: 'success' | 'warning' | 'danger' | 'neutral'
} {
  if (status === 'VERIFIED') {
    return { label: 'Đã xác minh', tone: 'success' }
  }
  if (status === 'PENDING_REVIEW' || status === 'PENDING') {
    return { label: 'Chờ xác minh', tone: 'warning' }
  }
  if (status === 'REJECTED') {
    return { label: 'Từ chối định danh', tone: 'danger' }
  }
  if (status === 'UNSUBMITTED' || status === 'NOT_SUBMITTED') {
    return { label: 'Chưa nộp hồ sơ', tone: 'neutral' }
  }
  return { label: status ?? 'Chưa cập nhật', tone: 'neutral' }
}

interface LightboxPhoto {
  title: string
  url: string
}

export default function AdminShopDetail() {
  const params = useParams()
  const id = params.id ?? ''
  const queryClient = useQueryClient()
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)
  const [reasonAction, setReasonAction] = useState<ReasonAction | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const detailQuery = useGetAdminShop(id, { query: { enabled: id !== '' } })

  function refresh(): void {
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: getGetAdminShopQueryKey(id) }),
      queryClient.invalidateQueries({ queryKey: getListAdminShopsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getListAdminUsersQueryKey() }),
    ])
  }

  function completed(message: string): void {
    setConfirmAction(null)
    setReasonAction(null)
    notify.success(message)
    refresh()
  }

  const approve = useApproveShop({
    mutation: {
      onSuccess: function () {
        completed('Shop đã được duyệt và có thể bắt đầu bán hàng.')
      },
      onError: function (err) {
        notify.fromError(err, undefined, adminErrorMessage(err))
      },
    },
  })
  const reinstate = useReinstateShop({
    mutation: {
      onSuccess: function () {
        completed('Shop đã được mở lại trên sàn.')
      },
      onError: function (err) {
        notify.fromError(err, undefined, adminErrorMessage(err))
      },
    },
  })
  const reject = useRejectShop({
    mutation: {
      onSuccess: function () {
        completed('Hồ sơ đã bị từ chối và chủ shop sẽ thấy lý do.')
      },
      onError: function (err) {
        notify.fromError(err, undefined, adminErrorMessage(err))
      },
    },
  })
  const suspend = useSuspendShop({
    mutation: {
      onSuccess: function () {
        completed('Shop đã được tạm khóa và ẩn khỏi sàn.')
      },
      onError: function (err) {
        notify.fromError(err, undefined, adminErrorMessage(err))
      },
    },
  })

  let detail: AdminShopDetailResponse | undefined
  if (detailQuery.data !== undefined) {
    detail = takeData(detailQuery.data)
  }
  const shop = detail?.shop
  const productCount = detail?.productCount ?? 0
  const orderCount = detail?.orderCount ?? 0
  const history = detail?.history ?? []

  // Danh sách ảnh eKYC hiện có để hỗ trợ xem phóng to + chuyển qua lại bằng MediaLightbox
  const kycPhotos: LightboxPhoto[] = []
  if (shop?.idFrontUrl) {
    kycPhotos.push({
      title: 'Mặt trước CCCD — ' + (shop.legalName ?? ''),
      url: urlOrPlaceholder(shop.idFrontUrl),
    })
  }
  if (shop?.idBackUrl) {
    kycPhotos.push({
      title: 'Mặt sau CCCD — ' + (shop.legalName ?? ''),
      url: urlOrPlaceholder(shop.idBackUrl),
    })
  }
  if (shop?.idSelfieUrl) {
    kycPhotos.push({
      title: 'Selfie cầm CCCD — ' + (shop.legalName ?? ''),
      url: urlOrPlaceholder(shop.idSelfieUrl),
    })
  }
  if (shop?.businessCertUrl) {
    kycPhotos.push({
      title: 'Giấy phép kinh doanh — ' + (shop.name ?? ''),
      url: urlOrPlaceholder(shop.businessCertUrl),
    })
  }

  function openPhoto(url: string) {
    const idx = kycPhotos.findIndex(function (item) {
      return item.url === url
    })
    if (idx >= 0) {
      setLightboxIndex(idx)
    }
  }

  // Đối soát thực sự giữa tên chủ tài khoản ngân hàng và họ tên trên CCCD
  const normalizedBankHolder = normalizePersonName(shop?.bankHolder)
  const normalizedLegalName = normalizePersonName(shop?.legalName)
  const hasBothNames = normalizedBankHolder !== '' && normalizedLegalName !== ''
  const bankMatchesLegal = hasBothNames && normalizedBankHolder === normalizedLegalName

  let confirmTitle = ''
  let confirmDescription = ''
  let confirmLabel = ''
  let confirmPending = false
  if (confirmAction === 'approve') {
    confirmTitle = 'Duyệt shop này?'
    confirmDescription =
      'Shop sẽ xuất hiện trên sàn và chủ shop được cấp quyền truy cập kênh người bán.'
    confirmLabel = 'Duyệt shop'
    confirmPending = approve.isPending
  }
  if (confirmAction === 'reinstate') {
    confirmTitle = 'Mở lại shop?'
    confirmDescription = 'Shop sẽ hiển thị trở lại và có thể nhận đơn hàng mới.'
    confirmLabel = 'Mở lại shop'
    confirmPending = reinstate.isPending
  }

  let reasonTitle = ''
  let reasonDescription = ''
  let reasonLabel = ''
  let reasonSuggestions = REJECT_REASONS
  let reasonPending = false
  let reasonError: string | undefined
  if (reasonAction === 'reject') {
    reasonTitle = 'Từ chối hồ sơ shop'
    reasonDescription = 'Lý do sẽ hiển thị cho chủ shop để họ chỉnh sửa và gửi duyệt lại.'
    reasonLabel = 'Từ chối hồ sơ'
    reasonPending = reject.isPending
    if (reject.isError) {
      reasonError = adminErrorMessage(reject.error)
    }
  }
  if (reasonAction === 'suspend') {
    reasonTitle = 'Tạm khóa shop'
    reasonDescription = 'Shop sẽ bị ẩn khỏi sàn nhưng vẫn được xử lý các đơn đang có.'
    reasonLabel = 'Tạm khóa shop'
    reasonSuggestions = SUSPEND_REASONS
    reasonPending = suspend.isPending
    if (suspend.isError) {
      reasonError = adminErrorMessage(suspend.error)
    }
  }

  function confirmModeration(): void {
    if (confirmAction === 'approve') {
      approve.mutate({ id })
      return
    }
    if (confirmAction === 'reinstate') {
      reinstate.mutate({ id })
    }
  }

  function submitReason(reason: string): void {
    if (reasonAction === 'reject') {
      reject.mutate({ id, data: { reason } })
      return
    }
    if (reasonAction === 'suspend') {
      suspend.mutate({ id, data: { reason } })
    }
  }

  let actions: React.ReactNode
  if (shop?.status === 'PENDING') {
    actions = (
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={function () {
            setReasonAction('reject')
          }}
          className={cn(
            'cursor-pointer rounded-full border border-rose-300 px-4 py-2.5 text-sm font-bold text-rose-700 transition hover:bg-rose-50 dark:border-rose-400/30 dark:text-rose-300 dark:hover:bg-rose-500/15',
            FOCUS_RING_CLASS,
          )}
        >
          Từ chối
        </button>
        <button
          type="button"
          onClick={function () {
            setConfirmAction('approve')
          }}
          className={cn(primaryButtonClass(), 'rounded-full px-5 py-2.5 text-sm font-bold')}
        >
          Duyệt shop
        </button>
      </div>
    )
  }
  if (shop?.status === 'APPROVED') {
    actions = (
      <button
        type="button"
        onClick={function () {
          setReasonAction('suspend')
        }}
        className={cn(
          'cursor-pointer rounded-full border border-rose-300 px-4 py-2.5 text-sm font-bold text-rose-700 transition hover:bg-rose-50 dark:border-rose-400/30 dark:text-rose-300 dark:hover:bg-rose-500/15',
          FOCUS_RING_CLASS,
        )}
      >
        Tạm khóa shop
      </button>
    )
  }
  if (shop?.status === 'SUSPENDED') {
    actions = (
      <button
        type="button"
        onClick={function () {
          setConfirmAction('reinstate')
        }}
        className={cn(primaryButtonClass(), 'rounded-full px-5 py-2.5 text-sm font-bold')}
      >
        Mở lại shop
      </button>
    )
  }

  const pageTitle = shop?.name ?? 'Chi tiết shop'
  const kycBadge = kycStatusMeta(shop?.kycStatus)
  let activePhoto: LightboxPhoto | undefined
  if (lightboxIndex !== null) {
    activePhoto = kycPhotos[lightboxIndex]
  }
  let handleLightboxPrev: (() => void) | undefined
  let handleLightboxNext: (() => void) | undefined
  if (kycPhotos.length > 1) {
    handleLightboxPrev = function () {
      setLightboxIndex(function (prev) {
        if (prev === null || prev <= 0) {
          return kycPhotos.length - 1
        }
        return prev - 1
      })
    }
    handleLightboxNext = function () {
      setLightboxIndex(function (prev) {
        if (prev === null || prev >= kycPhotos.length - 1) {
          return 0
        }
        return prev + 1
      })
    }
  }

  return (
    <AdminShell
      title={pageTitle}
      description="Kiểm tra hồ sơ, chủ sở hữu và toàn bộ lịch sử kiểm duyệt."
      actions={actions}
      breadcrumbs={[
        { label: 'Quản trị', to: '/admin' },
        { label: 'Gian hàng', to: '/admin/shops' },
        { label: pageTitle },
      ]}
    >
      {detailQuery.isPending && <TableRowsSkeleton rows={5} columns={3} />}
      {detailQuery.isError && (
        <StatePanel
          title="Không mở được hồ sơ shop"
          description={adminErrorMessage(detailQuery.error)}
        />
      )}

      {shop !== undefined && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
          <div className="space-y-5">
            <section className={PANEL_CLASS}>
              {shop.bannerUrl && (
                <div className="mb-4 overflow-hidden rounded-2xl border border-zinc-200 dark:border-white/10">
                  <img
                    src={urlOrPlaceholder(shop.bannerUrl)}
                    alt={shop.name ?? 'Ảnh bìa shop'}
                    onError={function (e) {
                      if (e.currentTarget.src !== PLACEHOLDER_IMAGE) {
                        e.currentTarget.src = PLACEHOLDER_IMAGE
                      }
                    }}
                    className="h-36 w-full object-cover"
                  />
                </div>
              )}

              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  {shop.logoUrl && (
                    <img
                      src={urlOrPlaceholder(shop.logoUrl)}
                      alt={shop.name ?? 'Logo shop'}
                      onError={function (e) {
                        if (e.currentTarget.src !== PLACEHOLDER_IMAGE) {
                          e.currentTarget.src = PLACEHOLDER_IMAGE
                        }
                      }}
                      className="h-12 w-12 rounded-2xl border border-zinc-200 object-cover dark:border-white/10"
                    />
                  )}
                  {!shop.logoUrl && (
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 dark:bg-indigo-400/15 dark:text-sky-300">
                      <Storefront size={25} weight="bold" />
                    </span>
                  )}
                  <div>
                    <h2 className="text-xl font-extrabold tracking-tight text-[#17203a] dark:text-[#e2e8f0]">
                      {shop.name}
                    </h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">/{shop.slug}</p>
                  </div>
                </div>
                <StatusBadge status={shop.status} />
              </div>

              <p className="mt-5 text-sm leading-6 text-zinc-700 dark:text-zinc-200">
                {shop.description || 'Shop chưa cung cấp mô tả.'}
              </p>

              {(shop.address || shop.phone) && (
                <div className="mt-4 rounded-2xl bg-zinc-50 p-3.5 text-xs text-zinc-700 dark:bg-white/5 dark:text-zinc-300">
                  {shop.address && (
                    <p className="flex items-start gap-2">
                      <MapPin
                        size={16}
                        className="mt-0.5 shrink-0 text-zinc-500 dark:text-zinc-400"
                      />
                      <span>
                        <strong>Kho lấy hàng:</strong> {shop.address}
                      </span>
                    </p>
                  )}
                  {shop.phone && (
                    <p className="mt-2 flex items-center gap-2">
                      <Phone size={16} className="shrink-0 text-zinc-500 dark:text-zinc-400" />
                      <span>
                        <strong>Hotline shop:</strong> {shop.phone}
                      </span>
                    </p>
                  )}
                </div>
              )}

              {shop.statusReason !== undefined && shop.statusReason !== null && (
                <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 dark:border-rose-500/30 dark:bg-rose-500/15">
                  <p className="text-xs font-bold tracking-wide text-rose-700 uppercase dark:text-rose-300">
                    Lý do trạng thái hiện tại
                  </p>
                  <p className="mt-1 text-sm text-rose-800 dark:text-rose-200">
                    {shop.statusReason}
                  </p>
                </div>
              )}

              <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-bold text-zinc-500 uppercase dark:text-zinc-400">
                    Lần nộp gần nhất
                  </dt>
                  <dd className="mt-1 text-sm font-semibold tabular-nums">
                    {formatDateTime(shop.submittedAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold text-zinc-500 uppercase dark:text-zinc-400">
                    Được duyệt lúc
                  </dt>
                  <dd className="mt-1 text-sm font-semibold tabular-nums">
                    {formatDateTime(shop.approvedAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold text-zinc-500 uppercase dark:text-zinc-400">
                    Ngày tạo
                  </dt>
                  <dd className="mt-1 text-sm font-semibold tabular-nums">
                    {formatDateTime(shop.createdAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold text-zinc-500 uppercase dark:text-zinc-400">
                    Cập nhật gần nhất
                  </dt>
                  <dd className="mt-1 text-sm font-semibold tabular-nums">
                    {formatDateTime(shop.updatedAt)}
                  </dd>
                </div>
              </dl>
            </section>

            {/* Section: Hồ sơ định danh eKYC */}
            <section className={PANEL_CLASS}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 dark:bg-indigo-400/15 dark:text-sky-300">
                    <IdentificationCard size={20} weight="bold" />
                  </span>
                  <div>
                    <h2 className="font-extrabold tracking-tight text-[#17203a] dark:text-[#e2e8f0]">
                      Hồ sơ pháp lý &amp; Định danh eKYC
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Giấy tờ tùy thân và xác thực danh tính chủ shop
                    </p>
                  </div>
                </div>
                {shop.kycStatus && (
                  <span
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-bold',
                      badgeToneClass(kycBadge.tone),
                    )}
                  >
                    {kycBadge.label}
                  </span>
                )}
              </div>

              <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
                <div className="rounded-2xl bg-zinc-50 p-3 dark:bg-white/5">
                  <dt className="font-bold text-zinc-500 uppercase dark:text-zinc-400">
                    Họ và tên thật
                  </dt>
                  <dd className="mt-1 text-sm font-bold text-[#17203a] dark:text-white">
                    {shop.legalName || 'Chưa cung cấp'}
                  </dd>
                </div>
                <div className="rounded-2xl bg-zinc-50 p-3 dark:bg-white/5">
                  <dt className="font-bold text-zinc-500 uppercase dark:text-zinc-400">
                    Số CCCD / CMND
                  </dt>
                  <dd className="mt-1 font-mono text-sm font-bold text-[#17203a] dark:text-white">
                    {shop.idNumber || 'Chưa cung cấp'}
                  </dd>
                </div>
                <div className="rounded-2xl bg-zinc-50 p-3 dark:bg-white/5">
                  <dt className="font-bold text-zinc-500 uppercase dark:text-zinc-400">Ngày cấp</dt>
                  <dd className="mt-1 font-semibold text-zinc-800 dark:text-zinc-200">
                    {shop.idIssuedDate || 'Chưa cung cấp'}
                  </dd>
                </div>
                <div className="rounded-2xl bg-zinc-50 p-3 dark:bg-white/5">
                  <dt className="font-bold text-zinc-500 uppercase dark:text-zinc-400">Nơi cấp</dt>
                  <dd className="mt-1 font-semibold text-zinc-800 dark:text-zinc-200">
                    {shop.idIssuedPlace || 'Chưa cung cấp'}
                  </dd>
                </div>
                {shop.taxCode && (
                  <div className="rounded-2xl bg-zinc-50 p-3 sm:col-span-2 dark:bg-white/5">
                    <dt className="font-bold text-zinc-500 uppercase dark:text-zinc-400">
                      Mã số thuế
                    </dt>
                    <dd className="mt-1 font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                      {shop.taxCode}
                    </dd>
                  </div>
                )}
              </dl>

              <div className="mt-5">
                <h3 className="text-xs font-bold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                  Ảnh giấy tờ định danh đã tải lên
                </h3>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 p-2 dark:border-white/10 dark:bg-white/5">
                    <p className="mb-2 text-[11px] font-bold text-zinc-600 dark:text-zinc-300">
                      Mặt trước CCCD
                    </p>
                    {shop.idFrontUrl && (
                      <div className="group relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-black/5">
                        <img
                          src={urlOrPlaceholder(shop.idFrontUrl)}
                          alt="Mặt trước CCCD"
                          onError={function (e) {
                            if (e.currentTarget.src !== PLACEHOLDER_IMAGE) {
                              e.currentTarget.src = PLACEHOLDER_IMAGE
                            }
                          }}
                          className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                        />
                        <button
                          type="button"
                          aria-label="Phóng to ảnh mặt trước CCCD"
                          onClick={function () {
                            openPhoto(urlOrPlaceholder(shop.idFrontUrl))
                          }}
                          className={cn(
                            'absolute inset-0 flex cursor-pointer items-center justify-center rounded-2xl bg-black/45 opacity-0 transition duration-200 group-hover:opacity-100 focus-visible:opacity-100',
                            FOCUS_RING_CLASS,
                          )}
                        >
                          <span className="flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-zinc-900 shadow">
                            <Eye size={14} weight="bold" />
                            Phóng to
                          </span>
                        </button>
                      </div>
                    )}
                    {!shop.idFrontUrl && (
                      <p className="py-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
                        Chưa tải ảnh
                      </p>
                    )}
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 p-2 dark:border-white/10 dark:bg-white/5">
                    <p className="mb-2 text-[11px] font-bold text-zinc-600 dark:text-zinc-300">
                      Mặt sau CCCD
                    </p>
                    {shop.idBackUrl && (
                      <div className="group relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-black/5">
                        <img
                          src={urlOrPlaceholder(shop.idBackUrl)}
                          alt="Mặt sau CCCD"
                          onError={function (e) {
                            if (e.currentTarget.src !== PLACEHOLDER_IMAGE) {
                              e.currentTarget.src = PLACEHOLDER_IMAGE
                            }
                          }}
                          className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                        />
                        <button
                          type="button"
                          aria-label="Phóng to ảnh mặt sau CCCD"
                          onClick={function () {
                            openPhoto(urlOrPlaceholder(shop.idBackUrl))
                          }}
                          className={cn(
                            'absolute inset-0 flex cursor-pointer items-center justify-center rounded-2xl bg-black/45 opacity-0 transition duration-200 group-hover:opacity-100 focus-visible:opacity-100',
                            FOCUS_RING_CLASS,
                          )}
                        >
                          <span className="flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-zinc-900 shadow">
                            <Eye size={14} weight="bold" />
                            Phóng to
                          </span>
                        </button>
                      </div>
                    )}
                    {!shop.idBackUrl && (
                      <p className="py-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
                        Chưa tải ảnh
                      </p>
                    )}
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 p-2 dark:border-white/10 dark:bg-white/5">
                    <p className="mb-2 text-[11px] font-bold text-zinc-600 dark:text-zinc-300">
                      Ảnh selfie cầm CCCD
                    </p>
                    {shop.idSelfieUrl && (
                      <div className="group relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-black/5">
                        <img
                          src={urlOrPlaceholder(shop.idSelfieUrl)}
                          alt="Selfie cầm CCCD"
                          onError={function (e) {
                            if (e.currentTarget.src !== PLACEHOLDER_IMAGE) {
                              e.currentTarget.src = PLACEHOLDER_IMAGE
                            }
                          }}
                          className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                        />
                        <button
                          type="button"
                          aria-label="Phóng to ảnh selfie cầm CCCD"
                          onClick={function () {
                            openPhoto(urlOrPlaceholder(shop.idSelfieUrl))
                          }}
                          className={cn(
                            'absolute inset-0 flex cursor-pointer items-center justify-center rounded-2xl bg-black/45 opacity-0 transition duration-200 group-hover:opacity-100 focus-visible:opacity-100',
                            FOCUS_RING_CLASS,
                          )}
                        >
                          <span className="flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-zinc-900 shadow">
                            <Eye size={14} weight="bold" />
                            Phóng to
                          </span>
                        </button>
                      </div>
                    )}
                    {!shop.idSelfieUrl && (
                      <p className="py-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
                        Chưa tải ảnh
                      </p>
                    )}
                  </div>

                  {shop.businessCertUrl && (
                    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 p-2 sm:col-span-2 lg:col-span-3 dark:border-white/10 dark:bg-white/5">
                      <p className="mb-2 text-[11px] font-bold text-zinc-600 dark:text-zinc-300">
                        Giấy phép kinh doanh (Tùy chọn)
                      </p>
                      <div className="group relative aspect-[16/9] max-h-60 w-full overflow-hidden rounded-2xl bg-black/5">
                        <img
                          src={urlOrPlaceholder(shop.businessCertUrl)}
                          alt="Giấy phép kinh doanh"
                          onError={function (e) {
                            if (e.currentTarget.src !== PLACEHOLDER_IMAGE) {
                              e.currentTarget.src = PLACEHOLDER_IMAGE
                            }
                          }}
                          className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                        />
                        <button
                          type="button"
                          aria-label="Phóng to giấy phép kinh doanh"
                          onClick={function () {
                            openPhoto(urlOrPlaceholder(shop.businessCertUrl))
                          }}
                          className={cn(
                            'absolute inset-0 flex cursor-pointer items-center justify-center rounded-2xl bg-black/45 opacity-0 transition duration-200 group-hover:opacity-100 focus-visible:opacity-100',
                            FOCUS_RING_CLASS,
                          )}
                        >
                          <span className="flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-zinc-900 shadow">
                            <Eye size={14} weight="bold" />
                            Phóng to
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Section: Thông tin ngân hàng đối soát */}
            <section className={PANEL_CLASS}>
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 dark:bg-indigo-400/15 dark:text-sky-300">
                  <Bank size={20} weight="bold" />
                </span>
                <div>
                  <h2 className="font-extrabold tracking-tight text-[#17203a] dark:text-[#e2e8f0]">
                    Tài khoản ngân hàng nhận thanh toán
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Đối soát và chuyển khoản doanh thu định kỳ
                  </p>
                </div>
              </div>

              <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-3">
                <div className="rounded-2xl bg-zinc-50 p-3 dark:bg-white/5">
                  <dt className="font-bold text-zinc-500 uppercase dark:text-zinc-400">
                    Ngân hàng
                  </dt>
                  <dd className="mt-1 text-sm font-bold text-[#17203a] dark:text-white">
                    {shop.bankName || 'Chưa cung cấp'}
                  </dd>
                </div>
                <div className="rounded-2xl bg-zinc-50 p-3 dark:bg-white/5">
                  <dt className="font-bold text-zinc-500 uppercase dark:text-zinc-400">
                    Số tài khoản
                  </dt>
                  <dd className="mt-1 font-mono text-sm font-bold text-[#17203a] dark:text-white">
                    {shop.bankAccount || 'Chưa cung cấp'}
                  </dd>
                </div>
                <div className="rounded-2xl bg-zinc-50 p-3 dark:bg-white/5">
                  <dt className="font-bold text-zinc-500 uppercase dark:text-zinc-400">
                    Tên chủ tài khoản
                  </dt>
                  <dd className="mt-1 text-sm font-bold text-[#17203a] dark:text-white">
                    {shop.bankHolder || 'Chưa cung cấp'}
                  </dd>
                </div>
              </dl>

              {bankMatchesLegal && (
                <div className="mt-3 flex items-start gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300">
                  <CheckCircle
                    size={16}
                    weight="fill"
                    className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                  />
                  <span>
                    Đối soát trùng khớp: Tên chủ tài khoản ngân hàng ({shop.bankHolder}) khớp với Họ
                    tên trên CCCD ({shop.legalName}).
                  </span>
                </div>
              )}

              {hasBothNames && bankMatchesLegal === false && (
                <div
                  role="alert"
                  className="mt-3 flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300"
                >
                  <Warning
                    size={16}
                    weight="fill"
                    className="mt-0.5 shrink-0 text-rose-600 dark:text-rose-400"
                  />
                  <span>
                    Cảnh báo lệch thông tin: Tên chủ tài khoản ngân hàng ({shop.bankHolder}) KHÔNG
                    trùng khớp với Họ tên trên CCCD ({shop.legalName}). Vui lòng xác minh kỹ trước
                    khi duyệt.
                  </span>
                </div>
              )}

              {hasBothNames === false && (
                <div
                  role="alert"
                  className="mt-3 flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs font-semibold text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300"
                >
                  <Warning
                    size={16}
                    weight="fill"
                    className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400"
                  />
                  <span>
                    Chưa đủ dữ liệu đối soát: Thiếu tên chủ tài khoản ngân hàng hoặc Họ tên trên
                    CCCD. Không thể tự động xác thực trùng khớp.
                  </span>
                </div>
              )}
            </section>

            <section className="grid gap-4 sm:grid-cols-2">
              <article className={PANEL_CLASS}>
                <Cube size={22} className="text-blue-700 dark:text-sky-300" />
                <p className="mt-3 text-3xl font-extrabold tracking-tighter tabular-nums">
                  {productCount.toLocaleString('vi-VN')}
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Sản phẩm mọi trạng thái</p>
              </article>
              <article className={PANEL_CLASS}>
                <Package size={22} className="text-blue-700 dark:text-sky-300" />
                <p className="mt-3 text-3xl font-extrabold tracking-tighter tabular-nums">
                  {orderCount.toLocaleString('vi-VN')}
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Đơn hàng mọi trạng thái</p>
              </article>
            </section>
          </div>

          <div className="space-y-5">
            <section className={PANEL_CLASS}>
              <h2 className="font-extrabold tracking-tight text-[#17203a] dark:text-[#e2e8f0]">
                Chủ sở hữu
              </h2>
              <div className="mt-4 space-y-3 text-sm">
                <p className="flex items-center gap-2">
                  <User size={17} className="text-zinc-500 dark:text-zinc-400" />
                  <span className="font-semibold">{shop.ownerName ?? 'Chưa có tên'}</span>
                </p>
                <p className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
                  <Envelope size={17} className="text-zinc-500 dark:text-zinc-400" />
                  {shop.ownerEmail ?? '—'}
                </p>
                <div className="flex items-center gap-2">
                  <LockKey size={17} className="text-zinc-500 dark:text-zinc-400" />
                  <StatusBadge status={shop.ownerStatus} />
                </div>
              </div>
              {shop.ownerId !== undefined && shop.ownerId !== null && (
                <Link
                  to={'/admin/users/' + shop.ownerId}
                  className={cn(
                    'mt-5 inline-flex cursor-pointer rounded-full bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-800 transition hover:bg-indigo-100 dark:bg-indigo-400/15 dark:text-sky-300 dark:hover:bg-indigo-400/25',
                    FOCUS_RING_CLASS,
                  )}
                >
                  Mở hồ sơ chủ shop
                </Link>
              )}
            </section>

            <section className={PANEL_CLASS}>
              <div className="mb-4 flex items-center gap-2">
                <Clock size={20} className="text-blue-700 dark:text-sky-300" />
                <h2 className="font-extrabold tracking-tight text-[#17203a] dark:text-[#e2e8f0]">
                  Lịch sử trạng thái
                </h2>
              </div>
              <HistoryTimeline items={history} />
            </section>

            {shop.status === 'REJECTED' && (
              <div className="rounded-3xl border border-rose-200 bg-rose-50/80 p-5 text-sm dark:border-rose-500/30 dark:bg-rose-500/10">
                <div className="flex items-center gap-2 font-bold text-rose-800 dark:text-rose-300">
                  <XCircle size={19} weight="bold" />
                  Đang chờ chủ shop chỉnh sửa
                </div>
                <p className="mt-2 text-zinc-700 dark:text-zinc-300">
                  Chủ shop có thể cập nhật hồ sơ rồi gửi duyệt lại. Khi đó hồ sơ sẽ xếp cuối hàng
                  đợi.
                </p>
              </div>
            )}
            {shop.status === 'APPROVED' && (
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-sm dark:border-emerald-500/30 dark:bg-emerald-500/15">
                <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300">
                  <CheckCircle size={19} weight="bold" />
                  Shop đang hoạt động
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmAction !== null}
        title={confirmTitle}
        description={confirmDescription}
        confirmLabel={confirmLabel}
        variant="primary"
        isPending={confirmPending}
        onCancel={function () {
          setConfirmAction(null)
        }}
        onConfirm={confirmModeration}
      />
      <ReasonDialog
        open={reasonAction !== null}
        danger
        title={reasonTitle}
        description={reasonDescription}
        confirmLabel={reasonLabel}
        suggestions={reasonSuggestions}
        pending={reasonPending}
        error={reasonError}
        onClose={function () {
          if (reasonPending === false) {
            setReasonAction(null)
          }
        }}
        onConfirm={submitReason}
      />

      {activePhoto !== undefined && lightboxIndex !== null && (
        <MediaLightbox
          open
          src={activePhoto.url}
          alt={activePhoto.title}
          caption={activePhoto.title}
          onClose={function () {
            setLightboxIndex(null)
          }}
          onPrev={handleLightboxPrev}
          onNext={handleLightboxNext}
        />
      )}
    </AdminShell>
  )
}
