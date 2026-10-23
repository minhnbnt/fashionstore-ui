import { useState } from 'react'

import { useListCategories } from '@generated/endpoints/categories/categories'
import {
  getInventoryQueryKey,
  getListProductsQueryKey,
  useBulkDeleteProducts,
  useBulkImport,
  useBulkUpdatePrice,
  useBulkUpdateStatus,
  useBulkUpdateStock,
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
  WarningCircle,
  CircleNotch,
  PencilSimple,
  CheckSquare,
  Square,
  MinusSquare,
  CurrencyDollar,
  Package,
  ShieldWarning,
  ArrowCounterClockwise,
  Funnel,
  ArrowsDownUp,
  Tag,
} from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import { PLACEHOLDER_IMAGE, takeData } from '@/lib/apiAdapters'
import { formatDateTime, formatVnd } from '@/lib/format'
import { productItem } from '@/lib/sellerAdapters'

import type { ProductItem } from '@/types/seller'
import type { BulkOperationResult } from '@generated/model'

function isBulkResult(data: unknown): data is BulkOperationResult {
  if (typeof data !== 'object' || data === null) {
    return false
  }
  return 'successCount' in data && 'failedCount' in data
}

// Tên file export chỉ dùng khi bấm nút — sinh ở module-level để khỏi gọi Date.now trong render
function csvExportFileName(): string {
  return `products_export_${Date.now()}.csv`
}

