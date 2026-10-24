import { useState } from 'react'

import { useListCategories } from '@generated/endpoints/categories/categories'
import {
  getInventoryQueryKey,
  getListProductsQueryKey,
  useBulkImport,
  useListProducts,
} from '@generated/endpoints/seller-products-inventory/seller-products-inventory'
import { useDeleteProduct, useUpdate1 } from '@generated/endpoints/shop-products/shop-products'
import {
  Plus,
  DownloadSimple,
  UploadSimple,
  MagnifyingGlass,
  Eye,
  EyeSlash,
  Trash,
  CheckCircle,
  WarningCircle,
  CircleNotch,
  PencilSimple,
} from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import Modal from '@/components/Modal'
import StatusBadge from '@/components/ui/StatusBadge'
import { PLACEHOLDER_IMAGE, takeData } from '@/lib/apiAdapters'
import { ApiError } from '@/lib/apiFetch'
import { productItem } from '@/lib/sellerAdapters'
import { sellerStatusMeta } from '@/lib/sellerStatus'

import { formatVnd } from '../../lib/format'

import type { ProductItem } from '@/types/seller'

// Tên file export chỉ dùng khi bấm nút — sinh ở module-level để khỏi gọi Date.now trong render
function csvExportFileName(): string {
  return `products_export_${Date.now()}.csv`
}

function toggleStatusTitle(status: string): string {
  if (status === 'ACTIVE') {
    return 'Tạm ẩn sản phẩm'
  }
  return 'Đăng bán sản phẩm'
}

interface Props {
  shopId: string
  onNavigateAddProduct: () => void
  onNavigateEditProduct: (productId: string) => void
}

