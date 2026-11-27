import { useState } from 'react'

import { useGetShopCategories } from '@generated/endpoints/shops-catalog/shops-catalog'

import Modal from '@/components/Modal'
import { takeData } from '@/lib/api/apiAdapters'
import {
  cn,
  INPUT_CLASS,
  LABEL_CLASS,
  primaryButtonClass,
  secondaryButtonClass,
} from '@/lib/ui/styles'

import type { DecorationBlock } from '@/types/seller'
import type { ShopCategorySummaryResponse } from '@generated/model/shopCategorySummaryResponse'

interface CollectionConfigModalProps {
  block: DecorationBlock
  shopId: string
  isOpen: boolean
  onClose: () => void
  onSave: (updated: DecorationBlock) => void
}

const SELECT_CLASS = cn(INPUT_CLASS, 'cursor-pointer dark:bg-[#0a0f1e]')

const CRITERIA: { value: NonNullable<DecorationBlock['collectionType']>; label: string }[] = [
  { value: 'NEW_ARRIVALS', label: 'Hàng mới về, mới đăng trước' },
  { value: 'BEST_SELLER', label: 'Bán chạy, bán nhiều trước' },
  { value: 'SALE_OFF', label: 'Đang giảm giá, giảm sâu trước' },
  { value: 'CUSTOM', label: 'Một danh mục shop chọn' },
]

export default function CollectionConfigModal({
  block,
  shopId,
  isOpen,
  onClose,
  onSave,
}: CollectionConfigModalProps) {
  const [title, setTitle] = useState(block.title)
  const [collectionType, setCollectionType] = useState<DecorationBlock['collectionType']>(
    block.collectionType ?? 'NEW_ARRIVALS',
  )
  const [categoryId, setCategoryId] = useState(block.categoryId ?? '')
  const [itemLimit, setItemLimit] = useState<number>(block.itemLimit ?? 8)
  const [displayStyle, setDisplayStyle] = useState<DecorationBlock['displayStyle']>(
    block.displayStyle ?? 'GRID',
  )
  const [error, setError] = useState('')

  const categoriesQuery = useGetShopCategories(shopId, {
    query: { enabled: shopId !== '' && isOpen },
  })
  let categories: ShopCategorySummaryResponse[] = []
  if (categoriesQuery.data !== undefined && categoriesQuery.data.status === 200) {
    categories = takeData(categoriesQuery.data)
  }

  if (!isOpen) {
    return null
  }

  const handleSave = () => {
    if (title.trim() === '') {
      setError('Nhập tiêu đề để khách biết khối này là gì.')
      return
    }
    if (collectionType === 'CUSTOM' && categoryId === '') {
      setError('Chọn một danh mục cho bộ sưu tập.')
      return
    }
    const updated: DecorationBlock = {
      ...block,
      title: title.trim(),
      collectionType,
      itemLimit,
      displayStyle,
    }
    if (collectionType === 'CUSTOM') {
      updated.categoryId = categoryId
    }
    if (collectionType !== 'CUSTOM') {
      delete updated.categoryId
    }
    onSave(updated)
  }

  return (
    <Modal title="Bộ sưu tập sản phẩm" onClose={onClose} widthClass="max-w-md">
      <div className="mt-4 space-y-4">
        <div>
          <label htmlFor="collectionTitleInput" className={LABEL_CLASS}>
            Tiêu đề
          </label>
          <input
            id="collectionTitleInput"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Hàng mới tuần này"
            className={INPUT_CLASS}
          />
        </div>

        <div>
          <label htmlFor="collectionTypeSelect" className={LABEL_CLASS}>
            Lấy sản phẩm theo
          </label>
          <select
            id="collectionTypeSelect"
            value={collectionType}
            onChange={(e) => setCollectionType(e.target.value as DecorationBlock['collectionType'])}
            className={SELECT_CLASS}
          >
            {CRITERIA.map(function (item) {
              return (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              )
            })}
          </select>
        </div>

        {collectionType === 'CUSTOM' && (
          <div>
            <label htmlFor="collectionCategorySelect" className={LABEL_CLASS}>
              Danh mục
            </label>
            <select
              id="collectionCategorySelect"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="">Chọn danh mục</option>
              {categories.map(function (category) {
                return (
                  <option key={category.id} value={category.id}>
                    {category.name} ({category.productCount ?? 0} sản phẩm)
                  </option>
                )
              })}
            </select>
            {categoriesQuery.isSuccess && categories.length === 0 && (
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                Shop chưa có sản phẩm đang bán nào được gắn danh mục.
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="itemLimitSelect" className={LABEL_CLASS}>
              Số sản phẩm
            </label>
            <select
              id="itemLimitSelect"
              value={itemLimit}
              onChange={(e) => setItemLimit(Number(e.target.value))}
              className={SELECT_CLASS}
            >
              <option value={4}>4</option>
              <option value={8}>8</option>
              <option value={12}>12</option>
              <option value={16}>16</option>
            </select>
          </div>

          <div>
            <label htmlFor="displayStyleSelect" className={LABEL_CLASS}>
              Kiểu hiển thị
            </label>
            <select
              id="displayStyleSelect"
              value={displayStyle}
              onChange={(e) => setDisplayStyle(e.target.value as DecorationBlock['displayStyle'])}
              className={SELECT_CLASS}
            >
              <option value="GRID">Lưới</option>
              <option value="SLIDER">Cuộn ngang</option>
            </select>
          </div>
        </div>

        {error !== '' && (
          <p role="alert" className="text-sm font-semibold text-rose-700 dark:text-rose-300">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-zinc-200/80 pt-3 dark:border-white/10">
          <button type="button" onClick={onClose} className={cn(secondaryButtonClass(), 'text-xs')}>
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSave}
            className={cn(primaryButtonClass(), 'rounded-full px-5 py-2 text-xs font-bold')}
          >
            Lưu khối
          </button>
        </div>
      </div>
    </Modal>
  )
}
