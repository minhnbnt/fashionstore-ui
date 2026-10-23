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
} from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import ProductMediaUploader from '@/components/seller/ProductMediaUploader'
import RichTextEditor from '@/components/ui/RichTextEditor'
import { imageUrl, takeData } from '@/lib/apiAdapters'
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

function newVariantRow(
  sku: string,
  size: string,
  color: string,
  isDefault = false,
  imageKey: string | null = null,
): VariantRow {
  return {
    keyId: `var-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
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
  const [categoryId, setCategoryId] = useState('')
  const [description, setDescription] = useState(
    '### Đặc điểm nổi bật:\n- Chất liệu cao cấp, thoáng mát và co giãn nhẹ.\n- Phom dáng hiện đại, đường may tỉ mỉ, tôn dáng người mặc.\n- Phù hợp đi làm, đi chơi và dạo phố năng động.\n\n### Hướng dẫn giặt & bảo quản:\n- Giặt máy ở chế độ nhẹ nhàng với nước lạnh.\n- Không dùng chất tẩy rửa mạnh.\n- Phơi trong bóng râm, tránh ánh nắng trực tiếp.',
  )

  // 2. Media
  const [images, setImages] = useState<string[]>([])
  const [videoKey, setVideoKey] = useState<string | null>(null)
  const [tryOnEnabled, setTryOnEnabled] = useState(false)
  const [garmentKey, setGarmentKey] = useState<string | null>(null)

  // 3. Variants & Color Images
  const [variants, setVariants] = useState<VariantRow[]>([
    newVariantRow('AO-THUN-TRG-M', 'M', 'Trắng', true),
    newVariantRow('AO-THUN-DEN-L', 'L', 'Đen', false),
  ])
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
        const message = err instanceof Error ? err.message : 'Có lỗi xảy ra khi tạo sản phẩm.'
        setFormError(message)
      },
    },
  })

  let effectiveCategoryId = categoryId
  if (effectiveCategoryId === '' && categories.length > 0) {
    effectiveCategoryId = categories[0]?.id ?? ''
  }

  function handleNameChange(val: string) {
    setName(val)
    const generatedSlug = val
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
    setSlug(generatedSlug)
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
      setFormError('Ảnh garment (trải phẳng trên nền trắng) là bắt buộc khi bật tính năng thử đồ ảo.')
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

    for (const v of variants) {
      if (v.sku.trim() === '') {
        setFormError('Mã SKU không được để trống.')
        return
      }
      if (v.size.trim() === '' || v.color.trim() === '') {
        setFormError('Kích cỡ và màu sắc của biến thể không được để trống.')
        return
      }
      if (v.price <= 0) {
        setFormError('Giá bán phải lớn hơn 0 ₫.')
        return
      }
      if (v.compareAtPrice !== null && v.compareAtPrice <= v.price) {
        setFormError(`Giá gốc (${v.compareAtPrice}₫) phải lớn hơn giá bán (${v.price}₫).`)
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
              Thêm sản phẩm mới (Đặc tả 2.2.1)
            </h2>
            <p className="text-xs text-zinc-500">
              Đăng bán sản phẩm với đầy đủ ảnh gallery, video giới thiệu, Virtual Try-On và biến thể.
            </p>
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
              <span className="text-[11px] text-zinc-400">{name.length}/300 ký tự (Tối thiểu 5)</span>
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

      {/* 3. Phân loại biến thể & Ảnh theo màu & Giá bán */}
      <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold tracking-wider text-zinc-900 uppercase dark:text-white">
              3. Phân loại biến thể (Size & Màu sắc) & Tồn kho
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              Quản lý SKU, giá bán, giá gốc (tự động tính % giảm) và ảnh riêng cho từng màu sắc.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddVariant}
            className="flex items-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-600 hover:bg-orange-100 dark:border-orange-900/40 dark:bg-orange-950/40 dark:text-orange-400"
          >
            <Plus size={14} weight="bold" />
            Thêm biến thể
          </button>
        </div>

        {/* Upload ảnh riêng cho từng màu sắc */}
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

        {/* Bảng biến thể */}
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
                  <tr key={v.keyId}>
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
                        className="w-24 rounded-xl border border-zinc-200 p-2 text-xs outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-zinc-950"
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
                        className="w-16 rounded-xl border border-zinc-200 p-2 text-xs outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-zinc-950"
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
                        className="w-32 rounded-xl border border-zinc-200 p-2 text-xs outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-zinc-950"
                      />
                    </td>
                    <td className="py-2.5">
                      <input
                        aria-label="Giá bán"
                        type="number"
                        min="0"
                        value={v.price}
                        onChange={function (e) {
                          handleUpdateVariant(v.keyId, 'price', Number(e.target.value))
                        }}
                        className="w-28 rounded-xl border border-zinc-200 p-2 text-xs outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-zinc-950"
                      />
                    </td>
                    <td className="py-2.5">
                      <input
                        aria-label="Giá gốc"
                        type="number"
                        min="0"
                        value={v.compareAtPrice ?? ''}
                        onChange={function (e) {
                          const val = e.target.value === '' ? null : Number(e.target.value)
                          handleUpdateVariant(v.keyId, 'compareAtPrice', val)
                        }}
                        placeholder="Không có"
                        className="w-28 rounded-xl border border-zinc-200 p-2 text-xs outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-zinc-950"
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
                        className="w-20 rounded-xl border border-zinc-200 p-2 text-xs outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-zinc-950"
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
