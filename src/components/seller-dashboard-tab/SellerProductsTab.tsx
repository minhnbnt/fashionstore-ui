import { useState } from 'react'

import { useListCategories } from '@generated/endpoints/categories/categories'
import {
  adjustStock,
  getInventoryQueryKey,
  getListProductsQueryKey,
  useBulkDeleteProducts,
  useBulkUpdatePrice,
  useBulkUpdateStatus,
  useListProducts,
} from '@generated/endpoints/seller-products-inventory/seller-products-inventory'
import { useDeleteProduct, useUpdate1 } from '@generated/endpoints/shop-products/shop-products'
import {
  Plus,
  MagnifyingGlass,
  Eye,
  EyeSlash,
  Trash,
  CheckCircle,
  X,
  WarningCircle,
  CircleNotch,
  PencilSimple,
  CheckSquare,
  Square,
  MinusSquare,
  CurrencyDollar,
  Package,
  ArrowCounterClockwise,
  Funnel,
  ArrowsDownUp,
  Tag,
} from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import Modal from '@/components/Modal'
import StatusBadge from '@/components/ui/StatusBadge'
import { PLACEHOLDER_IMAGE, takeData } from '@/lib/apiAdapters'
import { ApiError } from '@/lib/apiFetch'
import { formatDateTime, formatVnd } from '@/lib/format'
import { productItem } from '@/lib/sellerAdapters'
import { sellerStatusMeta } from '@/lib/sellerStatus'

import type { ProductItem } from '@/types/seller'
import type { BulkOperationResult, SellerProductResponse } from '@generated/model'

function isBulkResult(data: unknown): data is BulkOperationResult {
  if (typeof data !== 'object' || data === null) {
    return false
  }
  return 'successCount' in data && 'failedCount' in data
}

