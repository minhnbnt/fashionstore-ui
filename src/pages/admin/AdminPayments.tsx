import { useState } from 'react'

import {
  getListAdminWithdrawalsQueryKey,
  getListPaymentGatewaysQueryKey,
  getListPaymentTransactionsQueryKey,
  useApproveWithdrawal,
  useConfirmPaymentTransfer,
  useListAdminWithdrawals,
  useListPaymentGateways,
  useListPaymentTransactions,
  useMarkTransactionRefunded,
  useRejectWithdrawal,
  useUpdatePaymentGateway,
} from '@generated/endpoints/admin-payments/admin-payments'
import { useListBanks } from '@generated/endpoints/banks/banks'
import { ListPaymentTransactionsRefundStatus } from '@generated/model/listPaymentTransactionsRefundStatus'
import { ListPaymentTransactionsStatus } from '@generated/model/listPaymentTransactionsStatus'
import {
  ArrowsLeftRight,
  Bank,
  CheckCircle,
  CreditCard,
  FloppyDisk,
  MagnifyingGlass,
  Money,
  QrCode,
  WarningCircle,
  XCircle,
} from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import AdminShell from '@/components/admin/AdminShell'
import Modal from '@/components/Modal'
import Pagination from '@/components/search/Pagination'
import EmptyState from '@/components/ui/EmptyState'
import { Skeleton, TableRowsSkeleton } from '@/components/ui/Skeleton'
import StatePanel from '@/components/ui/StatePanel'
import { fallbackImageOnError, takeData } from '@/lib/api/apiAdapters'
import { formatDateTime, formatVnd } from '@/lib/format'
import { notify, safeErrorMessage } from '@/lib/notifications'
import {
  badgeToneClass,
  cn,
  dangerButtonClass,
  FOCUS_RING_CLASS,
  iconChipClass,
  INPUT_CLASS,
  LABEL_CLASS,
  PANEL_CLASS,
  primaryButtonClass,
  secondaryButtonClass,
  sectionLabelClass,
  segmentedItemClass,
  segmentedTrackClass,
  successButtonClass,
  switchKnobClass,
  switchTrackClass,
  TEXTAREA_CLASS,
} from '@/lib/ui/styles'

import type { AdminWithdrawalResponse } from '@generated/model/adminWithdrawalResponse'
import type { BankResponse } from '@generated/model/bankResponse'
import type { ListAdminWithdrawalsParams } from '@generated/model/listAdminWithdrawalsParams'
import type { ListPaymentTransactionsParams } from '@generated/model/listPaymentTransactionsParams'
import type { PaymentGatewayResponse } from '@generated/model/paymentGatewayResponse'
import type { PaymentTransactionResponse } from '@generated/model/paymentTransactionResponse'
import type { UpdatePaymentGatewayRequest } from '@generated/model/updatePaymentGatewayRequest'

const PAGE_SIZE = 15

type MainTabKey = 'GATEWAYS' | 'TRANSACTIONS' | 'WITHDRAWALS'

const MAIN_TABS: { key: MainTabKey; label: string }[] = [
  { key: 'GATEWAYS', label: 'Cổng thanh toán' },
  { key: 'TRANSACTIONS', label: 'Giao dịch & Hoàn tiền' },
  { key: 'WITHDRAWALS', label: 'Yêu cầu rút tiền Shop' },
]

type TxStatusFilter = 'ALL' | ListPaymentTransactionsStatus

const TX_STATUS_FILTERS: { value: TxStatusFilter; label: string }[] = [
  { value: 'ALL', label: 'Tất cả' },
  { value: ListPaymentTransactionsStatus.SUCCESS, label: 'Thành công' },
  { value: ListPaymentTransactionsStatus.UNDERPAID, label: 'Chuyển thiếu' },
  { value: ListPaymentTransactionsStatus.PENDING, label: 'Đang chờ' },
  { value: ListPaymentTransactionsStatus.EXPIRED, label: 'Hết hạn' },
]

type WithdrawalStatusFilter = 'ALL' | 'REQUESTED' | 'COMPLETED' | 'REJECTED'

const WITHDRAWAL_STATUS_FILTERS: { value: WithdrawalStatusFilter; label: string }[] = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'REQUESTED', label: 'Chờ duyệt' },
  { value: 'COMPLETED', label: 'Đã chuyển khoản' },
  { value: 'REJECTED', label: 'Đã từ chối' },
]

interface VietQrDraftState {
  enabled: boolean
  sandboxMode: boolean
  bankBin: string
  accountNumber: string
  accountName: string
  webhookSecret: string
}

function toVietQrDraft(gateway: PaymentGatewayResponse | undefined): VietQrDraftState {
  if (gateway === undefined) {
    return {
      enabled: true,
      sandboxMode: false,
      bankBin: '',
      accountNumber: '',
      accountName: '',
      webhookSecret: '',
    }
  }
  return {
    enabled: gateway.enabled ?? true,
    sandboxMode: gateway.sandboxMode ?? false,
    bankBin: gateway.bankBin ?? '',
    accountNumber: gateway.accountNumber ?? '',
    accountName: gateway.accountName ?? '',
    webhookSecret: '',
  }
}

function txStatusMeta(status: string | undefined): {
  label: string
  tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral'
} {
  if (status === 'SUCCESS') {
    return { label: 'Thành công', tone: 'success' }
  }
  if (status === 'UNDERPAID') {
    return { label: 'Chuyển thiếu', tone: 'warning' }
  }
  if (status === 'PENDING') {
    return { label: 'Đang chờ', tone: 'info' }
  }
  if (status === 'EXPIRED') {
    return { label: 'Hết hạn', tone: 'neutral' }
  }
  if (status === 'FAILED') {
    return { label: 'Thất bại', tone: 'danger' }
  }
  return { label: status ?? '—', tone: 'neutral' }
}

function refundStatusMeta(refundStatus: string | undefined): {
  label: string
  tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral'
} {
  if (refundStatus === 'PENDING') {
    return { label: 'Chờ hoàn tiền', tone: 'warning' }
  }
  if (refundStatus === 'REFUNDED') {
    return { label: 'Đã hoàn tiền', tone: 'success' }
  }
  return { label: 'Không', tone: 'neutral' }
}

function withdrawalStatusMeta(status: string | undefined): {
  label: string
  tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral'
} {
  if (status === 'REQUESTED') {
    return { label: 'Chờ duyệt', tone: 'warning' }
  }
  if (status === 'COMPLETED') {
    return { label: 'Đã chuyển khoản', tone: 'success' }
  }
  if (status === 'REJECTED') {
    return { label: 'Đã từ chối', tone: 'danger' }
  }
  if (status === 'PROCESSING') {
    return { label: 'Đang xử lý', tone: 'info' }
  }
  return { label: status ?? '—', tone: 'neutral' }
}

