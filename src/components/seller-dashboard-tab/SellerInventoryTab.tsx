import { useState } from 'react'

import {
  WarningCircle,
  ClockCounterClockwise,
  PencilSimple,
  CheckCircle,
  X,
  MagnifyingGlass,
  ArrowUp,
  ArrowDown,
} from '@phosphor-icons/react'

import type { ProductItem, StockMovementItem } from '@/types/seller'

interface Props {
  products: ProductItem[]
  movements: StockMovementItem[]
  onAdjustStock: (
    variantSku: string,
    changeQty: number,
    reason: 'RESTOCK' | 'DAMAGE' | 'RETURN' | 'AUDIT' | 'MANUAL',
    note: string,
  ) => void
}

export default function SellerInventoryTab({ products, movements, onAdjustStock }: Props) {
  const [searchTerm, setSearchTerm] = useState('')
  const [showAdjustModal, setShowAdjustModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [selectedSku, setSelectedSku] = useState('')
  const [adjustQty, setAdjustQty] = useState(10)
  const [adjustReason, setAdjustReason] = useState<
    'RESTOCK' | 'DAMAGE' | 'RETURN' | 'AUDIT' | 'MANUAL'
  >('RESTOCK')
  const [adjustNote, setAdjustNote] = useState('')
  const [notification, setNotification] = useState<string | null>(null)

  function showToast(msg: string) {
    setNotification(msg)
    setTimeout(function () {
      setNotification(null)
    }, 3000)
  }

  // Flatten all variants across products
  const allVariants = products.flatMap(function (p) {
    return p.variants.map(function (v) {
      return {
        ...v,
        productId: p.id,
        productName: p.name,
        productImage: p.image,
      }
    })
  })

  // Filter
  const filteredVariants = allVariants.filter(function (v) {
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase()
      const matchSku = v.sku.toLowerCase().includes(term)
      const matchName = v.productName.toLowerCase().includes(term)
      if (matchSku === false && matchName === false) {
        return false
      }
    }
    return true
  })

  const lowStockVariants = allVariants.filter(function (v) {
    return v.stock <= v.lowStockThreshold
  })

  function handleOpenAdjust(sku: string) {
    setSelectedSku(sku)
    setAdjustQty(10)
    setAdjustReason('RESTOCK')
    setAdjustNote('')
    setShowAdjustModal(true)
  }

  function handleConfirmAdjust() {
    if (selectedSku === '') {
      alert('Chưa chọn biến thể.')
      return
    }
    onAdjustStock(selectedSku, adjustQty, adjustReason, adjustNote)
    setShowAdjustModal(false)
    showToast(`Đã ghi nhận điều chỉnh kho cho SKU ${selectedSku}`)
  }

  function renderStockState(stock: number, threshold: number) {
    if (stock === 0) {
      return (
        <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-bold text-red-600 dark:bg-red-950/40 dark:text-red-400">
          Hết hàng
        </span>
      )
    }
    if (stock <= threshold) {
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
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-black text-zinc-900 dark:text-white">
            Quản lý tồn kho & Biến động
          </h2>
          <p className="text-xs text-zinc-500">
            Theo dõi số lượng tồn kho theo từng biến thể (size, màu) và sổ nhật ký xuất nhập
          </p>
        </div>
        <button
          type="button"
          onClick={function () {
            setShowHistoryModal(true)
          }}
          className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
        >
          <ClockCounterClockwise size={16} weight="bold" />
          Xem sổ nhật ký biến động kho (Audit log)
        </button>
      </div>

      {/* Cảnh báo tồn thấp */}
      {lowStockVariants.length > 0 && (
        <div className="rounded-3xl border border-amber-200/80 bg-amber-50/70 p-5 dark:border-amber-900/40 dark:bg-amber-950/30">
          <div className="flex items-start gap-3">
            <WarningCircle
              size={22}
              weight="bold"
              className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400"
            />
            <div>
              <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                Cảnh báo: Có {lowStockVariants.length} biến thể sản phẩm sắp hết hàng hoặc đã hết
                hàng!
              </p>
              <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">
                Vui lòng nhập thêm hàng để tránh gián đoạn đơn đặt hàng của khách.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Bảng tồn kho */}
      <div className="rounded-3xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs font-bold tracking-wider text-zinc-500 uppercase">
            Danh sách biến thể ({filteredVariants.length})
          </p>
          <div className="relative w-72">
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
              className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 py-2 pr-4 pl-9 text-xs outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
            />
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-100 text-[11px] font-bold text-zinc-400 uppercase dark:border-zinc-800">
                <th className="pb-3 pl-2">Sản phẩm</th>
                <th className="pb-3">Mã SKU</th>
                <th className="pb-3">Phân loại (Màu / Size)</th>
                <th className="pb-3 text-center">Tồn kho hiện tại</th>
                <th className="pb-3 text-center">Ngưỡng báo động</th>
                <th className="pb-3">Tình trạng</th>
                <th className="pr-2 pb-3 text-right">Điều chỉnh</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {filteredVariants.map(function (v) {
                return (
                  <tr
                    key={v.sku}
                    className="transition hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30"
                  >
                    <td className="py-3 pl-2">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={v.productImage}
                          alt={v.productName}
                          className="h-9 w-9 rounded-lg border border-zinc-200 object-cover"
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
                      {v.stock}
                    </td>
                    <td className="py-3 text-center font-semibold text-zinc-500">
                      {v.lowStockThreshold}
                    </td>
                    <td className="py-3">{renderStockState(v.stock, v.lowStockThreshold)}</td>
                    <td className="py-3 pr-2 text-right">
                      <button
                        type="button"
                        onClick={function () {
                          handleOpenAdjust(v.sku)
                        }}
                        className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 px-3 py-1.5 text-[11px] font-bold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300"
                      >
                        <PencilSimple size={13} weight="bold" />
                        Điều chỉnh
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Điều chỉnh kho */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                Điều chỉnh tồn kho
              </h3>
              <button
                type="button"
                onClick={function () {
                  setShowAdjustModal(false)
                }}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div>
                <label
                  htmlFor="adjustSkuInput"
                  className="block font-semibold text-zinc-700 dark:text-zinc-300"
                >
                  SKU biến thể
                </label>
                <input
                  id="adjustSkuInput"
                  type="text"
                  value={selectedSku}
                  readOnly
                  className="mt-1 w-full rounded-2xl border border-zinc-200 bg-zinc-50 p-2.5 font-mono text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950"
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
                    setAdjustReason(
                      e.target.value as 'RESTOCK' | 'DAMAGE' | 'RETURN' | 'AUDIT' | 'MANUAL',
                    )
                  }}
                  className="mt-1 w-full rounded-2xl border border-zinc-200 p-2.5 text-xs outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
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
                  className="mt-1 w-full rounded-2xl border border-zinc-200 p-2.5 text-xs font-bold outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="adjustNoteInput"
                  className="block font-semibold text-zinc-700 dark:text-zinc-300"
                >
                  Ghi chú (bắt buộc)
                </label>
                <input
                  id="adjustNoteInput"
                  type="text"
                  value={adjustNote}
                  onChange={function (e) {
                    setAdjustNote(e.target.value)
                  }}
                  placeholder="VD: Nhập thêm 50 cái từ xưởng may"
                  className="mt-1 w-full rounded-2xl border border-zinc-200 p-2.5 text-xs outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={function () {
                  setShowAdjustModal(false)
                }}
                className="rounded-2xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmAdjust}
                className="rounded-2xl bg-orange-600 px-5 py-2 text-xs font-bold text-white hover:bg-orange-700"
              >
                Xác nhận lưu vào sổ kho
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Sổ nhật ký biến động kho */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Sổ nhật ký biến động kho (Stock Movement Audit)
                </h3>
                <p className="text-xs text-zinc-500">
                  Toàn bộ thao tác tăng giảm kho đều được ghi nhận tự động theo thời gian thực
                </p>
              </div>
              <button
                type="button"
                onClick={function () {
                  setShowHistoryModal(false)
                }}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X size={20} weight="bold" />
              </button>
            </div>

            <div className="mt-4 max-h-[420px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-100 text-[11px] font-bold text-zinc-400 uppercase dark:border-zinc-800">
                    <th className="pb-3">Thời gian</th>
                    <th className="pb-3">Mã SKU</th>
                    <th className="pb-3">Lý do</th>
                    <th className="pb-3 text-center">Biến động</th>
                    <th className="pb-3 text-center">Trước → Sau</th>
                    <th className="pb-3">Ghi chú & Người tạo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {movements.map(function (m) {
                    return (
                      <tr key={m.id}>
                        <td className="py-2.5 text-zinc-500">{m.createdAt}</td>
                        <td className="py-2.5 font-mono text-[11px] font-bold text-zinc-800 dark:text-zinc-200">
                          {m.variantSku}
                        </td>
                        <td className="py-2.5">
                          <span className="rounded-lg bg-zinc-100 px-2 py-0.5 font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                            {m.reason}
                          </span>
                        </td>
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
                        <td className="py-2.5 text-center text-zinc-500">
                          {m.previousStock} → {m.newStock}
                        </td>
                        <td className="py-2.5 text-zinc-600 dark:text-zinc-400">
                          <p>{m.note}</p>
                          <p className="text-[10px] text-zinc-400">{m.createdBy}</p>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {movements.length === 0 && (
                <div className="py-8 text-center text-zinc-400">
                  <p>Chưa có biến động kho nào được ghi nhận.</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={function () {
                  setShowHistoryModal(false)
                }}
                className="rounded-2xl border border-zinc-200 px-5 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
