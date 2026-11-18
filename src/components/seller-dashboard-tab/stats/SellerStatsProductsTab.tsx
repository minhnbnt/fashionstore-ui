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
import { DashboardSkeleton } from '@/components/ui/Skeleton'
import { PLACEHOLDER_IMAGE, takeData, urlOrPlaceholder } from '@/lib/api/apiAdapters'
import { formatVnd } from '@/lib/format'
import { productAnalyticsItems } from '@/lib/seller/sellerStatsAdapters'
import { badgeToneClass, cn, dangerButtonClass, PANEL_CLASS } from '@/lib/ui/styles'

import type { ProductAnalyticsItem } from '@/types/seller'

interface Props {
  shopId: string
  onNavigateTab?: (tabId: string, params?: Record<string, string>) => void
}

function resolveProductImage(key: string | null): string {
  if (key === null || key === '') {
    return PLACEHOLDER_IMAGE
  }
  return urlOrPlaceholder(key)
}

function handleImageError(event: React.SyntheticEvent<HTMLImageElement>) {
  const target = event.currentTarget
  if (target.src !== PLACEHOLDER_IMAGE) {
    target.src = PLACEHOLDER_IMAGE
  }
}

export default function SellerStatsProductsTab({ shopId, onNavigateTab }: Props) {
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
  const outOfStockQuery = useGetOutOfStockProducts(shopId, { query: { enabled: isEnabled } })
  const slowMovingQuery = useGetSlowMovingProducts(
    shopId,
    { limit: 10 },
    { query: { enabled: isEnabled } },
  )

  if (topSellingQuery.isPending && lowConversionQuery.isPending) {
    return <DashboardSkeleton />
  }

  const hasError =
    topSellingQuery.isError ||
    lowConversionQuery.isError ||
    outOfStockQuery.isError ||
    slowMovingQuery.isError

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

  const topBarData = topSelling.slice(0, 5).map(function (p, index) {
    return {
      label: p.productName,
      value: p.totalRevenue,
      subLabel: `Đã bán ${p.totalSold}`,
      rank: index + 1,
      color: '#1d4ed8',
    }
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={cn(PANEL_CLASS, 'flex flex-col gap-2 p-6')}>
        <div className="flex items-center gap-2">
          <span className={cn('rounded-full px-3 py-1 text-xs font-bold', badgeToneClass('info'))}>
            Hiệu Suất Sản Phẩm
          </span>
        </div>
        <h2 className="text-xl font-black text-[#17203a] dark:text-white">
          Phân Tích & Tối Ưu Sản Phẩm
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Nhận diện các sản phẩm bán chạy, sản phẩm xem nhiều mua ít và cảnh báo tồn kho để tối ưu
          kinh doanh
        </p>
      </div>

      {hasError && (
        <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300">
          <WarningCircle size={16} weight="bold" className="shrink-0" />
          <span>Không thể tải đầy đủ dữ liệu phân tích sản phẩm. Vui lòng thử lại sau.</span>
        </div>
      )}

      {/* Top sản phẩm bán chạy nhất */}
      <div className={cn(PANEL_CLASS, 'p-6')}>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
              <Sparkle size={18} weight="bold" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#17203a] dark:text-white">
                Top sản phẩm bán chạy nhất
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Xếp hạng theo tổng doanh thu mang lại cho Shop
              </p>
            </div>
          </div>
        </div>

        {topBarData.length > 0 && (
          <div className="mb-6 rounded-2xl bg-zinc-50/70 p-4 dark:bg-white/5">
            <h4 className="mb-3 text-xs font-bold text-zinc-700 dark:text-zinc-300">
              Biểu đồ doanh thu Top 5
            </h4>
            <BarChart data={topBarData} horizontal={true} formatValue={formatVnd} />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                <th className="pb-3 font-semibold">Hạng</th>
                <th className="pb-3 font-semibold">Sản phẩm</th>
                <th className="pb-3 text-right font-semibold">Đã bán</th>
                <th className="pb-3 text-right font-semibold">Doanh thu</th>
                <th className="pb-3 text-right font-semibold">Lượt xem</th>
                <th className="pb-3 text-right font-semibold">Tồn kho</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
              {topSelling.map(function (item, index) {
                let rankClass = 'bg-zinc-100 text-zinc-700 dark:bg-white/10 dark:text-zinc-300'
                if (index === 0) {
                  rankClass = 'bg-amber-500 text-white font-bold'
                }
                if (index === 1) {
                  rankClass = 'bg-slate-400 text-white font-bold'
                }
                if (index === 2) {
                  rankClass = 'bg-amber-700 text-white font-bold'
                }

                return (
                  <tr key={item.productId} className="hover:bg-zinc-50/50 dark:hover:bg-white/5">
                    <td className="py-3">
                      <span
                        className={cn(
                          'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs',
                          rankClass,
                        )}
                      >
                        {index + 1}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={resolveProductImage(item.imageUrl)}
                          alt={item.productName}
                          onError={handleImageError}
                          className="h-10 w-10 shrink-0 rounded-2xl object-cover"
                        />
                        <span className="line-clamp-2 font-semibold text-[#17203a] dark:text-white">
                          {item.productName}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 text-right font-medium text-zinc-700 tabular-nums dark:text-zinc-300">
                      {item.totalSold}
                    </td>
                    <td className="py-3 text-right font-bold text-blue-700 tabular-nums dark:text-sky-300">
                      {formatVnd(item.totalRevenue)}
                    </td>
                    <td className="py-3 text-right text-zinc-500 tabular-nums dark:text-zinc-400">
                      {item.viewCount.toLocaleString('vi-VN')}
                    </td>
                    <td className="py-3 text-right font-semibold text-[#17203a] tabular-nums dark:text-white">
                      {item.currentStock}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {topSelling.length === 0 && (
            <div className="py-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
              Chưa có dữ liệu sản phẩm bán chạy.
            </div>
          )}
        </div>
      </div>

      {/* Grid: Sản phẩm xem nhiều mua ít + Sản phẩm tồn kho chậm */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className={cn(PANEL_CLASS, 'p-6')}>
          <div className="mb-4 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
              <TrendDown size={18} weight="bold" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#17203a] dark:text-white">
                Xem nhiều mua ít
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Cần tối ưu giá bán, hình ảnh hoặc mô tả sản phẩm
              </p>
            </div>
          </div>

          {lowConversion.length === 0 && (
            <div className="py-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
              Không có sản phẩm nào có tỷ lệ chuyển đổi bất thường
            </div>
          )}

          {lowConversion.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                    <th className="pb-2.5 font-semibold">Sản phẩm</th>
                    <th className="pb-2.5 text-right font-semibold">Lượt xem</th>
                    <th className="pb-2.5 text-right font-semibold">Đã bán</th>
                    <th className="pb-2.5 text-right font-semibold">Chuyển đổi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
                  {lowConversion.map(function (item) {
                    const convPercent = Math.round(item.conversionRate * 100 * 10) / 10
                    return (
                      <tr
                        key={item.productId}
                        className="hover:bg-zinc-50/50 dark:hover:bg-white/5"
                      >
                        <td className="py-2.5">
                          <div className="flex items-center gap-2">
                            <img
                              src={resolveProductImage(item.imageUrl)}
                              alt={item.productName}
                              onError={handleImageError}
                              className="h-9 w-9 shrink-0 rounded-2xl object-cover"
                            />
                            <span className="line-clamp-1 max-w-[160px] font-medium text-[#17203a] dark:text-zinc-200">
                              {item.productName}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 text-right text-zinc-500 tabular-nums dark:text-zinc-400">
                          {item.viewCount}
                        </td>
                        <td className="py-2.5 text-right font-medium text-zinc-800 tabular-nums dark:text-zinc-200">
                          {item.totalSold}
                        </td>
                        <td className="py-2.5 text-right font-bold text-rose-600 tabular-nums dark:text-rose-400">
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

        {/* Sản phẩm tồn kho chậm */}
        <div className={cn(PANEL_CLASS, 'p-6')}>
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                <ClockCounterClockwise size={18} weight="bold" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#17203a] dark:text-white">
                  Tồn kho chậm luân chuyển
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Top 10 sản phẩm tồn kho cao nhưng chưa phát sinh đơn hàng gần đây
                </p>
              </div>
            </div>

            <span
              className={cn(
                'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold',
                badgeToneClass('warning'),
              )}
            >
              Top 10
            </span>
          </div>

          {slowMoving.length === 0 && (
            <div className="py-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
              Không có sản phẩm nào đang bị ứ đọng tồn kho
            </div>
          )}

          {slowMoving.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                    <th className="pb-2.5 font-semibold">Sản phẩm</th>
                    <th className="pb-2.5 text-right font-semibold">Tồn kho</th>
                    <th className="pb-2.5 text-right font-semibold">Lượt xem</th>
                    <th className="pb-2.5 text-right font-semibold">Đề xuất</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
                  {slowMoving.map(function (item) {
                    return (
                      <tr
                        key={item.productId}
                        className="hover:bg-zinc-50/50 dark:hover:bg-white/5"
                      >
                        <td className="py-2.5">
                          <div className="flex items-center gap-2">
                            <img
                              src={resolveProductImage(item.imageUrl)}
                              alt={item.productName}
                              onError={handleImageError}
                              className="h-9 w-9 shrink-0 rounded-2xl object-cover"
                            />
                            <span className="line-clamp-1 max-w-[160px] font-medium text-[#17203a] dark:text-zinc-200">
                              {item.productName}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 text-right font-semibold text-[#17203a] tabular-nums dark:text-white">
                          {item.currentStock}
                        </td>
                        <td className="py-2.5 text-right text-zinc-500 tabular-nums dark:text-zinc-400">
                          {item.viewCount}
                        </td>
                        <td className="py-2.5 text-right">
                          <span
                            className={cn(
                              'rounded-full px-2.5 py-0.5 text-[10px] font-bold',
                              badgeToneClass('warning'),
                            )}
                          >
                            Xả kho / Sale
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Sản phẩm hết hàng */}
      {outOfStock.length > 0 && (
        <div className="rounded-3xl border border-rose-200/80 bg-rose-50/50 p-6 shadow-sm dark:border-rose-500/30 dark:bg-rose-500/10">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-600 text-white">
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
                onClick={function () {
                  onNavigateTab('inventory', { filter: 'low_stock' })
                }}
                className={cn(dangerButtonClass(), 'px-4 py-2 text-xs')}
              >
                <Package size={14} weight="bold" />
                Vào kho hàng
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {outOfStock.map(function (item) {
              return (
                <div
                  key={item.productId}
                  className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-white p-3.5 shadow-xs dark:border-rose-500/30 dark:bg-[#11182a]"
                >
                  <img
                    src={resolveProductImage(item.imageUrl)}
                    alt={item.productName}
                    onError={handleImageError}
                    className="h-11 w-11 shrink-0 rounded-2xl object-cover grayscale"
                  />
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate text-xs font-semibold text-[#17203a] dark:text-white">
                      {item.productName}
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Đã từng bán: {item.totalSold} | Tồn:{' '}
                      <span className="font-bold text-rose-600 dark:text-rose-400">0</span>
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
