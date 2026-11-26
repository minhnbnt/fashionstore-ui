import { useState } from 'react'

import { useList5 } from '@generated/endpoints/seller-orders/seller-orders'
import {
  getListWithdrawalsQueryKey,
  getSummary1QueryKey,
  useByDay,
  useListWithdrawals,
  useRequestWithdrawal,
  useSettlements,
  useSummary1,
  useTopProducts,
} from '@generated/endpoints/seller-revenue-finance/seller-revenue-finance'
import { Bank, Clock, Receipt, TrendUp, Wallet, WarningCircle } from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import Modal from '@/components/Modal'
import { BarChart } from '@/components/ui/charts'
import { EmptyState } from '@/components/ui/EmptyState'
import { DashboardSkeleton } from '@/components/ui/Skeleton'
import { takeData } from '@/lib/api/apiAdapters'
import { formatDateTime, formatNumberWithDots, formatVnd, parseNumberFromDots } from '@/lib/format'
import { notify } from '@/lib/notifications'
import { settlementItem, withdrawalItem } from '@/lib/seller/sellerAdapters'
import { useSellerPermissions } from '@/lib/seller/sellerPermissions'
import {
  badgeToneClass,
  cn,
  iconChipClass,
  INPUT_CLASS,
  PANEL_CLASS,
  secondaryButtonClass,
  segmentedItemClass,
  segmentedTrackClass,
  successButtonClass,
} from '@/lib/ui/styles'

import type { SettlementItem, WithdrawalItem } from '@/types/seller'
import type { OrderResponse } from '@generated/model/orderResponse'
import type { RevenueSummaryResponse } from '@generated/model/revenueSummaryResponse'

interface Props {
  shopId: string
  bankName: string
  bankAccount: string
  bankHolder: string
}

const MIN_WITHDRAW_AMOUNT = 50000