type TabKey = 'ALL' | 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK' | 'PENDING' | 'BANNED' | 'DELETED'
type StockFilterKey = 'ALL' | 'LOW_STOCK' | 'OUT_OF_STOCK'
type SortKey =
  | 'createdAt_desc'
  | 'createdAt_asc'
  | 'stock_desc'
  | 'stock_asc'
  | 'sold_desc'
  | 'price_asc'
  | 'price_desc'

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

  // Tab & Filters state
  const [activeTab, setActiveTab] = useState<TabKey>('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [stockFilter, setStockFilter] = useState<StockFilterKey>('ALL')
  const [minPriceInput, setMinPriceInput] = useState('')
  const [maxPriceInput, setMaxPriceInput] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('createdAt_desc')

  // Multi-select state
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set())

  // Single delete modal state
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null)

  // Bulk modals state
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false)
  const [bulkDeleteErrorMessage, setBulkDeleteErrorMessage] = useState<string | null>(null)

  const [showBulkPriceModal, setShowBulkPriceModal] = useState(false)
  const [bulkPriceMode, setBulkPriceMode] = useState<'FIXED' | 'PERCENT'>('FIXED')
  const [bulkPriceValue, setBulkPriceValue] = useState('')
  const [bulkPriceError, setBulkPriceError] = useState<string | null>(null)

  const [showBulkStockModal, setShowBulkStockModal] = useState(false)
  const [bulkStockMode, setBulkStockMode] = useState<'FIXED' | 'DELTA'>('FIXED')
  const [bulkStockQuantity, setBulkStockQuantity] = useState('')
  const [bulkStockError, setBulkStockError] = useState<string | null>(null)

  // CSV Import modal state
  const [showImportModal, setShowImportModal] = useState(false)
  const [importText, setImportText] = useState('')

  // Toast notification
  const [notification, setNotification] = useState<string | null>(null)

  // Queries
  const productsQuery = useListProducts(shopId, undefined, { query: { enabled: shopId !== '' } })
  const categoriesQuery = useListCategories()

  const categoryNameById = new Map<string, string>()
  const categoriesList: { id: string; name: string }[] = []
  if (categoriesQuery.data !== undefined) {
    for (const c of takeData(categoriesQuery.data)) {
      const cId = c.id ?? ''
      const cName = c.name ?? ''
      categoryNameById.set(cId, cName)
      categoriesList.push({ id: cId, name: cName })
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

  function showToast(msg: string) {
    setNotification(msg)
    setTimeout(function () {
      setNotification(null)
    }, 3500)
  }

  // Mutations
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
        showToast('Đã xóa mềm sản phẩm vào thùng rác')
      },
      onError: function (error: unknown) {
        const errObj = error as { status?: number; response?: { status?: number } }
        let status: number | undefined
        if (errObj.status !== undefined) {
          status = errObj.status
        }
        if (status === undefined && errObj.response?.status !== undefined) {
          status = errObj.response.status
        }
        if (status === 409) {
          setDeleteErrorMessage(
            'Không thể xóa sản phẩm do đang có đơn hàng liên quan đang xử lý. Vui lòng hoàn tất hoặc hủy các đơn hàng trước.',
          )
          return
        }
        setDeleteErrorMessage('Đã xảy ra lỗi khi xóa sản phẩm. Vui lòng thử lại sau.')
      },
    },
  })

  const bulkStatusMutation = useBulkUpdateStatus({
    mutation: {
      onSuccess: function (resp) {
        void queryClient.invalidateQueries({ queryKey: getListProductsQueryKey(shopId) })
        setSelectedProductIds(new Set())
        const data = resp.data
        if (isBulkResult(data)) {
          showToast(`Thao tác thành công trên ${data.successCount} sản phẩm`)
          return
        }
        showToast('Thao tác hoàn tất')
      },
      onError: function () {
        showToast('Lỗi khi cập nhật trạng thái hàng loạt. Vui lòng thử lại.')
      },
    },
  })

  const bulkDeleteMutation = useBulkDeleteProducts({
    mutation: {
      onSuccess: function (resp) {
        void queryClient.invalidateQueries({ queryKey: getListProductsQueryKey(shopId) })
        setShowBulkDeleteModal(false)
        setBulkDeleteErrorMessage(null)
        setSelectedProductIds(new Set())
        const data = resp.data
        if (isBulkResult(data)) {
          if (data.failedCount > 0) {
            const detail = data.messages.join('; ')
            showToast(`Đã xóa ${data.successCount} sản phẩm. Bỏ qua ${data.failedCount}: ${detail}`)
            return
          }
          showToast(`Đã xóa mềm thành công ${data.successCount} sản phẩm`)
          return
        }
        showToast('Thao tác xóa mềm hoàn tất')
      },
      onError: function () {
        setBulkDeleteErrorMessage('Không thể xóa hàng loạt sản phẩm. Vui lòng kiểm tra lại.')
      },
    },
  })

  const bulkPriceMutation = useBulkUpdatePrice({
    mutation: {
      onSuccess: function (resp) {
        void queryClient.invalidateQueries({ queryKey: getListProductsQueryKey(shopId) })
        setShowBulkPriceModal(false)
        setBulkPriceError(null)
        setBulkPriceValue('')
        setSelectedProductIds(new Set())
        const data = resp.data
        if (isBulkResult(data)) {
          showToast(`Đã cập nhật giá cho ${data.successCount} sản phẩm`)
          return
        }
        showToast('Cập nhật giá hoàn tất')
      },
      onError: function () {
        setBulkPriceError('Lỗi cập nhật giá hàng loạt. Vui lòng kiểm tra lại giá trị.')
      },
    },
  })

  const bulkStockMutation = useBulkUpdateStock({
    mutation: {
      onSuccess: function (resp) {
        void queryClient.invalidateQueries({ queryKey: getListProductsQueryKey(shopId) })
        void queryClient.invalidateQueries({ queryKey: getInventoryQueryKey(shopId) })
        setShowBulkStockModal(false)
        setBulkStockError(null)
        setBulkStockQuantity('')
        setSelectedProductIds(new Set())
        const data = resp.data
        if (isBulkResult(data)) {
          showToast(`Đã cập nhật tồn kho cho ${data.successCount} sản phẩm`)
          return
        }
        showToast('Cập nhật tồn kho hoàn tất')
      },
      onError: function () {
        setBulkStockError('Lỗi cập nhật tồn kho hàng loạt. Vui lòng kiểm tra lại số lượng.')
      },
    },
  })

  const bulkImportMutation = useBulkImport({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getListProductsQueryKey(shopId) })
        void queryClient.invalidateQueries({ queryKey: getInventoryQueryKey(shopId) })
        setShowImportModal(false)
        setImportText('')
        showToast('Đã nhập hàng loạt sản phẩm thành công!')
      },
      onError: function () {
        showToast('Lỗi khi nhập file CSV. Vui lòng kiểm tra đúng định dạng các cột.')
      },
    },
  })

  // Đếm số lượng sản phẩm cho từng tab
  let countAll = 0
  let countActive = 0
  let countInactive = 0
  let countOutOfStock = 0
  let countPending = 0
  let countBanned = 0
  let countDeleted = 0

  for (const p of products) {
    if (p.status !== 'DELETED') {
      countAll += 1
    }
    if (p.status === 'ACTIVE') {
      countActive += 1
    }
    if (p.status === 'INACTIVE') {
      countInactive += 1
    }
    if (p.stock === 0 && p.status !== 'DELETED') {
      countOutOfStock += 1
    }
    if (p.status === 'PENDING') {
      countPending += 1
    }
    if (p.status === 'BANNED') {
      countBanned += 1
    }
    if (p.status === 'DELETED') {
      countDeleted += 1
    }
  }

  // Lọc sản phẩm theo Tab, Category, Stock level, Price range, Search
  let filteredProducts = products.filter(function (p) {
    // 1. Lọc theo Tab
    if (activeTab === 'ACTIVE' && p.status !== 'ACTIVE') {
      return false
    }
    if (activeTab === 'INACTIVE' && p.status !== 'INACTIVE') {
      return false
    }
    if (activeTab === 'OUT_OF_STOCK' && (p.stock > 0 || p.status === 'DELETED')) {
      return false
    }
    if (activeTab === 'PENDING' && p.status !== 'PENDING') {
      return false
    }
    if (activeTab === 'BANNED' && p.status !== 'BANNED') {
      return false
    }
    if (activeTab === 'DELETED' && p.status !== 'DELETED') {
      return false
    }
    if (activeTab === 'ALL' && p.status === 'DELETED') {
      return false
    }

    // 2. Lọc theo Danh mục
    if (selectedCategoryId !== '' && p.categoryId !== selectedCategoryId) {
      return false
    }

    // 3. Lọc theo Mức tồn kho
    if (stockFilter === 'OUT_OF_STOCK' && p.stock > 0) {
      return false
    }
    if (stockFilter === 'LOW_STOCK' && (p.stock > 15 || p.stock === 0)) {
      return false
    }

    // 4. Lọc theo Khoảng giá
    const minVal = parseFloat(minPriceInput)
    if (!Number.isNaN(minVal) && minVal > 0 && p.price < minVal) {
      return false
    }
    const maxVal = parseFloat(maxPriceInput)
    if (!Number.isNaN(maxVal) && maxVal > 0 && p.price > maxVal) {
      return false
    }

    // 5. Tìm kiếm theo tên hoặc SKU
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase()
      const matchName = p.name.toLowerCase().includes(term)
      const matchSku = p.sku.toLowerCase().includes(term)
      let matchVariantSku = false
      for (const v of p.variants) {
        if (v.sku.toLowerCase().includes(term)) {
          matchVariantSku = true
          break
        }
      }
      if (!matchName && !matchSku && !matchVariantSku) {
        return false
      }
    }

    return true
  })

  // Sắp xếp
  filteredProducts = filteredProducts.slice().sort(function (a, b) {
    if (sortBy === 'createdAt_asc') {
      const dateA = a.createdAt !== undefined ? new Date(a.createdAt).getTime() : 0
      const dateB = b.createdAt !== undefined ? new Date(b.createdAt).getTime() : 0
      return dateA - dateB
    }
    if (sortBy === 'stock_desc') {
      return b.stock - a.stock
    }
    if (sortBy === 'stock_asc') {
      return a.stock - b.stock
    }
    if (sortBy === 'sold_desc') {
      return b.sold - a.sold
    }
    if (sortBy === 'price_asc') {
      return a.price - b.price
    }
    if (sortBy === 'price_desc') {
      return b.price - a.price
    }
    // Default: createdAt_desc
    const dateA = a.createdAt !== undefined ? new Date(a.createdAt).getTime() : 0
    const dateB = b.createdAt !== undefined ? new Date(b.createdAt).getTime() : 0
    return dateB - dateA
  })

  // Selection logic
  const selectableProducts = filteredProducts.filter(function (p) {
    return p.status !== 'DELETED'
  })

  let allSelectableSelected = false
  if (selectableProducts.length > 0) {
    let countSelected = 0
    for (const p of selectableProducts) {
      if (selectedProductIds.has(p.id)) {
        countSelected += 1
      }
    }
    if (countSelected === selectableProducts.length) {
      allSelectableSelected = true
    }
  }

  function handleToggleSelectAll() {
    if (allSelectableSelected) {
      setSelectedProductIds(new Set())
      return
    }
    const nextSet = new Set(selectedProductIds)
    for (const p of selectableProducts) {
      nextSet.add(p.id)
    }
    setSelectedProductIds(nextSet)
  }

  function handleToggleSelectRow(productId: string) {
    const nextSet = new Set(selectedProductIds)
    if (nextSet.has(productId)) {
      nextSet.delete(productId)
    } else {
      nextSet.add(productId)
    }
    setSelectedProductIds(nextSet)
  }

  function handleClearSelection() {
    setSelectedProductIds(new Set())
  }

  // Single handlers
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
          showToast('Không thể cập nhật trạng thái sản phẩm.')
        },
      },
    )
  }

  function handleConfirmSingleDelete() {
    if (deleteTargetId !== null) {
      setDeleteErrorMessage(null)
      deleteProductMutation.mutate({ shopId, id: deleteTargetId })
    }
  }

  // Bulk handlers
  function handleBulkStatus(targetStatus: 'ACTIVE' | 'HIDDEN') {
    const ids = Array.from(selectedProductIds)
    if (ids.length === 0) {
      return
    }
    bulkStatusMutation.mutate({
      shopId,
      data: {
        productIds: ids,
        status: targetStatus,
      },
    })
  }

  function handleConfirmBulkDelete() {
    const ids = Array.from(selectedProductIds)
    if (ids.length === 0) {
      return
    }
    setBulkDeleteErrorMessage(null)
    bulkDeleteMutation.mutate({
      shopId,
      data: {
        productIds: ids,
      },
    })
  }

  function handleConfirmBulkPrice() {
    const ids = Array.from(selectedProductIds)
    if (ids.length === 0) {
      setBulkPriceError('Vui lòng chọn ít nhất 1 sản phẩm')
      return
    }
    const val = parseFloat(bulkPriceValue)
    if (Number.isNaN(val)) {
      setBulkPriceError('Vui lòng nhập giá trị số hợp lệ')
      return
    }
    if (bulkPriceMode === 'FIXED' && val <= 0) {
      setBulkPriceError('Giá cố định phải lớn hơn 0')
      return
    }
    if (bulkPriceMode === 'PERCENT' && (val < -90 || val > 500)) {
      setBulkPriceError('Phần trăm thay đổi phải từ -90% đến +500%')
      return
    }
    setBulkPriceError(null)
    bulkPriceMutation.mutate({
      shopId,
      data: {
        productIds: ids,
        mode: bulkPriceMode,
        value: val,
      },
    })
  }

  function handleConfirmBulkStock() {
    const ids = Array.from(selectedProductIds)
    if (ids.length === 0) {
      setBulkStockError('Vui lòng chọn ít nhất 1 sản phẩm')
      return
    }
    const qty = parseInt(bulkStockQuantity, 10)
    if (Number.isNaN(qty)) {
      setBulkStockError('Vui lòng nhập số lượng nguyên hợp lệ')
      return
    }
    if (bulkStockMode === 'FIXED' && qty < 0) {
      setBulkStockError('Tồn kho cố định không được nhỏ hơn 0')
      return
    }
    setBulkStockError(null)
    bulkStockMutation.mutate({
      shopId,
      data: {
        productIds: ids,
        mode: bulkStockMode,
        quantity: qty,
      },
    })
  }

  function handleResetFilters() {
    setActiveTab('ALL')
    setSearchTerm('')
    setSelectedCategoryId('')
    setStockFilter('ALL')
    setMinPriceInput('')
    setMaxPriceInput('')
    setSortBy('createdAt_desc')
  }

  const isFiltered =
    activeTab !== 'ALL' ||
    searchTerm !== '' ||
    selectedCategoryId !== '' ||
    stockFilter !== 'ALL' ||
    minPriceInput !== '' ||
    maxPriceInput !== '' ||
    sortBy !== 'createdAt_desc'

  function handleExportCsv() {
    const headers = 'name,slug,sku,category,price,stock,sold,status,createdAt\n'
    const rows = products
      .map(function (p) {
        return `"${p.name}","${p.slug}","${p.sku}","${p.category}",${p.price},${p.stock},${p.sold},${p.status},"${p.createdAt ?? ''}"`
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
    const file = new File([importText], 'products.csv', { type: 'text/csv' })
    bulkImportMutation.mutate({ shopId, data: { file } })
  }

  function renderStatusBadge(product: ProductItem) {
    if (product.status === 'ACTIVE') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Đang bán
        </span>
      )
    }
    if (product.status === 'PENDING') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
          Chờ duyệt
        </span>
      )
    }
    if (product.status === 'INACTIVE') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
          Đã ẩn
        </span>
      )
    }
    if (product.status === 'BANNED') {
      return (
        <span
          className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700 dark:bg-red-950/60 dark:text-red-300"
          title={
            product.statusReason !== undefined && product.statusReason !== null
              ? `Lý do vi phạm: ${product.statusReason}`
              : 'Sản phẩm vi phạm chính sách sàn'
          }
        >
          <ShieldWarning size={14} weight="fill" className="text-red-600" />
          Vi phạm
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-600 dark:bg-red-950/40 dark:text-red-400">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
        Đã xóa
      </span>
    )
  }

  return (
    <div className="space-y-6 pb-20">
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
          <h2 className="text-xl font-black text-zinc-900 dark:text-white">
            Quản lý danh sách sản phẩm
          </h2>
          <p className="text-xs text-zinc-500">
            Tổng quan và quản lý tất cả sản phẩm đang bán, lọc đa tiêu chí và thao tác hàng loạt
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
            Nhập CSV
          </button>
          <button
            type="button"
            onClick={onNavigateAddProduct}
            className="flex items-center gap-2 rounded-2xl bg-orange-600 px-4 py-2 text-xs font-bold text-white shadow-md transition hover:bg-orange-700"
          >
            <Plus size={16} weight="bold" />
            Đăng sản phẩm mới
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="rounded-3xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {/* Tab phân loại 6 tabs */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-zinc-100 pb-4 dark:border-zinc-800">
          {[
            { id: 'ALL', label: 'Tất cả', count: countAll },
            { id: 'ACTIVE', label: 'Đang bán', count: countActive },
            { id: 'INACTIVE', label: 'Đã ẩn', count: countInactive },
            { id: 'OUT_OF_STOCK', label: 'Hết hàng', count: countOutOfStock },
            { id: 'PENDING', label: 'Chờ duyệt', count: countPending },
            { id: 'BANNED', label: 'Vi phạm', count: countBanned },
            { id: 'DELETED', label: 'Đã xóa', count: countDeleted },
          ].map(function (tab) {
            const isCurrent = activeTab === tab.id
            let tabClasses =
              'flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-xs font-bold transition text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 dark:hover:text-white dark:hover:bg-zinc-800/50'
            let countBadgeClasses =
              'rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
            if (isCurrent) {
              tabClasses =
                'flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-xs font-bold transition bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400 shadow-2xs'
              countBadgeClasses =
                'rounded-full bg-orange-100/70 px-2 py-0.5 text-[10px] text-orange-600 dark:bg-orange-900/50 dark:text-orange-300'
            }
            return (
              <button
                key={tab.id}
                type="button"
                onClick={function () {
                  setActiveTab(tab.id as TabKey)
                }}
                className={tabClasses}
              >
                <span>{tab.label}</span>
                <span className={countBadgeClasses}>{tab.count}</span>
              </button>
            )
          })}
        </div>

        {/* Thanh tìm kiếm và bộ lọc nâng cao */}
        <div className="mt-4 flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
            {/* Tìm kiếm */}
            <div className="relative md:col-span-4">
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
                placeholder="Tìm theo tên sản phẩm, mã SKU..."
                className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 py-2.5 pr-4 pl-9 text-xs transition outline-none focus:border-orange-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:bg-zinc-900"
              />
              {searchTerm !== '' && (
                <button
                  type="button"
                  onClick={function () {
                    setSearchTerm('')
                  }}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  <X size={14} weight="bold" />
                </button>
              )}
            </div>

            {/* Lọc danh mục */}
            <div className="md:col-span-3">
              <div className="relative">
                <Tag
                  size={15}
                  weight="bold"
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-400"
                />
                <select
                  value={selectedCategoryId}
                  onChange={function (e) {
                    setSelectedCategoryId(e.target.value)
                  }}
                  className="w-full appearance-none rounded-2xl border border-zinc-200 bg-zinc-50 py-2.5 pr-8 pl-9 text-xs font-medium text-zinc-700 transition outline-none focus:border-orange-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                >
                  <option value="">Tất cả danh mục</option>
                  {categoriesList.map(function (cat) {
                    return (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    )
                  })}
                </select>
                <Funnel
                  size={12}
                  className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-zinc-400"
                />
              </div>
            </div>

            {/* Lọc tồn kho */}
            <div className="md:col-span-2">
              <div className="relative">
                <Package
                  size={15}
                  weight="bold"
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-400"
                />
                <select
                  value={stockFilter}
                  onChange={function (e) {
                    setStockFilter(e.target.value as StockFilterKey)
                  }}
                  className="w-full appearance-none rounded-2xl border border-zinc-200 bg-zinc-50 py-2.5 pr-8 pl-9 text-xs font-medium text-zinc-700 transition outline-none focus:border-orange-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                >
                  <option value="ALL">Mọi mức tồn kho</option>
                  <option value="LOW_STOCK">Sắp hết hàng (≤ 15)</option>
                  <option value="OUT_OF_STOCK">Hết hàng (= 0)</option>
                </select>
              </div>
            </div>

            {/* Sắp xếp */}
            <div className="md:col-span-3">
              <div className="relative">
                <ArrowsDownUp
                  size={15}
                  weight="bold"
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-400"
                />
                <select
                  value={sortBy}
                  onChange={function (e) {
                    setSortBy(e.target.value as SortKey)
                  }}
                  className="w-full appearance-none rounded-2xl border border-zinc-200 bg-zinc-50 py-2.5 pr-8 pl-9 text-xs font-medium text-zinc-700 transition outline-none focus:border-orange-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                >
                  <option value="createdAt_desc">Ngày đăng: Mới nhất</option>
                  <option value="createdAt_asc">Ngày đăng: Cũ nhất</option>
                  <option value="stock_desc">Tồn kho: Nhiều nhất</option>
                  <option value="stock_asc">Tồn kho: Ít nhất</option>
                  <option value="sold_desc">Lượt bán: Bán chạy nhất</option>
                  <option value="price_asc">Giá: Thấp đến cao</option>
                  <option value="price_desc">Giá: Cao đến thấp</option>
                </select>
              </div>
            </div>
          </div>

          {/* Dải lọc khoảng giá & Nút Reset */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              <span className="font-semibold">Khoảng giá (VND):</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  step="10000"
                  value={minPriceInput}
                  onChange={function (e) {
                    setMinPriceInput(e.target.value)
                  }}
                  placeholder="Từ..."
                  className="w-28 rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs transition outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                />
                <span className="text-zinc-400">-</span>
                <input
                  type="number"
                  min="0"
                  step="10000"
                  value={maxPriceInput}
                  onChange={function (e) {
                    setMaxPriceInput(e.target.value)
                  }}
                  placeholder="Đến..."
                  className="w-28 rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs transition outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                />
              </div>
            </div>

            {isFiltered && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                <ArrowCounterClockwise size={13} weight="bold" />
                Xóa bộ lọc
              </button>
            )}
          </div>
        </div>

        {/* Bảng danh sách sản phẩm */}
        <div className="mt-5 overflow-x-auto rounded-2xl border border-zinc-200/80 dark:border-zinc-800">
          <table className="w-full min-w-[1100px] text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200/80 bg-zinc-50/70 text-[11px] font-bold text-zinc-500 uppercase dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-400">
                <th className="w-10 py-3.5 pr-1 pl-4 text-center whitespace-nowrap">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    disabled={selectableProducts.length === 0}
                    className="flex items-center justify-center text-zinc-400 hover:text-orange-600 disabled:opacity-40"
                    title={allSelectableSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả sản phẩm'}
                  >
                    {allSelectableSelected && (
                      <CheckSquare size={18} weight="fill" className="text-orange-600" />
                    )}
                    {!allSelectableSelected && selectedProductIds.size > 0 && (
                      <MinusSquare size={18} weight="fill" className="text-orange-600" />
                    )}
                    {!allSelectableSelected && selectedProductIds.size === 0 && (
                      <Square size={18} weight="bold" />
                    )}
                  </button>
                </th>
                <th className="w-[300px] min-w-[260px] py-3.5 pr-3 pl-2 text-left whitespace-nowrap">
                  Sản phẩm & SKU
                </th>
                <th className="min-w-[220px] px-3 py-3.5 text-left whitespace-nowrap">
                  Biến thể / Danh mục
                </th>
                <th className="w-[130px] min-w-[110px] px-3 py-3.5 text-right whitespace-nowrap">
                  Giá bán
                </th>
                <th className="w-[120px] min-w-[100px] px-3 py-3.5 text-center whitespace-nowrap">
                  Tổng kho
                </th>
                <th className="w-[90px] min-w-[80px] px-3 py-3.5 text-center whitespace-nowrap">
                  Đã bán
                </th>
                <th className="w-[140px] min-w-[120px] px-3 py-3.5 text-center whitespace-nowrap">
                  Trạng thái
                </th>
                <th className="w-[130px] min-w-[110px] px-3 py-3.5 text-center whitespace-nowrap">
                  Ngày đăng
                </th>
                <th className="w-[110px] min-w-[90px] py-3.5 pr-4 pl-3 text-right whitespace-nowrap">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {filteredProducts.map(function (product) {
                let toggleActionTitle = 'Bật bán sản phẩm'
                if (product.status === 'ACTIVE') {
                  toggleActionTitle = 'Tạm ẩn sản phẩm'
                }
                const isSelected = selectedProductIds.has(product.id)
                const isLowStock = product.stock <= 15 && product.stock > 0
                const isOutOfStock = product.stock === 0
                const isBanned = product.status === 'BANNED'

                return (
                  <tr
                    key={product.id}
                    className={`transition hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30 ${
                      isSelected ? 'bg-orange-50/30 dark:bg-orange-950/20' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-3.5 pr-1 pl-4 text-center">
                      {product.status !== 'DELETED' && (
                        <button
                          type="button"
                          onClick={function () {
                            handleToggleSelectRow(product.id)
                          }}
                          className="flex items-center justify-center text-zinc-400 hover:text-orange-600"
                        >
                          {isSelected && (
                            <CheckSquare size={17} weight="fill" className="text-orange-600" />
                          )}
                          {!isSelected && <Square size={17} weight="bold" />}
                        </button>
                      )}
                    </td>

                    {/* Sản phẩm & SKU */}
                    <td className="py-3.5 pr-3 pl-2">
                      <div className="flex items-center gap-3">
                        <img
                          src={product.image}
                          alt=""
                          onError={function (e) {
                            e.currentTarget.src = PLACEHOLDER_IMAGE
                          }}
                          className="h-12 w-12 shrink-0 rounded-xl border border-zinc-200/80 bg-zinc-100 object-cover dark:border-zinc-800 dark:bg-zinc-800"
                        />
                        <div className="max-w-[210px] min-w-0">
                          <button
                            type="button"
                            onClick={function () {
                              if (product.status !== 'DELETED') {
                                onNavigateEditProduct(product.id)
                              }
                            }}
                            className="line-clamp-2 text-left font-bold text-zinc-900 transition hover:text-orange-600 dark:text-white dark:hover:text-orange-400"
                            title={product.name}
                          >
                            {product.name}
                          </button>
                          <p className="mt-0.5 truncate text-[11px] text-zinc-400">
                            SKU: {product.sku !== '' ? product.sku : '---'}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Biến thể & Danh mục */}
                    <td className="px-3 py-3.5 text-zinc-600 dark:text-zinc-400">
                      <div className="flex max-w-[260px] flex-col gap-1">
                        {product.category !== '' && (
                          <span className="text-[11px] font-semibold text-zinc-500">
                            {product.category}
                          </span>
                        )}
                        <div className="flex flex-wrap gap-1">
                          {product.variants.map(function (v) {
                            return (
                              <span
                                key={v.id}
                                className="rounded-lg bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                              >
                                {v.color} - {v.size}
                              </span>
                            )
                          })}
                        </div>
                      </div>
                    </td>

                    {/* Giá bán */}
                    <td className="px-3 py-3.5 text-right font-bold whitespace-nowrap text-zinc-900 dark:text-white">
                      {formatVnd(product.price)}
                    </td>

                    {/* Tổng kho & Cảnh báo */}
                    <td className="px-3 py-3.5 text-center font-bold whitespace-nowrap">
                      {isLowStock && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                          <WarningCircle size={13} weight="bold" />
                          {product.stock} <span className="text-[10px] font-normal">(Sắp hết)</span>
                        </span>
                      )}
                      {isOutOfStock && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2 py-0.5 text-xs font-bold text-red-600 dark:bg-red-950/40 dark:text-red-400">
                          <WarningCircle size={13} weight="bold" />
                          Hết hàng
                        </span>
                      )}
                      {!isLowStock && !isOutOfStock && (
                        <span className="text-zinc-700 dark:text-zinc-300">{product.stock}</span>
                      )}
                    </td>

                    {/* Đã bán */}
                    <td className="px-3 py-3.5 text-center font-semibold whitespace-nowrap text-zinc-600 dark:text-zinc-400">
                      {product.sold}
                    </td>

                    {/* Trạng thái */}
                    <td className="px-3 py-3.5 text-center whitespace-nowrap">
                      <div className="flex flex-col items-center gap-1">
                        {renderStatusBadge(product)}
                        {isBanned &&
                          product.statusReason !== undefined &&
                          product.statusReason !== null && (
                            <span
                              className="max-w-[130px] truncate text-[10px] text-red-500"
                              title={product.statusReason}
                            >
                              {product.statusReason}
                            </span>
                          )}
                      </div>
                    </td>

                    {/* Ngày đăng */}
                    <td className="px-3 py-3.5 text-center text-[11px] whitespace-nowrap text-zinc-400">
                      {formatDateTime(product.createdAt)}
                    </td>

                    {/* Thao tác đơn lẻ */}
                    <td className="py-3.5 pr-4 pl-3 text-right whitespace-nowrap">
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
                        {product.status !== 'DELETED' &&
                          product.status !== 'PENDING' &&
                          product.status !== 'BANNED' && (
                            <button
                              type="button"
                              disabled={updateProductMutation.isPending}
                              onClick={function () {
                                handleToggleProductStatus(product.id)
                              }}
                              title={toggleActionTitle}
                              className="flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-200 text-zinc-600 transition hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
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
              <p className="text-sm font-medium">Không tìm thấy sản phẩm nào phù hợp với bộ lọc.</p>
              {isFiltered && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-zinc-100 px-3.5 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200"
                >
                  <ArrowCounterClockwise size={13} weight="bold" />
                  Đặt lại bộ lọc
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Floating Bulk Action Bar (Hiển thị khi chọn >= 1 sản phẩm) */}
      {selectedProductIds.size > 0 && (
        <aside
          aria-label="Thao tác hàng loạt trên các sản phẩm đã chọn"
          className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-3xl border border-zinc-800 bg-zinc-950/95 px-5 py-3 text-white shadow-2xl backdrop-blur-md dark:border-zinc-700 dark:bg-zinc-900/95"
        >
          <div className="flex items-center gap-2 border-r border-zinc-700 pr-3 text-xs font-bold">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-600 text-[10px] font-black text-white">
              {selectedProductIds.size}
            </span>
            <span>Đã chọn</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Hiện hàng loạt */}
            <button
              type="button"
              disabled={bulkStatusMutation.isPending}
              onClick={function () {
                handleBulkStatus('ACTIVE')
              }}
              className="flex items-center gap-1.5 rounded-2xl bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-700 disabled:opacity-50"
            >
              <Eye size={14} weight="bold" className="text-emerald-400" />
              <span>Hiện</span>
            </button>

            {/* Ẩn hàng loạt */}
            <button
              type="button"
              disabled={bulkStatusMutation.isPending}
              onClick={function () {
                handleBulkStatus('HIDDEN')
              }}
              className="flex items-center gap-1.5 rounded-2xl bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-700 disabled:opacity-50"
            >
              <EyeSlash size={14} weight="bold" className="text-amber-400" />
              <span>Ẩn</span>
            </button>

            {/* Đổi giá hàng loạt */}
            <button
              type="button"
              onClick={function () {
                setBulkPriceError(null)
                setBulkPriceValue('')
                setShowBulkPriceModal(true)
              }}
              className="flex items-center gap-1.5 rounded-2xl bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-700"
            >
              <CurrencyDollar size={14} weight="bold" className="text-cyan-400" />
              <span>Đổi giá</span>
            </button>

            {/* Cập nhật tồn kho hàng loạt */}
            <button
              type="button"
              onClick={function () {
                setBulkStockError(null)
                setBulkStockQuantity('')
                setShowBulkStockModal(true)
              }}
              className="flex items-center gap-1.5 rounded-2xl bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-700"
            >
              <Package size={14} weight="bold" className="text-indigo-400" />
              <span>Cập nhật kho</span>
            </button>

            {/* Xóa hàng loạt */}
            <button
              type="button"
              onClick={function () {
                setBulkDeleteErrorMessage(null)
                setShowBulkDeleteModal(true)
              }}
              className="flex items-center gap-1.5 rounded-2xl border border-red-800/60 bg-red-950/70 px-3 py-1.5 text-xs font-semibold text-red-200 transition hover:bg-red-900 disabled:opacity-50"
            >
              <Trash size={14} weight="bold" className="text-red-400" />
              <span>Xóa</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleClearSelection}
            className="ml-2 rounded-xl p-1 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
            title="Bỏ chọn tất cả"
          >
            <X size={15} weight="bold" />
          </button>
        </aside>
      )}

      {/* Modal Đổi giá hàng loạt */}
      {showBulkPriceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CurrencyDollar size={22} weight="bold" className="text-orange-600" />
                <h3 className="text-base font-black text-zinc-900 dark:text-white">
                  Đổi giá cho {selectedProductIds.size} sản phẩm
                </h3>
              </div>
              <button
                type="button"
                onClick={function () {
                  setShowBulkPriceModal(false)
                }}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            {bulkPriceError !== null && (
              <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 p-2.5 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
                <WarningCircle size={16} weight="bold" className="shrink-0 text-red-600" />
                <span>{bulkPriceError}</span>
              </div>
            )}

            <div className="mt-4 space-y-3">
              <span className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Phương thức đổi giá:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={function () {
                    setBulkPriceMode('FIXED')
                  }}
                  className={`rounded-2xl border p-3 text-left transition ${
                    bulkPriceMode === 'FIXED'
                      ? 'border-orange-500 bg-orange-50/40 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300'
                      : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400'
                  }`}
                >
                  <p className="text-xs font-bold">Giá cố định</p>
                  <p className="text-[10px] text-zinc-400">Gán một mức giá mới cho toàn bộ</p>
                </button>
                <button
                  type="button"
                  onClick={function () {
                    setBulkPriceMode('PERCENT')
                  }}
                  className={`rounded-2xl border p-3 text-left transition ${
                    bulkPriceMode === 'PERCENT'
                      ? 'border-orange-500 bg-orange-50/40 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300'
                      : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400'
                  }`}
                >
                  <p className="text-xs font-bold">Theo phần trăm (%)</p>
                  <p className="text-[10px] text-zinc-400">Tăng (+) hoặc giảm (-) % giá hiện tại</p>
                </button>
              </div>

              <div className="pt-2">
                <label
                  htmlFor="bulkPriceValueInput"
                  className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                >
                  {bulkPriceMode === 'FIXED' && 'Mức giá mới (VND):'}
                  {bulkPriceMode === 'PERCENT' && 'Phần trăm thay đổi (-90 đến +500%):'}
                </label>
                <input
                  id="bulkPriceValueInput"
                  type="number"
                  step={bulkPriceMode === 'FIXED' ? '1000' : '1'}
                  value={bulkPriceValue}
                  onChange={function (e) {
                    setBulkPriceValue(e.target.value)
                  }}
                  placeholder={
                    bulkPriceMode === 'FIXED' ? 'Ví dụ: 199000' : 'Ví dụ: -10 (giảm 10%) hoặc 15'
                  }
                  className="mt-1.5 w-full rounded-2xl border border-zinc-200 bg-zinc-50 p-2.5 text-xs outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={function () {
                  setShowBulkPriceModal(false)
                }}
                className="rounded-2xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={bulkPriceMutation.isPending}
                onClick={handleConfirmBulkPrice}
                className="flex items-center gap-1.5 rounded-2xl bg-orange-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-orange-700 disabled:opacity-50"
              >
                {bulkPriceMutation.isPending && (
                  <CircleNotch size={14} weight="bold" className="animate-spin" />
                )}
                <span>Áp dụng đổi giá</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cập nhật tồn kho hàng loạt */}
      {showBulkStockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package size={22} weight="bold" className="text-orange-600" />
                <h3 className="text-base font-black text-zinc-900 dark:text-white">
                  Cập nhật kho cho {selectedProductIds.size} sản phẩm
                </h3>
              </div>
              <button
                type="button"
                onClick={function () {
                  setShowBulkStockModal(false)
                }}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            {bulkStockError !== null && (
              <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 p-2.5 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
                <WarningCircle size={16} weight="bold" className="shrink-0 text-red-600" />
                <span>{bulkStockError}</span>
              </div>
            )}

            <div className="mt-4 space-y-3">
              <span className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Phương thức cập nhật kho:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={function () {
                    setBulkStockMode('FIXED')
                  }}
                  className={`rounded-2xl border p-3 text-left transition ${
                    bulkStockMode === 'FIXED'
                      ? 'border-orange-500 bg-orange-50/40 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300'
                      : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400'
                  }`}
                >
                  <p className="text-xs font-bold">Gán tồn cố định</p>
                  <p className="text-[10px] text-zinc-400">Thiết lập số lượng tồn mới (≥ 0)</p>
                </button>
                <button
                  type="button"
                  onClick={function () {
                    setBulkStockMode('DELTA')
                  }}
                  className={`rounded-2xl border p-3 text-left transition ${
                    bulkStockMode === 'DELTA'
                      ? 'border-orange-500 bg-orange-50/40 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300'
                      : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400'
                  }`}
                >
                  <p className="text-xs font-bold">Cộng/Trừ (+ / -)</p>
                  <p className="text-[10px] text-zinc-400">Thêm hoặc bớt số lượng vào kho</p>
                </button>
              </div>

              <div className="pt-2">
                <label
                  htmlFor="bulkStockQtyInput"
                  className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                >
                  {bulkStockMode === 'FIXED' && 'Số lượng tồn cố định mới:'}
                  {bulkStockMode === 'DELTA' && 'Số lượng cộng thêm (+) hoặc trừ đi (-):'}
                </label>
                <input
                  id="bulkStockQtyInput"
                  type="number"
                  step="1"
                  value={bulkStockQuantity}
                  onChange={function (e) {
                    setBulkStockQuantity(e.target.value)
                  }}
                  placeholder={bulkStockMode === 'FIXED' ? 'Ví dụ: 50' : 'Ví dụ: 10 hoặc -5'}
                  className="mt-1.5 w-full rounded-2xl border border-zinc-200 bg-zinc-50 p-2.5 text-xs outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={function () {
                  setShowBulkStockModal(false)
                }}
                className="rounded-2xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={bulkStockMutation.isPending}
                onClick={handleConfirmBulkStock}
                className="flex items-center gap-1.5 rounded-2xl bg-orange-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-orange-700 disabled:opacity-50"
              >
                {bulkStockMutation.isPending && (
                  <CircleNotch size={14} weight="bold" className="animate-spin" />
                )}
                <span>Lưu tồn kho</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xóa hàng loạt */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-zinc-900">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400">
                <WarningCircle size={24} weight="bold" />
              </div>
              <div>
                <h3 className="text-base font-black text-zinc-900 dark:text-white">
                  Xác nhận xóa mềm {selectedProductIds.size} sản phẩm?
                </h3>
                <p className="text-[11px] font-semibold text-zinc-400">
                  Sản phẩm sẽ chuyển sang trạng thái DELETED
                </p>
              </div>
            </div>

            {bulkDeleteErrorMessage !== null && (
              <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                <WarningCircle size={18} weight="bold" className="mt-0.5 shrink-0 text-red-600" />
                <div className="leading-relaxed">{bulkDeleteErrorMessage}</div>
              </div>
            )}

            <p className="mt-4 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              Các sản phẩm được chọn sẽ bị ẩn khỏi sàn và người mua không thể đặt hàng mới. Nếu có
              sản phẩm đang có đơn hàng xử lý, hệ thống sẽ tự động bảo vệ và bỏ qua sản phẩm đó.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={bulkDeleteMutation.isPending}
                onClick={function () {
                  setShowBulkDeleteModal(false)
                  setBulkDeleteErrorMessage(null)
                }}
                className="rounded-2xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:text-zinc-300"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={bulkDeleteMutation.isPending}
                onClick={handleConfirmBulkDelete}
                className="flex items-center gap-1.5 rounded-2xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-red-700 disabled:opacity-50"
              >
                {bulkDeleteMutation.isPending && (
                  <CircleNotch size={14} weight="bold" className="animate-spin" />
                )}
                <span>Xác nhận xóa {selectedProductIds.size} sản phẩm</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xóa mềm đơn lẻ */}
      {deleteTargetId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-zinc-900">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400">
                <WarningCircle size={24} weight="bold" />
              </div>
              <div>
                <h3 className="text-base font-black text-zinc-900 dark:text-white">
                  Xác nhận xóa mềm sản phẩm?
                </h3>
                <p className="text-[11px] font-semibold text-zinc-400">
                  Chỉ xóa mềm trong hệ thống — không xóa cứng
                </p>
              </div>
            </div>

            {deleteErrorMessage !== null && (
              <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                <WarningCircle size={18} weight="bold" className="mt-0.5 shrink-0 text-red-600" />
                <div className="leading-relaxed">{deleteErrorMessage}</div>
              </div>
            )}

            {deleteTargetProduct !== undefined && (
              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-zinc-200/80 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
                <img
                  src={deleteTargetProduct.image}
                  alt={deleteTargetProduct.name}
                  className="h-12 w-12 shrink-0 rounded-xl border border-zinc-200 object-cover dark:border-zinc-700"
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

            <p className="mt-4 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              Sản phẩm sẽ được chuyển sang trạng thái <strong>DELETED</strong>. Sản phẩm sẽ bị ẩn
              khỏi gian hàng và người mua không thể đặt hàng mới. Lịch sử đơn hàng và doanh thu quá
              khứ vẫn được lưu trữ nguyên vẹn.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={deleteProductMutation.isPending}
                onClick={function () {
                  setDeleteTargetId(null)
                  setDeleteErrorMessage(null)
                }}
                className="rounded-2xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={deleteProductMutation.isPending}
                onClick={handleConfirmSingleDelete}
                className="flex items-center gap-1.5 rounded-2xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-red-700 disabled:opacity-50"
              >
                {deleteProductMutation.isPending && (
                  <CircleNotch size={14} weight="bold" className="animate-spin" />
                )}
                {deleteProductMutation.isPending && <span>Đang xử lý...</span>}
                {!deleteProductMutation.isPending && <span>Xác nhận xóa</span>}
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
