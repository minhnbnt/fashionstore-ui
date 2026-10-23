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
  X,
  FileCsv,
  PencilSimple,
} from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import { takeData } from '@/lib/apiAdapters'
import { productItem } from '@/lib/sellerAdapters'

import { formatVnd } from '../../lib/format'

import type { ProductItem } from '@/types/seller'

// Tên file export chỉ dùng khi bấm nút — sinh ở module-level để khỏi gọi Date.now trong render
function csvExportFileName(): string {
  return `products_export_${Date.now()}.csv`
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
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE' | 'DELETED'>('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [showImportModal, setShowImportModal] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
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
    updateProductMutation.mutate({ shopId, id: productId, data: { status: nextStatus } })
  }

  function handleDeleteProduct(productId: string) {
    deleteProductMutation.mutate({ shopId, id: productId })
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

  function handleConfirmDelete() {
    if (deleteTargetId !== null) {
      handleDeleteProduct(deleteTargetId)
      setDeleteTargetId(null)
      showToast('Đã xóa mềm sản phẩm vào thùng rác (Trạng thái DELETED)')
    }
  }

  // Lọc sản phẩm
  const filteredProducts = products.filter(function (p) {
    if (activeFilter !== 'ALL' && p.status !== activeFilter) {
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

  function renderStatusBadge(status: string) {
    if (status === 'ACTIVE') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Đang bán
        </span>
      )
    }
    if (status === 'INACTIVE') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
          Đã ẩn
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-600 dark:bg-red-950/40 dark:text-red-400">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
        Đã xóa
      </span>
    )
  }

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
            className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-bold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <DownloadSimple size={16} weight="bold" />
            Xuất CSV
          </button>
          <button
            type="button"
            onClick={function () {
              setShowImportModal(true)
            }}
            className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-bold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <UploadSimple size={16} weight="bold" />
            Nhập hàng loạt CSV
          </button>
          <button
            type="button"
            onClick={onNavigateAddProduct}
            className="flex items-center gap-2 rounded-2xl bg-orange-600 px-4 py-2 text-xs font-bold text-white shadow-md transition hover:bg-orange-700"
          >
            <Plus size={16} weight="bold" />
            Thêm 1 sản phẩm mới
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="rounded-3xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex flex-wrap items-center gap-1 border-b border-zinc-100 pb-2 md:border-b-0 md:pb-0 dark:border-zinc-800">
            {[
              { id: 'ALL', label: 'Tất cả' },
              { id: 'ACTIVE', label: 'Đang hoạt động' },
              { id: 'INACTIVE', label: 'Đã tạm ẩn' },
              { id: 'DELETED', label: 'Đã xóa' },
            ].map(function (tab) {
              const isCurrent = activeFilter === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={function () {
                    setActiveFilter(tab.id as 'ALL' | 'ACTIVE' | 'INACTIVE' | 'DELETED')
                  }}
                  className={`rounded-2xl px-4 py-2 text-xs font-bold transition ${
                    isCurrent
                      ? 'bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400'
                      : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
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
              className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 py-2 pr-4 pl-9 text-xs outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
            />
          </div>
        </div>

        {/* Bảng danh sách sản phẩm */}
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-100 text-[11px] font-bold text-zinc-400 uppercase dark:border-zinc-800">
                <th className="pb-3 pl-2">Sản phẩm & SKU</th>
                <th className="pb-3">Phân loại / Biến thể</th>
                <th className="pb-3">Giá bán</th>
                <th className="pb-3 text-center">Tổng kho</th>
                <th className="pb-3 text-center">Đã bán</th>
                <th className="pb-3">Trạng thái</th>
                <th className="pr-2 pb-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {filteredProducts.map(function (product) {
                let toggleTitle = 'Đăng bán sản phẩm'
                if (product.status === 'ACTIVE') {
                  toggleTitle = 'Tạm ẩn sản phẩm'
                }

                return (
                  <tr
                    key={product.id}
                    className="transition hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30"
                  >
                    <td className="py-3.5 pl-2">
                      <div className="flex items-center gap-3">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="h-12 w-12 rounded-xl border border-zinc-200 object-cover dark:border-zinc-800"
                        />
                        <div className="max-w-[240px]">
                          <p className="line-clamp-2 font-bold text-zinc-900 dark:text-white">
                            {product.name}
                          </p>
                          <p className="mt-0.5 text-[11px] text-zinc-400">SKU: {product.sku}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 text-zinc-600 dark:text-zinc-400">
                      <div className="flex flex-wrap gap-1">
                        {product.variants.map(function (v) {
                          return (
                            <span
                              key={v.id}
                              className="rounded-lg bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold dark:bg-zinc-800"
                            >
                              {v.color} - {v.size}
                            </span>
                          )
                        })}
                      </div>
                    </td>

                    <td className="py-3.5 font-bold text-zinc-900 dark:text-white">
                      {formatVnd(product.price)}
                    </td>

                    <td className="py-3.5 text-center font-bold">
                      {product.stock <= 15 && product.stock > 0 && (
                        <span className="text-orange-500">{product.stock} (Sắp hết)</span>
                      )}
                      {product.stock === 0 && <span className="text-red-500">Hết hàng</span>}
                      {product.stock > 15 && (
                        <span className="text-zinc-700 dark:text-zinc-300">{product.stock}</span>
                      )}
                    </td>

                    <td className="py-3.5 text-center font-semibold text-zinc-600 dark:text-zinc-400">
                      {product.sold}
                    </td>

                    <td className="py-3.5">{renderStatusBadge(product.status)}</td>

                    <td className="py-3.5 pr-2 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {product.status !== 'DELETED' && (
                          <button
                            type="button"
                            onClick={function () {
                              onNavigateEditProduct(product.id)
                            }}
                            title="Chỉnh sửa sản phẩm"
                            className="flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-200 text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
                          >
                            <PencilSimple size={14} weight="bold" />
                          </button>
                        )}
                        {product.status !== 'DELETED' && (
                          <button
                            type="button"
                            onClick={function () {
                              handleToggleProductStatus(product.id)
                            }}
                            title={toggleTitle}
                            className="flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-200 text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
                          >
                            {product.status === 'ACTIVE' && <EyeSlash size={14} weight="bold" />}
                            {product.status !== 'ACTIVE' && <Eye size={14} weight="bold" />}
                          </button>
                        )}
                        {product.status !== 'DELETED' && (
                          <button
                            type="button"
                            onClick={function () {
                              setDeleteTargetId(product.id)
                            }}
                            title="Xóa mềm sản phẩm"
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

      {/* Modal Xóa mềm */}
      {deleteTargetId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-zinc-900">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
              Xác nhận xóa mềm sản phẩm?
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-zinc-500">
              Hệ thống sẽ chuyển trạng thái sản phẩm sang <strong>DELETED</strong>. Sản phẩm sẽ
              không còn hiển thị cho người mua, nhưng lịch sử đơn hàng đã đặt trước đó vẫn được lưu
              trữ nguyên vẹn.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={function () {
                  setDeleteTargetId(null)
                }}
                className="rounded-2xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="rounded-2xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nhập hàng loạt CSV */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCsv size={24} weight="bold" className="text-orange-600" />
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                  Nhập hàng loạt sản phẩm bằng file CSV
                </h3>
              </div>
              <button
                type="button"
                onClick={function () {
                  setShowImportModal(false)
                }}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X size={20} weight="bold" />
              </button>
            </div>

            <div className="mt-4 rounded-2xl bg-orange-50 p-3.5 text-xs text-orange-900 dark:bg-orange-950/40 dark:text-orange-200">
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
                className="mt-2 w-full rounded-2xl border border-zinc-200 p-3 font-mono text-xs outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={function () {
                  setShowImportModal(false)
                }}
                className="rounded-2xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                className="rounded-2xl bg-orange-600 px-5 py-2 text-xs font-bold text-white hover:bg-orange-700"
              >
                Bắt đầu nhập
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