function badgeClass(tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral'): string {
  return cn(
    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold',
    badgeToneClass(tone),
  )
}

function switchKnobOffsetClass(on: boolean): string {
  if (on) {
    return 'translate-x-4'
  }
  return 'translate-x-0.5'
}

function enabledStatusMeta(enabled: boolean): {
  label: string
  tone: 'success' | 'neutral'
} {
  if (enabled) {
    return { label: 'Đang bật', tone: 'success' }
  }
  return { label: 'Đang tắt', tone: 'neutral' }
}

function GatewaysSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-5 lg:grid-cols-12"
      aria-busy="true"
      aria-label="Đang tải cấu hình cổng thanh toán"
    >
      <div className={cn(PANEL_CLASS, 'lg:col-span-5')}>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="mt-3 h-4 w-64" />
        <Skeleton className="mt-6 h-10 w-36 rounded-full" />
      </div>
      <div className={cn(PANEL_CLASS, 'lg:col-span-7')}>
        <Skeleton className="h-6 w-56" />
        <Skeleton className="mt-3 h-4 w-72" />
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Skeleton className="h-11 w-full rounded-full" />
          <Skeleton className="h-11 w-full rounded-full" />
          <Skeleton className="h-11 w-full rounded-full" />
          <Skeleton className="h-11 w-full rounded-full" />
        </div>
      </div>
    </div>
  )
}

