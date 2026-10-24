import { useState, type ChangeEvent } from 'react'

import { useListCategories } from '@generated/endpoints/categories/categories'
import { getListProductsQueryKey } from '@generated/endpoints/seller-products-inventory/seller-products-inventory'
import { useCreate1 } from '@generated/endpoints/shop-products/shop-products'
import { useMine } from '@generated/endpoints/shops/shops'
import {
  ArrowLeft,
  Plus,
  Trash,
  CheckCircle,
  WarningCircle,
  Info,
  ShieldCheck,
  SpinnerGap,
  UploadSimple,
  X,
  Tag,
  Lightning,
  Copy,
  SquaresFour,
  ListDashes,
} from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import ProductMediaUploader from '@/components/seller/ProductMediaUploader'
import RichTextEditor from '@/components/ui/RichTextEditor'
import { imageUrl, takeData } from '@/lib/apiAdapters'
import { ApiError } from '@/lib/apiFetch'
import { uploadImage } from '@/lib/uploadImage'

import type { CreateProductRequest } from '@generated/model/createProductRequest'
import type { CreateVariantRequest } from '@generated/model/createVariantRequest'
import type { ImageItemRequest } from '@generated/model/imageItemRequest'
import type { ShopResponse } from '@generated/model/shopResponse'

interface Props {
  shopId: string
  onBack: () => void
}

interface VariantRow {
  keyId: string
  sku: string
  size: string
  color: string
  price: number
  compareAtPrice: number | null
  stockQuantity: number
  isDefault: boolean
  imageKey: string | null
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

function safeSkuPart(str: string): string {
  return str
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/Đ/g, 'D')
    .replace(/[^A-Z0-9]/g, '')
}

const COMMON_COLORS = ['Trắng', 'Đen', 'Xanh Navy', 'Be', 'Hồng', 'Xám', 'Đỏ', 'Vàng', 'Nâu']
const COMMON_SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', 'Freesize']

function generateVariantSku(prefix: string, color: string, size: string): string {
  const cleanPrefix = prefix
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6)
  let safePrefix = cleanPrefix
  if (safePrefix === '') {
    safePrefix = 'SP'
  }
  const colorCode = safeSkuPart(color).slice(0, 4)
  let safeColor = colorCode
  if (safeColor === '') {
    safeColor = 'COL'
  }
  const sizeCode = safeSkuPart(size).slice(0, 4)
  let safeSize = sizeCode
  if (safeSize === '') {
    safeSize = 'SZ'
  }
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${safePrefix}-${safeColor}-${safeSize}-${rand}`
}

function newVariantRow(
  sku: string,
  size: string,
  color: string,
  isDefault = false,
  imageKey: string | null = null,
): VariantRow {
  return {
    keyId: `var-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    sku,
    size,
    color,
    price: 199000,
    compareAtPrice: 250000,
    stockQuantity: 50,
    isDefault,
    imageKey,
  }
}

