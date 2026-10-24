import { useState } from 'react'
import { useSearchParams } from 'react-router'

import {
  useMovements,
  getInventoryQueryKey,
  getMovementsQueryKey,
  useAdjustStock,
  useInventory,
  useListProducts,
} from '@generated/endpoints/seller-products-inventory/seller-products-inventory'
import {
  WarningCircle,
  ClockCounterClockwise,
  PencilSimple,
  CheckCircle,
  MagnifyingGlass,
  ArrowUp,
  ArrowDown,
} from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import Modal from '@/components/Modal'
import { apiErrorMessage, takeData } from '@/lib/apiAdapters'
import { productItem, stockMovementItem } from '@/lib/sellerAdapters'
import { useSellerPermissions } from '@/lib/sellerPermissions'

import type { ProductItem, StockMovementItem } from '@/types/seller'
import type { InventoryItemResponse } from '@generated/model/inventoryItemResponse'

interface Props {
  shopId: string
}

type AdjustReason = 'RESTOCK' | 'DAMAGE' | 'RETURN' | 'AUDIT' | 'MANUAL'

export default function SellerInventoryTab({ shopId }: Props) {
  const { can } = useSellerPermissions(shopId)
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  const filterParam = searchParams.get('filter')
  let activeFilter: 'ALL' | 'LOW_STOCK' = 'ALL'
  if (filterParam === 'low_stock') {
    activeFilter = 'LOW_STOCK'
  }
  const [searchTerm, setSearchTerm] = useState('')
  const [showAdjustModal, setShowAdjustModal] = useState(false)
  const [historyVariant, setHistoryVariant] = useState<InventoryItemResponse | null>(null)
  const [adjustVariant, setAdjustVariant] = useState<InventoryItemResponse | null>(null)
  const [adjustQty, setAdjustQty] = useState(10)
  const [adjustReason, setAdjustReason] = useState<AdjustReason>('RESTOCK')
  const [notification, setNotification] = useState<string | null>(null)

  const inventoryQuery = useInventory(shopId, undefined, { query: { enabled: shopId !== '' } })
  // Chỉ để lấy ảnh sản phẩm cho từng dòng tồn kho
  const productsQuery = useListProducts(shopId, undefined, { query: { enabled: shopId !== '' } })

  const adjustStockMutation = useAdjustStock({
    mutation: {
      onSuccess: function (_data, variables) {
        void queryClient.invalidateQueries({ queryKey: getInventoryQueryKey(shopId) })
        void queryClient.invalidateQueries({
          queryKey: getMovementsQueryKey(shopId, variables.variantId),
        })
      },
    },
  })

  let inventory: InventoryItemResponse[] = []
  if (inventoryQuery.data !== undefined) {
    inventory = takeData(inventoryQuery.data)
  }

  let products: ProductItem[] = []
  if (productsQuery.data !== undefined) {
    products = takeData(productsQuery.data).map(function (p) {
      return productItem(p, '')
    })
  }

  const movementsQuery = useMovements(shopId, historyVariant?.variantId ?? '', {
    query: { enabled: shopId !== '' && historyVariant !== null },
  })
  let movements: StockMovementItem[] = []
  let movementsError = ''
  if (movementsQuery.isError) {
    movementsError = apiErrorMessage('sellerProductsInventory', errorStatus(movementsQuery.error))
  }
  if (movementsQuery.data !== undefined) {
    const skuMap = skuByVariantId()
    const nameMap = productNameByVariantId()
    movements = takeData(movementsQuery.data).map(function (m) {
      return stockMovementItem(m, skuMap, nameMap)
    })
  }

  function skuByVariantId(): Map<string, string> {
    const map = new Map<string, string>()
    for (const inv of inventory) {
      map.set(inv.variantId ?? '', inv.sku ?? '')
    }
    return map
  }

  function productNameByVariantId(): Map<string, string> {
    const map = new Map<string, string>()
    for (const inv of inventory) {
      map.set(inv.variantId ?? '', inv.productName ?? '')
    }
    return map
  }

  function productImageByProductId(): Map<string, string> {
    const map = new Map<string, string>()
    for (const p of products) {
      map.set(p.id, p.image)
    }
    return map
  }

  function errorStatus(error: unknown): number {
    if (typeof error === 'object' && error !== null && 'status' in error) {
      const status = (error as { status: unknown }).status
      if (typeof status === 'number') {
        return status
      }
    }
    return 0
  }

  function showToast(msg: string) {
    setNotification(msg)
    setTimeout(function () {
      setNotification(null)
    }, 3000)
  }

  // Gắn ảnh sản phẩm vào từng dòng tồn kho
  const imageByProductId = productImageByProductId()
  const rows = inventory.map(function (inv) {
    return {
      ...inv,
      productImage: imageByProductId.get(inv.productId ?? '') ?? '',
    }
  })

  const lowStockRows = rows.filter(function (v) {
    if (v.isLowStock === true) {
      return true
    }
    const stock = v.stockQuantity ?? 0
    const threshold = v.lowStockThreshold ?? 5
    if (stock <= threshold || stock === 0) {
      return true
    }
    return false
  })

  // Filter
  const filteredRows = rows.filter(function (v) {
    if (activeFilter === 'LOW_STOCK') {
      const stock = v.stockQuantity ?? 0
      const threshold = v.lowStockThreshold ?? 5
      const isLow = v.isLowStock === true || stock <= threshold || stock === 0
      if (isLow === false) {
        return false
      }
    }
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase()
      const matchSku = (v.sku ?? '').toLowerCase().includes(term)
      const matchName = (v.productName ?? '').toLowerCase().includes(term)
      if (matchSku === false && matchName === false) {
        return false
      }
    }
    return true
  })

  function handleOpenAdjust(row: InventoryItemResponse) {
    setAdjustVariant(row)
    setAdjustQty(10)
    setAdjustReason('RESTOCK')
    setShowAdjustModal(true)
  }

  function handleConfirmAdjust() {
    if (adjustVariant === null) {
      alert('Chưa chọn biến thể.')
      return
    }
    if ((adjustVariant.variantId ?? '') === '') {
      alert('Biến thể không hợp lệ.')
      return
    }
    handleAdjustStock(adjustVariant.variantId ?? '', adjustQty, adjustReason)
    setShowAdjustModal(false)
    showToast(`Đã ghi nhận điều chỉnh kho cho SKU ${adjustVariant.sku ?? ''}`)
  }

  function handleAdjustStock(variantId: string, changeQty: number, reason: string) {
    const current = inventory.find(function (i) {
      return i.variantId === variantId
    })
    if (current === undefined) {
      return
    }
    const stock = current.stockQuantity ?? 0
    const newStock = Math.max(0, stock + changeQty)
    adjustStockMutation.mutate({ shopId, variantId, data: { newStock, reason } })
  }

  function renderStockState(stock: number, threshold: number, isLow: boolean) {
    if (stock === 0) {
      return (
        <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-bold text-red-600 dark:bg-red-950/40 dark:text-red-400">
          Hết hàng
        </span>
      )
    }
    if (isLow) {
      return (
        <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
          Tồn kho thấp ({stock}/{threshold})
        </span>
      )
    }
    return (
      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
        Đủ hàng ({stock})
      </span>
    )
  }

  function renderMovementCell(m: StockMovementItem) {
    return (
      <td className="py-2.5 text-center font-bold">
        {m.changeQty > 0 && (
          <span className="inline-flex items-center text-emerald-600">
            <ArrowUp size={12} weight="bold" />+{m.changeQty}
          </span>
        )}
        {m.changeQty <= 0 && (
          <span className="inline-flex items-center text-red-600">
            <ArrowDown size={12} weight="bold" />
            {m.changeQty}
          </span>
        )}
      </td>
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

      {/* Header bar */}
      <div>
        <h2 className="text-xl font-black text-zinc-900 dark:text-white">
          Quản lý tồn kho & Biến động
        </h2>
        <p className="text-xs text-zinc-500">
          Theo dõi số lượng tồn kho theo từng biến thể (size, màu) và sổ nhật ký xuất nhập
        </p>
      </div>

      {/* Cảnh báo tồn thấp */}
      {lowStockRows.length > 0 && (
        <div className="rounded-3xl border border-amber-200/80 bg-amber-50/70 p-5 dark:border-amber-900/40 dark:bg-amber-950/30">
          <div className="flex items-start gap-3">
            <WarningCircle
              size={22}
              weight="bold"
              className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400"
            />
            <div>
              <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                Cảnh báo: Có {lowStockRows.length} biến thể sản phẩm sắp hết hàng hoặc đã hết hàng!
              </p>
              <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">
                Vui lòng nhập thêm hàng để tránh gián đoạn đơn đặt hàng của khách.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Bảng tồn kho */}
      <div className="rounded-3xl border border-zinc-200/80 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-[#11182a]">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex flex-wrap items-center gap-1 border-b border-zinc-100 pb-2 md:border-b-0 md:pb-0 dark:border-white/10">
            {[
              { id: 'ALL', label: 'Tất cả biến thể', count: rows.length },
              { id: 'LOW_STOCK', label: 'Hết / Sắp hết hàng', count: lowStockRows.length },
            ].map(function (tab) {
              const isCurrent = activeFilter === tab.id
              let tabClasses =
                'flex items-center gap-1.5 rounded-2xl px-3.5 py-1.5 text-xs font-bold transition text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              let countBadgeClasses =
                'rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-500 dark:bg-white/10 dark:text-zinc-400'
              if (isCurrent) {
                tabClasses =
                  'flex items-center gap-1.5 rounded-2xl px-3.5 py-1.5 text-xs font-bold transition bg-indigo-900 text-white shadow-lg shadow-indigo-900/20 dark:bg-indigo-300 dark:text-indigo-950'
                countBadgeClasses =
                  'rounded-full bg-white/20 px-2 py-0.5 text-[10px] text-white dark:bg-indigo-900/30 dark:text-indigo-950'
              }
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={function () {
                    const next = tab.id as 'ALL' | 'LOW_STOCK'
                    setSearchParams(function (prev) {
                      const nextParams = new URLSearchParams(prev)
                      if (next === 'ALL') {
                        nextParams.delete('filter')
                      } else {
                        nextParams.set('filter', 'low_stock')
                      }
                      return nextParams
                    })
                  }}
                  className={tabClasses}
                >
                  <span>{tab.label}</span>
                  <span className={countBadgeClasses}>{tab.count}</span>
                </button>
              )
            })}
          </div>

          <div className="relative w-full md:w-72">
            <MagnifyingGlass
              size={16}
              weight="bold"
              className="absolute top-1/2 left-3 -translate-y-1/2 text-zinc-400"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={function (e) {
                setSearchTerm(e.target.value)
              }}
              placeholder="Tìm theo SKU hoặc tên..."
              className="w-full rounded-full border border-zinc-300 bg-zinc-50 py-2 pr-4 pl-9 text-xs outline-none focus:border-blue-600 dark:border-white/15 dark:bg-white/10 dark:text-white"
            />
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-100 text-[11px] font-bold text-zinc-400 uppercase dark:border-white/10">
                <th className="pb-3 pl-2">Sản phẩm</th>
                <th className="pb-3">Mã SKU</th>
                <th className="pb-3">Phân loại (Màu / Size)</th>
                <th className="pb-3 text-center">Tồn kho hiện tại</th>
                <th className="pb-3 text-center">Ngưỡng báo động</th>
                <th className="pb-3">Tình trạng</th>
                <th className="pr-2 pb-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-white/10">
              {filteredRows.map(function (v) {
                return (
                  <tr
                    key={v.variantId}
                    className="transition hover:bg-zinc-50/60 dark:hover:bg-white/5"
                  >
                    <td className="py-3 pl-2">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={v.productImage}
                          alt={v.productName ?? ''}
                          className="h-9 w-9 rounded-lg border border-zinc-200 object-cover dark:border-white/10"
                        />
                        <span className="max-w-[220px] truncate font-bold text-zinc-900 dark:text-white">
                          {v.productName}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 font-mono text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                      {v.sku}
                    </td>
                    <td className="py-3 text-zinc-700 dark:text-zinc-300">
                      {v.color} - Size {v.size}
                    </td>
                    <td className="py-3 text-center text-sm font-extrabold text-zinc-900 dark:text-white">
                      {v.stockQuantity}
                    </td>
                    <td className="py-3 text-center font-semibold text-zinc-500">
                      {v.lowStockThreshold}
                    </td>
                    <td className="py-3">
                      {renderStockState(
                        v.stockQuantity ?? 0,
                        v.lowStockThreshold ?? 0,
                        v.isLowStock === true,
                      )}
                    </td>
                    <td className="py-3 pr-2 text-right">
                      {can('INVENTORY_WRITE') && (
                        <button
                          type="button"
                          onClick={function () {
                            handleOpenAdjust(v)
                          }}
                          className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 px-3 py-1.5 text-[11px] font-bold text-zinc-700 transition hover:bg-zinc-100 dark:border-white/10 dark:text-zinc-300"
                        >
                          <PencilSimple size={13} weight="bold" />
                          Điều chỉnh
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={function () {
                          setHistoryVariant(v)
                        }}
                        className="ml-1.5 inline-flex items-center gap-1 rounded-xl border border-zinc-200 px-3 py-1.5 text-[11px] font-bold text-zinc-700 transition hover:bg-zinc-100 dark:border-white/10 dark:text-zinc-300"
                      >
                        <ClockCounterClockwise size={13} weight="bold" />
                        Lịch sử
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {filteredRows.length === 0 && (
            <div className="py-8 text-center text-zinc-400">
              <p>Chưa có biến thể nào trong kho.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Điều chỉnh kho */}
      {showAdjustModal && adjustVariant !== null && (
        <Modal
          title="Điều chỉnh tồn kho"
          onClose={function () {
            setShowAdjustModal(false)
          }}
          widthClass="max-w-md"
        >
          <div className="mt-4 space-y-4 text-xs">
            <div>
              <label
                htmlFor="adjustSkuInput"
                className="block font-semibold text-zinc-700 dark:text-zinc-300"
              >
                SKU biến thể (tồn hiện tại: {adjustVariant.stockQuantity})
              </label>
              <input
                id="adjustSkuInput"
                type="text"
                value={adjustVariant.sku ?? ''}
                readOnly
                className="mt-1 w-full rounded-full border border-zinc-300 bg-zinc-50 p-2.5 font-mono text-xs text-zinc-600 dark:border-white/15 dark:bg-white/5"
              />
            </div>

            <div>
              <label
                htmlFor="adjustReasonSelect"
                className="block font-semibold text-zinc-700 dark:text-zinc-300"
              >
                Lý do điều chỉnh
              </label>
              <select
                id="adjustReasonSelect"
                value={adjustReason}
                onChange={function (e) {
                  setAdjustReason(e.target.value as AdjustReason)
                }}
                className="mt-1 w-full rounded-full border border-zinc-300 p-2.5 text-xs outline-none focus:border-blue-600 dark:border-white/15 dark:bg-white/10 dark:text-white"
              >
                <option value="RESTOCK">Nhập thêm hàng vào kho (RESTOCK)</option>
                <option value="DAMAGE">Xuất bỏ hàng lỗi / hư hỏng (DAMAGE)</option>
                <option value="RETURN">Nhập lại hàng khách trả (RETURN)</option>
                <option value="AUDIT">Điều chỉnh sau kiểm kê kho (AUDIT)</option>
                <option value="MANUAL">Điều chỉnh thủ công khác (MANUAL)</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="adjustQtyInput"
                className="block font-semibold text-zinc-700 dark:text-zinc-300"
              >
                Số lượng thay đổi (dương là cộng thêm, âm là trừ đi)
              </label>
              <input
                id="adjustQtyInput"
                type="number"
                value={adjustQty}
                onChange={function (e) {
                  setAdjustQty(Number(e.target.value))
                }}
                className="mt-1 w-full rounded-full border border-zinc-300 p-2.5 text-xs font-bold outline-none focus:border-blue-600 dark:border-white/15 dark:bg-white/10 dark:text-white"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={function () {
                setShowAdjustModal(false)
              }}
              className="rounded-2xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-300"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={handleConfirmAdjust}
              className="btn-primary rounded-2xl px-5 py-2 text-xs font-bold"
            >
              Xác nhận lưu vào sổ kho
            </button>
          </div>
        </Modal>
      )}

      {/* Modal Sổ nhật ký biến động kho (theo biến thể đang chọn) */}
      {historyVariant !== null && (
        <Modal
          title={`Nhật ký biến động kho — ${historyVariant.productName}`}
          onClose={function () {
            setHistoryVariant(null)
          }}
          widthClass="max-w-3xl"
        >
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            SKU {historyVariant.sku} • mọi thao tác tăng giảm kho đều được ghi nhận tự động
          </p>

          <div className="mt-4 max-h-[420px] overflow-y-auto">
            {movementsError !== '' && (
              <p className="py-4 text-center text-sm text-red-600">{movementsError}</p>
            )}
            {movementsQuery.isPending && (
              <p className="py-4 text-center text-sm text-zinc-500">Đang tải nhật ký…</p>
            )}
            {movementsError === '' && movementsQuery.isPending === false && (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-100 text-[11px] font-bold text-zinc-400 uppercase dark:border-white/10">
                    <th className="pb-3">Thời gian</th>
                    <th className="pb-3">Lý do</th>
                    <th className="pb-3 text-center">Biến động</th>
                    <th className="pb-3 text-center">Sau biến động</th>
                    <th className="pb-3">Người tạo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-white/10">
                  {movements.map(function (m) {
                    return (
                      <tr key={m.id}>
                        <td className="py-2.5 text-zinc-500">{m.createdAt}</td>
                        <td className="py-2.5">
                          <span className="rounded-lg bg-zinc-100 px-2 py-0.5 font-semibold text-zinc-700 dark:bg-white/10 dark:text-zinc-300">
                            {m.reason}
                          </span>
                        </td>
                        {renderMovementCell(m)}
                        <td className="py-2.5 text-center text-zinc-500">
                          {/* API không lưu tồn trước/sau từng lần biến động */}
                          {m.newStock === null && '—'}
                          {m.newStock !== null && m.newStock}
                        </td>
                        <td className="py-2.5 text-zinc-600 dark:text-zinc-400">{m.createdBy}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}

            {movementsError === '' &&
              movementsQuery.isPending === false &&
              movements.length === 0 && (
                <div className="py-8 text-center text-zinc-400">
                  <p>Chưa có biến động kho nào được ghi nhận cho biến thể này.</p>
                </div>
              )}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={function () {
                setHistoryVariant(null)
              }}
              className="rounded-2xl border border-zinc-200 px-5 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-300"
            >
              Đóng
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
