import { useState } from 'react'

import { useList5 } from '@generated/endpoints/seller-orders/seller-orders'
import {
  getListWithdrawalsQueryKey,
  getSummaryQueryKey,
  useByDay,
  useListWithdrawals,
  useRequestWithdrawal,
  useSettlements,
  useSummary,
  useTopProducts,
} from '@generated/endpoints/seller-revenue-finance/seller-revenue-finance'
import { Wallet, Clock, Receipt, TrendUp, Bank, CheckCircle } from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import Modal from '@/components/Modal'
import { takeData } from '@/lib/apiAdapters'
import { settlementItem, withdrawalItem } from '@/lib/sellerAdapters'
import { useSellerPermissions } from '@/lib/sellerPermissions'

import { formatDateTime, formatVnd } from '../../lib/format'

import type { SettlementItem, WithdrawalItem } from '@/types/seller'
import type { OrderResponse } from '@generated/model/orderResponse'
import type { RevenueSummaryResponse } from '@generated/model/revenueSummaryResponse'

interface Props {
  shopId: string
  bankName: string
  bankAccount: string
  bankHolder: string
}

function settlementTabClass(active: boolean): string {
  if (active) {
    return 'text-xs font-bold transition text-indigo-600 dark:text-indigo-400'
  }
  return 'text-xs font-bold transition text-zinc-400 hover:text-zinc-700'
}