export default function SellerAddProductTab({ shopId, onBack }: Props) {
  const queryClient = useQueryClient()

  // 1. Basic Info
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugSuffix] = useState(function () {
    return Math.random().toString(36).substring(2, 6)
  })
  const [categoryId, setCategoryId] = useState('')
  const [description, setDescription] = useState(
    '### Đặc điểm nổi bật:\n- Chất liệu cao cấp, thoáng mát và co giãn nhẹ.\n- Phom dáng hiện đại, đường may tỉ mỉ, tôn dáng người mặc.\n- Phù hợp đi làm, đi chơi và dạo phố năng động.\n\n### Hướng dẫn giặt & bảo quản:\n- Giặt máy ở chế độ nhẹ nhàng với nước lạnh.\n- Không dùng chất tẩy rửa mạnh.\n- Phơi trong bóng râm, tránh ánh nắng trực tiếp.',
  )

  // 2. Media
  const [images, setImages] = useState<string[]>([])
  const [videoKey, setVideoKey] = useState<string | null>(null)
  const [tryOnEnabled, setTryOnEnabled] = useState(false)
  const [garmentKey, setGarmentKey] = useState<string | null>(null)

  // 3. Classifications (Màu sắc & Kích cỡ), Bulk Apply & Variants
  const [colors, setColors] = useState<string[]>(['Trắng', 'Đen'])
  const [customColor, setCustomColor] = useState('')
  const [colorSizesMap, setColorSizesMap] = useState<Record<string, string[]>>({
    Trắng: ['M', 'L'],
    Đen: ['M', 'L'],
  })
  const [customColorSizeInputs, setCustomColorSizeInputs] = useState<Record<string, string>>({})
  const [sizeViewMode, setSizeViewMode] = useState<'by_color' | 'grid'>('by_color')

  // Bulk Apply state
  const [bulkTarget, setBulkTarget] = useState<string>('ALL')
  const [bulkPrice, setBulkPrice] = useState('199.000')
  const [bulkCompareAtPrice, setBulkCompareAtPrice] = useState('250.000')
  const [bulkStock, setBulkStock] = useState('50')

  const [variants, setVariants] = useState<VariantRow[]>(function () {
    return [
      newVariantRow(generateVariantSku('SP', 'Trắng', 'M'), 'M', 'Trắng', true),
      newVariantRow(generateVariantSku('SP', 'Đen', 'L'), 'L', 'Đen', false),
    ]
  })
  const [colorImages, setColorImages] = useState<Record<string, string>>({})
  const [uploadingColor, setUploadingColor] = useState<string | null>(null)

  // 4. Additional Info & Shipping
  const [material, setMaterial] = useState('100% Cotton Organic')
  const [origin, setOrigin] = useState('Việt Nam')
  const [careInstructions, setCareInstructions] = useState(
    'Giặt máy nước lạnh, không dùng thuốc tẩy clo, là ủi ở nhiệt độ trung bình dưới 150°C.',
  )
  const [sizeGuide, setSizeGuide] = useState(
    'Size M: 1m60 - 1m68 (52 - 60kg)\nSize L: 1m68 - 1m75 (60 - 68kg)\nSize XL: 1m75 - 1m82 (68 - 76kg)',
  )
  const [weightGrams, setWeightGrams] = useState<number>(250)
  const [lengthCm, setLengthCm] = useState<number>(25)
  const [widthCm, setWidthCm] = useState<number>(18)
  const [heightCm, setHeightCm] = useState<number>(4)

  // 5. Status
  const [desiredStatus, setDesiredStatus] = useState<'ACTIVE' | 'HIDDEN'>('ACTIVE')
  const [formError, setFormError] = useState<string | null>(null)

  // Categories query
  const categoriesQuery = useListCategories()
  let categories: { id: string; name: string }[] = []
  if (categoriesQuery.data !== undefined) {
    categories = takeData(categoriesQuery.data).map(function (c) {
      return { id: c.id ?? '', name: c.name ?? '' }
    })
  }

  // Shop info query to determine trust/moderation notice
  const mineShopsQuery = useMine()
  let currentShop: ShopResponse | undefined
  if (mineShopsQuery.data !== undefined) {
    const shopsList = takeData(mineShopsQuery.data)
    currentShop = shopsList.find((s) => s.id === shopId)
  }
  const isShopTrusted =
    currentShop !== undefined &&
    (currentShop.isTrusted === true || currentShop.kycStatus === 'VERIFIED')

  const createProductMutation = useCreate1({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getListProductsQueryKey(shopId) })
        onBack()
      },
      onError: function (err: unknown) {
        if (err instanceof ApiError) {
          if (err.status === 409) {
            const lower = err.message.toLowerCase()
            if (lower.includes('slug')) {
              setFormError(
                'Đường dẫn slug sản phẩm đã tồn tại trong gian hàng. Vui lòng đổi lại tên sản phẩm.',
              )
              return
            }
            if (lower.includes('sku')) {
              setFormError(
                'Mã SKU của một trong các phân loại đã tồn tại trong gian hàng. Vui lòng kiểm tra lại bảng phân loại bên dưới và đổi mã SKU.',
              )
              return
            }
            setFormError(
              'Xung đột dữ liệu (409): Tên/slug hoặc mã SKU đã tồn tại trong gian hàng. Vui lòng kiểm tra lại.',
            )
            return
          }
          setFormError(err.message)
          return
        }
        if (err instanceof Error) {
          setFormError(err.message)
          return
        }
        setFormError('Có lỗi xảy ra khi tạo sản phẩm.')
      },
    },
  })

  let effectiveCategoryId = categoryId
  if (effectiveCategoryId === '' && categories.length > 0) {
    effectiveCategoryId = categories[0]?.id ?? ''
  }

  function handleNameChange(val: string) {
    setName(val)
    const clean = val
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
    if (clean === '') {
      setSlug('')
      return
    }
    setSlug(`${clean}-${slugSuffix}`)
  }

  function syncVariantsFromColorSizes(activeColors: string[], activeMap: Record<string, string[]>) {
    const nextVariants: VariantRow[] = []
    let isFirst = true

    for (const c of activeColors) {
      const sizesForColor = activeMap[c] ?? []
      for (const s of sizesForColor) {
        const existing = variants.find(
          (v) =>
            v.color.trim().toLowerCase() === c.trim().toLowerCase() &&
            v.size.trim().toLowerCase() === s.trim().toLowerCase(),
        )

        if (existing !== undefined) {
          nextVariants.push({
            ...existing,
            color: c,
            size: s,
            isDefault: isFirst,
          })
        } else {
          let skuPrefix = 'SP'
          if (slug.trim() !== '') {
            skuPrefix = slug
          } else if (name.trim() !== '') {
            skuPrefix = name
          }
          const sku = generateVariantSku(skuPrefix, c, s)
          const samplePrice = parseNumberFromDots(bulkPrice) ?? 199000
          const sampleCompareAtPrice = parseNumberFromDots(bulkCompareAtPrice) ?? 250000
          const sampleStock = parseNumberFromDots(bulkStock) ?? 50
          const colorImg = colorImages[c] ?? null

          nextVariants.push({
            keyId: `var-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
            sku,
            size: s,
            color: c,
            price: samplePrice,
            compareAtPrice: sampleCompareAtPrice,
            stockQuantity: sampleStock,
            isDefault: isFirst,
            imageKey: colorImg,
          })
        }
        isFirst = false
      }
    }

    const hadDefault = nextVariants.some((v) => v.isDefault)
    if (!hadDefault && nextVariants.length > 0 && nextVariants[0] !== undefined) {
      nextVariants[0].isDefault = true
    }

    setVariants(nextVariants)
  }

  function handleAddColor(colorName: string) {
    const trimmed = colorName.trim()
    if (trimmed === '' || colors.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      return
    }
    const updatedColors = [...colors, trimmed]
    // Mặc định màu mới nhận bộ size của màu đầu tiên (nếu có), hoặc ['M', 'L']
    const templateSizes =
      colors.length > 0 && colorSizesMap[colors[0]!]
        ? [...(colorSizesMap[colors[0]!] ?? [])]
        : ['M', 'L']
    const updatedMap = {
      ...colorSizesMap,
      [trimmed]: templateSizes.length > 0 ? templateSizes : ['M', 'L'],
    }
    setColors(updatedColors)
    setColorSizesMap(updatedMap)
    setCustomColor('')
    syncVariantsFromColorSizes(updatedColors, updatedMap)
  }

  function handleRemoveColor(colorName: string) {
    if (colors.length <= 1) {
      setFormError('Sản phẩm nên có ít nhất 1 màu sắc.')
      return
    }
    const updatedColors = colors.filter((c) => c !== colorName)
    const updatedMap = { ...colorSizesMap }
    delete updatedMap[colorName]
    setColors(updatedColors)
    setColorSizesMap(updatedMap)
    syncVariantsFromColorSizes(updatedColors, updatedMap)
  }

  function handleAddSizeToColor(colorName: string, sizeName: string) {
    const trimmed = sizeName.trim()
    if (trimmed === '') {
      return
    }
    const currentSizes = colorSizesMap[colorName] ?? []
    if (currentSizes.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      return
    }
    const updatedSizes = [...currentSizes, trimmed]
    const updatedMap = {
      ...colorSizesMap,
      [colorName]: updatedSizes,
    }
    setColorSizesMap(updatedMap)
    setCustomColorSizeInputs((prev) => ({ ...prev, [colorName]: '' }))
    syncVariantsFromColorSizes(colors, updatedMap)
  }

  function handleRemoveSizeFromColor(colorName: string, sizeName: string) {
    const currentSizes = colorSizesMap[colorName] ?? []
    if (currentSizes.length <= 1) {
      setFormError(`Màu "${colorName}" phải có ít nhất 1 kích cỡ.`)
      return
    }
    const updatedSizes = currentSizes.filter((s) => s !== sizeName)
    const updatedMap = {
      ...colorSizesMap,
      [colorName]: updatedSizes,
    }
    setColorSizesMap(updatedMap)
    syncVariantsFromColorSizes(colors, updatedMap)
  }

  function handleToggleSizeForColor(colorName: string, sizeName: string) {
    const currentSizes = colorSizesMap[colorName] ?? []
    const isPresent = currentSizes.some((s) => s.toLowerCase() === sizeName.toLowerCase())
    if (isPresent) {
      handleRemoveSizeFromColor(colorName, sizeName)
    } else {
      handleAddSizeToColor(colorName, sizeName)
    }
  }

  function handleCopySizesToAllColors(sourceColor: string) {
    const sourceSizes = colorSizesMap[sourceColor] ?? []
    if (sourceSizes.length === 0) {
      return
    }
    const updatedMap: Record<string, string[]> = {}
    for (const c of colors) {
      updatedMap[c] = [...sourceSizes]
    }
    setColorSizesMap(updatedMap)
    syncVariantsFromColorSizes(colors, updatedMap)
  }

  function handleApplyBulk() {
    const p = parseNumberFromDots(bulkPrice)
    const cp = parseNumberFromDots(bulkCompareAtPrice)
    const stock = parseNumberFromDots(bulkStock)

    if (p === null && cp === null && stock === null) {
      setFormError('Vui lòng nhập ít nhất một thông tin để áp dụng hàng loạt.')
      return
    }

    setVariants((prev) =>
      prev.map((v) => {
        let shouldApply = false
        if (bulkTarget === 'ALL') {
          shouldApply = true
        } else if (bulkTarget.startsWith('color:')) {
          const targetColor = bulkTarget.replace('color:', '')
          shouldApply = v.color.trim().toLowerCase() === targetColor.trim().toLowerCase()
        } else if (bulkTarget.startsWith('size:')) {
          const targetSize = bulkTarget.replace('size:', '')
          shouldApply = v.size.trim().toLowerCase() === targetSize.trim().toLowerCase()
        }

        if (!shouldApply) {
          return v
        }

        return {
          ...v,
          price: p !== null ? p : v.price,
          compareAtPrice: cp !== null ? cp : v.compareAtPrice,
          stockQuantity: stock !== null ? stock : v.stockQuantity,
        }
      }),
    )
    setFormError(null)
  }

  function handleAddVariant() {
    const nextSuffix = (variants.length + 1).toString()
    setVariants([
      ...variants,
      newVariantRow(`SKU-${Date.now().toString().slice(-4)}-${nextSuffix}`, 'XL', 'Be', false),
    ])
  }

  function handleRemoveVariant(keyId: string) {
    if (variants.length <= 1) {
      setFormError('Sản phẩm phải có ít nhất 1 biến thể.')
      return
    }
    const filtered = variants.filter(function (v) {
      return v.keyId !== keyId
    })
    // If deleted row was default, assign default to first row
    const hadDefault = filtered.some((v) => v.isDefault)
    if (!hadDefault && filtered.length > 0 && filtered[0] !== undefined) {
      filtered[0].isDefault = true
    }
    setVariants(filtered)
  }

  function handleSetDefaultVariant(keyId: string) {
    setVariants(
      variants.map(function (v) {
        return { ...v, isDefault: v.keyId === keyId }
      }),
    )
  }

  function handleUpdateVariant(
    keyId: string,
    field: keyof VariantRow,
    value: string | number | null,
  ) {
    setVariants(
      variants.map(function (v) {
        if (v.keyId === keyId) {
          return { ...v, [field]: value }
        }
        return v
      }),
    )
  }

  async function handleColorImageUpload(colorName: string, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file === undefined) {
      return
    }

    setUploadingColor(colorName)
    try {
      const key = await uploadImage(file)
      setColorImages((prev) => ({ ...prev, [colorName]: key }))
      // Update all variants with this color
      setVariants((prev) =>
        prev.map((v) => {
          if (v.color.trim().toLowerCase() === colorName.trim().toLowerCase()) {
            return { ...v, imageKey: key }
          }
          return v
        }),
      )
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Tải ảnh màu thất bại.'
      setFormError(msg)
    } finally {
      setUploadingColor(null)
      e.target.value = ''
    }
  }

  // Get distinct list of colors across variants
  const distinctColors: string[] = []
  for (const v of variants) {
    const trimmed = v.color.trim()
    if (trimmed !== '' && distinctColors.includes(trimmed) === false) {
      distinctColors.push(trimmed)
    }
  }

  function handleSubmit() {
    setFormError(null)

    // 1. Validation basic info
    if (name.trim().length < 5) {
      setFormError('Tên sản phẩm phải có ít nhất 5 ký tự.')
      return
    }
    if (name.trim().length > 300) {
      setFormError('Tên sản phẩm không được vượt quá 300 ký tự.')
      return
    }
    if (slug.trim() === '') {
      setFormError('Đường dẫn slug sản phẩm không hợp lệ.')
      return
    }
    if (effectiveCategoryId === '') {
      setFormError('Vui lòng chọn danh mục ngành hàng.')
      return
    }
    if (description.trim() === '') {
      setFormError('Mô tả chi tiết sản phẩm không được để trống.')
      return
    }

    // 2. Validation media
    if (images.length < 3) {
      setFormError('Vui lòng tải lên tối thiểu 3 ảnh sản phẩm (gallery).')
      return
    }
    if (images.length > 9) {
      setFormError('Sản phẩm chỉ được tải lên tối đa 9 ảnh.')
      return
    }
    if (tryOnEnabled && (garmentKey === null || garmentKey.trim() === '')) {
      setFormError(
        'Ảnh garment (trải phẳng trên nền trắng) là bắt buộc khi bật tính năng thử đồ ảo.',
      )
      return
    }

    // 3. Validation variants
    if (variants.length === 0) {
      setFormError('Sản phẩm phải có ít nhất 1 biến thể.')
      return
    }
    const defaultCount = variants.filter((v) => v.isDefault).length
    if (defaultCount !== 1) {
      setFormError('Vui lòng chọn chính xác 1 biến thể làm mặc định.')
      return
    }

    const seenSkus = new Set<string>()
    for (const v of variants) {
      if (v.sku.trim() === '') {
        setFormError('Mã SKU không được để trống.')
        return
      }
      const upperSku = v.sku.trim().toUpperCase()
      if (seenSkus.has(upperSku)) {
        setFormError(
          `Mã SKU "${v.sku}" bị trùng lặp giữa các phân loại. Mỗi phân loại phải có mã SKU riêng biệt.`,
        )
        return
      }
      seenSkus.add(upperSku)
      if (v.size.trim() === '' || v.color.trim() === '') {
        setFormError('Kích cỡ và màu sắc của biến thể không được để trống.')
        return
      }
      if (v.price <= 0) {
        setFormError('Giá bán phải lớn hơn 0 ₫.')
        return
      }
      if (v.compareAtPrice !== null && v.compareAtPrice < 0) {
        setFormError('Giá gốc không được âm.')
        return
      }
      if (v.stockQuantity < 0) {
        setFormError('Số lượng tồn kho ban đầu không được âm.')
        return
      }
    }

    // 4. Construct payload
    const imageItems: ImageItemRequest[] = images.map(function (key, index) {
      return {
        s3Key: key,
        sortOrder: index,
        variantId: null,
      }
    })

    const variantItems: CreateVariantRequest[] = variants.map(function (v) {
      const colorImg = colorImages[v.color.trim()]
      const effectiveImgKey = v.imageKey ?? colorImg ?? null
      return {
        sku: v.sku.trim(),
        size: v.size.trim(),
        color: v.color.trim(),
        price: v.price,
        compareAtPrice: v.compareAtPrice,
        stockQuantity: v.stockQuantity,
        defaultVariant: v.isDefault,
        imageKey: effectiveImgKey,
      }
    })

    const payload: CreateProductRequest = {
      name: name.trim(),
      slug,
      description: description.trim(),
      categoryId: effectiveCategoryId,
      variants: variantItems,
      images: imageItems,
      videoKey: videoKey ?? null,
      garmentKey: garmentKey ?? null,
      tryOnEnabled,
      material: material.trim() !== '' ? material.trim() : null,
      origin: origin.trim() !== '' ? origin.trim() : null,
      careInstructions: careInstructions.trim() !== '' ? careInstructions.trim() : null,
      sizeGuide: sizeGuide.trim() !== '' ? sizeGuide.trim() : null,
      weightGrams: weightGrams > 0 ? weightGrams : null,
      lengthCm: lengthCm > 0 ? lengthCm : null,
      widthCm: widthCm > 0 ? widthCm : null,
      heightCm: heightCm > 0 ? heightCm : null,
      status: desiredStatus,
    }

    createProductMutation.mutate({
      shopId,
      data: payload,
    })
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header Sticky Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200/80 pb-4 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-2xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-bold text-zinc-700 shadow-xs transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <ArrowLeft size={16} weight="bold" />
            Quay lại
          </button>
          <div>
            <h2 className="text-base font-extrabold tracking-tight text-zinc-900 dark:text-white">
              Thêm sản phẩm mới
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={createProductMutation.isPending}
            onClick={handleSubmit}
            className="flex items-center gap-2 rounded-2xl bg-orange-600 px-5 py-2 text-xs font-bold text-white shadow-md transition hover:bg-orange-700 disabled:opacity-50"
          >
            {createProductMutation.isPending && (
              <SpinnerGap size={16} weight="bold" className="animate-spin" />
            )}
            {createProductMutation.isPending === false && <CheckCircle size={16} weight="bold" />}
            Lưu & Đăng bán
          </button>
        </div>
      </div>

      {formError !== null && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
          <WarningCircle size={20} weight="fill" className="shrink-0 text-red-500" />
          <span>{formError}</span>
        </div>
      )}

      {/* 1. Thông tin cơ bản */}
      <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="text-sm font-bold tracking-wider text-zinc-900 uppercase dark:text-white">
          1. Thông tin cơ bản
        </h3>
        <div className="mt-4 space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="addProductNameInput"
                className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
              >
                Tên sản phẩm <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-zinc-400">
                {name.length}/300 ký tự (Tối thiểu 5)
              </span>
            </div>
            <input
              id="addProductNameInput"
              type="text"
              value={name}
              onChange={function (e) {
                handleNameChange(e.target.value)
              }}
              placeholder="VD: Áo Thun Nam Cổ Tròn Cotton 100% Thoáng Khí Cao Cấp"
              className="mt-1.5 w-full rounded-2xl border border-zinc-200 p-3 text-xs outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="addProductSlugInput"
                className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
              >
                Đường dẫn slug (Tự sinh độc nhất)
              </label>
              <input
                id="addProductSlugInput"
                type="text"
                value={slug}
                readOnly
                className="mt-1.5 w-full rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/50"
              />
            </div>
            <div>
              <label
                htmlFor="addProductCategorySelect"
                className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
              >
                Danh mục ngành hàng <span className="text-red-500">*</span>
              </label>
              <select
                id="addProductCategorySelect"
                value={effectiveCategoryId}
                onChange={function (e) {
                  setCategoryId(e.target.value)
                }}
                className="mt-1.5 w-full rounded-2xl border border-zinc-200 p-3 text-xs outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
              >
                {categories.length === 0 && <option value="">Đang tải danh mục…</option>}
                {categories.map(function (c) {
                  return (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  )
                })}
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="rich-text-editor"
              className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
            >
              Mô tả chi tiết sản phẩm (Rich Text Editor)
            </label>
            <RichTextEditor
              id="rich-text-editor"
              value={description}
              onChange={setDescription}
              rows={8}
            />
          </div>
        </div>
      </div>

      {/* 2. Media Uploader: Images (3-9), Video (<=60s), Garment Flat Lay (Try-On) */}
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

      {/* 3. Phân loại biến thể (Size & Màu sắc) & Tồn kho */}
      <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold tracking-wider text-zinc-900 uppercase dark:text-white">
                3. Phân loại biến thể (Size & Màu sắc) & Tồn kho
              </h3>
              <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-[11px] font-bold text-orange-700 dark:bg-orange-950/60 dark:text-orange-400">
                {variants.length} phân loại
              </span>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              Thiết lập màu sắc, kích cỡ, công cụ áp dụng giá hàng loạt và quản lý tồn kho theo biến
              thể.
            </p>
          </div>

          <button
            type="button"
            onClick={handleAddVariant}
            className="flex items-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-600 hover:bg-orange-100 dark:border-orange-900/40 dark:bg-orange-950/40 dark:text-orange-400"
          >
            <Plus size={14} weight="bold" />
            Thêm dòng tùy biến
          </button>
        </div>

        {/* 3.1 Nhóm phân loại 1: Màu sắc */}
        <div className="mt-5 rounded-2xl border border-zinc-100 bg-zinc-50/70 p-4 dark:border-zinc-800/80 dark:bg-zinc-950/50">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-white">
              <Tag size={14} weight="bold" className="text-orange-600 dark:text-orange-400" />
              Nhóm 1: Màu sắc sản phẩm
            </label>
            <span className="text-[11px] text-zinc-400">Chọn hoặc nhập màu sắc</span>
          </div>

          {/* Active Colors Chips */}
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {colors.map((c) => (
              <span
                key={c}
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-2.5 py-1 text-xs font-bold text-zinc-800 shadow-2xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              >
                {c}
                <button
                  type="button"
                  onClick={() => handleRemoveColor(c)}
                  className="rounded-full p-0.5 text-zinc-400 hover:bg-zinc-100 hover:text-red-500 dark:hover:bg-zinc-700"
                  title={`Xóa màu ${c}`}
                >
                  <X size={12} weight="bold" />
                </button>
              </span>
            ))}

            {/* Input custom color */}
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                placeholder="Nhập màu khác..."
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddColor(customColor)
                  }
                }}
                className="w-32 rounded-xl border border-zinc-200 bg-white px-2.5 py-1 text-xs outline-none focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
              />
              <button
                type="button"
                onClick={() => handleAddColor(customColor)}
                className="rounded-xl border border-zinc-200 bg-white px-2.5 py-1 text-xs font-bold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              >
                Thêm
              </button>
            </div>
          </div>

          {/* Quick pick colors */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-zinc-200/50 pt-2 dark:border-zinc-800/60">
            <span className="mr-1 text-[11px] font-medium text-zinc-400">Gợi ý nhanh:</span>
            {COMMON_COLORS.map((c) => {
              const isSelected = colors.some((col) => col.toLowerCase() === c.toLowerCase())
              return (
                <button
                  key={c}
                  type="button"
                  disabled={isSelected}
                  onClick={() => handleAddColor(c)}
                  className={`rounded-lg px-2 py-0.5 text-[11px] font-semibold transition ${
                    isSelected
                      ? 'cursor-not-allowed bg-zinc-200/70 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600'
                      : 'border border-dashed border-zinc-300 bg-white text-zinc-600 hover:border-orange-500 hover:text-orange-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400'
                  }`}
                >
                  + {c}
                </button>
              )
            })}
          </div>
        </div>

        {/* 3.2 Nhóm phân loại 2: Kích cỡ theo từng màu sắc (Color-specific Sizes Builder) */}
        <div className="mt-5 rounded-2xl border border-zinc-100 bg-zinc-50/70 p-4 dark:border-zinc-800/80 dark:bg-zinc-950/50">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200/50 pb-3 dark:border-zinc-800/60">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-white">
                <Tag size={14} weight="bold" className="text-orange-600 dark:text-orange-400" />
                Nhóm 2: Kích cỡ (Size) theo từng màu sắc
              </label>
              <span className="text-[11px] text-zinc-400">
                Cho phép mỗi màu sắc sở hữu một tập kích cỡ riêng biệt (Ví dụ: Đen chỉ có XL, 2XL;
                Trắng có đủ S, M, L, XL, 2XL; Xanh Navy có 4XL)
              </span>
            </div>

            {/* Toggle View Mode: By Color vs Matrix Grid */}
            <div className="flex items-center rounded-xl border border-zinc-200 bg-white p-0.5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
              <button
                type="button"
                onClick={() => setSizeViewMode('by_color')}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                  sizeViewMode === 'by_color'
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                }`}
              >
                <ListDashes size={14} weight="bold" />
                Theo từng màu
              </button>
              <button
                type="button"
                onClick={() => setSizeViewMode('grid')}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                  sizeViewMode === 'grid'
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                }`}
              >
                <SquaresFour size={14} weight="bold" />
                Lưới ma trận Màu × Size
              </button>
            </div>
          </div>

          {/* VIEW MODE 1: Thẻ kích cỡ theo từng màu (Color Cards) */}
          {sizeViewMode === 'by_color' && (
            <div className="mt-4 space-y-3">
              {colors.map((colorName) => {
                const sizesForThisColor = colorSizesMap[colorName] ?? []
                const customInputVal = customColorSizeInputs[colorName] ?? ''

                return (
                  <div
                    key={colorName}
                    className="rounded-xl border border-zinc-200/80 bg-white p-3.5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-2.5 dark:border-zinc-800/60">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full border border-zinc-300 bg-orange-500/80 shadow-2xs" />
                        <span className="text-xs font-bold text-zinc-900 dark:text-white">
                          Màu:{' '}
                          <span className="text-orange-600 dark:text-orange-400">{colorName}</span>
                        </span>
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                          {sizesForThisColor.length} size
                        </span>
                      </div>

                      {colors.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleCopySizesToAllColors(colorName)}
                          className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-100 hover:text-orange-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                          title={`Sao chép toàn bộ size của màu ${colorName} sang các màu khác`}
                        >
                          <Copy size={12} weight="bold" />
                          Sao chép bộ size này sang tất cả màu
                        </button>
                      )}
                    </div>

                    {/* Active Size Chips for this color */}
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {sizesForThisColor.map((s) => (
                        <span
                          key={s}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50/70 px-2.5 py-1 text-xs font-bold text-orange-900 shadow-2xs dark:border-orange-900/40 dark:bg-orange-950/40 dark:text-orange-300"
                        >
                          {s}
                          <button
                            type="button"
                            onClick={() => handleRemoveSizeFromColor(colorName, s)}
                            className="rounded-full p-0.5 text-orange-400 hover:bg-orange-100 hover:text-red-600 dark:hover:bg-orange-900"
                            title={`Xóa size ${s} của màu ${colorName}`}
                          >
                            <X size={12} weight="bold" />
                          </button>
                        </span>
                      ))}

                      {/* Custom size input for this color */}
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          placeholder="Nhập size khác..."
                          value={customInputVal}
                          onChange={(e) =>
                            setCustomColorSizeInputs((prev) => ({
                              ...prev,
                              [colorName]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleAddSizeToColor(colorName, customInputVal)
                            }
                          }}
                          className="w-24 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs outline-none focus:border-orange-500 focus:bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddSizeToColor(colorName, customInputVal)}
                          className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-bold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                        >
                          + Thêm
                        </button>
                      </div>
                    </div>

                    {/* Quick pick standard sizes for this color */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-1 border-t border-zinc-100 pt-2 dark:border-zinc-800/40">
                      <span className="mr-1 text-[10px] font-medium text-zinc-400">
                        Chọn nhanh:
                      </span>
                      {COMMON_SIZES.map((sz) => {
                        const isSelected = sizesForThisColor.some(
                          (s) => s.toLowerCase() === sz.toLowerCase(),
                        )
                        return (
                          <button
                            key={sz}
                            type="button"
                            disabled={isSelected}
                            onClick={() => handleAddSizeToColor(colorName, sz)}
                            className={`rounded-md px-2 py-0.5 text-[10px] font-semibold transition ${
                              isSelected
                                ? 'cursor-not-allowed bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600'
                                : 'border border-dashed border-zinc-300 bg-zinc-50 text-zinc-600 hover:border-orange-500 hover:text-orange-600 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-400'
                            }`}
                          >
                            + {sz}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* VIEW MODE 2: Lưới ma trận (Matrix Checkbox Grid) */}
          {sizeViewMode === 'grid' &&
            (() => {
              const allUsedSizes: string[] = []
              for (const c of colors) {
                for (const s of colorSizesMap[c] ?? []) {
                  if (!allUsedSizes.includes(s)) {
                    allUsedSizes.push(s)
                  }
                }
              }
              const gridSizes = Array.from(new Set([...COMMON_SIZES, ...allUsedSizes]))

              return (
                <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-200 bg-white p-3 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
                  <table className="w-full text-center text-xs">
                    <thead>
                      <tr className="border-b border-zinc-200 text-[11px] font-bold text-zinc-500 uppercase dark:border-zinc-800">
                        <th scope="col" className="py-2 pl-2 text-left">
                          Màu sắc
                        </th>
                        {gridSizes.map((sz) => (
                          <th key={sz} scope="col" className="px-2 py-2">
                            {sz}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                      {colors.map((colorName) => {
                        const sizesForThis = colorSizesMap[colorName] ?? []
                        return (
                          <tr
                            key={colorName}
                            className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30"
                          >
                            <td className="py-2 pl-2 text-left font-bold text-zinc-900 dark:text-white">
                              {colorName}
                            </td>
                            {gridSizes.map((sz) => {
                              const isChecked = sizesForThis.some(
                                (s) => s.toLowerCase() === sz.toLowerCase(),
                              )
                              return (
                                <td key={sz} className="px-2 py-2 text-center">
                                  <label className="inline-flex cursor-pointer items-center justify-center p-1">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => handleToggleSizeForColor(colorName, sz)}
                                      className="h-4 w-4 rounded accent-orange-600"
                                    />
                                  </label>
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )
            })()}
        </div>

        {/* 3.3 Công cụ áp dụng hàng loạt thông minh (Smart Bulk Apply Tool) */}
        {(() => {
          const allSizesInVariants = Array.from(new Set(variants.map((v) => v.size)))

          return (
            <div className="mt-4 rounded-2xl border border-orange-200/80 bg-orange-50/50 p-4 dark:border-orange-950/60 dark:bg-orange-950/20">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-orange-900 dark:text-orange-300">
                <div className="flex items-center gap-2">
                  <Lightning
                    size={16}
                    weight="fill"
                    className="text-orange-600 dark:text-orange-400"
                  />
                  <span>Áp dụng thông số hàng loạt ({variants.length} phân loại)</span>
                </div>

                {/* Chọn mục tiêu áp dụng (Target Selector) */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                    Áp dụng cho:
                  </span>
                  <select
                    value={bulkTarget}
                    onChange={(e) => setBulkTarget(e.target.value)}
                    className="rounded-xl border border-zinc-300 bg-white px-3 py-1 text-xs font-bold text-zinc-800 outline-none focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                  >
                    <option value="ALL">Tất cả {variants.length} phân loại</option>
                    <optgroup label="Theo Màu sắc">
                      {colors.map((c) => (
                        <option key={c} value={`color:${c}`}>
                          Chỉ màu {c} ({(colorSizesMap[c] ?? []).length} biến thể)
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Theo Kích cỡ">
                      {allSizesInVariants.map((s) => (
                        <option key={s} value={`size:${s}`}>
                          Chỉ size {s}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                    Giá bán chung (₫)
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: 199.000"
                    value={bulkPrice}
                    onChange={(e) => {
                      const num = parseNumberFromDots(e.target.value)
                      setBulkPrice(num !== null ? formatNumberWithDots(num) : '')
                    }}
                    className="mt-1 w-36 rounded-xl border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-bold outline-none focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                    Giá gốc chung (₫)
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: 250.000"
                    value={bulkCompareAtPrice}
                    onChange={(e) => {
                      const num = parseNumberFromDots(e.target.value)
                      setBulkCompareAtPrice(num !== null ? formatNumberWithDots(num) : '')
                    }}
                    className="mt-1 w-36 rounded-xl border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-bold outline-none focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                    Kho ban đầu
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ví dụ: 50"
                    value={bulkStock}
                    onChange={(e) => setBulkStock(e.target.value)}
                    className="mt-1 w-24 rounded-xl border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-bold outline-none focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleApplyBulk}
                  className="flex items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-orange-700"
                >
                  <Lightning size={14} weight="bold" />
                  Áp dụng thông số
                </button>
              </div>
            </div>
          )
        })()}

        {/* 3.4 Upload ảnh riêng cho từng màu sắc */}
        {distinctColors.length > 0 && (
          <div className="mt-5 rounded-2xl border border-zinc-100 bg-zinc-50/70 p-4 dark:border-zinc-800/80 dark:bg-zinc-950/60">
            <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
              Ảnh riêng cho từng màu sắc (Hiển thị khi khách chọn màu trên PDP):
            </h4>
            <div className="mt-3 flex flex-wrap gap-4">
              {distinctColors.map(function (colorName) {
                const imgKey = colorImages[colorName]
                const isUploadingThis = uploadingColor === colorName
                return (
                  <div
                    key={colorName}
                    className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-2.5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    {imgKey !== undefined && (
                      <img
                        src={imageUrl(imgKey)}
                        alt={colorName}
                        className="h-10 w-10 rounded-lg object-cover"
                      />
                    )}
                    <div>
                      <span className="block text-xs font-bold text-zinc-900 dark:text-white">
                        {colorName}
                      </span>
                      <label className="mt-1 inline-flex cursor-pointer items-center gap-1 text-[11px] font-semibold text-orange-600 hover:underline dark:text-orange-400">
                        {isUploadingThis && (
                          <SpinnerGap size={12} weight="bold" className="animate-spin" />
                        )}
                        {isUploadingThis === false && <UploadSimple size={12} weight="bold" />}
                        {imgKey !== undefined && <span>Đổi ảnh</span>}
                        {imgKey === undefined && <span>Tải ảnh màu</span>}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={function (e) {
                            void handleColorImageUpload(colorName, e)
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 3.5 Bảng danh sách phân loại chi tiết */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-100 text-[11px] font-bold text-zinc-400 uppercase dark:border-zinc-800">
                <th scope="col" className="pb-3 pl-2">
                  Mặc định
                </th>
                <th scope="col" className="pb-3">
                  Màu sắc
                </th>
                <th scope="col" className="pb-3">
                  Kích cỡ
                </th>
                <th scope="col" className="pb-3">
                  Mã SKU
                </th>
                <th scope="col" className="pb-3">
                  Giá bán (₫)
                </th>
                <th scope="col" className="pb-3">
                  Giá gốc (₫)
                </th>
                <th scope="col" className="pb-3">
                  Giảm giá
                </th>
                <th scope="col" className="pb-3">
                  Kho ban đầu
                </th>
                <th scope="col" className="pr-2 pb-3 text-right">
                  Xóa
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {variants.map(function (v) {
                let discountPct = 0
                if (v.compareAtPrice !== null && v.compareAtPrice > v.price) {
                  discountPct = Math.round(((v.compareAtPrice - v.price) / v.compareAtPrice) * 100)
                }

                return (
                  <tr key={v.keyId} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                    <td className="py-2.5 pl-2">
                      <input
                        type="radio"
                        name="defaultVariantRadio"
                        checked={v.isDefault}
                        onChange={function () {
                          handleSetDefaultVariant(v.keyId)
                        }}
                        title="Chọn làm biến thể mặc định"
                        className="h-4 w-4 accent-orange-600"
                      />
                    </td>
                    <td className="py-2.5">
                      <input
                        aria-label="Màu sắc"
                        type="text"
                        value={v.color}
                        onChange={function (e) {
                          handleUpdateVariant(v.keyId, 'color', e.target.value)
                        }}
                        className="w-24 rounded-xl border border-zinc-200 p-2 text-xs font-medium outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-zinc-950"
                      />
                    </td>
                    <td className="py-2.5">
                      <input
                        aria-label="Kích cỡ"
                        type="text"
                        value={v.size}
                        onChange={function (e) {
                          handleUpdateVariant(v.keyId, 'size', e.target.value)
                        }}
                        className="w-16 rounded-xl border border-zinc-200 p-2 text-xs font-medium outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-zinc-950"
                      />
                    </td>
                    <td className="py-2.5">
                      <input
                        aria-label="Mã SKU"
                        type="text"
                        value={v.sku}
                        onChange={function (e) {
                          handleUpdateVariant(v.keyId, 'sku', e.target.value)
                        }}
                        className="w-36 rounded-xl border border-zinc-200 p-2 font-mono text-xs outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-zinc-950"
                      />
                    </td>
                    <td className="py-2.5">
                      <input
                        aria-label="Giá bán"
                        type="text"
                        value={formatNumberWithDots(v.price)}
                        onChange={function (e) {
                          const val = parseNumberFromDots(e.target.value) ?? 0
                          handleUpdateVariant(v.keyId, 'price', val)
                        }}
                        className="w-32 rounded-xl border border-zinc-200 p-2 text-xs font-semibold outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-zinc-950"
                      />
                    </td>
                    <td className="py-2.5">
                      <input
                        aria-label="Giá gốc"
                        type="text"
                        value={formatNumberWithDots(v.compareAtPrice)}
                        onChange={function (e) {
                          const val = parseNumberFromDots(e.target.value)
                          handleUpdateVariant(v.keyId, 'compareAtPrice', val)
                        }}
                        placeholder="Không có"
                        className="w-32 rounded-xl border border-zinc-200 p-2 text-xs font-semibold outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-zinc-950"
                      />
                    </td>
                    <td className="py-2.5">
                      {discountPct > 0 && (
                        <span className="rounded-md bg-red-100 px-2 py-0.5 text-[11px] font-extrabold text-red-600 dark:bg-red-950/50 dark:text-red-400">
                          -{discountPct}%
                        </span>
                      )}
                      {discountPct <= 0 && <span className="text-[11px] text-zinc-400">—</span>}
                    </td>
                    <td className="py-2.5">
                      <input
                        aria-label="Kho ban đầu"
                        type="number"
                        min="0"
                        value={v.stockQuantity}
                        onChange={function (e) {
                          handleUpdateVariant(v.keyId, 'stockQuantity', Number(e.target.value))
                        }}
                        className="w-20 rounded-xl border border-zinc-200 p-2 text-xs font-medium outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-zinc-950"
                      />
                    </td>
                    <td className="py-2.5 pr-2 text-right">
                      <button
                        type="button"
                        onClick={function () {
                          handleRemoveVariant(v.keyId)
                        }}
                        className="text-red-500 hover:text-red-700"
                        title="Xóa biến thể"
                      >
                        <Trash size={16} weight="bold" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Thông tin bổ sung & Vận chuyển */}
      <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="text-sm font-bold tracking-wider text-zinc-900 uppercase dark:text-white">
          4. Thông tin bổ sung & Đóng gói vận chuyển
        </h3>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="productMaterialInput"
              className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
            >
              Chất liệu sản phẩm
            </label>
            <input
              id="productMaterialInput"
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
              htmlFor="productOriginInput"
              className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
            >
              Xuất xứ sản phẩm
            </label>
            <input
              id="productOriginInput"
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
              htmlFor="productCareInput"
              className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
            >
              Hướng dẫn bảo quản
            </label>
            <textarea
              id="productCareInput"
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
              htmlFor="productSizeGuideInput"
              className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
            >
              Bảng hướng dẫn chọn size
            </label>
            <textarea
              id="productSizeGuideInput"
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

        {/* Thông tin kích thước vận chuyển */}
        <div className="mt-5 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
            Thông số kiện hàng đóng gói (Dùng tính phí vận chuyển):
          </h4>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label
                htmlFor="productWeightInput"
                className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400"
              >
                Cân nặng (grams)
              </label>
              <input
                id="productWeightInput"
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
                htmlFor="productLengthInput"
                className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400"
              >
                Dài (cm)
              </label>
              <input
                id="productLengthInput"
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
                htmlFor="productWidthInput"
                className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400"
              >
                Rộng (cm)
              </label>
              <input
                id="productWidthInput"
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
                htmlFor="productHeightInput"
                className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400"
              >
                Cao (cm)
              </label>
              <input
                id="productHeightInput"
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

      {/* 5. Trạng thái & Cơ chế phê duyệt */}
      <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="text-sm font-bold tracking-wider text-zinc-900 uppercase dark:text-white">
          5. Trạng thái hiển thị & Kiểm duyệt
        </h3>

        <div className="mt-4 flex flex-wrap gap-4">
          <label className="flex cursor-pointer items-center gap-2.5 rounded-2xl border border-zinc-200 p-3.5 transition hover:border-orange-500 dark:border-zinc-800">
            <input
              type="radio"
              name="productStatusRadio"
              value="ACTIVE"
              checked={desiredStatus === 'ACTIVE'}
              onChange={function () {
                setDesiredStatus('ACTIVE')
              }}
              className="h-4 w-4 accent-orange-600"
            />
            <div>
              <span className="block text-xs font-bold text-zinc-900 dark:text-white">
                Đang bán (ACTIVE)
              </span>
              <span className="text-[11px] text-zinc-500">
                Hiển thị công khai trên gian hàng và tìm kiếm.
              </span>
            </div>
          </label>

          <label className="flex cursor-pointer items-center gap-2.5 rounded-2xl border border-zinc-200 p-3.5 transition hover:border-orange-500 dark:border-zinc-800">
            <input
              type="radio"
              name="productStatusRadio"
              value="HIDDEN"
              checked={desiredStatus === 'HIDDEN'}
              onChange={function () {
                setDesiredStatus('HIDDEN')
              }}
              className="h-4 w-4 accent-orange-600"
            />
            <div>
              <span className="block text-xs font-bold text-zinc-900 dark:text-white">
                Tạm ẩn (HIDDEN)
              </span>
              <span className="text-[11px] text-zinc-500">
                Lưu vào kho, tạm ngừng hiển thị với người mua.
              </span>
            </div>
          </label>
        </div>

        {/* Moderation Notice Box */}
        {isShopTrusted && (
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
            <ShieldCheck size={20} weight="fill" className="shrink-0 text-emerald-600" />
            <div>
              <span className="font-bold">Shop uy tín (Đã xác thực eKYC):</span> Sản phẩm của bạn đủ
              điều kiện bỏ qua hàng đợi duyệt và sẽ được kích hoạt ngay lập tức khi đăng bán.
            </div>
          </div>
        )}

        {isShopTrusted === false && (
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
            <Info size={20} weight="fill" className="shrink-0 text-amber-600" />
            <div>
              <span className="font-bold">Quy trình kiểm duyệt sản phẩm mới:</span> Shop của bạn
              chưa kích hoạt định danh uy tín, sản phẩm mới sau khi đăng bán sẽ ở trạng thái{' '}
              <strong className="underline">Chờ duyệt (PENDING)</strong> và được Ban Quản Trị xem
              xét phê duyệt trong vòng 24 giờ.
            </div>
          </div>
        )}
      </div>

      {/* Footer Submit Button */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-2xl border border-zinc-200 bg-white px-5 py-2.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
        >
          Hủy bỏ
        </button>
        <button
          type="button"
          disabled={createProductMutation.isPending}
          onClick={handleSubmit}
          className="flex items-center gap-2 rounded-2xl bg-orange-600 px-6 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-orange-700 disabled:opacity-50"
        >
          {createProductMutation.isPending && (
            <SpinnerGap size={16} weight="bold" className="animate-spin" />
          )}
          {createProductMutation.isPending === false && <CheckCircle size={16} weight="bold" />}
          Lưu & Đăng bán sản phẩm
        </button>
      </div>
    </div>
  )
}
