import { useState } from 'react'

import { MagnifyingGlass } from '@phosphor-icons/react'

import Modal from '@/components/Modal'

import { CHAT_SEARCH_PILL_CLASS } from './bubble'
import ChatProductCard from './ChatProductCard'

import type { ChatProductItem } from './productItem'

export interface ChatProductPickerModalProps {
  title: string
  products: ChatProductItem[]
  isPending: boolean
  isError?: boolean
  onClose: () => void
  onSelectProduct: (product: { id: string; name: string; slug?: string }) => void
}

/** Modal chọn sản phẩm của shop kèm ô tìm kiếm để chèn nhanh link/card vào cuộc trò chuyện. */
export default function ChatProductPickerModal({
  title,
  products,
  isPending,
  isError = false,
  onClose,
  onSelectProduct,
}: ChatProductPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const normalizedQuery = searchQuery.trim().toLowerCase()
  const filteredProducts = products.filter(function (product) {
    if (normalizedQuery === '') {
      return true
    }
    return (product.name ?? '').toLowerCase().includes(normalizedQuery)
  })

  return (
    <Modal title={title} onClose={onClose} widthClass="max-w-lg">
      <div className="mt-3">
        <div className={CHAT_SEARCH_PILL_CLASS}>
          <MagnifyingGlass size={14} weight="bold" className="shrink-0 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={function (e) {
              setSearchQuery(e.target.value)
            }}
            placeholder="Tìm sản phẩm của shop..."
            className="w-full bg-transparent outline-none placeholder:text-zinc-400 dark:text-white"
          />
        </div>

        <div className="mt-3 max-h-80 space-y-2 overflow-y-auto overscroll-contain pr-1">
          {isPending && (
            <p className="py-6 text-center text-xs text-zinc-400">Đang tải danh sách sản phẩm...</p>
          )}
          {!isPending && isError && (
            <p className="py-6 text-center text-xs font-medium text-rose-600 dark:text-rose-400">
              Không tải được danh sách sản phẩm của shop.
            </p>
          )}
          {!isPending && !isError && filteredProducts.length === 0 && (
            <p className="py-6 text-center text-xs text-zinc-400">
              Không tìm thấy sản phẩm phù hợp.
            </p>
          )}
          {!isPending &&
            !isError &&
            filteredProducts.map(function (prod) {
              return (
                <ChatProductCard
                  key={prod.id ?? prod.slug}
                  product={prod}
                  onSendProduct={onSelectProduct}
                />
              )
            })}
        </div>
      </div>
    </Modal>
  )
}
