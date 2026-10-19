import { useState } from 'react'

import { ArrowLeft, Plus, Trash, CheckCircle } from '@phosphor-icons/react'

import type { CreateVariantRequest } from '@generated/model/createVariantRequest'

export interface AddProductPayload {
  name: string
  slug: string
  description: string
  categoryId: string
  variants: CreateVariantRequest[]
}

export interface CategoryOption {
  id: string
  name: string
}

interface Props {
  categories: CategoryOption[]
  onBack: () => void
  onAddProduct: (payload: AddProductPayload) => void
}

// Row nội bộ của bảng biến thể, keyId chỉ dùng cho React key + sửa/xóa hàng
interface VariantRow {
  keyId: string
  sku: string
  size: string
  color: string
  price: number
  stockQuantity: number
}

function newVariantRow(sku: string, size: string, color: string): VariantRow {
  return {
    keyId: `var-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    sku,
    size,
    color,
    price: 199000,
    stockQuantity: 30,
  }
}

export default function SellerAddProductTab({ categories, onBack, onAddProduct }: Props) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [variants, setVariants] = useState<VariantRow[]>([
    newVariantRow('NEW-WHT-M', 'M', 'Trắng'),
    newVariantRow('NEW-BLK-L', 'L', 'Đen'),
  ])

  // Chưa chọn danh mục thì mặc định chọn danh mục đầu tiên nếu có
  let effectiveCategoryId = category
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
    setVariants([
      ...variants,
      newVariantRow(`SKU-${Date.now().toString().slice(-4)}`, 'XL', 'Xanh'),
    ])
  }

  function handleRemoveVariant(keyId: string) {
    if (variants.length <= 1) {
      alert('Sản phẩm phải có ít nhất 1 biến thể.')
      return
    }
    setVariants(
      variants.filter(function (v) {
        return v.keyId !== keyId
      }),
    )
  }

  function handleUpdateVariant(keyId: string, field: keyof VariantRow, value: string | number) {
    setVariants(
      variants.map(function (v) {
        if (v.keyId === keyId) {
          return { ...v, [field]: value }
        }
        return v
      }),
    )
  }

  function handleSubmit() {
    if (name.trim() === '') {
      alert('Vui lòng nhập tên sản phẩm.')
      return
    }
    if (effectiveCategoryId === '') {
      alert('Vui lòng chọn danh mục ngành hàng.')
      return
    }
    for (const v of variants) {
      if (v.sku.trim() === '' || v.size.trim() === '' || v.color.trim() === '') {
        alert('Vui lòng nhập đủ SKU, kích cỡ và màu sắc cho mọi biến thể.')
        return
      }
      if (v.price < 0 || v.stockQuantity < 0) {
        alert('Giá bán và tồn kho không được âm.')
        return
      }
    }

    const payload: AddProductPayload = {
      name: name.trim(),
      slug,
      description: description.trim(),
      categoryId: effectiveCategoryId,
      // Biến thể đầu tiên là mặc định (API yêu cầu đúng 1 default)
      variants: variants.map(function (v, index) {
        const variant: CreateVariantRequest = {
          sku: v.sku.trim(),
          size: v.size.trim(),
          color: v.color.trim(),
          price: v.price,
          stockQuantity: v.stockQuantity,
          defaultVariant: index === 0,
        }
        return variant
      }),
    }

    onAddProduct(payload)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-bold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
        >
          <ArrowLeft size={16} weight="bold" />
          Quay lại danh sách
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex items-center gap-2 rounded-2xl bg-orange-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-orange-700"
          >
            <CheckCircle size={16} weight="bold" />
            Lưu & Đăng bán ngay
          </button>
        </div>
      </div>

      {/* 1. Thông tin cơ bản */}
      <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="text-sm font-bold tracking-wider text-zinc-900 uppercase dark:text-white">
          1. Thông tin cơ bản
        </h3>
        <div className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="addProductNameInput"
              className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
            >
              Tên sản phẩm <span className="text-red-500">*</span>
            </label>
            <input
              id="addProductNameInput"
              type="text"
              value={name}
              onChange={function (e) {
                handleNameChange(e.target.value)
              }}
              placeholder="VD: Áo Sơ Mi Lụa Dài Tay Cao Cấp Chống Nhăn"
              className="mt-1.5 w-full rounded-2xl border border-zinc-200 p-3 text-xs outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="addProductSlugInput"
                className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
              >
                Đường dẫn slug (Tự sinh)
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
                  setCategory(e.target.value)
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
              htmlFor="addProductDescTextarea"
              className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
            >
              Mô tả sản phẩm
            </label>
            <textarea
              id="addProductDescTextarea"
              rows={4}
              value={description}
              onChange={function (e) {
                setDescription(e.target.value)
              }}
              placeholder="Mô tả chất liệu, bảng size, hướng dẫn giặt là và bảo quản..."
              className="mt-1.5 w-full rounded-2xl border border-zinc-200 p-3 text-xs outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* 2. Thiết lập Biến thể (Size / Màu) & Giá kho */}
      <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold tracking-wider text-zinc-900 uppercase dark:text-white">
              2. Phân loại biến thể & Tồn kho ban đầu
            </h3>
            <p className="mt-1 text-[11px] text-zinc-500">
              Biến thể đầu tiên là ảnh đại diện mặc định của sản phẩm.
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

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-100 text-[11px] font-bold text-zinc-400 uppercase dark:border-zinc-800">
                <th scope="col" className="pb-3 pl-2">
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
                  Kho ban đầu
                </th>
                <th scope="col" className="pr-2 pb-3 text-right">
                  Xóa
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {variants.map(function (v) {
                return (
                  <tr key={v.keyId}>
                    <td className="py-2.5 pl-2">
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
                        className="w-28 rounded-xl border border-zinc-200 p-2 text-xs outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-zinc-950"
                      />
                    </td>
                    <td className="py-2.5">
                      <input
                        aria-label="Giá bán"
                        type="number"
                        value={v.price}
                        onChange={function (e) {
                          handleUpdateVariant(v.keyId, 'price', Number(e.target.value))
                        }}
                        className="w-28 rounded-xl border border-zinc-200 p-2 text-xs outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-zinc-950"
                      />
                    </td>
                    <td className="py-2.5">
                      <input
                        aria-label="Kho ban đầu"
                        type="number"
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
    </div>
  )
}