function parseCreatedTime(p: ProductItem): number {
  if (p.createdAt === undefined || p.createdAt === null || p.createdAt === '') {
    return 0
  }
  return new Date(p.createdAt).getTime()
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
  const [variantStocks, setVariantStocks] = useState<Record<string, string>>({})
  const [quickApplyValue, setQuickApplyValue] = useState('')
  const [isUpdatingStock, setIsUpdatingStock] = useState(false)
  const [bulkStockError, setBulkStockError] = useState<string | null>(null)

  // Toast notification
  const [notification, setNotification] = useState<string | null>(null)

  // Queries. BE tra "ALL" khong bao gom san pham DELETED nen can them 1 query rieng
  // cho tab "Da xoa" (gop lai de client-side filter va dem so luong van dung duoc).
  const productsQuery = useListProducts(shopId, undefined, { query: { enabled: shopId !== '' } })
  const deletedQuery = useListProducts(
    shopId,
    { status: 'DELETED' },
    { query: { enabled: shopId !== '' } },
  )
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

  function toProductItem(p: SellerProductResponse): ProductItem {
    return productItem(p, categoryNameById.get(p.categoryId ?? ''))
  }

  let products: ProductItem[] = []
  if (productsQuery.data !== undefined) {
    products = takeData(productsQuery.data).map(toProductItem)
  }
  if (deletedQuery.data !== undefined) {
    products = products.concat(takeData(deletedQuery.data).map(toProductItem))
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
          if (data.failedCount !== undefined && data.failedCount > 0) {
            const detail = (data.messages ?? []).join('; ')
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
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getListProductsQueryKey(shopId) })
        setShowBulkPriceModal(false)
        setBulkPriceError(null)
        setBulkPriceValue('')
        setSelectedProductIds(new Set())
        showToast('Cập nhật giá sản phẩm thành công')
      },
      onError: function () {
        setBulkPriceError('Lỗi cập nhật giá sản phẩm. Vui lòng kiểm tra lại giá trị.')
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
      const dateA = parseCreatedTime(a)
      const dateB = parseCreatedTime(b)
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
    const dateA = parseCreatedTime(a)
    const dateB = parseCreatedTime(b)
    return dateB - dateA
  })

  // Tìm sản phẩm duy nhất khi chỉ chọn 1 sản phẩm
  let singleSelectedProduct: ProductItem | undefined
  if (selectedProductIds.size === 1) {
    const onlyId = Array.from(selectedProductIds)[0]
    singleSelectedProduct = products.find(function (p) {
      return p.id === onlyId
    })
  }

  // Xem trước giá mới khi đổi giá
  let previewNewPriceText = ''
  if (singleSelectedProduct !== undefined && bulkPriceValue !== '') {
    const val = parseFloat(bulkPriceValue)
    if (!Number.isNaN(val)) {
      if (bulkPriceMode === 'FIXED') {
        if (val > 0) {
          previewNewPriceText = formatVnd(Math.round(val))
        }
      } else {
        const factor = 1 + val / 100
        const calculated = Math.max(1000, Math.round(singleSelectedProduct.price * factor))
        let sign = ''
        if (val >= 0) {
          sign = '+'
        }
        previewNewPriceText = `${formatVnd(calculated)} (${sign}${val}%)`
      }
    }
  }

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

  let selectAllTitle = 'Chọn tất cả sản phẩm'
  if (allSelectableSelected) {
    selectAllTitle = 'Bỏ chọn tất cả'
  }

  let fixedPriceBtnClass =
    'rounded-2xl border border-zinc-200 p-3 text-left text-zinc-600 transition hover:bg-zinc-50 dark:border-white/15 dark:text-zinc-400'
  if (bulkPriceMode === 'FIXED') {
    fixedPriceBtnClass =
      'rounded-2xl border border-indigo-500 bg-indigo-50/40 p-3 text-left text-indigo-700 transition dark:bg-indigo-950/30 dark:text-indigo-300'
  }

  let percentPriceBtnClass =
    'rounded-2xl border border-zinc-200 p-3 text-left text-zinc-600 transition hover:bg-zinc-50 dark:border-white/15 dark:text-zinc-400'
  if (bulkPriceMode === 'PERCENT') {
    percentPriceBtnClass =
      'rounded-2xl border border-indigo-500 bg-indigo-50/40 p-3 text-left text-indigo-700 transition dark:bg-indigo-950/30 dark:text-indigo-300'
  }

  let priceInputStep = '1'
  if (bulkPriceMode === 'FIXED') {
    priceInputStep = '1000'
  }

  let priceInputPlaceholder = 'Ví dụ: -10 (giảm 10%) hoặc 15'
  if (bulkPriceMode === 'FIXED') {
    priceInputPlaceholder = 'Ví dụ: 199000'
  }

  let totalNewStock = 0
  let totalDiff = 0
  if (singleSelectedProduct !== undefined) {
    let allValid = true
    let calculatedTotal = 0
    for (const v of singleSelectedProduct.variants) {
      let parsed = v.stock
      const stockStr = variantStocks[v.id]
      if (stockStr !== undefined) {
        if (stockStr === '') {
          allValid = false
        } else {
          const n = parseInt(stockStr, 10)
          if (!Number.isNaN(n) && n >= 0) {
            parsed = n
          } else {
            allValid = false
          }
        }
      }
      calculatedTotal += parsed
    }
    if (allValid) {
      totalNewStock = calculatedTotal
      totalDiff = totalNewStock - singleSelectedProduct.stock
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
    if (ids.length !== 1) {
      setBulkPriceError('Chỉ được cập nhật giá khi chọn đúng 1 sản phẩm')
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

  function handleApplyAllFixed() {
    const val = parseInt(quickApplyValue, 10)
    if (Number.isNaN(val) || val < 0) {
      setBulkStockError('Số lượng gán cho tất cả size phải là số nguyên ≥ 0')
      return
    }
    setBulkStockError(null)
    if (singleSelectedProduct === undefined) {
      return
    }
    const nextMap: Record<string, string> = {}
    for (const v of singleSelectedProduct.variants) {
      nextMap[v.id] = String(val)
    }
    setVariantStocks(nextMap)
  }

  function handleApplyAllDelta() {
    const val = parseInt(quickApplyValue, 10)
    if (Number.isNaN(val)) {
      setBulkStockError('Vui lòng nhập số lượng hợp lệ để cộng thêm/trừ bớt')
      return
    }
    setBulkStockError(null)
    if (singleSelectedProduct === undefined) {
      return
    }
    const nextMap: Record<string, string> = {}
    for (const v of singleSelectedProduct.variants) {
      let base = v.stock
      const stockStr = variantStocks[v.id]
      if (stockStr !== undefined && stockStr !== '') {
        const current = parseInt(stockStr, 10)
        if (!Number.isNaN(current)) {
          base = current
        }
      }
      const calculated = Math.max(0, base + val)
      nextMap[v.id] = String(calculated)
    }
    setVariantStocks(nextMap)
  }

  function handleIncrementVariant(variantId: string, fallbackStock: number) {
    setVariantStocks(function (prev) {
      let current = fallbackStock
      const stockStr = prev[variantId]
      if (stockStr !== undefined && stockStr !== '') {
        const parsed = parseInt(stockStr, 10)
        if (!Number.isNaN(parsed)) {
          current = parsed
        }
      }
      const nextMap = { ...prev }
      nextMap[variantId] = String(current + 1)
      return nextMap
    })
  }

  function handleDecrementVariant(variantId: string, fallbackStock: number) {
    setVariantStocks(function (prev) {
      let current = fallbackStock
      const stockStr = prev[variantId]
      if (stockStr !== undefined && stockStr !== '') {
        const parsed = parseInt(stockStr, 10)
        if (!Number.isNaN(parsed)) {
          current = parsed
        }
      }
      const nextMap = { ...prev }
      nextMap[variantId] = String(Math.max(0, current - 1))
      return nextMap
    })
  }

  function handleResetToOriginalStock() {
    if (singleSelectedProduct === undefined) {
      return
    }
    const initialMap: Record<string, string> = {}
    for (const v of singleSelectedProduct.variants) {
      initialMap[v.id] = String(v.stock)
    }
    setVariantStocks(initialMap)
    setQuickApplyValue('')
    setBulkStockError(null)
  }

  async function handleConfirmBulkStock() {
    if (singleSelectedProduct === undefined) {
      setBulkStockError('Chỉ được cập nhật tồn kho khi chọn đúng 1 sản phẩm')
      return
    }
    const variantsList = singleSelectedProduct.variants
    if (variantsList.length === 0) {
      setBulkStockError('Sản phẩm không có phân loại biến thể nào')
      return
    }

    const updates: Array<{ variantId: string; newStock: number }> = []
    for (const v of variantsList) {
      const stockStr = variantStocks[v.id]
      if (stockStr === undefined || stockStr === '') {
        setBulkStockError(`Vui lòng nhập số lượng tồn cho size ${v.size}`)
        return
      }
      const qty = parseInt(stockStr, 10)
      if (Number.isNaN(qty) || qty < 0) {
        setBulkStockError(`Số lượng tồn cho size ${v.size} phải là số nguyên ≥ 0`)
        return
      }
      if (qty !== v.stock) {
        updates.push({ variantId: v.id, newStock: qty })
      }
    }

    if (updates.length === 0) {
      setShowBulkStockModal(false)
      showToast('Tồn kho các size không có thay đổi')
      return
    }

    setIsUpdatingStock(true)
    setBulkStockError(null)

    try {
      await Promise.all(
        updates.map(function (u) {
          return adjustStock(shopId, u.variantId, {
            newStock: u.newStock,
            reason: 'MANUAL_ADJUST',
          })
        }),
      )

      void queryClient.invalidateQueries({ queryKey: getListProductsQueryKey(shopId) })
      void queryClient.invalidateQueries({ queryKey: getInventoryQueryKey(shopId) })
      setShowBulkStockModal(false)
      setSelectedProductIds(new Set())
      showToast('Cập nhật tồn kho từng size thành công')
    } catch {
      setBulkStockError('Lỗi cập nhật tồn kho từng size. Vui lòng kiểm tra lại.')
    } finally {
      setIsUpdatingStock(false)
    }
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

  function renderStatusBadge(product: ProductItem) {
    // StatusBadge dung sellerStatusMeta: ACTIVE/HIDDEN-INACTIVE/BANNED/DELETED deu co san.
    // voi BANNED them title reason de hover xem ly do goc.
    let reasonTitle: string | undefined = undefined
    if (
      product.status === 'BANNED' &&
      product.statusReason !== undefined &&
      product.statusReason !== null &&
      product.statusReason !== ''
    ) {
      reasonTitle = `Lý do vi phạm: ${product.statusReason}`
    }
    return (
      <span title={reasonTitle}>
        <StatusBadge status={product.status} meta={sellerStatusMeta} />
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
            onClick={onNavigateAddProduct}
            className="btn-primary flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold shadow-md"
          >
            <Plus size={16} weight="bold" />
            Đăng sản phẩm mới
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="rounded-3xl border border-zinc-200/80 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-[#11182a]">
        {/* Tab phân loại 6 tabs */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-zinc-100 pb-4 dark:border-white/10">
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
              'flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-xs font-bold transition text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            let countBadgeClasses =
              'rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-500 dark:bg-white/10 dark:text-zinc-400'
            if (isCurrent) {
              tabClasses =
                'flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-xs font-bold transition bg-indigo-900 text-white shadow-lg shadow-indigo-900/20 dark:bg-indigo-300 dark:text-indigo-950'
              countBadgeClasses =
                'rounded-full bg-white/20 px-2 py-0.5 text-[10px] text-white dark:bg-indigo-900/30 dark:text-indigo-950'
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
                className="w-full rounded-full border border-zinc-300 bg-zinc-50 py-2.5 pr-9 pl-9 text-xs outline-none focus:border-blue-600 dark:border-white/15 dark:bg-white/10 dark:text-white"
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
                  className="w-full appearance-none rounded-full border border-zinc-300 bg-zinc-50 py-2.5 pr-8 pl-9 text-xs font-medium text-zinc-700 outline-none focus:border-blue-600 dark:border-white/15 dark:bg-white/10 dark:text-zinc-200"
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
                  className="w-full appearance-none rounded-full border border-zinc-300 bg-zinc-50 py-2.5 pr-8 pl-9 text-xs font-medium text-zinc-700 outline-none focus:border-blue-600 dark:border-white/15 dark:bg-white/10 dark:text-zinc-200"
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
                  className="w-full appearance-none rounded-full border border-zinc-300 bg-zinc-50 py-2.5 pr-8 pl-9 text-xs font-medium text-zinc-700 outline-none focus:border-blue-600 dark:border-white/15 dark:bg-white/10 dark:text-zinc-200"
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
                  className="w-28 rounded-full border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-xs outline-none focus:border-blue-600 dark:border-white/15 dark:bg-white/10 dark:text-white"
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
                  className="w-28 rounded-full border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-xs outline-none focus:border-blue-600 dark:border-white/15 dark:bg-white/10 dark:text-white"
                />
              </div>
            </div>

            {isFiltered && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:border-white/15 dark:bg-white/10 dark:text-zinc-300 dark:hover:bg-white/20"
              >
                <ArrowCounterClockwise size={13} weight="bold" />
                Xóa bộ lọc
              </button>
            )}
          </div>
        </div>

        {/* Bảng danh sách sản phẩm */}
        <div className="mt-5 overflow-x-auto rounded-2xl border border-zinc-200/80 dark:border-white/10">
          <table className="w-full min-w-[1100px] text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-100 text-[11px] font-bold text-zinc-400 uppercase dark:border-white/10">
                <th className="w-10 py-3.5 pr-1 pl-4 text-center whitespace-nowrap">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    disabled={selectableProducts.length === 0}
                    className="flex items-center justify-center text-zinc-400 hover:text-indigo-600 disabled:opacity-40"
                    title={selectAllTitle}
                  >
                    {allSelectableSelected && (
                      <CheckSquare size={18} weight="fill" className="text-indigo-600" />
                    )}
                    {!allSelectableSelected && selectedProductIds.size > 0 && (
                      <MinusSquare size={18} weight="fill" className="text-indigo-600" />
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
            <tbody className="divide-y divide-zinc-100 dark:divide-white/10">
              {filteredProducts.map(function (product) {
                let toggleActionTitle = 'Bật bán sản phẩm'
                if (product.status === 'ACTIVE') {
                  toggleActionTitle = 'Tạm ẩn sản phẩm'
                }
                const isSelected = selectedProductIds.has(product.id)
                const isLowStock = product.stock <= 15 && product.stock > 0
                const isOutOfStock = product.stock === 0
                const isBanned = product.status === 'BANNED'

                let rowSelectedClass = ''
                if (isSelected) {
                  rowSelectedClass = 'bg-indigo-50/40 dark:bg-indigo-950/20'
                }

                let displaySku = '---'
                if (product.sku !== '') {
                  displaySku = product.sku
                }

                let rowCheckboxTitle = 'Chọn sản phẩm'
                if (isSelected) {
                  rowCheckboxTitle = 'Bỏ chọn sản phẩm'
                }

                return (
                  <tr
                    key={product.id}
                    className={`transition hover:bg-zinc-50/60 dark:hover:bg-white/5 ${rowSelectedClass}`}
                  >
                    {/* Checkbox */}
                    <td className="py-3.5 pr-1 pl-4 text-center">
                      {product.status !== 'DELETED' && (
                        <button
                          type="button"
                          onClick={function () {
                            handleToggleSelectRow(product.id)
                          }}
                          title={rowCheckboxTitle}
                          aria-label={rowCheckboxTitle}
                          className="flex items-center justify-center text-zinc-400 hover:text-indigo-600"
                        >
                          {isSelected && (
                            <CheckSquare size={17} weight="fill" className="text-indigo-600" />
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
                          alt={product.name}
                          onError={function (e) {
                            e.currentTarget.src = PLACEHOLDER_IMAGE
                          }}
                          className="h-12 w-12 shrink-0 rounded-xl border border-zinc-200 bg-zinc-100 object-cover dark:border-white/10 dark:bg-white/5"
                        />
                        <div className="max-w-[210px] min-w-0">
                          <button
                            type="button"
                            onClick={function () {
                              if (product.status !== 'DELETED') {
                                onNavigateEditProduct(product.id)
                              }
                            }}
                            className="line-clamp-2 text-left font-bold text-zinc-900 transition hover:text-indigo-700 dark:text-white dark:hover:text-indigo-300"
                            title={product.name}
                          >
                            {product.name}
                          </button>
                          <p className="mt-0.5 truncate text-[11px] text-zinc-400">
                            SKU: {displaySku}
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
                                className="rounded-lg bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold dark:bg-white/10"
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
                        <span className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-400/15 dark:text-amber-200">
                          <WarningCircle size={13} weight="bold" />
                          {product.stock} <span className="text-[10px] font-normal">(Sắp hết)</span>
                        </span>
                      )}
                      {isOutOfStock && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700 dark:bg-red-400/15 dark:text-red-200">
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
                            className="flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-200 text-zinc-600 transition hover:bg-zinc-100 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/10"
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
                  className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-zinc-100 px-3.5 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-200 dark:bg-white/10 dark:text-zinc-200"
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
          className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-3xl border border-zinc-800 bg-zinc-950/95 px-5 py-3 text-white shadow-2xl backdrop-blur-md dark:border-white/10 dark:bg-[#11182a]/95"
        >
          <div className="flex items-center gap-2 border-r border-zinc-700 pr-3 text-xs font-bold">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-black text-white">
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

            {/* Đổi giá (Chỉ khi chọn 1 sản phẩm) */}
            {selectedProductIds.size === 1 && (
              <button
                type="button"
                onClick={function () {
                  setBulkPriceError(null)
                  setBulkPriceValue('')
                  setShowBulkPriceModal(true)
                }}
                title="Đổi giá sản phẩm đã chọn"
                className="flex items-center gap-1.5 rounded-2xl bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-700"
              >
                <CurrencyDollar size={14} weight="bold" />
                <span>Đổi giá</span>
              </button>
            )}
            {selectedProductIds.size !== 1 && (
              <button
                type="button"
                disabled={true}
                title="Chỉ được cập nhật giá khi chọn chính xác 1 sản phẩm"
                className="flex cursor-not-allowed items-center gap-1.5 rounded-2xl bg-zinc-800/40 px-3 py-1.5 text-xs font-semibold text-zinc-500 opacity-60"
              >
                <CurrencyDollar size={14} weight="bold" />
                <span>Đổi giá</span>
                <span className="text-[10px] text-zinc-500">(1 SP)</span>
              </button>
            )}

            {/* Cập nhật tồn kho (Chỉ khi chọn 1 sản phẩm) */}
            {selectedProductIds.size === 1 && (
              <button
                type="button"
                onClick={function () {
                  setBulkStockError(null)
                  const initialMap: Record<string, string> = {}
                  if (singleSelectedProduct !== undefined) {
                    for (const v of singleSelectedProduct.variants) {
                      initialMap[v.id] = String(v.stock)
                    }
                  }
                  setVariantStocks(initialMap)
                  setQuickApplyValue('')
                  setShowBulkStockModal(true)
                }}
                title="Cập nhật kho từng size cho sản phẩm đã chọn"
                className="flex items-center gap-1.5 rounded-2xl bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-700"
              >
                <Package size={14} weight="bold" />
                <span>Cập nhật kho</span>
              </button>
            )}
            {selectedProductIds.size !== 1 && (
              <button
                type="button"
                disabled={true}
                title="Chỉ được cập nhật kho khi chọn chính xác 1 sản phẩm"
                className="flex cursor-not-allowed items-center gap-1.5 rounded-2xl bg-zinc-800/40 px-3 py-1.5 text-xs font-semibold text-zinc-500 opacity-60"
              >
                <Package size={14} weight="bold" />
                <span>Cập nhật kho</span>
                <span className="text-[10px] text-zinc-500">(1 SP)</span>
              </button>
            )}

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

      {/* Modal Đổi giá (Chỉ cho 1 sản phẩm, hiển thị giá cũ) */}
      {showBulkPriceModal && (
        <Modal
          title="Cập nhật giá sản phẩm"
          onClose={function () {
            setShowBulkPriceModal(false)
          }}
          widthClass="max-w-md"
        >
          {bulkPriceError !== null && (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 p-2.5 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
              <WarningCircle size={16} weight="bold" className="shrink-0 text-red-600" />
              <span>{bulkPriceError}</span>
            </div>
          )}

          {/* Thông tin sản phẩm và Giá cũ hiện tại */}
          {singleSelectedProduct !== undefined && (
            <div className="mt-3.5 space-y-2.5 rounded-2xl border border-zinc-200/80 bg-zinc-50 p-3.5 dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center gap-3">
                <img
                  src={singleSelectedProduct.image}
                  alt={singleSelectedProduct.name}
                  className="h-12 w-12 shrink-0 rounded-xl border border-zinc-200 object-cover dark:border-white/10"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-zinc-900 dark:text-white">
                    {singleSelectedProduct.name}
                  </p>
                  <p className="mt-0.5 text-[11px] text-zinc-400">
                    Mã SKU: {singleSelectedProduct.sku}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-indigo-50 px-3 py-2 text-xs dark:bg-indigo-900/30">
                <span className="font-semibold text-zinc-600 dark:text-zinc-300">
                  Giá cũ hiện tại:
                </span>
                <span className="text-sm font-black text-indigo-700 dark:text-indigo-300">
                  {formatVnd(singleSelectedProduct.price)}
                </span>
              </div>

              {singleSelectedProduct.variants.length > 1 && (
                <div className="max-h-24 overflow-y-auto rounded-xl border border-zinc-200/60 bg-white p-2 text-[11px] dark:border-white/10 dark:bg-white/5">
                  <p className="mb-1 font-semibold text-zinc-500 dark:text-zinc-400">
                    Giá cũ theo từng phân loại:
                  </p>
                  <div className="space-y-1">
                    {singleSelectedProduct.variants.map(function (v) {
                      let variantLabel = v.size
                      if (v.color !== '') {
                        variantLabel = variantLabel + ' - ' + v.color
                      }
                      return (
                        <div
                          key={v.id}
                          className="flex items-center justify-between text-zinc-600 dark:text-zinc-300"
                        >
                          <span>
                            {variantLabel} ({v.sku}):
                          </span>
                          <span className="font-bold">{formatVnd(v.price)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
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
                className={fixedPriceBtnClass}
              >
                <p className="text-xs font-bold">Giá cố định</p>
                <p className="text-[10px] text-zinc-400">Gán một mức giá mới cho toàn bộ</p>
              </button>
              <button
                type="button"
                onClick={function () {
                  setBulkPriceMode('PERCENT')
                }}
                className={percentPriceBtnClass}
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
                step={priceInputStep}
                value={bulkPriceValue}
                onChange={function (e) {
                  setBulkPriceValue(e.target.value)
                }}
                placeholder={priceInputPlaceholder}
                className="mt-1.5 w-full rounded-2xl border border-zinc-300 bg-zinc-50 p-2.5 text-xs outline-none focus:border-blue-600 dark:border-white/15 dark:bg-white/10 dark:text-white"
              />
            </div>

            {previewNewPriceText !== '' && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-2.5 text-xs text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
                <span className="font-semibold">Giá mới dự kiến: </span>
                <span className="font-bold">{previewNewPriceText}</span>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={function () {
                setShowBulkPriceModal(false)
              }}
              className="rounded-2xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-300"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={bulkPriceMutation.isPending}
              onClick={handleConfirmBulkPrice}
              className="flex items-center gap-1.5 rounded-2xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {bulkPriceMutation.isPending && (
                <CircleNotch size={14} weight="bold" className="animate-spin" />
              )}
              <span>Áp dụng đổi giá</span>
            </button>
          </div>
        </Modal>
      )}

      {/* Modal Cập nhật kho từng size (Chỉ cho 1 sản phẩm) */}
      {showBulkStockModal && (
        <Modal
          title="Cập nhật tồn kho theo từng size"
          onClose={function () {
            setShowBulkStockModal(false)
          }}
          widthClass="max-w-lg"
        >
          {bulkStockError !== null && (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 p-2.5 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
              <WarningCircle size={16} weight="bold" className="shrink-0 text-red-600" />
              <span>{bulkStockError}</span>
            </div>
          )}

          {/* Thông tin sản phẩm */}
          {singleSelectedProduct !== undefined && (
            <div className="mt-3.5 space-y-3">
              <div className="flex items-center gap-3 rounded-2xl border border-zinc-200/80 bg-zinc-50 p-3.5 dark:border-white/10 dark:bg-white/5">
                <img
                  src={singleSelectedProduct.image}
                  alt={singleSelectedProduct.name}
                  className="h-12 w-12 shrink-0 rounded-xl border border-zinc-200 object-cover dark:border-white/10"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-zinc-900 dark:text-white">
                    {singleSelectedProduct.name}
                  </p>
                  <p className="mt-0.5 text-[11px] text-zinc-400">
                    Mã SKU: {singleSelectedProduct.sku} • Tổng tồn kho hiện tại:{' '}
                    <strong className="text-indigo-700 dark:text-indigo-300">
                      {singleSelectedProduct.stock}
                    </strong>
                  </p>
                </div>
              </div>

              {/* Thanh tiện ích gán nhanh nếu có phân loại */}
              {singleSelectedProduct.variants.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-zinc-200/80 bg-zinc-50/70 p-3 text-xs dark:border-white/10 dark:bg-white/5">
                  <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
                    <span className="text-xs font-bold">Áp dụng hàng loạt:</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="SL mới"
                      value={quickApplyValue}
                      onChange={function (e) {
                        setQuickApplyValue(e.target.value)
                      }}
                      className="h-8 w-20 rounded-full border border-zinc-300 bg-white px-3 text-center font-mono text-xs font-bold text-zinc-900 outline-none focus:border-blue-600 dark:border-white/15 dark:bg-white/10 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={handleApplyAllFixed}
                      className="h-8 rounded-full bg-indigo-600 px-3.5 text-[11px] font-bold text-white shadow-2xs transition hover:bg-indigo-700 active:scale-95"
                    >
                      Gán tất cả
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyAllDelta}
                      className="h-8 rounded-full border border-zinc-200 bg-white px-3.5 text-[11px] font-bold text-zinc-700 shadow-2xs transition hover:bg-zinc-100 active:scale-95 dark:border-white/15 dark:bg-white/10 dark:text-zinc-200 dark:hover:bg-white/20"
                    >
                      + Thêm vào tất cả
                    </button>
                    <button
                      type="button"
                      onClick={handleResetToOriginalStock}
                      title="Khôi phục về số lượng tồn gốc ban đầu"
                      className="flex h-8 items-center gap-1 rounded-full border border-zinc-200 bg-white px-3 text-[11px] font-semibold text-zinc-500 shadow-2xs transition hover:bg-zinc-100 hover:text-zinc-800 active:scale-95 dark:border-white/15 dark:bg-white/10 dark:text-zinc-400 dark:hover:bg-white/20"
                    >
                      <ArrowCounterClockwise size={13} weight="bold" />
                      <span>Khôi phục</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Danh sách nhập tồn kho từng size */}
              <div>
                <div className="mb-2 flex items-center justify-between text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  <span>Điều chỉnh số lượng từng kích thước (Size):</span>
                  <span className="text-[11px] font-medium text-zinc-400">
                    {singleSelectedProduct.variants.length} phân loại
                  </span>
                </div>

                <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                  {singleSelectedProduct.variants.map(function (v) {
                    let currentVal = String(v.stock)
                    if (variantStocks[v.id] !== undefined) {
                      currentVal = variantStocks[v.id]
                    }
                    let diff = 0
                    let hasDiff = false
                    const numVal = parseInt(currentVal, 10)
                    if (!Number.isNaN(numVal)) {
                      diff = numVal - v.stock
                      hasDiff = diff !== 0
                    }

                    return (
                      <div
                        key={v.id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200/80 bg-white p-3 shadow-2xs transition hover:border-indigo-200 hover:shadow-xs dark:border-white/10 dark:bg-white/5 dark:hover:border-indigo-900/60"
                      >
                        {/* Size & Info */}
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="inline-flex h-9 min-w-10 items-center justify-center rounded-xl border border-indigo-200/80 bg-indigo-50 px-2.5 text-xs font-black text-indigo-700 shadow-2xs dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300">
                            {v.size}
                          </span>
                          <div className="min-w-0">
                            {v.color !== '' && (
                              <p className="truncate text-xs font-bold text-zinc-800 dark:text-zinc-200">
                                {v.color}
                              </p>
                            )}
                            <p className="truncate font-mono text-[11px] text-zinc-400">
                              SKU: {v.sku}
                            </p>
                          </div>
                        </div>

                        {/* Stock Controls */}
                        <div className="flex items-center gap-3">
                          <div className="min-w-[48px] text-right">
                            <span className="block text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">
                              Cũ
                            </span>
                            <span className="text-xs font-black text-zinc-700 dark:text-zinc-300">
                              {v.stock}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Stepper Input */}
                            <div className="flex items-center overflow-hidden rounded-full border border-zinc-300 bg-zinc-50 shadow-2xs transition focus-within:border-blue-600 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-600/20 dark:border-white/15 dark:bg-white/10 dark:focus-within:bg-white/20">
                              <button
                                type="button"
                                onClick={function () {
                                  handleDecrementVariant(v.id, v.stock)
                                }}
                                className="flex h-8 w-8 items-center justify-center text-zinc-500 transition hover:bg-zinc-200/70 hover:text-zinc-900 active:scale-90 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white"
                                title="Giảm 1"
                              >
                                <span className="text-base leading-none font-bold">−</span>
                              </button>

                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={currentVal}
                                onChange={function (e) {
                                  const val = e.target.value
                                  setVariantStocks(function (prev) {
                                    const nextMap = { ...prev }
                                    nextMap[v.id] = val
                                    return nextMap
                                  })
                                }}
                                className="h-8 w-16 [appearance:textfield] bg-transparent text-center font-mono text-xs font-bold text-zinc-900 outline-none dark:text-white [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              />

                              <button
                                type="button"
                                onClick={function () {
                                  handleIncrementVariant(v.id, v.stock)
                                }}
                                className="flex h-8 w-8 items-center justify-center text-zinc-500 transition hover:bg-zinc-200/70 hover:text-zinc-900 active:scale-90 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white"
                                title="Tăng 1"
                              >
                                <span className="text-base leading-none font-bold">+</span>
                              </button>
                            </div>

                            {/* Difference Badge */}
                            <div className="flex min-w-[50px] justify-center text-center">
                              {hasDiff && diff > 0 && (
                                <span className="inline-flex items-center rounded-full border border-emerald-200/80 bg-emerald-50 px-2 py-0.5 text-[11px] font-black text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/60 dark:text-emerald-300">
                                  +{diff}
                                </span>
                              )}
                              {hasDiff && diff < 0 && (
                                <span className="inline-flex items-center rounded-full border border-rose-200/80 bg-rose-50 px-2 py-0.5 text-[11px] font-black text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/60 dark:text-rose-300">
                                  {diff}
                                </span>
                              )}
                              {!hasDiff && (
                                <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-400 dark:bg-white/10 dark:text-zinc-500">
                                  0
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Thẻ tổng kết tồn kho mới */}
              <div className="flex items-center justify-between rounded-2xl border border-indigo-100 bg-indigo-50/50 px-3.5 py-2.5 text-xs dark:border-indigo-900/40 dark:bg-indigo-950/20">
                <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                  Tổng tồn kho mới dự kiến:
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-indigo-700 dark:text-indigo-300">
                    {totalNewStock} sản phẩm
                  </span>
                  {totalDiff > 0 && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                      +{totalDiff}
                    </span>
                  )}
                  {totalDiff < 0 && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-950/60 dark:text-red-300">
                      {totalDiff}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={function () {
                setShowBulkStockModal(false)
              }}
              className="rounded-2xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-300"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={isUpdatingStock}
              onClick={function () {
                void handleConfirmBulkStock()
              }}
              className="flex items-center gap-1.5 rounded-2xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {isUpdatingStock && <CircleNotch size={14} weight="bold" className="animate-spin" />}
              <span>Lưu tồn kho</span>
            </button>
          </div>
        </Modal>
      )}

      {/* Modal Xóa hàng loạt */}
      {showBulkDeleteModal && (
        <Modal
          title={`Xác nhận xóa mềm ${selectedProductIds.size} sản phẩm?`}
          onClose={function () {
            setShowBulkDeleteModal(false)
            setBulkDeleteErrorMessage(null)
          }}
          widthClass="max-w-md"
        >
          {bulkDeleteErrorMessage !== null && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              <WarningCircle size={18} weight="bold" className="mt-0.5 shrink-0 text-red-600" />
              <div className="leading-relaxed">{bulkDeleteErrorMessage}</div>
            </div>
          )}

          <p className="mt-4 text-xs leading-relaxed text-zinc-500">
            Các sản phẩm được chọn sẽ bị ẩn khỏi sàn và người mua không thể đặt hàng mới. Nếu có sản
            phẩm đang có đơn hàng xử lý, hệ thống sẽ tự động bảo vệ và bỏ qua sản phẩm đó.
          </p>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              disabled={bulkDeleteMutation.isPending}
              onClick={function () {
                setShowBulkDeleteModal(false)
                setBulkDeleteErrorMessage(null)
              }}
              className="rounded-2xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-white/10 dark:text-zinc-300"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              disabled={bulkDeleteMutation.isPending}
              onClick={handleConfirmBulkDelete}
              className="flex items-center gap-1.5 rounded-2xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {bulkDeleteMutation.isPending && (
                <CircleNotch size={14} weight="bold" className="animate-spin" />
              )}
              <span>Xác nhận xóa {selectedProductIds.size} sản phẩm</span>
            </button>
          </div>
        </Modal>
      )}

      {/* Modal Xóa mềm đơn lẻ */}
      {deleteTargetId !== null && (
        <Modal
          title="Xác nhận xóa mềm sản phẩm?"
          onClose={function () {
            setDeleteTargetId(null)
            setDeleteErrorMessage(null)
          }}
          widthClass="max-w-md"
        >
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
              onClick={handleConfirmSingleDelete}
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
    </div>
  )
}
