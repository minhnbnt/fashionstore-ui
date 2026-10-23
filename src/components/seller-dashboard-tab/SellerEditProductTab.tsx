import { useState, useEffect } from 'react'

import { useListCategories } from '@generated/endpoints/categories/categories'
import {
  getInventoryQueryKey,
  getListProductsQueryKey,
} from '@generated/endpoints/seller-products-inventory/seller-products-inventory'
import {
  getGetProductAuditLogsQueryKey,
  getGetSellerProductQueryKey,
  useGetProductAuditLogs,
  useGetSellerProduct,
  useToggleProductStatus,
  useUpdate1,
} from '@generated/endpoints/shop-products/shop-products'
import {
  ArrowLeft,
  FloppyDisk,
  ClockCounterClockwise,
  Eye,
  EyeSlash,
  CheckCircle,
  WarningCircle,
  Plus,
  Trash,
  Lightning,
  Copy,
  SpinnerGap,
  X,
  Info,
  LockKey,
} from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import ProductMediaUploader from '@/components/seller/ProductMediaUploader'
import RichTextEditor from '@/components/ui/RichTextEditor'
import { takeData } from '@/lib/apiAdapters'
import { ApiError } from '@/lib/apiFetch'
import { formatDateTime } from '@/lib/format'

import type { ImageItemRequest } from '@generated/model/imageItemRequest'
import type { ProductAuditLogResponse } from '@generated/model/productAuditLogResponse'
import type { UpdateProductRequest } from '@generated/model/updateProductRequest'
import type { UpdateVariantRequest } from '@generated/model/updateVariantRequest'

interface Props {
  shopId: string
  productId: string
  onBack: () => void
}

interface EditableVariantRow {
  keyId: string
  id: string | null
  sku: string
  size: string
  color: string
  price: number
  compareAtPrice: number | null
  stockQuantity: number
  isDefault: boolean
}

function formatNumberWithDots(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) {
    return ''
  }
  return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

function parseNumberFromDots(val: string): number | null {
  const clean = val.replace(/\D/g, '')
  if (clean === '') {
    return null
  }
  return parseInt(clean, 10)
}