export default function SellerRevenueTab({ shopId, bankName, bankAccount, bankHolder }: Props) {
  const { can } = useSellerPermissions(shopId)
  const queryClient = useQueryClient()
  const [subTab, setSubTab] = useState<'SETTLEMENTS' | 'WITHDRAWALS'>('SETTLEMENTS')
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState(0)

  const settlementsQuery = useSettlements({ shopId }, { query: { enabled: shopId !== '' } })
  const ordersQuery = useList5({ shopId }, { query: { enabled: shopId !== '' } })
  const withdrawalsQuery = useListWithdrawals({ shopId }, { query: { enabled: shopId !== '' } })
  const summaryQuery = useSummary1({ shopId }, { query: { enabled: shopId !== '' } })
  const byDayQuery = useByDay({ shopId }, { query: { enabled: shopId !== '' } })
  const topProductsQuery = useTopProducts(
    { shopId, limit: 3 },
    { query: { enabled: shopId !== '' } },
  )

  const requestWithdrawalMutation = useRequestWithdrawal({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getListWithdrawalsQueryKey({ shopId }) })
        void queryClient.invalidateQueries({ queryKey: getSummary1QueryKey({ shopId }) })
      },
    },
  })

  if (summaryQuery.isPending && byDayQuery.isPending) {
    return <DashboardSkeleton />
  }

  const orderById = new Map<string, OrderResponse>()
  if (ordersQuery.data !== undefined) {
    for (const o of takeData(ordersQuery.data)) {
      orderById.set(o.id ?? '', o)
    }
  }

  let settlements: SettlementItem[] = []
  if (settlementsQuery.data !== undefined) {
    settlements = takeData(settlementsQuery.data).map(function (s) {
      return settlementItem(s, orderById)
    })
  }

  let withdrawals: WithdrawalItem[] = []
  if (withdrawalsQuery.data !== undefined) {
    withdrawals = takeData(withdrawalsQuery.data).map(withdrawalItem)
  }

  let summary: RevenueSummaryResponse | undefined = undefined
  if (summaryQuery.data !== undefined) {
    summary = takeData(summaryQuery.data)
  }

  const chartData: { label: string; value: number; color: string }[] = []
  if (byDayQuery.data !== undefined) {
    for (const d of takeData(byDayQuery.data)) {
      chartData.push({
        label: formatDateTime(d.date),
        value: d.revenue ?? 0,
        color: '#1d4ed8',
      })
    }
  }

  const topProducts: { name: string; sold: number; revenue: number }[] = []
  if (topProductsQuery.data !== undefined) {
    for (const t of takeData(topProductsQuery.data)) {
      topProducts.push({
        name: t.productName ?? '',
        sold: t.soldQuantity ?? 0,
        revenue: t.totalRevenue ?? 0,
      })
    }
  }

  const walletBalance = summary?.walletBalance ?? 0
  const holdingBalance = summary?.holdingBalance ?? 0
  const totalRevenue = summary?.totalRevenue ?? 0
  const avgOrderValue = summary?.avgOrderValue ?? 0
  const totalOrders = summary?.totalOrders ?? 0

  const hasBankAccount =
    bankName.trim() !== '' && bankAccount.trim() !== '' && bankHolder.trim() !== ''
  const hasSufficientBalance = walletBalance >= MIN_WITHDRAW_AMOUNT

  function handleOpenWithdrawModal() {
    if (walletBalance >= MIN_WITHDRAW_AMOUNT) {
      setWithdrawAmount(Math.min(1000000, walletBalance))
    } else {
      setWithdrawAmount(0)
    }
    setShowWithdrawModal(true)
  }

  function handleCreateWithdrawal(amount: number) {
    requestWithdrawalMutation.mutate(
      {
        data: { shopId, amount, bankName, bankAccount, bankHolder },
      },
      {
        onSuccess: function () {
          setShowWithdrawModal(false)
          notify.success(`Đã tạo lệnh rút ${formatVnd(amount)} về tài khoản ngân hàng!`)
        },
        onError: function (err: unknown) {
          notify.fromError(err, undefined, 'Không thể tạo lệnh rút tiền. Vui lòng thử lại.')
        },
      },
    )
  }

  function handleConfirmWithdraw() {
    if (!hasBankAccount) {
      notify.warning(
        'Vui lòng cập nhật đầy đủ thông tin tài khoản ngân hàng trong Hồ sơ Shop trước khi rút tiền.',
      )
      return
    }
    if (!hasSufficientBalance) {
      notify.warning('Số dư ví khả dụng chưa đạt mức tối thiểu 50.000 ₫ để rút tiền.')
      return
    }
    if (Number.isNaN(withdrawAmount) || withdrawAmount < MIN_WITHDRAW_AMOUNT) {
      notify.warning('Số tiền rút tối thiểu là 50.000 ₫.')
      return
    }
    if (withdrawAmount > walletBalance) {
      notify.warning('Số tiền rút vượt quá số dư ví khả dụng hiện tại.')
      return
    }
    handleCreateWithdrawal(withdrawAmount)
  }

  function renderWithdrawalBadge(status: string) {
    if (status === 'COMPLETED') {
      return (
        <span
          className={cn(
            'rounded-full px-2.5 py-0.5 text-[11px] font-bold',
            badgeToneClass('success'),
          )}
        >
          Thành công
        </span>
      )
    }
    if (status === 'PROCESSING') {
      return (
        <span
          className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-bold', badgeToneClass('info'))}
        >
          Đang chuyển khoản
        </span>
      )
    }
    if (status === 'REQUESTED') {
      return (
        <span
          className={cn(
            'rounded-full px-2.5 py-0.5 text-[11px] font-bold',
            badgeToneClass('warning'),
          )}
        >
          Chờ xử lý
        </span>
      )
    }
    return (
      <span
        className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-bold', badgeToneClass('danger'))}
      >
        Từ chối
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-black text-[#17203a] dark:text-white">
            Tài chính & Doanh thu
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Quản lý dòng tiền bán hàng, các khoản quyết toán holding và rút tiền về ngân hàng
          </p>
        </div>
        {can('REVENUE_WITHDRAW') && (
          <button
            type="button"
            onClick={handleOpenWithdrawModal}
            className={cn(successButtonClass(), 'px-5 py-2.5 text-xs')}
          >
            <Bank size={18} weight="bold" />
            Yêu cầu rút tiền về ngân hàng
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className={PANEL_CLASS}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Số dư ví khả dụng
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
              <Wallet size={18} weight="bold" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-emerald-700 tabular-nums dark:text-emerald-300">
            {formatVnd(walletBalance)}
          </p>
          <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
            Có thể tạo lệnh rút ngay lập tức
          </p>
        </div>

        <div className={PANEL_CLASS}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Tiền tạm giữ (Escrow)
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
              <Clock size={18} weight="bold" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-amber-700 tabular-nums dark:text-amber-300">
            {formatVnd(holdingBalance)}
          </p>
          <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
            Tự động cộng ví sau 3 ngày giao hàng
          </p>
        </div>

        <div className={PANEL_CLASS}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Tổng doanh thu tuần
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
              <TrendUp size={18} weight="bold" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-[#17203a] tabular-nums dark:text-white">
            {formatVnd(totalRevenue)}
          </p>
          <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
            Tổng doanh thu ghi nhận được
          </p>
        </div>

        <div className={PANEL_CLASS}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Giá trị đơn TB (AOV)
            </span>
            <div className={cn(iconChipClass(), 'h-9 w-9')}>
              <Receipt size={18} weight="bold" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-[#17203a] tabular-nums dark:text-white">
            {formatVnd(avgOrderValue)}
          </p>
          <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
            Tổng cộng {totalOrders} đơn hoàn tất
          </p>
        </div>
      </div>

      {/* Biểu đồ Doanh thu 7 ngày & Top sản phẩm */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className={cn(PANEL_CLASS, 'p-6 lg:col-span-2')}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-[#17203a] dark:text-white">
                Biểu đồ Doanh thu (7 ngày gần nhất)
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Doanh thu ghi nhận theo từng ngày sau khi trừ hoàn hủy
              </p>
            </div>
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-700 dark:bg-white/10 dark:text-zinc-300">
              Đơn vị: VNĐ
            </span>
          </div>

          <div className="mt-6">
            <BarChart data={chartData} horizontal={false} height={220} formatValue={formatVnd} />
          </div>
        </div>

        {/* Top Sản Phẩm */}
        <div className={cn(PANEL_CLASS, 'p-6')}>
          <h3 className="text-base font-bold text-[#17203a] dark:text-white">
            Top Sản Phẩm Bán Chạy
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Sản phẩm tạo ra doanh số cao nhất
          </p>

          <div className="mt-4 space-y-3">
            {topProducts.map(function (item, idx) {
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-zinc-200/80 p-3 dark:border-white/10 dark:bg-white/5"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-100 text-[10px] font-black text-blue-700 dark:bg-sky-500/20 dark:text-sky-300">
                      {idx + 1}
                    </span>
                    <p className="truncate text-xs font-bold text-[#17203a] dark:text-zinc-200">
                      {item.name}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-zinc-500 dark:text-zinc-400">Đã bán: {item.sold}</span>
                    <span className="font-bold text-[#17203a] tabular-nums dark:text-white">
                      {formatVnd(item.revenue)}
                    </span>
                  </div>
                </div>
              )
            })}

            {topProducts.length === 0 && (
              <p className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                Chưa có dữ liệu sản phẩm bán chạy.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Quyết toán & Rút tiền */}
      <div className={cn(PANEL_CLASS, 'p-6')}>
        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200/80 pb-4 dark:border-white/10">
          <div className={segmentedTrackClass()}>
            <button
              type="button"
              onClick={function () {
                setSubTab('SETTLEMENTS')
              }}
              className={segmentedItemClass(subTab === 'SETTLEMENTS')}
            >
              Phiên quyết toán đơn hàng ({settlements.length})
            </button>
            <button
              type="button"
              onClick={function () {
                setSubTab('WITHDRAWALS')
              }}
              className={segmentedItemClass(subTab === 'WITHDRAWALS')}
            >
              Lịch sử rút tiền ({withdrawals.length})
            </button>
          </div>
        </div>

        {subTab === 'SETTLEMENTS' && (
          <div className="mt-4 overflow-x-auto">
            {settlements.length === 0 && (
              <EmptyState
                icon={<Receipt size={26} weight="bold" />}
                title="Chưa có phiên quyết toán nào"
                description="Các đơn hàng đã hoàn tất sẽ hiển thị phiên đối soát và lịch mở khóa tiền về ví tại đây."
              />
            )}

            {settlements.length > 0 && (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-200/80 text-[11px] font-bold text-zinc-500 uppercase dark:border-white/10 dark:text-zinc-400">
                    <th className="pb-3 pl-2">Mã đơn hàng</th>
                    <th className="pb-3">Tiền đơn hàng</th>
                    <th className="pb-3">Phí sàn (5%)</th>
                    <th className="pb-3">Doanh thu nhận về</th>
                    <th className="pb-3">Trạng thái</th>
                    <th className="pr-2 pb-3 text-right">Thời gian mở khóa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-white/10">
                  {settlements.map(function (s) {
                    return (
                      <tr key={s.id}>
                        <td className="py-3 pl-2 font-mono font-bold text-[#17203a] dark:text-white">
                          {s.orderCode}
                        </td>
                        <td className="py-3 text-zinc-700 tabular-nums dark:text-zinc-300">
                          {formatVnd(s.grossAmount)}
                        </td>
                        <td className="py-3 text-rose-600 tabular-nums dark:text-rose-400">
                          -{formatVnd(s.platformFee)}
                        </td>
                        <td className="py-3 font-bold text-emerald-700 tabular-nums dark:text-emerald-300">
                          {formatVnd(s.netAmount)}
                        </td>
                        <td className="py-3">
                          {s.status === 'HOLDING' && (
                            <span
                              className={cn(
                                'rounded-full px-2.5 py-0.5 text-[11px] font-bold',
                                badgeToneClass('warning'),
                              )}
                            >
                              Đang giữ đối soát
                            </span>
                          )}
                          {s.status === 'RELEASED' && (
                            <span
                              className={cn(
                                'rounded-full px-2.5 py-0.5 text-[11px] font-bold',
                                badgeToneClass('success'),
                              )}
                            >
                              Đã cộng ví
                            </span>
                          )}
                        </td>
                        <td className="py-3 pr-2 text-right font-medium text-zinc-500 dark:text-zinc-400">
                          {s.status === 'HOLDING' && <span>Dự kiến: {s.holdUntil}</span>}
                          {s.status === 'RELEASED' && <span>{s.releasedAt}</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {subTab === 'WITHDRAWALS' && (
          <div className="mt-4 overflow-x-auto">
            {withdrawals.length === 0 && (
              <EmptyState
                icon={<Bank size={26} weight="bold" />}
                title="Chưa có lệnh rút tiền nào"
                description="Lịch sử rút tiền từ ví shop về tài khoản ngân hàng thụ hưởng sẽ được ghi nhận tại đây."
              />
            )}

            {withdrawals.length > 0 && (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-200/80 text-[11px] font-bold text-zinc-500 uppercase dark:border-white/10 dark:text-zinc-400">
                    <th className="pb-3 pl-2">Thời gian</th>
                    <th className="pb-3">Số tiền rút</th>
                    <th className="pb-3">Ngân hàng thụ hưởng</th>
                    <th className="pb-3">Số tài khoản & Chủ TK</th>
                    <th className="pr-2 pb-3 text-right">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-white/10">
                  {withdrawals.map(function (w) {
                    return (
                      <tr key={w.id}>
                        <td className="py-3 pl-2 text-zinc-500 dark:text-zinc-400">
                          {w.createdAt}
                        </td>
                        <td className="py-3 font-bold text-[#17203a] tabular-nums dark:text-white">
                          {formatVnd(w.amount)}
                        </td>
                        <td className="py-3 text-zinc-700 dark:text-zinc-300">{w.bankName}</td>
                        <td className="py-3 text-zinc-600 dark:text-zinc-400">
                          {w.bankAccount} • {w.bankHolder}
                        </td>
                        <td className="py-3 pr-2 text-right">{renderWithdrawalBadge(w.status)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Modal Rút tiền */}
      {showWithdrawModal && (
        <Modal
          title="Rút tiền về tài khoản ngân hàng"
          onClose={function () {
            setShowWithdrawModal(false)
          }}
          widthClass="max-w-md"
        >
          <div className="mt-4 space-y-1.5 rounded-2xl border border-zinc-200/80 bg-zinc-50 p-3.5 text-xs text-zinc-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300">
            <p className="flex justify-between">
              <span>Số dư ví khả dụng:</span>
              <strong className="text-emerald-700 dark:text-emerald-300">
                {formatVnd(walletBalance)}
              </strong>
            </p>
            <p className="flex justify-between gap-2">
              <span className="shrink-0">Tài khoản nhận tiền:</span>
              <strong className="truncate text-right">
                {hasBankAccount && `${bankName} - ${bankAccount}`}
                {!hasBankAccount && 'Chưa thiết lập'}
              </strong>
            </p>
            <p className="flex justify-between gap-2">
              <span className="shrink-0">Chủ tài khoản:</span>
              <strong className="truncate text-right">
                {hasBankAccount && bankHolder}
                {!hasBankAccount && '—'}
              </strong>
            </p>
          </div>

          {!hasBankAccount && (
            <div className="mt-3 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300">
              <WarningCircle size={16} weight="bold" className="mt-0.5 shrink-0" />
              <span>
                Bạn chưa cấu hình đầy đủ tài khoản ngân hàng. Vui lòng cập nhật trong mục Hồ sơ Shop
                & KYC trước khi tạo lệnh rút tiền.
              </span>
            </div>
          )}

          {hasBankAccount && !hasSufficientBalance && (
            <div className="mt-3 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300">
              <WarningCircle size={16} weight="bold" className="mt-0.5 shrink-0" />
              <span>Số dư ví khả dụng cần tối thiểu 50.000 ₫ để thực hiện rút tiền.</span>
            </div>
          )}

          <div className="mt-4">
            <label
              htmlFor="withdrawAmountInput"
              className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
            >
              Số tiền muốn rút (VND, tối thiểu 50.000 ₫)
            </label>
            <input
              id="withdrawAmountInput"
              type="text"
              inputMode="numeric"
              disabled={!hasBankAccount || !hasSufficientBalance}
              value={formatNumberWithDots(withdrawAmount)}
              onChange={function (e) {
                setWithdrawAmount(parseNumberFromDots(e.target.value) ?? 0)
              }}
              className={cn(INPUT_CLASS, 'mt-1.5 font-black tabular-nums disabled:opacity-50')}
            />
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={function () {
                setShowWithdrawModal(false)
              }}
              className={cn(secondaryButtonClass(), 'text-xs')}
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={
                requestWithdrawalMutation.isPending || !hasBankAccount || !hasSufficientBalance
              }
              onClick={handleConfirmWithdraw}
              className={cn(successButtonClass(), 'px-5 text-xs')}
            >
              Tạo lệnh rút tiền ngay
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