export default function SellerProductsTab({
  shopId,
  onNavigateAddProduct,
  onNavigateEditProduct,
}: Props) {
  const queryClient = useQueryClient()
  const [activeFilter, setActiveFilter] = useState<
    'ACTIVE' | 'PENDING' | 'INACTIVE' | 'DELETED' | 'ALL'
  >('ACTIVE')
  const [searchTerm, setSearchTerm] = useState('')
  const [showImportModal, setShowImportModal] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null)
  const [importText, setImportText] = useState('')
  const [notification, setNotification] = useState<string | null>(null)

  const productsQuery = useListProducts(shopId, undefined, { query: { enabled: shopId !== '' } })
  const categoriesQuery = useListCategories()

  const categoryNameById = new Map<string, string>()
  if (categoriesQuery.data !== undefined) {
    for (const c of takeData(categoriesQuery.data)) {
      categoryNameById.set(c.id ?? '', c.name ?? '')
    }
  }

  let products: ProductItem[] = []
  if (productsQuery.data !== undefined) {
    products = takeData(productsQuery.data).map(function (p) {
      return productItem(p, categoryNameById.get(p.categoryId ?? ''))
    })
  }

  let deleteTargetProduct: ProductItem | undefined
  if (deleteTargetId !== null) {
    deleteTargetProduct = products.find(function (p) {
      return p.id === deleteTargetId
    })
  }

  const updateProductMutation = useUpdate1({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getListProductsQueryKey(shopId) })
      },
    },
  })
  const deleteProductMutation = useDeleteProduct({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getListProductsQueryKey(shopId) })
        setDeleteTargetId(null)
        setDeleteErrorMessage(null)
        showToast('Đã xóa mềm sản phẩm vào thùng rác (trạng thái DELETED)')
      },
      onError: function (error: unknown) {
        let status: number | undefined = undefined
        if (error instanceof ApiError) {
          status = error.status
        }
        if (status === 409) {
          setDeleteErrorMessage(
            'Không thể xóa sản phẩm do đang có đơn hàng liên quan đang xử lý (chờ xác nhận hoặc đang vận chuyển). Vui lòng hoàn tất hoặc hủy các đơn hàng trước.',
          )
          return
        }
        setDeleteErrorMessage('Đã xảy ra lỗi khi xóa sản phẩm. Vui lòng thử lại sau.')
      },
    },
  })
  const bulkImportMutation = useBulkImport({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getListProductsQueryKey(shopId) })
        void queryClient.invalidateQueries({ queryKey: getInventoryQueryKey(shopId) })
      },
    },
  })

  function handleToggleProductStatus(productId: string) {
    const current = products.find(function (p) {
      return p.id === productId
    })
    if (current === undefined) {
      return
    }
    let nextStatus = 'ACTIVE'
    if (current.status === 'ACTIVE') {
      nextStatus = 'HIDDEN'
    }
    updateProductMutation.mutate(
      { shopId, id: productId, data: { status: nextStatus } },
      {
        onSuccess: function () {
          if (nextStatus === 'HIDDEN') {
            showToast('Đã tạm ẩn sản phẩm khỏi gian hàng')
            return
          }
          showToast('Đã bật bán sản phẩm thành công')
        },
        onError: function () {
          showToast('Không thể cập nhật trạng thái sản phẩm. Vui lòng thử lại sau.')
        },
      },
    )
  }

  function handleConfirmDelete() {
    if (deleteTargetId !== null) {
      setDeleteErrorMessage(null)
      deleteProductMutation.mutate({ shopId, id: deleteTargetId })
    }
  }

  function handleBulkImport(csvContent: string) {
    const file = new File([csvContent], 'products.csv', { type: 'text/csv' })
    bulkImportMutation.mutate({ shopId, data: { file } })
  }

  function showToast(msg: string) {
    setNotification(msg)
    setTimeout(function () {
      setNotification(null)
    }, 3000)
  }

  function handleExportCsv() {
    const headers = 'name,slug,sku,category,price,stock,sold,status\n'
    const rows = products
      .map(function (p) {
        return `"${p.name}","${p.slug}","${p.sku}","${p.category}",${p.price},${p.stock},${p.sold},${p.status}`
      })
      .join('\n')
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', csvExportFileName())
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast('Đã xuất file CSV thành công!')
  }

  function handleConfirmImport() {
    if (importText.trim() === '') {
      alert('Vui lòng nhập hoặc dán nội dung CSV.')
      return
    }
    handleBulkImport(importText)
    setShowImportModal(false)
    setImportText('')
    showToast('Đã nhập hàng loạt sản phẩm thành công!')
  }

  let countActive = 0
  let countPending = 0
  let countInactive = 0
  let countDeleted = 0
  let countAll = 0
  for (const p of products) {
    if (p.status === 'ACTIVE') {
      countActive += 1
      countAll += 1
    }
    if (p.status === 'PENDING') {
      countPending += 1
      countAll += 1
    }
    if (p.status === 'INACTIVE') {
      countInactive += 1
      countAll += 1
    }
    if (p.status === 'DELETED') {
      countDeleted += 1
    }
  } // Lọc sản phẩm
  const filteredProducts = products.filter(function (p) {
    if (activeFilter === 'ACTIVE' && p.status !== 'ACTIVE') {
      return false
    }
    if (activeFilter === 'PENDING' && p.status !== 'PENDING') {
      return false
    }
    if (activeFilter === 'INACTIVE' && p.status !== 'INACTIVE') {
      return false
    }
    if (activeFilter === 'DELETED' && p.status !== 'DELETED') {
      return false
    }
    if (activeFilter === 'ALL' && p.status === 'DELETED') {
      return false
    }
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase()
      const matchName = p.name.toLowerCase().includes(term)
      const matchSku = p.sku.toLowerCase().includes(term)
      if (matchName === false && matchSku === false) {
        return false
      }
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Toast thông báo */}
      {notification !== null && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-bold text-white shadow-xl dark:bg-white dark:text-zinc-900">
          <CheckCircle size={18} weight="bold" className="text-emerald-400" />
          {notification}
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-black text-zinc-900 dark:text-white">Tất cả sản phẩm</h2>
          <p className="text-xs text-zinc-500">
            Quản lý danh sách, trạng thái hiển thị và thông tin sản phẩm của gian hàng
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-bold text-zinc-700 transition hover:bg-zinc-50 dark:border-white/10 dark:bg-[#11182a] dark:text-zinc-300 dark:hover:bg-white/10"
          >
            <DownloadSimple size={16} weight="bold" />
            Xuất CSV
          </button>
          <button
            type="button"
            onClick={function () {
              setShowImportModal(true)
            }}
            className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-bold text-zinc-700 transition hover:bg-zinc-50 dark:border-white/10 dark:bg-[#11182a] dark:text-zinc-300 dark:hover:bg-white/10"
          >
            <UploadSimple size={16} weight="bold" />
            Nhập hàng loạt CSV
          </button>
          <button
            type="button"
            onClick={onNavigateAddProduct}
            className="btn-primary flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold shadow-md"
          >
            <Plus size={16} weight="bold" />
            Thêm 1 sản phẩm mới
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="rounded-3xl border border-zinc-200/80 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-[#11182a]">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex flex-wrap items-center gap-1 border-b border-zinc-100 pb-2 md:border-b-0 md:pb-0 dark:border-white/10">
            {[
              { id: 'ACTIVE', label: 'Đang hoạt động', count: countActive },
              { id: 'PENDING', label: 'Chưa được duyệt', count: countPending },
              { id: 'INACTIVE', label: 'Đã tạm ẩn', count: countInactive },
              { id: 'DELETED', label: 'Đã xóa', count: countDeleted },
              { id: 'ALL', label: 'Tất cả', count: countAll },
            ].map(function (tab) {
              const isCurrent = activeFilter === tab.id
              let tabClasses =
                'flex items-center gap-1.5 rounded-2xl px-4 py-2 text-xs font-bold transition text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              let countBadgeClasses =
                'rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-500 dark:bg-white/10 dark:text-zinc-400'
              if (isCurrent) {
                tabClasses =
                  'flex items-center gap-1.5 rounded-2xl px-4 py-2 text-xs font-bold transition bg-indigo-900 text-white shadow-lg shadow-indigo-900/20 dark:bg-indigo-300 dark:text-indigo-950'
                countBadgeClasses =
                  'rounded-full bg-white/20 px-2 py-0.5 text-[10px] text-white dark:bg-indigo-900/30 dark:text-indigo-950'
              }
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={function () {
                    setActiveFilter(tab.id as 'ACTIVE' | 'PENDING' | 'INACTIVE' | 'DELETED' | 'ALL')
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
              placeholder="Tìm theo tên sản phẩm, SKU..."
              className="w-full rounded-full border border-zinc-300 bg-zinc-50 py-2 pr-4 pl-9 text-xs outline-none focus:border-blue-600 dark:border-white/15 dark:bg-white/10 dark:text-white"
            />
          </div>
        </div>

        {/* Bảng danh sách sản phẩm */}
        <div className="mt-5 overflow-x-auto rounded-2xl border border-zinc-200/80 dark:border-zinc-800">
          <table className="w-full min-w-[1060px] text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-100 text-[11px] font-bold text-zinc-400 uppercase dark:border-white/10">
                <th className="pb-3 pl-2">Sản phẩm & SKU</th>
                <th className="pb-3">Phân loại / Biến thể</th>
                <th className="pb-3">Giá bán</th>
                <th className="pb-3 text-center">Tổng kho</th>
                <th className="pb-3 text-center">Đã bán</th>
                <th className="pb-3">Trạng thái</th>
                <th className="pr-2 pb-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-white/10">
              {filteredProducts.map(function (product) {
                return (
                  <tr
                    key={product.id}
                    className="transition hover:bg-zinc-50/60 dark:hover:bg-white/5"
                  >
                    <td className="py-3.5 pr-3 pl-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={product.image}
                          alt={product.name}
                          onError={function (e) {
                            e.currentTarget.src = PLACEHOLDER_IMAGE
                          }}
                          className="h-12 w-12 rounded-xl border border-zinc-200 object-cover dark:border-white/10"
                        />
                        <div className="max-w-[220px] min-w-0">
                          <p
                            className="line-clamp-2 font-bold text-zinc-900 dark:text-white"
                            title={product.name}
                          >
                            {product.name}
                          </p>
                          <p className="mt-0.5 truncate text-[11px] text-zinc-400">
                            SKU: {product.sku}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-3.5 text-zinc-600 dark:text-zinc-400">
                      <div className="flex max-w-[320px] flex-wrap gap-1">
                        {product.variants.map(function (v) {
                          return (
                            <span
                              key={v.id}
                              className="rounded-lg bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold dark:bg-white/10"
                            >
                              {v.color} - {v.size}
                            </span>
                          )
                        })}
                      </div>
                    </td>

                    <td className="px-3 py-3.5 text-right font-bold whitespace-nowrap text-zinc-900 dark:text-white">
                      {formatVnd(product.price)}
                    </td>

                    <td className="px-3 py-3.5 text-center font-bold whitespace-nowrap">
                      {product.stock <= 15 && product.stock > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-400/15 dark:text-amber-200">
                          {product.stock} <span className="text-[10px] font-normal">(Sắp hết)</span>
                        </span>
                      )}
                      {product.stock === 0 && (
                        <span className="inline-flex items-center rounded-lg bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700 dark:bg-red-400/15 dark:text-red-200">
                          Hết hàng
                        </span>
                      )}
                      {product.stock > 15 && (
                        <span className="text-zinc-700 dark:text-zinc-300">{product.stock}</span>
                      )}
                    </td>

                    <td className="px-3 py-3.5 text-center font-semibold whitespace-nowrap text-zinc-600 dark:text-zinc-400">
                      {product.sold}
                    </td>

                    <td className="py-3.5">
                      <StatusBadge status={product.status} meta={sellerStatusMeta} />
                    </td>

                    <td className="py-3.5 pr-4 pl-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {product.status !== 'DELETED' && (
                          <button
                            type="button"
                            onClick={function () {
                              onNavigateEditProduct(product.id)
                            }}
                            aria-label="Chỉnh sửa sản phẩm"
                            title="Chỉnh sửa sản phẩm"
                            className="flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-200 text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
                          >
                            <PencilSimple size={14} weight="bold" />
                          </button>
                        )}
                        {product.status !== 'DELETED' && product.status !== 'PENDING' && (
                          <button
                            type="button"
                            disabled={updateProductMutation.isPending}
                            onClick={function () {
                              handleToggleProductStatus(product.id)
                            }}
                            title={toggleStatusTitle(product.status)}
                            aria-label={toggleStatusTitle(product.status)}
                            className="flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-200 text-zinc-600 transition hover:bg-zinc-100 disabled:opacity-50 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/10"
                          >
                            {product.status === 'ACTIVE' && <EyeSlash size={14} weight="bold" />}
                            {product.status !== 'ACTIVE' && <Eye size={14} weight="bold" />}
                          </button>
                        )}
                        {product.status !== 'DELETED' && (
                          <button
                            type="button"
                            onClick={function () {
                              setDeleteErrorMessage(null)
                              setDeleteTargetId(product.id)
                            }}
                            title="Xóa mềm sản phẩm"
                            aria-label="Xóa mềm sản phẩm"
                            className="flex h-8 w-8 items-center justify-center rounded-xl border border-red-200 text-red-500 transition hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-950/20"
                          >
                            <Trash size={14} weight="bold" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {filteredProducts.length === 0 && (
            <div className="py-12 text-center text-zinc-400">
              <p className="text-sm">Không tìm thấy sản phẩm nào phù hợp.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Xóa mềm nguy hiểm */}
      {deleteTargetId !== null && (
        <Modal
          title="Xác nhận xóa mềm sản phẩm?"
          onClose={function () {
            setDeleteTargetId(null)
            setDeleteErrorMessage(null)
          }}
          widthClass="max-w-md"
        >
          {/* Thông báo lỗi nếu có đơn hàng đang xử lý (409) */}
          {deleteErrorMessage !== null && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              <WarningCircle size={18} weight="bold" className="mt-0.5 shrink-0 text-red-600" />
              <div className="leading-relaxed">{deleteErrorMessage}</div>
            </div>
          )}

          {/* Thông tin sản phẩm cần xóa */}
          {deleteTargetProduct !== undefined && (
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-zinc-200/80 bg-zinc-50 p-3 dark:border-white/10 dark:bg-white/5">
              <img
                src={deleteTargetProduct.image}
                alt={deleteTargetProduct.name}
                className="h-12 w-12 shrink-0 rounded-xl border border-zinc-200 object-cover dark:border-white/10"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-zinc-900 dark:text-white">
                  {deleteTargetProduct.name}
                </p>
                <p className="mt-0.5 text-[11px] text-zinc-400">
                  SKU: {deleteTargetProduct.sku} • Tồn kho: {deleteTargetProduct.stock}
                </p>
              </div>
            </div>
          )}

          <p className="mt-4 text-xs leading-relaxed text-zinc-500">
            Sản phẩm sẽ được chuyển sang trạng thái <strong>DELETED</strong>. Sản phẩm sẽ bị ẩn khỏi
            gian hàng và người mua không thể đặt hàng mới. Lịch sử đơn hàng và doanh thu quá khứ vẫn
            được lưu trữ nguyên vẹn.
          </p>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              disabled={deleteProductMutation.isPending}
              onClick={function () {
                setDeleteTargetId(null)
                setDeleteErrorMessage(null)
              }}
              className="rounded-2xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-white/10 dark:text-zinc-300"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              disabled={deleteProductMutation.isPending}
              onClick={handleConfirmDelete}
              className="flex items-center gap-1.5 rounded-2xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {deleteProductMutation.isPending && (
                <CircleNotch size={14} weight="bold" className="animate-spin" />
              )}
              {deleteProductMutation.isPending && <span>Đang xử lý...</span>}
              {!deleteProductMutation.isPending && <span>Xác nhận xóa</span>}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal Nhập hàng loạt CSV */}
      {showImportModal && (
        <Modal
          title="Nhập hàng loạt sản phẩm bằng file CSV"
          onClose={function () {
            setShowImportModal(false)
          }}
          widthClass="max-w-xl"
        >
          <div className="mt-4 rounded-2xl bg-indigo-50 p-3.5 text-xs text-indigo-900 dark:bg-indigo-900/40 dark:text-indigo-200">
            <p className="font-bold">Định dạng 8 cột bắt buộc (theo dòng):</p>
            <code className="mt-1 block font-mono text-[11px]">
              name,slug,description,categoryId,sku,size,color,stock,price
            </code>
          </div>

          <div className="mt-4">
            <label
              htmlFor="importCsvText"
              className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
            >
              Dán nội dung CSV vào ô dưới đây:
            </label>
            <textarea
              id="importCsvText"
              rows={6}
              value={importText}
              onChange={function (e) {
                setImportText(e.target.value)
              }}
              placeholder="Áo Polo Nam,ao-polo-nam,Mo ta,uuid-cat,POLO-01,L,Trắng,50,220000"
              className="mt-2 w-full rounded-2xl border border-zinc-300 p-3 font-mono text-xs outline-none focus:border-blue-600 dark:border-white/15 dark:bg-white/10 dark:text-white"
            />
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={function () {
                setShowImportModal(false)
              }}
              className="rounded-2xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-300"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleConfirmImport}
              className="btn-primary rounded-2xl px-5 py-2 text-xs font-bold"
            >
              Bắt đầu nhập
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