export default function AdminPayments() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<MainTabKey>('GATEWAYS')

  // Tab 1: Gateways
  const gatewaysQuery = useListPaymentGateways()
  const banksQuery = useListBanks()
  const updateGatewayMutation = useUpdatePaymentGateway()

  const [codEnabledDraft, setCodEnabledDraft] = useState<boolean | null>(null)
  const [vietQrDraft, setVietQrDraft] = useState<VietQrDraftState | null>(null)

  let gateways: PaymentGatewayResponse[] = []
  if (gatewaysQuery.data !== undefined && gatewaysQuery.data.status === 200) {
    gateways = takeData(gatewaysQuery.data)
  }

  let banks: BankResponse[] = []
  if (banksQuery.data !== undefined && banksQuery.data.status === 200) {
    banks = takeData(banksQuery.data)
  }

  const codGateway = gateways.find(function (gw) {
    return gw.code === 'COD'
  })
  const vietQrGateway = gateways.find(function (gw) {
    return gw.code === 'VIETQR'
  })

  const codEnabled = codEnabledDraft ?? codGateway?.enabled ?? true
  const vietQrForm = vietQrDraft ?? toVietQrDraft(vietQrGateway)

  let webhookPlaceholder = 'Nhập khóa bí mật xác thực Webhook'
  if (vietQrGateway?.webhookSecretSet === true) {
    webhookPlaceholder = 'Đã thiết lập — để trống nếu giữ nguyên'
  }

  function updateVietQrField<K extends keyof VietQrDraftState>(
    field: K,
    value: VietQrDraftState[K],
  ) {
    setVietQrDraft({
      ...vietQrForm,
      [field]: value,
    })
  }

  function handleSaveCod() {
    const payload: UpdatePaymentGatewayRequest = {
      enabled: codEnabled,
    }
    void notify
      .promise(
        updateGatewayMutation.mutateAsync({ code: 'COD', data: payload }),
        {
          loading: 'Đang lưu cấu hình COD...',
          success: 'Đã cập nhật cấu hình thanh toán COD',
          error: function (err) {
            return safeErrorMessage(err, 'adminPayments', 'Không thể cập nhật cấu hình COD.')
          },
        },
        { id: 'admin-save-cod' },
      )
      .then(function () {
        setCodEnabledDraft(null)
        void queryClient.invalidateQueries({ queryKey: getListPaymentGatewaysQueryKey() })
      })
      .catch(function () {
        // Đã hiển thị toast lỗi qua notify.promise
      })
  }

  function handleSaveVietQr(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const payload: UpdatePaymentGatewayRequest = {
      enabled: vietQrForm.enabled,
      bankBin: vietQrForm.bankBin.trim(),
      accountNumber: vietQrForm.accountNumber.trim(),
      accountName: vietQrForm.accountName.trim(),
      sandboxMode: vietQrForm.sandboxMode,
    }
    if (vietQrForm.webhookSecret.trim() !== '') {
      payload.webhookSecret = vietQrForm.webhookSecret.trim()
    }

    void notify
      .promise(
        updateGatewayMutation.mutateAsync({ code: 'VIETQR', data: payload }),
        {
          loading: 'Đang lưu cấu hình VietQR...',
          success: 'Đã cập nhật cấu hình cổng thanh toán VietQR',
          error: function (err) {
            return safeErrorMessage(err, 'adminPayments', 'Không thể cập nhật cấu hình VietQR.')
          },
        },
        { id: 'admin-save-vietqr' },
      )
      .then(function () {
        setVietQrDraft(null)
        void queryClient.invalidateQueries({ queryKey: getListPaymentGatewaysQueryKey() })
      })
      .catch(function () {
        // Đã hiển thị toast lỗi qua notify.promise
      })
  }

  // Tab 2: Transactions & Refunds
  const [txStatusFilter, setTxStatusFilter] = useState<TxStatusFilter>('ALL')
  const [onlyPendingRefund, setOnlyPendingRefund] = useState(false)
  const [txSearchQuery, setTxSearchQuery] = useState('')
  const [txPage, setTxPage] = useState(0)
  const [refundTarget, setRefundTarget] = useState<PaymentTransactionResponse | null>(null)
  const [refundNote, setRefundNote] = useState('')
  const [refundNoteError, setRefundNoteError] = useState<string | null>(null)
  const [confirmTransferTarget, setConfirmTransferTarget] =
    useState<PaymentTransactionResponse | null>(null)
  const [confirmTransferAmount, setConfirmTransferAmount] = useState('')
  const [confirmTransferError, setConfirmTransferError] = useState<string | null>(null)

  const txParams: ListPaymentTransactionsParams = {
    page: txPage,
    size: PAGE_SIZE,
  }
  if (txStatusFilter !== 'ALL') {
    txParams.status = txStatusFilter
  }
  if (onlyPendingRefund) {
    txParams.refundStatus = ListPaymentTransactionsRefundStatus.PENDING
  }
  if (txSearchQuery.trim() !== '') {
    txParams.q = txSearchQuery.trim()
  }

  const transactionsQuery = useListPaymentTransactions(txParams)
  const markRefundedMutation = useMarkTransactionRefunded()
  const confirmTransferMutation = useConfirmPaymentTransfer()

  let transactions: PaymentTransactionResponse[] = []
  let txTotal = 0
  if (transactionsQuery.data !== undefined && transactionsQuery.data.status === 200) {
    const pageData = takeData(transactionsQuery.data)
    transactions = pageData.items ?? []
    txTotal = pageData.total ?? 0
  }

  let totalTxPages = Math.ceil(txTotal / PAGE_SIZE)
  if (totalTxPages < 1) {
    totalTxPages = 1
  }

  function openRefundModal(tx: PaymentTransactionResponse) {
    setRefundTarget(tx)
    setRefundNote('')
    setRefundNoteError(null)
  }

  function closeRefundModal() {
    setRefundTarget(null)
    setRefundNote('')
    setRefundNoteError(null)
  }

  function handleConfirmRefund(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (refundTarget === null || refundTarget.id === undefined) {
      return
    }
    const trimmed = refundNote.trim()
    if (trimmed.length < 5 || trimmed.length > 500) {
      const msg = 'Vui lòng nhập ghi chú đối soát hoàn tiền từ 5 đến 500 ký tự.'
      setRefundNoteError(msg)
      notify.warning('Ghi chú chưa hợp lệ', msg)
      return
    }

    const targetId = refundTarget.id
    void notify
      .promise(
        markRefundedMutation.mutateAsync({
          id: targetId,
          data: { note: trimmed },
        }),
        {
          loading: 'Đang xác nhận hoàn tiền...',
          success: 'Đã đánh dấu hoàn tiền thành công cho khách hàng',
          error: function (err) {
            return safeErrorMessage(err, 'adminPayments', 'Không thể xác nhận hoàn tiền.')
          },
        },
        { id: `admin-refund-${targetId}` },
      )
      .then(function () {
        closeRefundModal()
        void queryClient.invalidateQueries({ queryKey: getListPaymentTransactionsQueryKey() })
      })
      .catch(function () {
        // Đã hiển thị toast lỗi qua notify.promise
      })
  }

  function openConfirmTransferModal(tx: PaymentTransactionResponse) {
    setConfirmTransferTarget(tx)
    setConfirmTransferAmount(String(tx.amount ?? 0))
    setConfirmTransferError(null)
  }

  function closeConfirmTransferModal() {
    setConfirmTransferTarget(null)
    setConfirmTransferAmount('')
    setConfirmTransferError(null)
  }

  function handleConfirmTransfer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (confirmTransferTarget === null || confirmTransferTarget.id === undefined) {
      return
    }
    const parsed = Number(confirmTransferAmount.trim())
    if (Number.isFinite(parsed) === false || parsed <= 0) {
      const msg = 'Vui lòng nhập số tiền thực nhận lớn hơn 0.'
      setConfirmTransferError(msg)
      notify.warning('Số tiền chưa hợp lệ', msg)
      return
    }

    const targetId = confirmTransferTarget.id
    const roundedAmount = Math.round(parsed)
    void notify
      .promise(
        confirmTransferMutation.mutateAsync({
          id: targetId,
          data: { amount: roundedAmount },
        }),
        {
          loading: 'Đang xác nhận nhận tiền chuyển khoản...',
          success: 'Đã ghi nhận giao dịch chuyển khoản VietQR',
          error: function (err) {
            return safeErrorMessage(
              err,
              'adminPayments',
              'Không thể xác nhận giao dịch chuyển khoản.',
            )
          },
        },
        { id: `admin-confirm-transfer-${targetId}` },
      )
      .then(function () {
        closeConfirmTransferModal()
        void queryClient.invalidateQueries({ queryKey: getListPaymentTransactionsQueryKey() })
      })
      .catch(function () {
        // Đã hiển thị toast lỗi qua notify.promise
      })
  }

  // Tab 3: Shop Withdrawals
  const [withdrawalStatusFilter, setWithdrawalStatusFilter] =
    useState<WithdrawalStatusFilter>('ALL')
  const [withdrawalPage, setWithdrawalPage] = useState(0)

  const withdrawalParams: ListAdminWithdrawalsParams = {
    page: withdrawalPage,
    size: PAGE_SIZE,
  }
  if (withdrawalStatusFilter !== 'ALL') {
    withdrawalParams.status = withdrawalStatusFilter
  }

  const withdrawalsQuery = useListAdminWithdrawals(withdrawalParams)
  const approveWithdrawalMutation = useApproveWithdrawal()
  const rejectWithdrawalMutation = useRejectWithdrawal()

  let withdrawals: AdminWithdrawalResponse[] = []
  let withdrawalTotal = 0
  if (withdrawalsQuery.data !== undefined && withdrawalsQuery.data.status === 200) {
    const pageData = takeData(withdrawalsQuery.data)
    withdrawals = pageData.items ?? []
    withdrawalTotal = pageData.total ?? 0
  }

  let totalWithdrawalPages = Math.ceil(withdrawalTotal / PAGE_SIZE)
  if (totalWithdrawalPages < 1) {
    totalWithdrawalPages = 1
  }

  function handleApproveWithdrawal(withdrawalId: string | undefined) {
    if (withdrawalId === undefined || withdrawalId === '') {
      return
    }
    void notify
      .promise(
        approveWithdrawalMutation.mutateAsync({ id: withdrawalId }),
        {
          loading: 'Đang duyệt lệnh rút tiền...',
          success: 'Đã duyệt chuyển khoản lệnh rút tiền cho Shop',
          error: function (err) {
            return safeErrorMessage(err, 'adminPayments', 'Không thể duyệt lệnh rút tiền.')
          },
        },
        { id: `admin-approve-withdrawal-${withdrawalId}` },
      )
      .then(function () {
        void queryClient.invalidateQueries({ queryKey: getListAdminWithdrawalsQueryKey() })
      })
      .catch(function () {
        // Đã hiển thị toast lỗi qua notify.promise
      })
  }

  function handleRejectWithdrawal(withdrawalId: string | undefined) {
    if (withdrawalId === undefined || withdrawalId === '') {
      return
    }
    void notify
      .promise(
        rejectWithdrawalMutation.mutateAsync({ id: withdrawalId }),
        {
          loading: 'Đang từ chối lệnh rút tiền...',
          success: 'Đã từ chối lệnh rút và hoàn trả số dư khả dụng cho Shop',
          error: function (err) {
            return safeErrorMessage(err, 'adminPayments', 'Không thể từ chối lệnh rút tiền.')
          },
        },
        { id: `admin-reject-withdrawal-${withdrawalId}` },
      )
      .then(function () {
        void queryClient.invalidateQueries({ queryKey: getListAdminWithdrawalsQueryKey() })
      })
      .catch(function () {
        // Đã hiển thị toast lỗi qua notify.promise
      })
  }

  const codStatus = enabledStatusMeta(codEnabled)
  const vietQrStatus = enabledStatusMeta(vietQrForm.enabled)
  const hasQrPreview = vietQrForm.bankBin.trim() !== '' && vietQrForm.accountNumber.trim() !== ''
  const qrPreviewUrl = `https://img.vietqr.io/image/${vietQrForm.bankBin.trim()}-${vietQrForm.accountNumber.trim()}-compact2.png?accountName=${encodeURIComponent(vietQrForm.accountName.trim())}`

  let needRefundBtnClass = cn(
    'inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50/90 px-3.5 py-1.5 text-xs font-bold text-amber-800 transition hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300',
    FOCUS_RING_CLASS,
  )
  if (onlyPendingRefund) {
    needRefundBtnClass = cn(
      'inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-amber-500 bg-amber-500 px-3.5 py-1.5 text-xs font-extrabold text-white shadow-xs transition hover:bg-amber-600',
      FOCUS_RING_CLASS,
    )
  }

  return (
    <AdminShell
      title="Cổng thanh toán & Đối soát"
      description="Quản lý cấu hình COD và VietQR, đối soát giao dịch hoàn tiền khách hàng và phê duyệt lệnh rút tiền của Shop."
    >
      <div className="space-y-6">
        {/* Main Segmented Tabs */}
        <div className="overflow-x-auto pb-1">
          <div
            role="tablist"
            aria-label="Phân mục quản trị thanh toán"
            className={cn(segmentedTrackClass(), 'w-max')}
          >
            {MAIN_TABS.map(function (tab) {
              const active = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={function () {
                    setActiveTab(tab.key)
                  }}
                  className={segmentedItemClass(active)}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* TAB 1: GATEWAYS */}
        {activeTab === 'GATEWAYS' && (
          <>
            {gatewaysQuery.isLoading && <GatewaysSkeleton />}

            {gatewaysQuery.isError && (
              <StatePanel
                title="Không thể tải cấu hình cổng thanh toán"
                description={safeErrorMessage(
                  gatewaysQuery.error,
                  'adminPayments',
                  'Đã xảy ra lỗi khi tải danh sách cổng thanh toán.',
                )}
                action={
                  <button
                    type="button"
                    onClick={function () {
                      void gatewaysQuery.refetch()
                    }}
                    className={cn(
                      primaryButtonClass(),
                      'mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold',
                    )}
                  >
                    <span>Thử lại</span>
                  </button>
                }
              />
            )}

            {gatewaysQuery.isLoading === false && gatewaysQuery.isError === false && (
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
                {/* COD Card */}
                <section className={cn(PANEL_CLASS, 'flex flex-col justify-between lg:col-span-5')}>
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className={cn(iconChipClass(), 'h-10 w-10 rounded-2xl')}>
                          <Money size={20} weight="bold" />
                        </span>
                        <div>
                          <h2 className="text-lg font-extrabold tracking-tight text-[#17203a] dark:text-[#e2e8f0]">
                            Thanh toán khi nhận hàng (COD)
                          </h2>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Cho phép khách thanh toán tiền mặt cho bưu tá khi giao hàng thành công.
                          </p>
                        </div>
                      </div>
                      <span className={badgeClass(codStatus.tone)}>{codStatus.label}</span>
                    </div>

                    <div className="flex items-center justify-between rounded-2xl border border-zinc-200/80 bg-zinc-50/70 p-4 dark:border-white/10 dark:bg-white/5">
                      <div>
                        <p className="text-sm font-bold text-[#17203a] dark:text-[#e2e8f0]">
                          Trạng thái hoạt động COD
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          Bật hoặc tắt phương thức COD trên trang thanh toán
                        </p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-label="Bật thanh toán COD"
                        aria-checked={codEnabled}
                        onClick={function () {
                          setCodEnabledDraft(codEnabled === false)
                        }}
                        className={cn(
                          'relative inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full transition-colors',
                          switchTrackClass(codEnabled),
                          FOCUS_RING_CLASS,
                        )}
                      >
                        <span
                          className={cn(
                            switchKnobClass(),
                            'h-4 w-4',
                            switchKnobOffsetClass(codEnabled),
                          )}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-end border-t border-zinc-200/80 pt-4 dark:border-white/10">
                    <button
                      type="button"
                      onClick={handleSaveCod}
                      disabled={updateGatewayMutation.isPending}
                      className={cn(
                        primaryButtonClass(),
                        'inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50',
                      )}
                    >
                      <FloppyDisk size={16} weight="bold" />
                      <span>Lưu cấu hình COD</span>
                    </button>
                  </div>
                </section>

                {/* VIETQR Card */}
                <section className={cn(PANEL_CLASS, 'lg:col-span-7')}>
                  <form onSubmit={handleSaveVietQr} className="space-y-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className={cn(iconChipClass(), 'h-10 w-10 rounded-2xl')}>
                          <QrCode size={20} weight="bold" />
                        </span>
                        <div>
                          <h2 className="text-lg font-extrabold tracking-tight text-[#17203a] dark:text-[#e2e8f0]">
                            Chuyển khoản ngân hàng (VietQR)
                          </h2>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Tài khoản ngân hàng trung gian (Escrow) nhận tiền quét mã QR từ người
                            mua.
                          </p>
                        </div>
                      </div>
                      <span className={badgeClass(vietQrStatus.tone)}>{vietQrStatus.label}</span>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="flex items-center justify-between rounded-2xl border border-zinc-200/80 bg-zinc-50/70 p-3.5 dark:border-white/10 dark:bg-white/5">
                        <div>
                          <p className="text-sm font-bold text-[#17203a] dark:text-[#e2e8f0]">
                            Kích hoạt cổng VietQR
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Hiển thị tùy chọn quét mã VietQR khi đặt hàng
                          </p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-label="Bật thanh toán VietQR"
                          aria-checked={vietQrForm.enabled}
                          onClick={function () {
                            updateVietQrField('enabled', vietQrForm.enabled === false)
                          }}
                          className={cn(
                            'relative inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full transition-colors',
                            switchTrackClass(vietQrForm.enabled),
                            FOCUS_RING_CLASS,
                          )}
                        >
                          <span
                            className={cn(
                              switchKnobClass(),
                              'h-4 w-4',
                              switchKnobOffsetClass(vietQrForm.enabled),
                            )}
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between rounded-2xl border border-amber-200/80 bg-amber-50/60 p-3.5 dark:border-amber-500/25 dark:bg-amber-500/10">
                        <div>
                          <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
                            Chế độ Demo Sandbox
                          </p>
                          <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
                            Cho phép Admin giả lập biến động số dư tại tab Giao dịch
                          </p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-label="Chế độ Demo Sandbox"
                          aria-checked={vietQrForm.sandboxMode}
                          onClick={function () {
                            updateVietQrField('sandboxMode', vietQrForm.sandboxMode === false)
                          }}
                          className={cn(
                            'relative inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full transition-colors',
                            switchTrackClass(vietQrForm.sandboxMode),
                            FOCUS_RING_CLASS,
                          )}
                        >
                          <span
                            className={cn(
                              switchKnobClass(),
                              'h-4 w-4',
                              switchKnobOffsetClass(vietQrForm.sandboxMode),
                            )}
                          />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label htmlFor="vietqr-bank-bin" className={LABEL_CLASS}>
                          Ngân hàng nhận tiền (NAPAS)
                        </label>
                        <select
                          id="vietqr-bank-bin"
                          value={vietQrForm.bankBin}
                          onChange={function (event) {
                            updateVietQrField('bankBin', event.target.value)
                          }}
                          className={INPUT_CLASS}
                        >
                          <option value="">-- Chọn ngân hàng NAPAS --</option>
                          {banks.map(function (bank) {
                            const bin = bank.bin ?? ''
                            const shortLabel = bank.shortName ?? bank.code ?? bin
                            return (
                              <option key={bin} value={bin}>
                                {shortLabel} ({bin}) — {bank.name}
                              </option>
                            )
                          })}
                        </select>
                      </div>

                      <div>
                        <label htmlFor="vietqr-account-number" className={LABEL_CLASS}>
                          Số tài khoản nhận tiền
                        </label>
                        <input
                          id="vietqr-account-number"
                          type="text"
                          value={vietQrForm.accountNumber}
                          onChange={function (event) {
                            updateVietQrField('accountNumber', event.target.value)
                          }}
                          placeholder="0123456789"
                          className={cn(INPUT_CLASS, 'tabular-nums')}
                        />
                      </div>

                      <div>
                        <label htmlFor="vietqr-account-name" className={LABEL_CLASS}>
                          Tên chủ tài khoản
                        </label>
                        <input
                          id="vietqr-account-name"
                          type="text"
                          value={vietQrForm.accountName}
                          onChange={function (event) {
                            updateVietQrField('accountName', event.target.value)
                          }}
                          placeholder="CONG TY TNHH DHMQ"
                          className={INPUT_CLASS}
                        />
                      </div>

                      <div>
                        <label htmlFor="vietqr-webhook-secret" className={LABEL_CLASS}>
                          Webhook Secret
                        </label>
                        <input
                          id="vietqr-webhook-secret"
                          type="password"
                          value={vietQrForm.webhookSecret}
                          onChange={function (event) {
                            updateVietQrField('webhookSecret', event.target.value)
                          }}
                          placeholder={webhookPlaceholder}
                          className={INPUT_CLASS}
                        />
                      </div>
                    </div>

                    {hasQrPreview && (
                      <div className="flex flex-col items-center gap-3 rounded-2xl border border-zinc-200/80 bg-zinc-50/70 p-4 sm:flex-row dark:border-white/10 dark:bg-white/5">
                        <img
                          src={qrPreviewUrl}
                          alt="Xem trước mã VietQR mẫu"
                          width={96}
                          height={96}
                          loading="lazy"
                          onError={fallbackImageOnError}
                          className="h-24 w-24 shrink-0 rounded-2xl border border-zinc-200 bg-white object-contain p-1 dark:border-white/10"
                        />
                        <div className="space-y-1 text-center sm:text-left">
                          <p className="text-xs font-extrabold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                            Xem trước mã VietQR mẫu
                          </p>
                          <p className="text-sm font-bold text-[#17203a] dark:text-[#e2e8f0]">
                            {vietQrForm.accountName || 'Chưa nhập tên chủ tài khoản'}
                          </p>
                          <p className="font-mono text-xs text-zinc-600 tabular-nums dark:text-zinc-300">
                            BIN: {vietQrForm.bankBin} · STK: {vietQrForm.accountNumber}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-end border-t border-zinc-200/80 pt-4 dark:border-white/10">
                      <button
                        type="submit"
                        disabled={updateGatewayMutation.isPending}
                        className={cn(
                          primaryButtonClass(),
                          'inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50',
                        )}
                      >
                        <FloppyDisk size={16} weight="bold" />
                        <span>Lưu cấu hình VietQR</span>
                      </button>
                    </div>
                  </form>
                </section>
              </div>
            )}
          </>
        )}

        {/* TAB 2: TRANSACTIONS & REFUNDS */}
        {activeTab === 'TRANSACTIONS' && (
          <section className={PANEL_CLASS}>
            <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-start gap-3">
                <span className={cn(iconChipClass(), 'h-10 w-10 rounded-2xl')}>
                  <ArrowsLeftRight size={20} weight="bold" />
                </span>
                <div>
                  <h2 className="text-lg font-extrabold tracking-tight text-[#17203a] dark:text-[#e2e8f0]">
                    Giao dịch VietQR &amp; Đối soát hoàn tiền
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Theo dõi biến động giao dịch chuyển khoản và đánh dấu hoàn tiền cho các đơn hủy
                    hoặc trả hàng.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="overflow-x-auto">
                  <div
                    role="tablist"
                    aria-label="Lọc trạng thái giao dịch"
                    className={cn(segmentedTrackClass(), 'w-max')}
                  >
                    {TX_STATUS_FILTERS.map(function (opt) {
                      const active = txStatusFilter === opt.value
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          onClick={function () {
                            setTxStatusFilter(opt.value)
                            setTxPage(0)
                          }}
                          className={segmentedItemClass(active)}
                        >
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  aria-pressed={onlyPendingRefund}
                  onClick={function () {
                    setOnlyPendingRefund(onlyPendingRefund === false)
                    setTxPage(0)
                  }}
                  className={needRefundBtnClass}
                >
                  <WarningCircle size={15} weight="bold" />
                  <span>Cần hoàn tiền</span>
                </button>

                <div className="relative min-w-[220px] flex-1 sm:flex-initial">
                  <MagnifyingGlass
                    size={16}
                    weight="bold"
                    className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-zinc-400"
                  />
                  <input
                    type="search"
                    aria-label="Tìm kiếm giao dịch"
                    value={txSearchQuery}
                    onChange={function (event) {
                      setTxSearchQuery(event.target.value)
                      setTxPage(0)
                    }}
                    placeholder="Tìm mã GD (txnRef) hoặc mã đơn..."
                    className={cn(INPUT_CLASS, 'py-2 pr-4 pl-9 text-xs')}
                  />
                </div>
              </div>
            </div>

            {transactionsQuery.isLoading && <TableRowsSkeleton rows={5} columns={8} />}

            {transactionsQuery.isError && (
              <StatePanel
                title="Không thể tải danh sách giao dịch"
                description={safeErrorMessage(
                  transactionsQuery.error,
                  'adminPayments',
                  'Đã xảy ra lỗi khi tải danh sách giao dịch thanh toán.',
                )}
                action={
                  <button
                    type="button"
                    onClick={function () {
                      void transactionsQuery.refetch()
                    }}
                    className={cn(
                      primaryButtonClass(),
                      'mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold',
                    )}
                  >
                    <span>Thử lại</span>
                  </button>
                }
              />
            )}

            {transactionsQuery.isLoading === false &&
              transactionsQuery.isError === false &&
              transactions.length === 0 && (
                <EmptyState
                  icon={<CreditCard size={26} weight="bold" />}
                  title="Chưa có giao dịch thanh toán"
                  description="Các giao dịch chuyển khoản VietQR khớp bộ lọc sẽ xuất hiện tại đây."
                />
              )}

            {transactionsQuery.isLoading === false &&
              transactionsQuery.isError === false &&
              transactions.length > 0 && (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-zinc-200/80 dark:border-white/10">
                          <th className={cn(sectionLabelClass(), 'pr-4 pb-3')}>Mã GD</th>
                          <th className={cn(sectionLabelClass(), 'pr-4 pb-3')}>Đơn hàng</th>
                          <th className={cn(sectionLabelClass(), 'pr-4 pb-3')}>Người mua</th>
                          <th className={cn(sectionLabelClass(), 'pr-4 pb-3')}>
                            Số tiền yêu cầu / Đã nhận
                          </th>
                          <th className={cn(sectionLabelClass(), 'pr-4 pb-3')}>Trạng thái GD</th>
                          <th className={cn(sectionLabelClass(), 'pr-4 pb-3')}>
                            Trạng thái hoàn tiền
                          </th>
                          <th className={cn(sectionLabelClass(), 'pr-4 pb-3')}>Thời gian</th>
                          <th className={cn(sectionLabelClass(), 'pb-3 text-right')}>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200/70 dark:divide-white/10">
                        {transactions.map(function (tx, idx) {
                          const rowKey = tx.id ?? `${tx.txnRef ?? 'tx'}-${idx}`
                          const statusMeta = txStatusMeta(tx.status)
                          const refundMeta = refundStatusMeta(tx.refundStatus)
                          const orders = tx.orders ?? []
                          const displayTime = tx.paidAt ?? tx.createdAt

                          return (
                            <tr
                              key={rowKey}
                              className="transition hover:bg-sky-50/50 dark:hover:bg-white/5"
                            >
                              <td className="py-3.5 pr-4 align-top">
                                <span className="font-mono text-xs font-bold text-[#17203a] dark:text-[#e2e8f0]">
                                  {tx.txnRef ?? '—'}
                                </span>
                                {tx.bankCode !== undefined && tx.bankCode !== '' && (
                                  <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                                    {tx.bankCode} · {tx.accountNumber ?? ''}
                                  </p>
                                )}
                              </td>
                              <td className="py-3.5 pr-4 align-top">
                                {orders.length === 0 && (
                                  <span className="text-xs text-zinc-400">—</span>
                                )}
                                {orders.length > 0 && (
                                  <div className="flex flex-col gap-1">
                                    {orders.map(function (ord, ordIdx) {
                                      return (
                                        <div
                                          key={ord.orderId ?? `${ord.orderCode ?? 'ord'}-${ordIdx}`}
                                          className="text-xs"
                                        >
                                          <span className="font-mono font-bold text-[#17203a] dark:text-[#e2e8f0]">
                                            #{ord.orderCode}
                                          </span>
                                          {ord.shopName !== undefined && ord.shopName !== '' && (
                                            <span className="ml-1 text-zinc-500 dark:text-zinc-400">
                                              ({ord.shopName})
                                            </span>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </td>
                              <td className="py-3.5 pr-4 align-top text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                {tx.buyerEmail ?? '—'}
                              </td>
                              <td className="py-3.5 pr-4 align-top whitespace-nowrap tabular-nums">
                                <p className="text-xs font-bold text-[#17203a] dark:text-[#e2e8f0]">
                                  {formatVnd(tx.amount ?? 0)}
                                </p>
                                <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                                  Đã nhận: {formatVnd(tx.receivedAmount ?? 0)}
                                </p>
                              </td>
                              <td className="py-3.5 pr-4 align-top whitespace-nowrap">
                                <span className={badgeClass(statusMeta.tone)}>
                                  {statusMeta.label}
                                </span>
                              </td>
                              <td className="max-w-xs py-3.5 pr-4 align-top">
                                <div className="space-y-1">
                                  <span className={badgeClass(refundMeta.tone)}>
                                    {refundMeta.label}
                                  </span>
                                  {(tx.refundAmount ?? 0) > 0 && (
                                    <p className="text-xs font-bold text-amber-800 tabular-nums dark:text-amber-300">
                                      Hoàn: {formatVnd(tx.refundAmount ?? 0)}
                                    </p>
                                  )}
                                  {tx.refundReason !== undefined && tx.refundReason !== '' && (
                                    <p className="text-xs text-zinc-600 dark:text-zinc-300">
                                      {tx.refundReason}
                                    </p>
                                  )}
                                  {tx.refundNote !== undefined && tx.refundNote !== '' && (
                                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                                      Ghi chú: {tx.refundNote}
                                    </p>
                                  )}
                                </div>
                              </td>
                              <td className="py-3.5 pr-4 align-top text-xs whitespace-nowrap text-zinc-600 tabular-nums dark:text-zinc-300">
                                {formatDateTime(displayTime)}
                              </td>
                              <td className="py-3.5 text-right align-top whitespace-nowrap">
                                <div className="inline-flex flex-wrap items-center justify-end gap-2">
                                  {tx.status === 'PENDING' && (
                                    <button
                                      type="button"
                                      onClick={function () {
                                        openConfirmTransferModal(tx)
                                      }}
                                      className={cn(
                                        successButtonClass(),
                                        'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold',
                                      )}
                                    >
                                      <CheckCircle size={15} weight="bold" />
                                      <span>Xác nhận nhận tiền</span>
                                    </button>
                                  )}
                                  {tx.refundStatus === 'PENDING' && (
                                    <button
                                      type="button"
                                      onClick={function () {
                                        openRefundModal(tx)
                                      }}
                                      className={cn(
                                        primaryButtonClass(),
                                        'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold',
                                      )}
                                    >
                                      <CheckCircle size={15} weight="bold" />
                                      <span>Đánh dấu đã hoàn tiền</span>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-5 border-t border-zinc-200/80 pt-4 dark:border-white/10">
                    <p className="text-xs font-medium text-zinc-500 tabular-nums dark:text-zinc-400">
                      Tổng {txTotal.toLocaleString('vi-VN')} giao dịch · Trang {txPage + 1} /{' '}
                      {totalTxPages}
                    </p>
                    <Pagination
                      page={txPage}
                      totalPages={totalTxPages}
                      onPage={function (nextPage) {
                        setTxPage(nextPage)
                      }}
                    />
                  </div>
                </>
              )}
          </section>
        )}

        {/* TAB 3: SHOP WITHDRAWALS */}
        {activeTab === 'WITHDRAWALS' && (
          <section className={PANEL_CLASS}>
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <span className={cn(iconChipClass(), 'h-10 w-10 rounded-2xl')}>
                  <Bank size={20} weight="bold" />
                </span>
                <div>
                  <h2 className="text-lg font-extrabold tracking-tight text-[#17203a] dark:text-[#e2e8f0]">
                    Yêu cầu rút tiền của các Shop
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Phê duyệt sau khi đã chuyển khoản ngân hàng cho Shop hoặc từ chối để hoàn trả số
                    dư ví khả dụng.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto pb-1">
                <div
                  role="tablist"
                  aria-label="Lọc trạng thái lệnh rút tiền"
                  className={cn(segmentedTrackClass(), 'w-max')}
                >
                  {WITHDRAWAL_STATUS_FILTERS.map(function (opt) {
                    const active = withdrawalStatusFilter === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={function () {
                          setWithdrawalStatusFilter(opt.value)
                          setWithdrawalPage(0)
                        }}
                        className={segmentedItemClass(active)}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {withdrawalsQuery.isLoading && <TableRowsSkeleton rows={5} columns={7} />}

            {withdrawalsQuery.isError && (
              <StatePanel
                title="Không thể tải danh sách lệnh rút tiền"
                description={safeErrorMessage(
                  withdrawalsQuery.error,
                  'adminPayments',
                  'Đã xảy ra lỗi khi tải danh sách yêu cầu rút tiền của Shop.',
                )}
                action={
                  <button
                    type="button"
                    onClick={function () {
                      void withdrawalsQuery.refetch()
                    }}
                    className={cn(
                      primaryButtonClass(),
                      'mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold',
                    )}
                  >
                    <span>Thử lại</span>
                  </button>
                }
              />
            )}

            {withdrawalsQuery.isLoading === false &&
              withdrawalsQuery.isError === false &&
              withdrawals.length === 0 && (
                <EmptyState
                  icon={<Bank size={26} weight="bold" />}
                  title="Chưa có yêu cầu rút tiền"
                  description="Các lệnh rút tiền từ ví khả dụng của Shop khớp bộ lọc sẽ hiển thị tại đây."
                />
              )}

            {withdrawalsQuery.isLoading === false &&
              withdrawalsQuery.isError === false &&
              withdrawals.length > 0 && (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-zinc-200/80 dark:border-white/10">
                          <th className={cn(sectionLabelClass(), 'pr-4 pb-3')}>Shop</th>
                          <th className={cn(sectionLabelClass(), 'pr-4 pb-3')}>Số tiền rút</th>
                          <th className={cn(sectionLabelClass(), 'pr-4 pb-3')}>Ngân hàng</th>
                          <th className={cn(sectionLabelClass(), 'pr-4 pb-3')}>STK &amp; Chủ TK</th>
                          <th className={cn(sectionLabelClass(), 'pr-4 pb-3')}>Thời gian tạo</th>
                          <th className={cn(sectionLabelClass(), 'pr-4 pb-3')}>Trạng thái</th>
                          <th className={cn(sectionLabelClass(), 'pb-3 text-right')}>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200/70 dark:divide-white/10">
                        {withdrawals.map(function (wd, idx) {
                          const rowKey = wd.id ?? `wd-${idx}`
                          const statusMeta = withdrawalStatusMeta(wd.status)
                          return (
                            <tr
                              key={rowKey}
                              className="transition hover:bg-sky-50/50 dark:hover:bg-white/5"
                            >
                              <td className="py-3.5 pr-4 font-bold text-[#17203a] dark:text-[#e2e8f0]">
                                {wd.shopName ?? '—'}
                              </td>
                              <td className="py-3.5 pr-4 font-extrabold whitespace-nowrap text-[#17203a] tabular-nums dark:text-[#e2e8f0]">
                                {formatVnd(wd.amount ?? 0)}
                              </td>
                              <td className="py-3.5 pr-4 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                                {wd.bankName ?? '—'}
                              </td>
                              <td className="py-3.5 pr-4 text-xs">
                                <span className="font-mono font-bold text-[#17203a] tabular-nums dark:text-[#e2e8f0]">
                                  {wd.bankAccount ?? '—'}
                                </span>
                                <span className="mx-1.5 text-zinc-400">•</span>
                                <span className="font-medium text-zinc-600 dark:text-zinc-300">
                                  {wd.bankHolder ?? '—'}
                                </span>
                              </td>
                              <td className="py-3.5 pr-4 text-xs whitespace-nowrap text-zinc-600 tabular-nums dark:text-zinc-300">
                                {formatDateTime(wd.createdAt)}
                              </td>
                              <td className="py-3.5 pr-4 whitespace-nowrap">
                                <span className={badgeClass(statusMeta.tone)}>
                                  {statusMeta.label}
                                </span>
                              </td>
                              <td className="py-3.5 text-right whitespace-nowrap">
                                {wd.status === 'REQUESTED' && (
                                  <div className="inline-flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      disabled={
                                        approveWithdrawalMutation.isPending ||
                                        rejectWithdrawalMutation.isPending
                                      }
                                      onClick={function () {
                                        handleApproveWithdrawal(wd.id)
                                      }}
                                      className={cn(successButtonClass(), 'px-3.5 py-1.5 text-xs')}
                                    >
                                      <CheckCircle size={15} weight="bold" />
                                      <span>Duyệt đã chuyển khoản</span>
                                    </button>
                                    <button
                                      type="button"
                                      disabled={
                                        approveWithdrawalMutation.isPending ||
                                        rejectWithdrawalMutation.isPending
                                      }
                                      onClick={function () {
                                        handleRejectWithdrawal(wd.id)
                                      }}
                                      className={cn(dangerButtonClass(), 'px-3.5 py-1.5 text-xs')}
                                    >
                                      <XCircle size={15} weight="bold" />
                                      <span>Từ chối</span>
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-5 border-t border-zinc-200/80 pt-4 dark:border-white/10">
                    <p className="text-xs font-medium text-zinc-500 tabular-nums dark:text-zinc-400">
                      Tổng {withdrawalTotal.toLocaleString('vi-VN')} yêu cầu · Trang{' '}
                      {withdrawalPage + 1} / {totalWithdrawalPages}
                    </p>
                    <Pagination
                      page={withdrawalPage}
                      totalPages={totalWithdrawalPages}
                      onPage={function (nextPage) {
                        setWithdrawalPage(nextPage)
                      }}
                    />
                  </div>
                </>
              )}
          </section>
        )}
      </div>

      {/* Modal xác nhận / giả lập nhận tiền chuyển khoản VietQR */}
      {confirmTransferTarget !== null && (
        <Modal
          title="Xác nhận nhận tiền chuyển khoản VietQR"
          onClose={closeConfirmTransferModal}
          closeOnBackdrop
        >
          <form onSubmit={handleConfirmTransfer} className="mt-4 space-y-4">
            <div className="rounded-2xl border border-sky-200/80 bg-sky-50/70 p-3.5 text-xs dark:border-sky-500/25 dark:bg-sky-500/10">
              <p className="font-bold text-sky-900 dark:text-sky-200">
                Mã giao dịch: <span className="font-mono">{confirmTransferTarget.txnRef}</span>
              </p>
              <p className="mt-1 font-extrabold text-sky-800 tabular-nums dark:text-sky-300">
                Số tiền cần thanh toán: {formatVnd(confirmTransferTarget.amount ?? 0)}
              </p>
              {confirmTransferTarget.buyerEmail !== undefined &&
                confirmTransferTarget.buyerEmail !== '' && (
                  <p className="mt-1 text-sky-800/90 dark:text-sky-300/90">
                    Người mua: {confirmTransferTarget.buyerEmail}
                  </p>
                )}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Chọn nhanh kịch bản đối soát / giả lập:
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={function () {
                    setConfirmTransferAmount(String(confirmTransferTarget.amount ?? 0))
                    setConfirmTransferError(null)
                  }}
                  className={cn(
                    'inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-200',
                    FOCUS_RING_CLASS,
                  )}
                >
                  <CheckCircle size={14} weight="bold" />
                  <span>Nhận đủ 100% ({formatVnd(confirmTransferTarget.amount ?? 0)})</span>
                </button>
                <button
                  type="button"
                  onClick={function () {
                    const half = Math.floor((confirmTransferTarget.amount ?? 0) / 2)
                    setConfirmTransferAmount(String(half))
                    setConfirmTransferError(null)
                  }}
                  className={cn(
                    'inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-200',
                    FOCUS_RING_CLASS,
                  )}
                >
                  <WarningCircle size={14} weight="bold" />
                  <span>
                    Giả lập chuyển thiếu 50% (
                    {formatVnd(Math.floor((confirmTransferTarget.amount ?? 0) / 2))})
                  </span>
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirm-transfer-amount-input" className={LABEL_CLASS}>
                Số tiền thực nhận (VNĐ)
              </label>
              <input
                id="confirm-transfer-amount-input"
                type="number"
                min={1}
                value={confirmTransferAmount}
                onChange={function (event) {
                  setConfirmTransferAmount(event.target.value)
                  if (confirmTransferError !== null) {
                    setConfirmTransferError(null)
                  }
                }}
                className={cn(INPUT_CLASS, 'tabular-nums')}
              />
              {confirmTransferError !== null && (
                <p
                  role="alert"
                  className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400"
                >
                  {confirmTransferError}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={closeConfirmTransferModal}
                disabled={confirmTransferMutation.isPending}
                className={secondaryButtonClass()}
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={confirmTransferMutation.isPending}
                className={cn(
                  successButtonClass(),
                  'inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50',
                )}
              >
                <CheckCircle size={16} weight="bold" />
                <span>Xác nhận đã nhận tiền</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal xác nhận hoàn tiền */}
      {refundTarget !== null && (
        <Modal title="Xác nhận đã hoàn tiền cho khách" onClose={closeRefundModal} closeOnBackdrop>
          <form onSubmit={handleConfirmRefund} className="mt-4 space-y-4">
            <div className="rounded-2xl border border-amber-200/80 bg-amber-50/70 p-3.5 text-xs dark:border-amber-500/25 dark:bg-amber-500/10">
              <p className="font-bold text-amber-900 dark:text-amber-200">
                Mã giao dịch: <span className="font-mono">{refundTarget.txnRef}</span>
              </p>
              <p className="mt-1 font-extrabold text-amber-800 tabular-nums dark:text-amber-300">
                Số tiền hoàn: {formatVnd(refundTarget.refundAmount ?? refundTarget.amount ?? 0)}
              </p>
              {refundTarget.refundReason !== undefined && refundTarget.refundReason !== '' && (
                <p className="mt-1 text-amber-800/90 dark:text-amber-300/90">
                  Lý do: {refundTarget.refundReason}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="refund-note-input" className={LABEL_CLASS}>
                Ghi chú đối soát hoàn tiền
              </label>
              <textarea
                id="refund-note-input"
                rows={3}
                maxLength={500}
                value={refundNote}
                onChange={function (event) {
                  setRefundNote(event.target.value)
                  if (refundNoteError !== null) {
                    setRefundNoteError(null)
                  }
                }}
                placeholder="Nhập mã giao dịch ngân hàng, số tài khoản nhận hoàn hoặc ghi chú đối soát (5–500 ký tự)..."
                className={TEXTAREA_CLASS}
              />
              {refundNoteError !== null && (
                <p
                  role="alert"
                  className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400"
                >
                  {refundNoteError}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={closeRefundModal}
                disabled={markRefundedMutation.isPending}
                className={secondaryButtonClass()}
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={markRefundedMutation.isPending}
                className={cn(
                  primaryButtonClass(),
                  'inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50',
                )}
              >
                <CheckCircle size={16} weight="bold" />
                <span>Xác nhận đã hoàn tiền</span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </AdminShell>
  )
}