export default function SellerRevenueTab({ shopId, bankName, bankAccount, bankHolder }: Props) {
  const { can } = useSellerPermissions(shopId)
  const queryClient = useQueryClient()
  const [subTab, setSubTab] = useState<'SETTLEMENTS' | 'WITHDRAWALS'>('SETTLEMENTS')
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState(1000000)
  const [notification, setNotification] = useState<string | null>(null)

  const settlementsQuery = useSettlements({ shopId }, { query: { enabled: shopId !== '' } })
  // Danh mục đơn hàng để resolve mã đơn cho từng phiên quyết toán
  const ordersQuery = useList5({ shopId }, { query: { enabled: shopId !== '' } })
  const withdrawalsQuery = useListWithdrawals({ shopId }, { query: { enabled: shopId !== '' } })
  const summaryQuery = useSummary({ shopId }, { query: { enabled: shopId !== '' } })
  const byDayQuery = useByDay({ shopId }, { query: { enabled: shopId !== '' } })
  const topProductsQuery = useTopProducts(
    { shopId, limit: 3 },
    { query: { enabled: shopId !== '' } },
  )

  const requestWithdrawalMutation = useRequestWithdrawal({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getListWithdrawalsQueryKey({ shopId }) })
        void queryClient.invalidateQueries({ queryKey: getSummaryQueryKey({ shopId }) })
      },
    },
  })

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

  const chart: { day: string; revenue: number }[] = []
  if (byDayQuery.data !== undefined) {
    for (const d of takeData(byDayQuery.data)) {
      chart.push({ day: formatDateTime(d.date), revenue: d.revenue ?? 0 })
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

  function handleCreateWithdrawal(amount: number) {
    requestWithdrawalMutation.mutate({
      data: { shopId, amount, bankName, bankAccount, bankHolder },
    })
  }

  const walletBalance = summary?.walletBalance ?? 0
  const holdingBalance = summary?.holdingBalance ?? 0
  const totalRevenue = summary?.totalRevenue ?? 0
  const avgOrderValue = summary?.avgOrderValue ?? 0
  const totalOrders = summary?.totalOrders ?? 0

  // Chiều cao cột biểu đồ tính theo % so với ngày cao nhất
  let maxRevenue = 0
  for (const d of chart) {
    if (d.revenue > maxRevenue) {
      maxRevenue = d.revenue
    }
  }
  const chartBars = chart.map(function (d) {
    let height = 4
    if (maxRevenue > 0) {
      height = Math.max(4, Math.round((d.revenue / maxRevenue) * 100))
    }
    return { ...d, height }
  })

  function showToast(msg: string) {
    setNotification(msg)
    setTimeout(function () {
      setNotification(null)
    }, 3000)
  }

  function handleConfirmWithdraw() {
    if (withdrawAmount < 50000) {
      alert('Số tiền rút tối thiểu là 50.000 ₫.')
      return
    }
    if (withdrawAmount > walletBalance) {
      alert('Số tiền rút vượt quá số dư ví khả dụng hiện tại.')
      return
    }
    handleCreateWithdrawal(withdrawAmount)
    setShowWithdrawModal(false)
    showToast(`Đã tạo lệnh rút ${formatVnd(withdrawAmount)} về tài khoản ngân hàng!`)
  }

  function renderWithdrawalBadge(status: string) {
    if (status === 'COMPLETED') {
      return (
        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
          Thành công
        </span>
      )
    }
    if (status === 'PROCESSING') {
      return (
        <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
          Đang chuyển khoản
        </span>
      )
    }
    if (status === 'REQUESTED') {
      return (
        <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
          Chờ xử lý
        </span>
      )
    }
    return (
      <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-bold text-red-600 dark:bg-red-950/40 dark:text-red-400">
        Từ chối
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {notification !== null && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-bold text-white shadow-xl dark:bg-white dark:text-zinc-900">
          <CheckCircle size={18} weight="bold" className="text-emerald-400" />
          {notification}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-black text-zinc-900 dark:text-white">
            Tài chính & Doanh thu
          </h2>
          <p className="text-xs text-zinc-500">
            Quản lý dòng tiền bán hàng, các khoản quyết toán holding và rút tiền về ngân hàng
          </p>
        </div>
        {can('REVENUE_WITHDRAW') && (
          <button
            type="button"
            onClick={function () {
              setShowWithdrawModal(true)
            }}
            className="flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700"
          >
            <Bank size={18} weight="bold" />
            Yêu cầu rút tiền về ngân hàng
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-zinc-200/80 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-[#11182a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500">Số dư ví khả dụng</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40">
              <Wallet size={18} weight="bold" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {formatVnd(walletBalance)}
          </p>
          <p className="mt-1 text-[11px] text-zinc-400">Có thể tạo lệnh rút ngay lập tức</p>
        </div>

        <div className="rounded-3xl border border-zinc-200/80 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-[#11182a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500">Tiền tạm giữ (Escrow)</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40">
              <Clock size={18} weight="bold" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-amber-600 dark:text-amber-400">
            {formatVnd(holdingBalance)}
          </p>
          <p className="mt-1 text-[11px] text-zinc-400">Tự động cộng ví sau 3 ngày giao hàng</p>
        </div>

        <div className="rounded-3xl border border-zinc-200/80 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-[#11182a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500">Tổng doanh thu tuần</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40">
              <TrendUp size={18} weight="bold" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-zinc-900 dark:text-white">
            {formatVnd(totalRevenue)}
          </p>
          <p className="mt-1 text-[11px] text-zinc-400">Tổng doanh thu ghi nhận được</p>
        </div>

        <div className="rounded-3xl border border-zinc-200/80 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-[#11182a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500">Giá trị đơn TB (AOV)</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40">
              <Receipt size={18} weight="bold" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-zinc-900 dark:text-white">
            {formatVnd(avgOrderValue)}
          </p>
          <p className="mt-1 text-[11px] text-zinc-400">Tổng cộng {totalOrders} đơn hoàn tất</p>
        </div>
      </div>

      {/* Biểu đồ Doanh thu 7 ngày & Top sản phẩm */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Biểu đồ cột */}
        <div className="rounded-3xl border border-zinc-200/80 bg-white/80 p-6 shadow-sm lg:col-span-2 dark:border-white/10 dark:bg-[#11182a]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                Biểu đồ Doanh thu (7 ngày gần nhất)
              </h3>
              <p className="text-xs text-zinc-500">
                Doanh thu ghi nhận theo từng ngày sau khi trừ hoàn hủy
              </p>
            </div>
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-700 dark:bg-white/10 dark:text-zinc-300">
              Đơn vị: VNĐ
            </span>
          </div>

          <div className="mt-8 flex h-52 items-end justify-between gap-3 border-b border-zinc-200 px-2 pb-2 dark:border-white/10">
            {chartBars.map(function (d) {
              return (
                <div key={d.day} className="group relative flex flex-1 flex-col items-center gap-2">
                  <div className="invisible absolute -top-8 rounded-lg bg-zinc-900 px-2 py-1 text-[10px] font-bold text-white shadow-md group-hover:visible dark:bg-white dark:text-zinc-900">
                    {formatVnd(d.revenue)}
                  </div>
                  <div
                    style={{ height: d.height + '%' }}
                    className="w-full max-w-[36px] rounded-t-xl bg-gradient-to-t from-blue-700 to-sky-400 transition-all duration-300 hover:brightness-110"
                  />
                  <span className="text-[10px] font-semibold text-zinc-500">{d.day}</span>
                </div>
              )
            })}
          </div>

          {chartBars.length === 0 && (
            <p className="py-10 text-center text-sm text-zinc-400">
              Chưa có doanh thu nào được ghi nhận gần đây.
            </p>
          )}
        </div>

        {/* Top Sản Phẩm */}
        <div className="rounded-3xl border border-zinc-200/80 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-[#11182a]">
          <h3 className="text-base font-bold text-zinc-900 dark:text-white">
            Top Sản Phẩm Bán Chạy
          </h3>
          <p className="text-xs text-zinc-500">Sản phẩm tạo ra doanh số cao nhất</p>

          <div className="mt-4 space-y-3">
            {topProducts.map(function (item, idx) {
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-zinc-100 p-3 dark:border-white/10"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-black text-indigo-600 dark:bg-indigo-900/40">
                      {idx + 1}
                    </span>
                    <p className="truncate text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      {item.name}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Đã bán: {item.sold}</span>
                    <span className="font-bold text-zinc-900 dark:text-white">
                      {formatVnd(item.revenue)}
                    </span>
                  </div>
                </div>
              )
            })}

            {topProducts.length === 0 && (
              <p className="py-6 text-center text-sm text-zinc-400">
                Chưa có dữ liệu sản phẩm bán chạy.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Quyết toán & Rút tiền */}
      <div className="rounded-3xl border border-zinc-200/80 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-[#11182a]">
        <div className="flex items-center gap-4 border-b border-zinc-100 pb-3 dark:border-white/10">
          <button
            type="button"
            onClick={function () {
              setSubTab('SETTLEMENTS')
            }}
            className={settlementTabClass(subTab === 'SETTLEMENTS')}
          >
            Phiên quyết toán đơn hàng ({settlements.length})
          </button>
          <button
            type="button"
            onClick={function () {
              setSubTab('WITHDRAWALS')
            }}
            className={settlementTabClass(subTab === 'WITHDRAWALS')}
          >
            Lịch sử rút tiền ({withdrawals.length})
          </button>
        </div>

        {subTab === 'SETTLEMENTS' && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-100 text-[11px] font-bold text-zinc-400 uppercase dark:border-white/10">
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
                      <td className="py-3 pl-2 font-mono font-bold text-zinc-900 dark:text-white">
                        {s.orderCode}
                      </td>
                      <td className="py-3 text-zinc-700 dark:text-zinc-300">
                        {formatVnd(s.grossAmount)}
                      </td>
                      <td className="py-3 text-red-500">-{formatVnd(s.platformFee)}</td>
                      <td className="py-3 font-bold text-emerald-600 dark:text-emerald-400">
                        {formatVnd(s.netAmount)}
                      </td>
                      <td className="py-3">
                        {s.status === 'HOLDING' && (
                          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                            Đang giữ đối soát
                          </span>
                        )}
                        {s.status === 'RELEASED' && (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                            Đã cộng ví
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-2 text-right font-medium text-zinc-500">
                        {s.status === 'HOLDING' && <span>Dự kiến: {s.holdUntil}</span>}
                        {s.status === 'RELEASED' && <span>{s.releasedAt}</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {subTab === 'WITHDRAWALS' && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-100 text-[11px] font-bold text-zinc-400 uppercase dark:border-white/10">
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
                      <td className="py-3 pl-2 text-zinc-500">{w.createdAt}</td>
                      <td className="py-3 font-bold text-zinc-900 dark:text-white">
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
          <div className="mt-4 space-y-1 rounded-2xl bg-zinc-50 p-3.5 text-xs text-zinc-700 dark:bg-white/5 dark:text-zinc-300">
            <p className="flex justify-between">
              <span>Số dư ví khả dụng:</span>
              <strong className="text-emerald-600">{formatVnd(walletBalance)}</strong>
            </p>
            <p className="flex justify-between">
              <span>Tài khoản nhận tiền:</span>
              <strong>
                {bankName} - {bankAccount}
              </strong>
            </p>
            <p className="flex justify-between">
              <span>Chủ tài khoản:</span>
              <strong>{bankHolder}</strong>
            </p>
          </div>

          <div className="mt-4">
            <label
              htmlFor="withdrawAmountInput"
              className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
            >
              Số tiền muốn rút (VND, tối thiểu 50.000 ₫)
            </label>
            <input
              id="withdrawAmountInput"
              type="number"
              value={withdrawAmount}
              onChange={function (e) {
                setWithdrawAmount(Number(e.target.value))
              }}
              className="mt-1.5 w-full rounded-full border border-zinc-300 p-2.5 text-sm font-black outline-none focus:border-blue-600 dark:border-white/15 dark:bg-white/10 dark:text-white"
            />
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={function () {
                setShowWithdrawModal(false)
              }}
              className="rounded-2xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-300"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleConfirmWithdraw}
              className="rounded-2xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700"
            >
              Tạo lệnh rút tiền ngay
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
