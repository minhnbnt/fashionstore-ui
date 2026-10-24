import { useState } from 'react'

import {
  useGetLowConversionProducts,
  useGetOutOfStockProducts,
  useGetSlowMovingProducts,
  useGetTopSellingProducts,
} from '@generated/endpoints/seller-statistics/seller-statistics'
import {
  ClockCounterClockwise,
  Package,
  Sparkle,
  TrendDown,
  WarningCircle,
} from '@phosphor-icons/react'

import { BarChart } from '@/components/ui/charts'
import { PLACEHOLDER_IMAGE, imageUrl, takeData } from '@/lib/apiAdapters'
import { formatVnd } from '@/lib/format'
import { productAnalyticsItems } from '@/lib/sellerStatsAdapters'

import type { ProductAnalyticsItem } from '@/types/seller'

interface Props {
  shopId: string
  onNavigateTab?: (tabId: string) => void
}

function resolveProductImage(key: string | null): string {
  if (key === null || key === '') {
    return PLACEHOLDER_IMAGE
  }
  return imageUrl(key)
}

export default function SellerStatsProductsTab({ shopId, onNavigateTab }: Props) {
  const [slowDays, setSlowDays] = useState(30)
  const isEnabled = shopId !== ''

  const topSellingQuery = useGetTopSellingProducts(
    shopId,
    { limit: 10 },
    { query: { enabled: isEnabled } },
  )

  const lowConversionQuery = useGetLowConversionProducts(
    shopId,
    { limit: 10 },
    { query: { enabled: isEnabled } },
  )

  const outOfStockQuery = useGetOutOfStockProducts(
    shopId,
    { query: { enabled: isEnabled } },
  )

  const slowMovingQuery = useGetSlowMovingProducts(
    shopId,
    { limit: 10 },
    { query: { enabled: isEnabled } },
  )

  // Adapters
  let topSelling: ProductAnalyticsItem[] = []
  if (topSellingQuery.data !== undefined) {
    topSelling = productAnalyticsItems(takeData(topSellingQuery.data))
  }

  let lowConversion: ProductAnalyticsItem[] = []
  if (lowConversionQuery.data !== undefined) {
    lowConversion = productAnalyticsItems(takeData(lowConversionQuery.data))
  }

  let outOfStock: ProductAnalyticsItem[] = []
  if (outOfStockQuery.data !== undefined) {
    outOfStock = productAnalyticsItems(takeData(outOfStockQuery.data))
  }

  let slowMoving: ProductAnalyticsItem[] = []
  if (slowMovingQuery.data !== undefined) {
    slowMoving = productAnalyticsItems(takeData(slowMovingQuery.data))
  }

  const topBarData = topSelling.slice(0, 5).map((p, index) => ({
    label: p.productName,
    value: p.totalRevenue,
    subLabel: `Đã bán ${p.totalSold}`,
    rank: index + 1,
    color: '#6366f1',
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 rounded-3xl border border-zinc-200/80 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-[#11182a]">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
            Hiệu Suất Sản Phẩm
          </span>
        </div>
        <h2 className="text-xl font-black text-zinc-900 dark:text-white">
          Phân Tích & Tối Ưu Sản Phẩm
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Nhận diện các sản phẩm bán chạy, sản phẩm xem nhiều mua ít và cảnh báo tồn kho để tối ưu kinh doanh
        </p>
      </div>

      {/* Top sản phẩm bán chạy nhất */}
      <div className="rounded-3xl border border-zinc-200/80 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-[#11182a]">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40">
              <Sparkle size={18} weight="bold" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                Top sản phẩm bán chạy nhất
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Xếp hạng theo tổng doanh thu mang lại cho Shop
              </p>
            </div>
          </div>
        </div>

        {/* Bar chart overview for top 5 */}
        {topBarData.length > 0 && (
          <div className="mb-6 rounded-2xl bg-zinc-50/60 p-4 dark:bg-white/5">
            <h4 className="mb-3 text-xs font-bold text-zinc-700 dark:text-zinc-300">
              Biểu đồ doanh thu Top 5
            </h4>
            <BarChart data={topBarData} horizontal={true} formatValue={formatVnd} />
          </div>
        )}

        {/* Table top selling */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                <th className="pb-3 font-semibold">Hạng</th>
                <th className="pb-3 font-semibold">Sản phẩm</th>
                <th className="pb-3 font-semibold text-right">Đã bán</th>
                <th className="pb-3 font-semibold text-right">Doanh thu</th>
                <th className="pb-3 font-semibold text-right">Lượt xem</th>
                <th className="pb-3 font-semibold text-right">Tồn kho</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
              {topSelling.map((item, index) => {
                let rankClass = 'bg-zinc-100 text-zinc-700 dark:bg-white/10 dark:text-zinc-300'
                if (index === 0) {
                  rankClass = 'bg-amber-500 text-white font-bold'
                }
                if (index === 1) {
                  rankClass = 'bg-slate-400 text-white font-bold'
                }
                if (index === 2) {
                  rankClass = 'bg-orange-500 text-white font-bold'
                }

                return (
                  <tr key={item.productId} className="hover:bg-zinc-50/50 dark:hover:bg-white/5">
                    <td className="py-3">
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${rankClass}`}
                      >
                        {index + 1}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={resolveProductImage(item.imageKey)}
                          alt={item.productName}
                          className="h-10 w-10 shrink-0 rounded-xl object-cover"
                        />
                        <span className="font-semibold text-zinc-900 dark:text-white line-clamp-2">
                          {item.productName}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 text-right font-medium text-zinc-700 tabular-nums dark:text-zinc-300">
                      {item.totalSold}
                    </td>
                    <td className="py-3 text-right font-bold text-indigo-600 tabular-nums dark:text-indigo-400">
                      {formatVnd(item.totalRevenue)}
                    </td>
                    <td className="py-3 text-right text-zinc-500 tabular-nums dark:text-zinc-400">
                      {item.viewCount.toLocaleString('vi-VN')}
                    </td>
                    <td className="py-3 text-right font-semibold text-zinc-900 tabular-nums dark:text-white">
                      {item.currentStock}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grid: Sản phẩm xem nhiều mua ít + Sản phẩm hết hàng & Tồn kho lâu */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Sản phẩm xem nhiều mua ít (Tỷ lệ chuyển đổi thấp) */}
        <div className="rounded-3xl border border-zinc-200/80 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-[#11182a]">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40">
                <TrendDown size={18} weight="bold" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Xem nhiều mua ít
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Cần tối ưu giá bán, hình ảnh hoặc voucher kích cầu
                </p>
              </div>
            </div>
          </div>

          {lowConversion.length === 0 && (
            <div className="py-8 text-center text-xs text-zinc-400 dark:text-zinc-500">
              Không có sản phẩm nào có tỷ lệ chuyển đổi bất thường
            </div>
          )}

          {lowConversion.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                    <th className="pb-2.5 font-semibold">Sản phẩm</th>
                    <th className="pb-2.5 font-semibold text-right">Lượt xem</th>
                    <th className="pb-2.5 font-semibold text-right">Đã bán</th>
                    <th className="pb-2.5 font-semibold text-right">Chuyển đổi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
                  {lowConversion.map((item) => {
                    const convPercent = Math.round(item.conversionRate * 100 * 10) / 10
                    return (
                      <tr key={item.productId} className="hover:bg-zinc-50/50 dark:hover:bg-white/5">
                        <td className="py-2.5">
                          <div className="flex items-center gap-2">
                            <img
                              src={resolveProductImage(item.imageKey)}
                              alt={item.productName}
                              className="h-8 w-8 shrink-0 rounded-lg object-cover"
                            />
                            <span className="font-medium text-zinc-800 dark:text-zinc-200 line-clamp-1 max-w-[160px]">
                              {item.productName}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 text-right tabular-nums text-zinc-500 dark:text-zinc-400">
                          {item.viewCount}
                        </td>
                        <td className="py-2.5 text-right tabular-nums text-zinc-800 dark:text-zinc-200 font-medium">
                          {item.totalSold}
                        </td>
                        <td className="py-2.5 text-right tabular-nums font-bold text-rose-500">
                          {convPercent}%
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Sản phẩm tồn kho lâu ngày */}
        <div className="rounded-3xl border border-zinc-200/80 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-[#11182a]">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40">
                <ClockCounterClockwise size={18} weight="bold" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Tồn kho lâu ngày
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Sản phẩm chưa phát sinh đơn hàng mới trong thời gian dài
                </p>
              </div>
            </div>

            {/* Filter 30/60/90 days */}
            <div className="flex rounded-full bg-zinc-100 p-0.5 dark:bg-white/5">
              <button
                type="button"
                onClick={() => setSlowDays(30)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                  slowDays === 30
                    ? 'bg-white text-indigo-600 shadow-sm dark:bg-indigo-600 dark:text-white'
                    : 'text-zinc-500 dark:text-zinc-400'
                }`}
              >
                30 ngày
              </button>
              <button
                type="button"
                onClick={() => setSlowDays(60)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                  slowDays === 60
                    ? 'bg-white text-indigo-600 shadow-sm dark:bg-indigo-600 dark:text-white'
                    : 'text-zinc-500 dark:text-zinc-400'
                }`}
              >
                60 ngày
              </button>
            </div>
          </div>

          {slowMoving.length === 0 && (
            <div className="py-8 text-center text-xs text-zinc-400 dark:text-zinc-500">
              Không có sản phẩm nào bị ứ đọng tồn kho quá {slowDays} ngày
            </div>
          )}

          {slowMoving.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                    <th className="pb-2.5 font-semibold">Sản phẩm</th>
                    <th className="pb-2.5 font-semibold text-right">Tồn kho</th>
                    <th className="pb-2.5 font-semibold text-right">Lượt xem</th>
                    <th className="pb-2.5 font-semibold text-right">Đề xuất</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
                  {slowMoving.map((item) => (
                    <tr key={item.productId} className="hover:bg-zinc-50/50 dark:hover:bg-white/5">
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <img
                            src={resolveProductImage(item.imageKey)}
                            alt={item.productName}
                            className="h-8 w-8 shrink-0 rounded-lg object-cover"
                          />
                          <span className="font-medium text-zinc-800 dark:text-zinc-200 line-clamp-1 max-w-[160px]">
                            {item.productName}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 text-right tabular-nums font-semibold text-zinc-900 dark:text-white">
                        {item.currentStock}
                      </td>
                      <td className="py-2.5 text-right tabular-nums text-zinc-500 dark:text-zinc-400">
                        {item.viewCount}
                      </td>
                      <td className="py-2.5 text-right">
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                          Xả kho / Sale
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Sản phẩm hết hàng thường xuyên (Cảnh báo tồn kho) */}
      {outOfStock.length > 0 && (
        <div className="rounded-3xl border border-rose-200/80 bg-rose-50/50 p-6 shadow-sm dark:border-rose-900/40 dark:bg-rose-950/20">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500 text-white">
                <WarningCircle size={18} weight="bold" />
              </div>
              <div>
                <h3 className="text-base font-bold text-rose-900 dark:text-rose-200">
                  Cảnh báo: Sản phẩm đã hết hàng ({outOfStock.length})
                </h3>
                <p className="text-xs text-rose-700 dark:text-rose-300">
                  Khách hàng không thể đặt hàng những sản phẩm này, hãy bổ sung kho ngay
                </p>
              </div>
            </div>

            {onNavigateTab !== undefined && (
              <button
                type="button"
                onClick={() => onNavigateTab('inventory')}
                className="flex items-center gap-1.5 rounded-full bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-rose-700"
              >
                <Package size={14} weight="bold" />
                Vào kho hàng
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {outOfStock.map((item) => (
              <div
                key={item.productId}
                className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-white p-3.5 shadow-sm dark:border-rose-800/40 dark:bg-[#11182a]"
              >
                <img
                  src={resolveProductImage(item.imageKey)}
                  alt={item.productName}
                  className="h-11 w-11 shrink-0 rounded-xl object-cover grayscale"
                />
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-xs font-semibold text-zinc-900 dark:text-white">
                    {item.productName}
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Đã từng bán: {item.totalSold} | Tồn: <span className="font-bold text-rose-600 dark:text-rose-400">0</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