function renderActionBadge(action: string) {
  let label = action
  let colorClass =
    'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700'

  if (action === 'CREATE_PRODUCT') {
    label = 'Tạo sản phẩm'
    colorClass =
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
  } else if (action === 'UPDATE_PRODUCT') {
    label = 'Cập nhật thông tin'
    colorClass =
      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800'
  } else if (action === 'TOGGLE_STATUS') {
    label = 'Ẩn / Hiện sản phẩm'
    colorClass =
      'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800'
  } else if (action === 'BULK_IMPORT') {
    label = 'Nhập hàng loạt'
    colorClass =
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800'
  }

  return (
    <span
      className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[10px] font-bold ${colorClass}`}
    >
      {label}
    </span>
  )
}

export default function SellerEditProductTab({ shopId, productId, onBack }: Props) {
  const queryClient = useQueryClient()

  // Queries
  const productQuery = useGetSellerProduct(shopId, productId, {
    query: { enabled: shopId !== '' && productId !== '' },
  })
  const categoriesQuery = useListCategories()

  // State
  const [initialized, setInitialized] = useState(false)
  const [showAuditModal, setShowAuditModal] = useState(false)
  const [notification, setNotification] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isTogglingStatus, setIsTogglingStatus] = useState(false)

  // 1. Basic info
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [status, setStatus] = useState('ACTIVE')
  const [description, setDescription] = useState('')

  // 2. Media
  const [images, setImages] = useState<string[]>([])
  const [videoKey, setVideoKey] = useState<string | null>(null)
  const [tryOnEnabled, setTryOnEnabled] = useState(false)
  const [garmentKey, setGarmentKey] = useState<string | null>(null)

  // 3. Variants
  const [variants, setVariants] = useState<EditableVariantRow[]>([])

  // Bulk Apply state
  const [bulkTarget, setBulkTarget] = useState<string>('ALL')
  const [bulkPrice, setBulkPrice] = useState('199.000')
  const [bulkCompareAtPrice, setBulkCompareAtPrice] = useState('250.000')
  const [bulkStock, setBulkStock] = useState('50')

  // 4. Specifications & Dimensions
  const [material, setMaterial] = useState('')
  const [origin, setOrigin] = useState('')
  const [careInstructions, setCareInstructions] = useState('')
  const [sizeGuide, setSizeGuide] = useState('')
  const [weightGrams, setWeightGrams] = useState(300)
  const [lengthCm, setLengthCm] = useState(20)
  const [widthCm, setWidthCm] = useState(15)
  const [heightCm, setHeightCm] = useState(5)

  // Audit Logs Query
  const auditLogsQuery = useGetProductAuditLogs(shopId, productId, {
    query: { enabled: showAuditModal && shopId !== '' && productId !== '' },
  })

  // Prefill state once product details are loaded
  useEffect(
    function () {
      if (productQuery.data === undefined || initialized === true) {
        return
      }

      const p = takeData(productQuery.data)
      setName(p.name ?? '')
      setSlug(p.slug ?? '')
      setCategoryId(p.categoryId ?? '')
      setStatus(p.status ?? 'ACTIVE')
      setDescription(p.description ?? '')

      const rawImages: string[] = []
      if (p.images !== undefined && p.images !== null) {
        for (const img of p.images) {
          if (img.s3Key !== null && img.s3Key !== undefined && img.s3Key !== '') {
            rawImages.push(img.s3Key)
          }
        }
      }
      setImages(rawImages)

      setVideoKey(p.videoKey ?? null)
      setGarmentKey(p.garmentKey ?? null)
      setTryOnEnabled(p.tryOnEnabled === true)

      setMaterial(p.material ?? '')
      setOrigin(p.origin ?? '')
      setCareInstructions(p.careInstructions ?? '')
      setSizeGuide(p.sizeGuide ?? '')

      setWeightGrams(p.weightGrams ?? 300)
      setLengthCm(p.lengthCm ?? 20)
      setWidthCm(p.widthCm ?? 15)
      setHeightCm(p.heightCm ?? 5)

      const initialVariants: EditableVariantRow[] = []
      if (p.variants !== undefined && p.variants !== null) {
        for (const v of p.variants) {
          initialVariants.push({
            keyId: v.id ?? `v-${Date.now()}-${Math.random()}`,
            id: v.id ?? null,
            sku: v.sku ?? '',
            size: v.size ?? '',
            color: v.color ?? '',
            price: v.price ?? 0,
            compareAtPrice: v.compareAtPrice ?? null,
            stockQuantity: v.stockQuantity ?? 0,
            isDefault: v.defaultVariant === true,
          })
        }
      }
      setVariants(initialVariants)
      setInitialized(true)
    },
    [productQuery.data, initialized],
  )

  const updateMutation = useUpdate1({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getListProductsQueryKey(shopId) })
        void queryClient.invalidateQueries({
          queryKey: getGetSellerProductQueryKey(shopId, productId),
        })
        void queryClient.invalidateQueries({
          queryKey: getGetProductAuditLogsQueryKey(shopId, productId),
        })
        void queryClient.invalidateQueries({ queryKey: getInventoryQueryKey(shopId) })
        showToast('Cập nhật sản phẩm thành công!')
        setIsSaving(false)
      },
      onError: function (err: unknown) {
        setIsSaving(false)
        if (err instanceof ApiError) {
          setErrorMessage(err.message)
        } else {
          setErrorMessage('Không thể lưu sản phẩm. Vui lòng thử lại.')
        }
      },
    },
  })

  const toggleStatusMutation = useToggleProductStatus({
    mutation: {
      onSuccess: function (resp) {
        void queryClient.invalidateQueries({ queryKey: getListProductsQueryKey(shopId) })
        void queryClient.invalidateQueries({
          queryKey: getGetSellerProductQueryKey(shopId, productId),
        })
        void queryClient.invalidateQueries({
          queryKey: getGetProductAuditLogsQueryKey(shopId, productId),
        })
        setIsTogglingStatus(false)
        if (resp.data.status !== undefined && resp.data.status !== null) {
          setStatus(String(resp.data.status))
        }
        showToast('Đã chuyển đổi trạng thái sản phẩm thành công!')
      },
      onError: function (err: unknown) {
        setIsTogglingStatus(false)
        if (err instanceof ApiError) {
          setErrorMessage(err.message)
        } else {
          setErrorMessage('Không thể chuyển đổi trạng thái.')
        }
      },
    },
  })

  function showToast(msg: string) {
    setNotification(msg)
    setTimeout(function () {
      setNotification(null)
    }, 4000)
  }

  function handleToggleStatus() {
    setIsTogglingStatus(true)
    setErrorMessage(null)
    toggleStatusMutation.mutate({ shopId, id: productId })
  }

  function handleSetDefaultVariant(keyId: string) {
    setVariants(function (prev) {
      return prev.map(function (item) {
        let isDefault = false
        if (item.keyId === keyId) {
          isDefault = true
        }
        return {
          ...item,
          isDefault,
        }
      })
    })
  }

  function handleUpdateVariantField(
    keyId: string,
    field: keyof EditableVariantRow,
    value: string | number | null,
  ) {
    setVariants(function (prev) {
      return prev.map(function (item) {
        if (item.keyId === keyId) {
          return {
            ...item,
            [field]: value,
          }
        }
        return item
      })
    })
  }

  function handleAddNewVariant() {
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase()
    const newSku = `SP-VAR-${randomSuffix}`
    const isFirst = variants.length === 0

    const newRow: EditableVariantRow = {
      keyId: `new-${Date.now()}-${randomSuffix}`,
      id: null,
      sku: newSku,
      size: 'Freesize',
      color: 'Mặc định',
      price: 199000,
      compareAtPrice: 250000,
      stockQuantity: 50,
      isDefault: isFirst,
    }
    setVariants(function (prev) {
      return [...prev, newRow]
    })
  }

  function handleRemoveVariant(keyId: string) {
    if (variants.length <= 1) {
      alert('Sản phẩm phải có ít nhất 1 biến thể.')
      return
    }
    const target = variants.find(function (v) {
      return v.keyId === keyId
    })
    if (target !== undefined && target.id !== null) {
      alert('Biến thể đã có trên hệ thống. Bạn có thể cập nhật tồn kho về 0 thay vì xóa trực tiếp.')
      return
    }
    setVariants(function (prev) {
      const next = prev.filter(function (v) {
        return v.keyId !== keyId
      })
      const hasDefault = next.some(function (v) {
        return v.isDefault
      })
      if (!hasDefault && next.length > 0) {
        next[0].isDefault = true
      }
      return next
    })
  }

  function handleApplyBulk() {
    const parsedPrice = parseNumberFromDots(bulkPrice)
    const parsedCompare = parseNumberFromDots(bulkCompareAtPrice)
    const parsedStock = parseInt(bulkStock, 10)

    setVariants(function (prev) {
      return prev.map(function (v) {
        let shouldApply = false
        if (bulkTarget === 'ALL') {
          shouldApply = true
        } else if (bulkTarget === v.color) {
          shouldApply = true
        }

        if (shouldApply) {
          let updatedPrice = v.price
          if (parsedPrice !== null && !isNaN(parsedPrice)) {
            updatedPrice = parsedPrice
          }

          let updatedCompare = v.compareAtPrice
          if (parsedCompare !== null && !isNaN(parsedCompare)) {
            updatedCompare = parsedCompare
          }

          let updatedStock = v.stockQuantity
          if (!isNaN(parsedStock) && parsedStock >= 0) {
            updatedStock = parsedStock
          }

          return {
            ...v,
            price: updatedPrice,
            compareAtPrice: updatedCompare,
            stockQuantity: updatedStock,
          }
        }
        return v
      })
    })

    showToast('Đã áp dụng thông số hàng loạt cho các biến thể được chọn!')
  }

  function handleSave() {
    setErrorMessage(null)

    if (name.trim() === '') {
      setErrorMessage('Vui lòng nhập tên sản phẩm.')
      return
    }

    if (categoryId === '') {
      setErrorMessage('Vui lòng chọn danh mục cho sản phẩm.')
      return
    }

    if (variants.length === 0) {
      setErrorMessage('Sản phẩm phải có ít nhất 1 biến thể.')
      return
    }

    const defaultCount = variants.filter(function (v) {
      return v.isDefault
    }).length

    if (defaultCount !== 1) {
      setErrorMessage('Vui lòng chọn đúng 1 biến thể mặc định.')
      return
    }

    // Check variant values
    for (const v of variants) {
      if (v.price < 0) {
        setErrorMessage(`Giá bán của biến thể SKU "${v.sku}" không được âm.`)
        return
      }
      if (v.stockQuantity < 0) {
        setErrorMessage(`Tồn kho của biến thể SKU "${v.sku}" không được âm.`)
        return
      }
      if (v.sku.trim() === '') {
        setErrorMessage('Tất cả các biến thể phải có mã SKU hợp lệ.')
        return
      }
    }

    setIsSaving(true)

    const mappedImages: ImageItemRequest[] = images.map(function (key, idx) {
      return {
        s3Key: key,
        sortOrder: idx,
      }
    })

    const mappedVariants: UpdateVariantRequest[] = variants.map(function (v) {
      let variantId: string | undefined = undefined
      if (v.id !== null && v.id !== '') {
        variantId = v.id
      }
      return {
        id: variantId,
        sku: v.sku.trim(),
        size: v.size.trim(),
        color: v.color.trim(),
        price: v.price,
        compareAtPrice: v.compareAtPrice,
        stockQuantity: v.stockQuantity,
        defaultVariant: v.isDefault,
      }
    })

    const requestData: UpdateProductRequest = {
      name: name.trim(),
      description: description.trim(),
      categoryId: categoryId,
      status: status,
      images: mappedImages,
      videoKey: videoKey,
      garmentKey: garmentKey,
      tryOnEnabled: tryOnEnabled,
      material: material.trim(),
      origin: origin.trim(),
      careInstructions: careInstructions.trim(),
      sizeGuide: sizeGuide.trim(),
      weightGrams: weightGrams,
      lengthCm: lengthCm,
      widthCm: widthCm,
      heightCm: heightCm,
      variants: mappedVariants,
    }

    updateMutation.mutate({
      shopId,
      id: productId,
      data: requestData,
    })
  }

  // Categories map
  const categoriesList = categoriesQuery.data !== undefined ? takeData(categoriesQuery.data) : []

  // Extract distinct colors for bulk filter
  const distinctColors: string[] = []
  for (const v of variants) {
    if (v.color.trim() !== '' && !distinctColors.includes(v.color.trim())) {
      distinctColors.push(v.color.trim())
    }
  }

  // Audit Logs list
  let auditLogs: ProductAuditLogResponse[] = []
  if (auditLogsQuery.data !== undefined) {
    auditLogs = takeData(auditLogsQuery.data)
  }

  if (productQuery.isPending) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-zinc-500">
        <SpinnerGap size={36} weight="bold" className="animate-spin text-orange-600" />
        <p className="mt-3 text-sm font-semibold">Đang tải thông tin sản phẩm...</p>
      </div>
    )
  }

  if (productQuery.isError) {
    return (
      <div className="mx-auto max-w-2xl py-24 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400">
          <WarningCircle size={32} weight="bold" />
        </div>
        <h3 className="mt-4 text-base font-bold text-zinc-900 dark:text-white">
          Không tìm thấy thông tin sản phẩm
        </h3>
        <p className="mt-2 text-xs text-zinc-500">
          Sản phẩm có thể đã bị xóa hoặc bạn không có quyền truy cập gian hàng này.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="mt-6 rounded-2xl bg-zinc-900 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
        >
          Quay lại danh sách sản phẩm
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Toast Notification */}
      {notification !== null && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-white p-4 shadow-xl dark:border-emerald-900/60 dark:bg-zinc-900">
          <CheckCircle size={20} weight="fill" className="text-emerald-500" />
          <p className="text-xs font-bold text-zinc-900 dark:text-white">{notification}</p>
        </div>
      )}

      {/* Error Message banner */}
      {errorMessage !== null && (
        <div className="flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-400">
          <div className="flex items-center gap-2">
            <WarningCircle size={18} weight="fill" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={function () {
              setErrorMessage(null)
            }}
            className="rounded-full p-1 hover:bg-red-200/50 dark:hover:bg-red-900/40"
          >
            <X size={14} weight="bold" />
          </button>
        </div>
      )}

      {/* Top Bar Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
            title="Quay lại danh sách"
          >
            <ArrowLeft size={18} weight="bold" />
          </button>

          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                Chỉnh sửa sản phẩm
              </h2>
              {status === 'ACTIVE' && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  Đang bán (ACTIVE)
                </span>
              )}
              {status === 'HIDDEN' && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300 bg-zinc-100 px-2.5 py-0.5 text-[11px] font-bold text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  <EyeSlash size={12} weight="bold" />
                  Tạm ẩn (HIDDEN)
                </span>
              )}
              {status !== 'ACTIVE' && status !== 'HIDDEN' && (
                <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-bold text-red-700 dark:bg-red-950/50 dark:text-red-400">
                  {status}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-zinc-500">
              Cập nhật thông tin chi tiết, biến thể, hình ảnh & media và quản lý trạng thái hiển
              thị.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Audit Logs button */}
          <button
            type="button"
            onClick={function () {
              setShowAuditModal(true)
            }}
            className="flex items-center gap-1.5 rounded-2xl border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-xs font-bold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            <ClockCounterClockwise size={16} weight="bold" />
            Lịch sử chỉnh sửa
          </button>

          {/* Quick Toggle Status */}
          <button
            type="button"
            disabled={isTogglingStatus}
            onClick={handleToggleStatus}
            className="flex items-center gap-1.5 rounded-2xl border border-zinc-200 px-3.5 py-2 text-xs font-bold text-zinc-800 transition hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {isTogglingStatus && <SpinnerGap size={14} weight="bold" className="animate-spin" />}
            {!isTogglingStatus && status === 'ACTIVE' && <EyeSlash size={16} weight="bold" />}
            {!isTogglingStatus && status !== 'ACTIVE' && <Eye size={16} weight="bold" />}
            {status === 'ACTIVE' && <span>Tạm ẩn sản phẩm</span>}
            {status !== 'ACTIVE' && <span>Mở bán lại</span>}
          </button>

          {/* Save Button */}
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-2xl bg-orange-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-orange-600/20 transition hover:bg-orange-700 disabled:opacity-60"
          >
            {isSaving && <SpinnerGap size={14} weight="bold" className="animate-spin" />}
            {!isSaving && <FloppyDisk size={16} weight="bold" />}
            <span>Lưu thay đổi</span>
          </button>
        </div>
      </div>

      {/* Section 1: Thông tin cơ bản */}
      <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="border-b border-zinc-100 pb-3 text-sm font-bold tracking-wider text-zinc-900 uppercase dark:border-zinc-800 dark:text-white">
          1. Thông tin cơ bản
        </h3>

        <div className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="editProductName"
              className="block text-xs font-bold text-zinc-800 dark:text-zinc-200"
            >
              Tên sản phẩm <span className="text-red-500">*</span>
            </label>
            <input
              id="editProductName"
              type="text"
              value={name}
              onChange={function (e) {
                setName(e.target.value)
              }}
              placeholder="Nhập tên sản phẩm thời trang..."
              className="mt-1.5 w-full rounded-2xl border border-zinc-200 p-3 text-xs outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Slug readonly */}
            <div>
              <label
                htmlFor="editProductSlug"
                className="flex items-center gap-1.5 text-xs font-bold text-zinc-800 dark:text-zinc-200"
              >
                <LockKey size={13} weight="bold" className="text-zinc-400" />
                Đường dẫn tĩnh (Slug)
              </label>
              <div className="mt-1.5 flex items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/80 dark:text-zinc-400">
                <input
                  id="editProductSlug"
                  type="text"
                  readOnly
                  value={slug}
                  className="w-full cursor-default bg-transparent outline-none"
                />
                <button
                  type="button"
                  onClick={function () {
                    void navigator.clipboard.writeText(slug)
                    showToast('Đã sao chép đường dẫn slug!')
                  }}
                  title="Sao chép slug"
                  className="ml-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                >
                  <Copy size={14} weight="bold" />
                </button>
              </div>
              <p className="mt-1 text-[11px] text-zinc-400">
                Slug cố định để giữ thứ hạng tìm kiếm và SEO sản phẩm.
              </p>
            </div>

            {/* Category dropdown */}
            <div>
              <label
                htmlFor="editProductCategory"
                className="block text-xs font-bold text-zinc-800 dark:text-zinc-200"
              >
                Ngành hàng / Danh mục <span className="text-red-500">*</span>
              </label>
              <select
                id="editProductCategory"
                value={categoryId}
                onChange={function (e) {
                  setCategoryId(e.target.value)
                }}
                className="mt-1.5 w-full rounded-2xl border border-zinc-200 p-3 text-xs outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
              >
                <option value="">-- Chọn danh mục --</option>
                {categoriesList.map(function (cat) {
                  return (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  )
                })}
              </select>
            </div>

            {/* Status select */}
            <div>
              <label
                htmlFor="editProductStatus"
                className="block text-xs font-bold text-zinc-800 dark:text-zinc-200"
              >
                Trạng thái hiển thị
              </label>
              <select
                id="editProductStatus"
                value={status}
                onChange={function (e) {
                  setStatus(e.target.value)
                }}
                className="mt-1.5 w-full rounded-2xl border border-zinc-200 p-3 text-xs outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
              >
                <option value="ACTIVE">ACTIVE - Đang bán công khai</option>
                <option value="HIDDEN">HIDDEN - Tạm ẩn khỏi sàn</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="editProductDesc"
              className="block text-xs font-bold text-zinc-800 dark:text-zinc-200"
            >
              Mô tả chi tiết sản phẩm
            </label>
            <div className="mt-1.5">
              <RichTextEditor
                id="editProductDesc"
                value={description}
                onChange={setDescription}
                rows={7}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Media Uploader */}
      <ProductMediaUploader
        images={images}
        onImagesChange={setImages}
        videoKey={videoKey}
        onVideoChange={setVideoKey}
        tryOnEnabled={tryOnEnabled}
        onTryOnToggle={setTryOnEnabled}
        garmentKey={garmentKey}
        onGarmentChange={setGarmentKey}
      />

      {/* Section 3: Quản lý biến thể & Tồn kho */}
      <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold tracking-wider text-zinc-900 uppercase dark:text-white">
                3. Quản lý biến thể & tồn kho
              </h3>
              <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-[11px] font-bold text-orange-700 dark:bg-orange-950/60 dark:text-orange-400">
                {variants.length} biến thể
              </span>
            </div>
            <p className="mt-0.5 text-xs text-zinc-500">
              Cập nhật giá bán, giá so sánh và số lượng tồn kho theo từng kích cỡ & màu sắc.
            </p>
          </div>

          <button
            type="button"
            onClick={handleAddNewVariant}
            className="flex items-center gap-1.5 rounded-2xl border border-orange-200 bg-orange-50 px-3.5 py-2 text-xs font-bold text-orange-600 transition hover:bg-orange-100 dark:border-orange-900/40 dark:bg-orange-950/40 dark:text-orange-400"
          >
            <Plus size={14} weight="bold" />
            Thêm biến thể mới
          </button>
        </div>

        {/* Công cụ Áp dụng hàng loạt (Bulk Apply Bar) */}
        <div className="mt-4 rounded-2xl border border-zinc-200/80 bg-zinc-50/80 p-4 dark:border-zinc-800/80 dark:bg-zinc-950/50">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-800 dark:text-zinc-200">
            <Lightning size={16} weight="bold" className="text-orange-600 dark:text-orange-400" />
            <span>Công cụ áp dụng hàng loạt (Bulk Apply):</span>
          </div>

          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                Áp dụng cho
              </label>
              <select
                value={bulkTarget}
                onChange={function (e) {
                  setBulkTarget(e.target.value)
                }}
                className="mt-1 rounded-xl border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-bold outline-none focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="ALL">Tất cả {variants.length} biến thể</option>
                {distinctColors.map(function (c) {
                  return (
                    <option key={c} value={c}>
                      Chỉ màu: {c}
                    </option>
                  )
                })}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                Giá bán (₫)
              </label>
              <input
                type="text"
                placeholder="VD: 199.000"
                value={bulkPrice}
                onChange={function (e) {
                  const num = parseNumberFromDots(e.target.value)
                  if (num !== null) {
                    setBulkPrice(formatNumberWithDots(num))
                  } else {
                    setBulkPrice('')
                  }
                }}
                className="mt-1 w-32 rounded-xl border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-bold outline-none focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                Giá gốc (₫)
              </label>
              <input
                type="text"
                placeholder="VD: 250.000"
                value={bulkCompareAtPrice}
                onChange={function (e) {
                  const num = parseNumberFromDots(e.target.value)
                  if (num !== null) {
                    setBulkCompareAtPrice(formatNumberWithDots(num))
                  } else {
                    setBulkCompareAtPrice('')
                  }
                }}
                className="mt-1 w-32 rounded-xl border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-bold outline-none focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                Số lượng tồn
              </label>
              <input
                type="number"
                min="0"
                placeholder="VD: 50"
                value={bulkStock}
                onChange={function (e) {
                  setBulkStock(e.target.value)
                }}
                className="mt-1 w-24 rounded-xl border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-bold outline-none focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>

            <button
              type="button"
              onClick={handleApplyBulk}
              className="flex items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-orange-700"
            >
              <Lightning size={14} weight="bold" />
              Áp dụng hàng loạt
            </button>
          </div>
        </div>

        {/* Bảng danh sách biến thể */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-100 text-[11px] font-bold text-zinc-400 uppercase dark:border-zinc-800">
                <th scope="col" className="w-14 pb-3 pl-2 text-center">
                  Mặc định
                </th>
                <th scope="col" className="w-32 pb-3">
                  Màu sắc
                </th>
                <th scope="col" className="w-28 pb-3">
                  Kích cỡ
                </th>
                <th scope="col" className="w-44 pb-3">
                  Mã SKU
                </th>
                <th scope="col" className="w-36 pb-3">
                  Giá bán (₫)
                </th>
                <th scope="col" className="w-36 pb-3">
                  Giá gốc (₫)
                </th>
                <th scope="col" className="w-28 pb-3">
                  Tồn kho
                </th>
                <th scope="col" className="w-16 pr-2 pb-3 text-right">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {variants.map(function (v) {
                return (
                  <tr key={v.keyId} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                    <td className="py-2.5 pl-2 text-center">
                      <input
                        type="radio"
                        name="defaultVariantGroup"
                        checked={v.isDefault}
                        onChange={function () {
                          handleSetDefaultVariant(v.keyId)
                        }}
                        title="Chọn làm biến thể mặc định"
                        className="h-4 w-4 accent-orange-600"
                      />
                    </td>

                    <td className="py-2.5 pr-2">
                      <input
                        type="text"
                        value={v.color}
                        onChange={function (e) {
                          handleUpdateVariantField(v.keyId, 'color', e.target.value)
                        }}
                        placeholder="VD: Trắng"
                        className="w-full rounded-xl border border-zinc-200 px-2.5 py-1.5 text-xs font-semibold outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-zinc-950"
                      />
                    </td>

                    <td className="py-2.5 pr-2">
                      <input
                        type="text"
                        value={v.size}
                        onChange={function (e) {
                          handleUpdateVariantField(v.keyId, 'size', e.target.value)
                        }}
                        placeholder="VD: M, L"
                        className="w-full rounded-xl border border-zinc-200 px-2.5 py-1.5 text-xs font-semibold outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-zinc-950"
                      />
                    </td>

                    <td className="py-2.5 pr-2">
                      <input
                        type="text"
                        value={v.sku}
                        onChange={function (e) {
                          handleUpdateVariantField(v.keyId, 'sku', e.target.value)
                        }}
                        placeholder="SKU"
                        className="w-full rounded-xl border border-zinc-200 px-2.5 py-1.5 font-mono text-xs font-bold outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-zinc-950"
                      />
                    </td>

                    <td className="py-2.5 pr-2">
                      <input
                        type="text"
                        value={formatNumberWithDots(v.price)}
                        onChange={function (e) {
                          const num = parseNumberFromDots(e.target.value)
                          let val = 0
                          if (num !== null) {
                            val = num
                          }
                          handleUpdateVariantField(v.keyId, 'price', val)
                        }}
                        className="w-full rounded-xl border border-zinc-200 px-2.5 py-1.5 text-xs font-bold text-zinc-900 outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                      />
                    </td>

                    <td className="py-2.5 pr-2">
                      <input
                        type="text"
                        value={formatNumberWithDots(v.compareAtPrice)}
                        onChange={function (e) {
                          const num = parseNumberFromDots(e.target.value)
                          handleUpdateVariantField(v.keyId, 'compareAtPrice', num)
                        }}
                        placeholder="Không có"
                        className="w-full rounded-xl border border-zinc-200 px-2.5 py-1.5 text-xs font-semibold text-zinc-500 outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400"
                      />
                    </td>

                    <td className="py-2.5 pr-2">
                      <input
                        type="number"
                        min="0"
                        value={v.stockQuantity}
                        onChange={function (e) {
                          handleUpdateVariantField(
                            v.keyId,
                            'stockQuantity',
                            Math.max(0, parseInt(e.target.value, 10) || 0),
                          )
                        }}
                        className="w-full rounded-xl border border-zinc-200 px-2.5 py-1.5 text-center text-xs font-bold outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-zinc-950"
                      />
                    </td>

                    <td className="py-2.5 pr-2 text-right">
                      {v.id === null && (
                        <button
                          type="button"
                          onClick={function () {
                            handleRemoveVariant(v.keyId)
                          }}
                          title="Xóa biến thể mới thêm"
                          className="flex h-8 w-8 items-center justify-center rounded-xl border border-red-200 text-red-500 hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-950/20"
                        >
                          <Trash size={14} weight="bold" />
                        </button>
                      )}
                      {v.id !== null && (
                        <span className="text-[10px] font-medium text-zinc-400">Đã lưu</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 4: Thuộc tính thời trang & Thông số kiện hàng */}
      <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="border-b border-zinc-100 pb-3 text-sm font-bold tracking-wider text-zinc-900 uppercase dark:border-zinc-800 dark:text-white">
          4. Thuộc tính thời trang & Thông số kiện hàng
        </h3>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="editProductMaterial"
              className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
            >
              Chất liệu sản phẩm
            </label>
            <input
              id="editProductMaterial"
              type="text"
              value={material}
              onChange={function (e) {
                setMaterial(e.target.value)
              }}
              placeholder="VD: 100% Cotton Organic, Lụa Satin, Kaki..."
              className="mt-1.5 w-full rounded-2xl border border-zinc-200 p-3 text-xs outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="editProductOrigin"
              className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
            >
              Xuất xứ sản phẩm
            </label>
            <input
              id="editProductOrigin"
              type="text"
              value={origin}
              onChange={function (e) {
                setOrigin(e.target.value)
              }}
              placeholder="VD: Việt Nam, Hàn Quốc, Nhật Bản..."
              className="mt-1.5 w-full rounded-2xl border border-zinc-200 p-3 text-xs outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="editProductCare"
              className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
            >
              Hướng dẫn bảo quản
            </label>
            <textarea
              id="editProductCare"
              rows={3}
              value={careInstructions}
              onChange={function (e) {
                setCareInstructions(e.target.value)
              }}
              placeholder="Cách giặt, nhiệt độ là ủi, lưu ý bảo quản..."
              className="mt-1.5 w-full rounded-2xl border border-zinc-200 p-3 text-xs outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="editProductSizeGuide"
              className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
            >
              Bảng hướng dẫn chọn size
            </label>
            <textarea
              id="editProductSizeGuide"
              rows={3}
              value={sizeGuide}
              onChange={function (e) {
                setSizeGuide(e.target.value)
              }}
              placeholder="Quy đổi chiều cao, cân nặng, số đo các vòng..."
              className="mt-1.5 w-full rounded-2xl border border-zinc-200 p-3 text-xs outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
            />
          </div>
        </div>

        {/* Thông số kiện hàng */}
        <div className="mt-5 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
            Thông số kiện hàng đóng gói (Dùng tính phí vận chuyển):
          </h4>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label
                htmlFor="editProductWeight"
                className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400"
              >
                Cân nặng (grams)
              </label>
              <input
                id="editProductWeight"
                type="number"
                min="1"
                value={weightGrams}
                onChange={function (e) {
                  setWeightGrams(Number(e.target.value))
                }}
                className="mt-1 w-full rounded-xl border border-zinc-200 p-2 text-xs outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-zinc-950"
              />
            </div>
            <div>
              <label
                htmlFor="editProductLength"
                className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400"
              >
                Dài (cm)
              </label>
              <input
                id="editProductLength"
                type="number"
                min="1"
                value={lengthCm}
                onChange={function (e) {
                  setLengthCm(Number(e.target.value))
                }}
                className="mt-1 w-full rounded-xl border border-zinc-200 p-2 text-xs outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-zinc-950"
              />
            </div>
            <div>
              <label
                htmlFor="editProductWidth"
                className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400"
              >
                Rộng (cm)
              </label>
              <input
                id="editProductWidth"
                type="number"
                min="1"
                value={widthCm}
                onChange={function (e) {
                  setWidthCm(Number(e.target.value))
                }}
                className="mt-1 w-full rounded-xl border border-zinc-200 p-2 text-xs outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-zinc-950"
              />
            </div>
            <div>
              <label
                htmlFor="editProductHeight"
                className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400"
              >
                Cao (cm)
              </label>
              <input
                id="editProductHeight"
                type="number"
                min="1"
                value={heightCm}
                onChange={function (e) {
                  setHeightCm(Number(e.target.value))
                }}
                className="mt-1 w-full rounded-xl border border-zinc-200 p-2 text-xs outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-zinc-950"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Floating Save Actions at bottom */}
      <div className="sticky bottom-6 flex items-center justify-between rounded-3xl border border-zinc-200/80 bg-white/95 p-4 shadow-xl backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/95">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-2xl border border-zinc-200 px-4 py-2.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <ArrowLeft size={16} weight="bold" />
          Hủy & Quay lại
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="flex items-center gap-2 rounded-2xl bg-orange-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-orange-600/30 transition hover:bg-orange-700 disabled:opacity-60"
          >
            {isSaving && <SpinnerGap size={16} weight="bold" className="animate-spin" />}
            {!isSaving && <FloppyDisk size={16} weight="bold" />}
            <span>Lưu tất cả thay đổi</span>
          </button>
        </div>
      </div>

      {/* Audit Log Modal */}
      {showAuditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-3xl bg-white shadow-2xl dark:bg-zinc-900">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 p-5 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400">
                  <ClockCounterClockwise size={20} weight="bold" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                    Lịch sử chỉnh sửa sản phẩm (Audit Log)
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Ghi nhận mọi lần cập nhật thông tin, thay đổi giá, tồn kho và trạng thái.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={function () {
                  setShowAuditModal(false)
                }}
                className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                <X size={16} weight="bold" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              {auditLogsQuery.isPending && (
                <div className="py-12 text-center text-zinc-400">
                  <SpinnerGap size={24} weight="bold" className="mx-auto animate-spin" />
                  <p className="mt-2 text-xs">Đang tải lịch sử chỉnh sửa...</p>
                </div>
              )}

              {!auditLogsQuery.isPending && auditLogs.length === 0 && (
                <div className="py-12 text-center text-zinc-400">
                  <Info size={32} weight="bold" className="mx-auto mb-2 text-zinc-300" />
                  <p className="text-xs">Chưa có lịch sử chỉnh sửa nào được ghi nhận.</p>
                </div>
              )}

              {!auditLogsQuery.isPending && auditLogs.length > 0 && (
                <div className="relative space-y-6 border-l-2 border-zinc-200 pl-4 dark:border-zinc-800">
                  {auditLogs.map(function (log) {
                    return (
                      <div key={log.id} className="group relative">
                        {/* Dot on timeline */}
                        <div className="absolute top-1 -left-[21px] h-2.5 w-2.5 rounded-full border-2 border-white bg-orange-600 dark:border-zinc-900" />

                        <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-3.5 dark:border-zinc-800 dark:bg-zinc-950/40">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {renderActionBadge(log.action ?? '')}
                              <span className="text-[11px] font-bold text-zinc-900 dark:text-zinc-200">
                                {log.changesSummary ?? 'Thay đổi sản phẩm'}
                              </span>
                            </div>
                            <span className="font-mono text-[11px] text-zinc-400">
                              {formatDateTime(log.createdAt)}
                            </span>
                          </div>

                          {/* Old values / New values snippet if present */}
                          {(log.oldValues !== null || log.newValues !== null) && (
                            <div className="mt-2.5 grid grid-cols-1 gap-2 border-t border-zinc-100 pt-2 sm:grid-cols-2 dark:border-zinc-800/80">
                              {log.oldValues !== null && log.oldValues !== '' && (
                                <div className="rounded-xl bg-red-50/50 p-2 text-[11px] text-red-900 dark:bg-red-950/20 dark:text-red-300">
                                  <span className="block text-[10px] font-bold text-red-600 uppercase dark:text-red-400">
                                    Giá trị cũ:
                                  </span>
                                  <pre className="mt-0.5 font-mono text-[10px] leading-tight whitespace-pre-wrap">
                                    {log.oldValues}
                                  </pre>
                                </div>
                              )}
                              {log.newValues !== null && log.newValues !== '' && (
                                <div className="rounded-xl bg-emerald-50/50 p-2 text-[11px] text-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-300">
                                  <span className="block text-[10px] font-bold text-emerald-600 uppercase dark:text-emerald-400">
                                    Giá trị mới:
                                  </span>
                                  <pre className="mt-0.5 font-mono text-[10px] leading-tight whitespace-pre-wrap">
                                    {log.newValues}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end border-t border-zinc-100 p-4 dark:border-zinc-800">
              <button
                type="button"
                onClick={function () {
                  setShowAuditModal(false)
                }}
                className="rounded-2xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
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
