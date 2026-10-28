import { useState } from 'react'

import Modal from '@/components/Modal'

import type { DecorationBlock } from '@/types/seller'

interface CollectionConfigModalProps {
  block: DecorationBlock
  isOpen: boolean
  onClose: () => void
  onSave: (updated: DecorationBlock) => void
}

export default function CollectionConfigModal({
  block,
  isOpen,
  onClose,
  onSave,
}: CollectionConfigModalProps) {
  const [title, setTitle] = useState(block.title)
  const [collectionType, setCollectionType] = useState<DecorationBlock['collectionType']>(
    block.collectionType ?? 'NEW_ARRIVALS',
  )
  const [itemLimit, setItemLimit] = useState<number>(block.itemLimit ?? 8)
  const [displayStyle, setDisplayStyle] = useState<DecorationBlock['displayStyle']>(
    block.displayStyle ?? 'GRID',
  )

  if (!isOpen) {
    return null
  }

  const handleSave = () => {
    onSave({
      ...block,
      title,
      collectionType,
      itemLimit,
      displayStyle,
    })
    onClose()
  }

  return (
    <Modal title="Cấu hình Bộ sưu tập nổi bật" onClose={onClose} widthClass="max-w-md">
      <div className="space-y-4">
        <div>
          <label
            htmlFor="collectionTitleInput"
            className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-200"
          >
            Tiêu đề bộ sưu tập *
          </label>
          <input
            id="collectionTitleInput"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ví dụ: Hàng Mới Về Tuần Này, Best Seller..."
            className="w-full rounded-full border border-zinc-300 px-3 py-2 text-xs focus:border-blue-600 focus:outline-none dark:border-white/15 dark:bg-white/10"
          />
        </div>

        <div>
          <label
            htmlFor="collectionTypeSelect"
            className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-200"
          >
            Tiêu chí lọc sản phẩm
          </label>
          <select
            id="collectionTypeSelect"
            value={collectionType}
            onChange={(e) => setCollectionType(e.target.value as DecorationBlock['collectionType'])}
            className="w-full rounded-full border border-zinc-300 px-3 py-2 text-xs focus:border-blue-600 focus:outline-none dark:border-white/15 dark:bg-white/10"
          >
            <option value="NEW_ARRIVALS">
              Hàng mới về (New Arrivals - Sắp xếp theo ngày tạo mới nhất)
            </option>
            <option value="BEST_SELLER">
              Bán chạy nhất (Best Seller - Ưu tiên sản phẩm có lượng bán cao)
            </option>
            <option value="SALE_OFF">
              Khuyến mãi giảm giá sâu (Sale Off - Sản phẩm có % giảm giá tốt nhất)
            </option>
            <option value="CUSTOM">Bộ sưu tập nổi bật do shop tuyển chọn</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="itemLimitSelect"
              className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-200"
            >
              Số sản phẩm tối đa
            </label>
            <select
              id="itemLimitSelect"
              value={itemLimit}
              onChange={(e) => setItemLimit(Number(e.target.value))}
              className="w-full rounded-full border border-zinc-300 px-3 py-2 text-xs focus:border-blue-600 focus:outline-none dark:border-white/15 dark:bg-white/10"
            >
              <option value={4}>4 sản phẩm</option>
              <option value={8}>8 sản phẩm</option>
              <option value={12}>12 sản phẩm</option>
              <option value={16}>16 sản phẩm</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="displayStyleSelect"
              className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-200"
            >
              Kiểu hiển thị
            </label>
            <select
              id="displayStyleSelect"
              value={displayStyle}
              onChange={(e) => setDisplayStyle(e.target.value as DecorationBlock['displayStyle'])}
              className="w-full rounded-full border border-zinc-300 px-3 py-2 text-xs focus:border-blue-600 focus:outline-none dark:border-white/15 dark:bg-white/10"
            >
              <option value="GRID">Lưới sản phẩm (Grid)</option>
              <option value="SLIDER">Băng chuyền cuộn ngang (Slider)</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-zinc-100 pt-3 dark:border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 dark:border-white/15 dark:text-zinc-300 dark:hover:bg-white/10"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="btn-primary rounded-full px-5 py-2 text-xs font-semibold shadow-sm"
          >
            Lưu bộ sưu tập
          </button>
        </div>
      </div>
    </Modal>
  )
}
