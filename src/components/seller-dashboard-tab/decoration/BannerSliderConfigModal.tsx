import { useState } from 'react'

import { ArrowDown, ArrowUp, Plus, Trash } from '@phosphor-icons/react'

import ImageUploadField from '@/components/admin/ImageUploadField'
import Modal from '@/components/Modal'

import type { BannerSlideItem, DecorationBlock } from '@/types/seller'

interface BannerSliderConfigModalProps {
  block: DecorationBlock
  isOpen: boolean
  onClose: () => void
  onSave: (updated: DecorationBlock) => void
}

export default function BannerSliderConfigModal({
  block,
  isOpen,
  onClose,
  onSave,
}: BannerSliderConfigModalProps) {
  const [title, setTitle] = useState(block.title)
  const [banners, setBanners] = useState<BannerSlideItem[]>(block.banners ?? [])

  if (!isOpen) {
    return null
  }

  const handleAddBanner = () => {
    if (banners.length >= 5) {
      return
    }
    const newSlide: BannerSlideItem = {
      id: `slide-${Date.now()}`,
      imageKey: '',
      title: '',
      linkUrl: '',
    }
    setBanners([...banners, newSlide])
  }

  const handleUpdateSlide = (id: string, patch: Partial<BannerSlideItem>) => {
    setBanners(banners.map((b) => (b.id === id ? { ...b, ...patch } : b)))
  }

  const handleDeleteSlide = (id: string) => {
    setBanners(banners.filter((b) => b.id !== id))
  }

  const handleMoveSlide = (index: number, direction: 'UP' | 'DOWN') => {
    const targetIndex = direction === 'UP' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= banners.length) {
      return
    }
    const updated = [...banners]
    const temp = updated[targetIndex]
    const current = updated[index]
    if (temp && current) {
      updated[targetIndex] = current
      updated[index] = temp
      setBanners(updated)
    }
  }

  const handleSave = () => {
    onSave({
      ...block,
      title,
      banners,
    })
    onClose()
  }

  const isMaxReached = banners.length >= 5

  return (
    <Modal
      title="Cấu hình Banner Slider (Tối đa 5 banner)"
      onClose={onClose}
      widthClass="max-w-2xl"
    >
      <div className="space-y-4">
        <div>
          <label
            htmlFor="sliderBlockTitle"
            className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-200"
          >
            Tên khối module
          </label>
          <input
            id="sliderBlockTitle"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-full border border-zinc-300 px-3 py-2 text-xs focus:border-blue-600 focus:outline-none dark:border-white/15 dark:bg-white/10"
            placeholder="Ví dụ: Banner Quảng Cáo Đầu Trang"
          />
        </div>

        <div className="flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-white/10">
          <div>
            <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-100">
              Danh sách ảnh Banner Slider ({banners.length}/5)
            </h4>
            <p className="text-[11px] text-zinc-400">
              Ảnh hiển thị dạng trình chiếu xoay vòng tự động trên trang chủ gian hàng.
            </p>
          </div>
          <button
            type="button"
            disabled={isMaxReached}
            onClick={handleAddBanner}
            className="btn-primary flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={14} />
            Thêm banner
          </button>
        </div>

        {isMaxReached && (
          <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-700 dark:bg-amber-950/20 dark:text-amber-300">
            Đã đạt số lượng tối đa 5 banner quảng cáo theo quy định của sàn.
          </p>
        )}

        {banners.length === 0 && (
          <div className="rounded-2xl border border-dashed border-zinc-200 p-6 text-center text-xs text-zinc-400 dark:border-white/10">
            Chưa có banner nào. Nhấn &ldquo;Thêm banner&rdquo; để tải ảnh lên.
          </div>
        )}

        <div className="max-h-[380px] space-y-4 overflow-y-auto pr-1">
          {banners.map((slide, index) => {
            const isFirst = index === 0
            const isLast = index === banners.length - 1

            return (
              <div
                key={slide.id}
                className="relative rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-4 dark:border-white/10 dark:bg-white/5"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                    Banner #{index + 1}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={() => handleMoveSlide(index, 'UP')}
                      title="Di chuyển lên"
                      className="rounded p-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 disabled:opacity-30 dark:hover:bg-white/10"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={isLast}
                      onClick={() => handleMoveSlide(index, 'DOWN')}
                      title="Di chuyển xuống"
                      className="rounded p-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 disabled:opacity-30 dark:hover:bg-white/10"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSlide(slide.id)}
                      title="Xóa banner"
                      className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <ImageUploadField
                    label="Tải ảnh banner lên"
                    hint="Tỉ lệ 3:1 (1200x400px), định dạng JPG, PNG, WEBP."
                    aspectClass="aspect-[3/1] max-w-full"
                    value={slide.imageKey}
                    onChange={(key) => handleUpdateSlide(slide.id, { imageKey: key })}
                  />

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div>
                      <label
                        htmlFor={`slide-title-${slide.id}`}
                        className="mb-1 block text-[11px] font-medium text-zinc-600 dark:text-zinc-300"
                      >
                        Tiêu đề / Chú thích (Tùy chọn)
                      </label>
                      <input
                        id={`slide-title-${slide.id}`}
                        type="text"
                        value={slide.title || ''}
                        onChange={(e) => handleUpdateSlide(slide.id, { title: e.target.value })}
                        placeholder="Bộ sưu tập Thu Đông..."
                        className="w-full rounded-full border border-zinc-300 px-3 py-1.5 text-xs focus:border-blue-600 focus:outline-none dark:border-white/15 dark:bg-white/10"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor={`slide-link-${slide.id}`}
                        className="mb-1 block text-[11px] font-medium text-zinc-600 dark:text-zinc-300"
                      >
                        Link điều hướng (Tùy chọn)
                      </label>
                      <input
                        id={`slide-link-${slide.id}`}
                        type="text"
                        value={slide.linkUrl || ''}
                        onChange={(e) => handleUpdateSlide(slide.id, { linkUrl: e.target.value })}
                        placeholder="/search?category=ao-khoac..."
                        className="w-full rounded-full border border-zinc-300 px-3 py-1.5 text-xs focus:border-blue-600 focus:outline-none dark:border-white/15 dark:bg-white/10"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex justify-end gap-2 border-t border-zinc-100 pt-3 dark:border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 dark:border-white/15 dark:text-zinc-300 dark:hover:bg-white/10"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="btn-primary rounded-full px-5 py-2 text-xs font-semibold shadow-sm"
          >
            Lưu cấu hình Slider
          </button>
        </div>
      </div>
    </Modal>
  )
}
