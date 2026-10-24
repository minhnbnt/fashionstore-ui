import { useState } from 'react'

import {
  getGetDecorationQueryKey,
  useDiscardDraft,
  useGetDecoration,
  usePublish,
  useSaveDraft,
} from '@generated/endpoints/seller-decoration/seller-decoration'
import {
  PaintBrushBroad,
  DeviceMobile,
  Desktop,
  Plus,
  Trash,
  ArrowUp,
  ArrowDown,
  ArrowClockwise,
  Eye,
  EyeSlash,
  CheckCircle,
  FloppyDisk,
  Broadcast,
  Image as ImageIcon,
  Lightning,
  SquaresFour,
  VideoCamera,
} from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import Modal from '@/components/Modal'
import { takeData } from '@/lib/apiAdapters'
import { decorationBlocks, decorationDraftJson } from '@/lib/sellerAdapters'

import type { DecorationBlock } from '@/types/seller'

// Id block chỉ dùng cho React key — sinh ở module-level để khỏi gọi Date.now trong render
function newBlockId(): string {
  return `block-${Date.now()}`
}

interface SellerDecorationTabProps {
  shopId: string
}

export function SellerDecorationTab({ shopId }: SellerDecorationTabProps) {
  const queryClient = useQueryClient()
  const [draftBlocks, setDraftBlocks] = useState<DecorationBlock[] | null>(null)
  const [devicePreview, setDevicePreview] = useState<'MOBILE' | 'DESKTOP'>('MOBILE')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newBlockType, setNewBlockType] = useState<DecorationBlock['type']>('BANNER')
  const [newBlockTitle, setNewBlockTitle] = useState('')
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('')

  const decorationQuery = useGetDecoration(shopId, { query: { enabled: shopId !== '' } })

  const saveDraftMutation = useSaveDraft({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getGetDecorationQueryKey(shopId) })
        setDraftBlocks(null)
      },
    },
  })
  const publishMutation = usePublish({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getGetDecorationQueryKey(shopId) })
        setDraftBlocks(null)
      },
    },
  })
  const discardDraftMutation = useDiscardDraft({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getGetDecorationQueryKey(shopId) })
        setDraftBlocks(null)
      },
    },
  })

  let serverBlocks: DecorationBlock[] = []
  if (decorationQuery.data !== undefined) {
    serverBlocks = decorationBlocks(takeData(decorationQuery.data))
  }
  let blocks = serverBlocks
  if (draftBlocks !== null) {
    blocks = draftBlocks
  }
  const hasLocalChanges = draftBlocks !== null

  const handleToggle = (id: string) => {
    const updated = blocks.map((b) => {
      if (b.id === id) {
        return { ...b, enabled: !b.enabled }
      }
      return b
    })
    setDraftBlocks(updated)
  }

  const handleMoveUp = (index: number) => {
    if (index === 0) return
    const updated = [...blocks]
    const temp = updated[index - 1]
    const current = updated[index]
    if (temp && current) {
      updated[index - 1] = current
      updated[index] = temp
      setDraftBlocks(updated)
    }
  }

  const handleMoveDown = (index: number) => {
    if (index === blocks.length - 1) return
    const updated = [...blocks]
    const temp = updated[index + 1]
    const current = updated[index]
    if (temp && current) {
      updated[index + 1] = current
      updated[index] = temp
      setDraftBlocks(updated)
    }
  }

  const handleDelete = (id: string) => {
    const updated = blocks.filter((b) => b.id !== id)
    setDraftBlocks(updated)
  }

  const handleAddBlock = () => {
    if (!newBlockTitle.trim()) return
    const newBlock: DecorationBlock = {
      id: newBlockId(),
      type: newBlockType,
      title: newBlockTitle.trim(),
      enabled: true,
    }
    setDraftBlocks([...blocks, newBlock])
    setNewBlockTitle('')
    setIsAddModalOpen(false)
    setSaveSuccessMsg('Đã thêm module trang trí mới vào bố cục!')
  }

  const handleSaveDraft = () => {
    saveDraftMutation.mutate({ shopId, data: { layoutJson: decorationDraftJson(blocks) } })
    setSaveSuccessMsg('Đã gửi lưu bản nháp thiết kế gian hàng!')
  }

  const handlePublish = () => {
    publishMutation.mutate({ shopId })
    setSaveSuccessMsg('Đã gửi xuất bản giao diện lên trang gian hàng chính thức!')
  }

  const handleDiscard = () => {
    discardDraftMutation.mutate({ shopId })
    setSaveSuccessMsg('Đã bỏ các thay đổi chưa lưu, quay lại bản nháp trên hệ thống.')
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Actions */}
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-zinc-200/80 bg-white/80 p-5 shadow-sm md:flex-row md:items-center dark:border-white/10 dark:bg-[#11182a]">
        <div>
          <div className="flex items-center gap-2">
            <PaintBrushBroad size={24} className="text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-xl font-bold text-zinc-800 dark:text-zinc-100">
              Trang Trí Gian Hàng (Store Decoration)
            </h2>
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Thiết kế bố cục trang chủ shop, kéo-thả sắp xếp banner, flash sale và danh mục nổi bật
            thu hút người mua.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasLocalChanges && (
            <span className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">
              Có thay đổi chưa lưu
            </span>
          )}
          {hasLocalChanges && (
            <button
              type="button"
              onClick={handleDiscard}
              className="flex items-center gap-1.5 rounded-full border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-white/15 dark:text-zinc-200 dark:hover:bg-white/10"
            >
              <ArrowClockwise size={16} />
              Bỏ thay đổi
            </button>
          )}
          <button
            type="button"
            onClick={handleSaveDraft}
            className="flex items-center gap-1.5 rounded-full border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-white/15 dark:text-zinc-200 dark:hover:bg-white/10"
          >
            <FloppyDisk size={16} />
            Lưu nháp
          </button>
          <button
            type="button"
            onClick={handlePublish}
            className="btn-primary flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold shadow-sm transition-colors"
          >
            <Broadcast size={16} />
            Áp dụng gian hàng
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {saveSuccessMsg && (
        <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <div className="flex items-center gap-2">
            <CheckCircle size={18} className="text-green-600" />
            <span>{saveSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveSuccessMsg('')}
            className="text-xs font-medium text-green-700 underline hover:text-green-900"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Main Studio Editor: 2 Columns */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* Left Column: Module Manager List (5 cols) */}
        <div className="space-y-4 rounded-3xl border border-zinc-200/80 bg-white/80 p-5 shadow-sm lg:col-span-5 dark:border-white/10 dark:bg-[#11182a]">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-white/10">
            <div>
              <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                Bố cục các module trang chủ
              </h3>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {blocks.length} khối nội dung đang cấu hình
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-100 dark:border-indigo-900/40 dark:bg-indigo-900/40 dark:text-indigo-400"
            >
              <Plus size={14} />
              Thêm module
            </button>
          </div>

          <div className="space-y-2">
            {blocks.map((block, idx) => (
              <div
                key={block.id}
                className="flex items-center justify-between rounded-lg border bg-zinc-50 p-3 transition-all hover:border-indigo-300 hover:bg-white dark:border-white/10 dark:bg-white/5"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-200 text-xs font-bold text-zinc-400 dark:bg-white/10 dark:text-zinc-500">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      {block.type === 'BANNER' && <ImageIcon size={14} className="text-blue-500" />}
                      {block.type === 'FLASH_SALE' && (
                        <Lightning size={14} className="text-amber-500" />
                      )}
                      {block.type === 'COLLECTION' && (
                        <SquaresFour size={14} className="text-emerald-500" />
                      )}
                      {block.type === 'VIDEO' && (
                        <VideoCamera size={14} className="text-indigo-500" />
                      )}
                      <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-100">
                        {block.title}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] tracking-wider text-zinc-400 uppercase dark:text-zinc-500">
                      {block.type}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {/* Reorder Buttons */}
                  <button
                    type="button"
                    title="Di chuyển lên"
                    onClick={() => handleMoveUp(idx)}
                    disabled={idx === 0}
                    className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-30 disabled:hover:text-zinc-400 dark:text-zinc-500 dark:hover:bg-white/10"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    title="Di chuyển xuống"
                    onClick={() => handleMoveDown(idx)}
                    disabled={idx === blocks.length - 1}
                    className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-30 disabled:hover:text-zinc-400 dark:text-zinc-500 dark:hover:bg-white/10"
                  >
                    <ArrowDown size={14} />
                  </button>

                  {/* Toggle Visibility */}
                  <button
                    type="button"
                    title="Ẩn/Hiện module"
                    onClick={() => handleToggle(block.id)}
                    className="rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-indigo-600 dark:text-zinc-400 dark:hover:bg-white/10"
                  >
                    {block.enabled && <Eye size={15} className="text-emerald-600" />}
                    {!block.enabled && (
                      <EyeSlash size={15} className="text-zinc-400 dark:text-zinc-500" />
                    )}
                  </button>

                  {/* Delete */}
                  <button
                    type="button"
                    title="Xóa module"
                    onClick={() => handleDelete(block.id)}
                    className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-red-600 dark:text-zinc-500 dark:hover:bg-white/10"
                  >
                    <Trash size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-800">
            💡 <strong>Mẹo gian hàng chuyên nghiệp:</strong> Đặt <em>Banner Khuyến Mãi</em> ở vị trí
            đầu tiên, tiếp theo là <em>Flash Sale Giờ Vàng</em> để tối ưu tỷ lệ chuyển đổi đơn hàng
            lên tới +35%.
          </div>
        </div>

        {/* Right Column: Live Storefront Preview (7 cols) */}
        <div className="flex flex-col items-center rounded-3xl border border-zinc-200/80 bg-white/80 p-5 shadow-sm lg:col-span-7 dark:border-white/10 dark:bg-[#11182a]">
          {/* Preview Controls */}
          <div className="mb-4 flex w-full items-center justify-between border-b border-zinc-100 pb-3 dark:border-white/10">
            <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Xem trước trực tiếp (Live Preview)
            </span>
            <div className="flex items-center gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-white/10">
              <button
                type="button"
                onClick={() => setDevicePreview('MOBILE')}
                className={`flex items-center gap-1 rounded px-3 py-1 text-xs font-medium transition-all ${
                  devicePreview === 'MOBILE' &&
                  'bg-white text-indigo-600 shadow-sm dark:bg-[#11182a] dark:text-indigo-400'
                } ${devicePreview !== 'MOBILE' && 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400'}`}
              >
                <DeviceMobile size={14} />
                Ứng dụng Mobile
              </button>
              <button
                type="button"
                onClick={() => setDevicePreview('DESKTOP')}
                className={`flex items-center gap-1 rounded px-3 py-1 text-xs font-medium transition-all ${
                  devicePreview === 'DESKTOP' &&
                  'bg-white text-indigo-600 shadow-sm dark:bg-[#11182a] dark:text-indigo-400'
                } ${devicePreview !== 'DESKTOP' && 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400'}`}
              >
                <Desktop size={14} />
                Giao diện Máy tính
              </button>
            </div>
          </div>

          {/* Preview Viewport */}
          {devicePreview === 'MOBILE' && (
            <div className="w-[340px] overflow-hidden rounded-[32px] border-8 border-zinc-800 bg-zinc-100 shadow-2xl dark:bg-white/10">
              {/* Phone Notch / Header */}
              <div className="flex items-center justify-between bg-gradient-to-r from-[#312e81] to-[#1d4ed8] p-3 text-center text-xs font-bold text-white">
                <span>9:41</span>
                <span>FASHION HUB OFFICIAL</span>
                <span className="text-[10px]">100%</span>
              </div>

              {/* Shop Header Bar in phone */}
              <div className="flex items-center gap-3 bg-gradient-to-r from-[#312e81] to-[#1d4ed8] p-3 text-white">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-white/20 text-sm font-bold">
                  FH
                </div>
                <div>
                  <h4 className="text-xs font-bold">FashionHub Boutique</h4>
                  <p className="text-[10px] text-white/80">Online 5 phút trước | 4.9 ⭐</p>
                </div>
              </div>

              {/* Dynamic Blocks Stream */}
              <div className="max-h-[500px] space-y-2 overflow-y-auto p-2">
                {blocks.map((b) => {
                  if (!b.enabled) return null

                  if (b.type === 'BANNER') {
                    return (
                      <div key={b.id} className="relative overflow-hidden rounded shadow-sm">
                        <img
                          src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=500&q=80"
                          alt="Banner"
                          className="h-28 w-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 px-4 text-center text-xs font-bold text-white">
                          {b.title}
                        </div>
                      </div>
                    )
                  }

                  if (b.type === 'FLASH_SALE') {
                    return (
                      <div
                        key={b.id}
                        className="rounded border border-red-100 bg-white p-2.5 shadow-sm dark:bg-white/10"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-1 text-xs font-bold text-red-600">
                            <Lightning size={14} weight="fill" />
                            <span>FLASH SALE</span>
                          </div>
                          <span className="rounded bg-black px-1.5 py-0.5 font-mono text-[9px] font-bold text-white">
                            02 : 14 : 58
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          <div className="rounded bg-zinc-50 p-1 text-center dark:bg-white/5">
                            <div className="mb-1 h-12 rounded bg-zinc-200 dark:bg-white/10" />
                            <span className="text-[10px] font-bold text-red-600">189k</span>
                          </div>
                          <div className="rounded bg-zinc-50 p-1 text-center dark:bg-white/5">
                            <div className="mb-1 h-12 rounded bg-zinc-200 dark:bg-white/10" />
                            <span className="text-[10px] font-bold text-red-600">349k</span>
                          </div>
                          <div className="rounded bg-zinc-50 p-1 text-center dark:bg-white/5">
                            <div className="mb-1 h-12 rounded bg-zinc-200 dark:bg-white/10" />
                            <span className="text-[10px] font-bold text-red-600">450k</span>
                          </div>
                        </div>
                      </div>
                    )
                  }

                  if (b.type === 'COLLECTION') {
                    return (
                      <div key={b.id} className="rounded bg-white p-2.5 shadow-sm dark:bg-white/10">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-bold text-zinc-800 dark:text-zinc-100">
                            {b.title}
                          </span>
                          <span className="text-[10px] text-indigo-600 dark:text-indigo-400">
                            Xem tất cả &gt;
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded border border-zinc-100 p-1.5 dark:border-white/10">
                            <div className="mb-1 h-16 rounded bg-zinc-200 dark:bg-white/10" />
                            <p className="truncate text-[10px] font-medium">Áo thun Oversize</p>
                            <span className="text-[10px] font-bold text-red-500">189.000đ</span>
                          </div>
                          <div className="rounded border border-zinc-100 p-1.5 dark:border-white/10">
                            <div className="mb-1 h-16 rounded bg-zinc-200 dark:bg-white/10" />
                            <p className="truncate text-[10px] font-medium">Quần Jeans Baggy</p>
                            <span className="text-[10px] font-bold text-red-500">349.000đ</span>
                          </div>
                        </div>
                      </div>
                    )
                  }

                  if (b.type === 'VIDEO') {
                    return (
                      <div
                        key={b.id}
                        className="flex items-center justify-center gap-2 rounded bg-zinc-900 p-3 text-xs text-white"
                      >
                        <VideoCamera size={16} />
                        <span>{b.title} (Live Feed)</span>
                      </div>
                    )
                  }

                  return null
                })}
              </div>
            </div>
          )}

          {devicePreview === 'DESKTOP' && (
            <div className="w-full overflow-hidden rounded-lg border bg-zinc-100 shadow-lg dark:bg-white/10">
              <div className="flex items-center gap-2 border-b bg-zinc-200 px-3 py-2 dark:bg-white/10">
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
                </div>
                <div className="max-w-sm flex-1 truncate rounded bg-white px-3 py-0.5 text-[11px] text-zinc-500 dark:bg-[#11182a] dark:text-zinc-400">
                  https://netfashion.vn/fashionhub.boutique
                </div>
              </div>
              <div className="max-h-[500px] space-y-4 overflow-y-auto bg-zinc-50 p-4 dark:bg-white/5">
                {blocks.map((b) => {
                  if (!b.enabled) return null
                  return (
                    <div
                      key={b.id}
                      className="rounded border border-zinc-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#11182a]"
                    >
                      <div className="mb-2 flex items-center justify-between border-b pb-2">
                        <span className="text-xs font-bold tracking-wider text-zinc-700 uppercase dark:text-zinc-200">
                          {b.type}
                        </span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">{b.title}</span>
                      </div>
                      <div className="flex h-20 items-center justify-center rounded border border-dashed border-zinc-300 bg-zinc-100 text-xs text-zinc-400 dark:border-white/15 dark:bg-white/10 dark:text-zinc-500">
                        Mô phỏng hiển thị module {b.title} trên màn hình PC rộng 1200px
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Module Modal */}
      {isAddModalOpen && (
        <Modal
          title="Thêm module trang trí mới"
          onClose={() => setIsAddModalOpen(false)}
          widthClass="max-w-md"
        >
          <div className="space-y-3">
            <div>
              <label
                htmlFor="decorationModuleType"
                className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-300"
              >
                Loại module
              </label>
              <select
                id="decorationModuleType"
                value={newBlockType}
                onChange={(e) => setNewBlockType(e.target.value as DecorationBlock['type'])}
                className="w-full rounded-full border border-zinc-300 px-3 py-2 text-xs focus:border-blue-600 focus:outline-none dark:border-white/15 dark:bg-white/10"
              >
                <option value="BANNER">Banner Khuyến mãi lớn (Carousel / Slider)</option>
                <option value="FLASH_SALE">Đồng hồ Flash Sale & Sản phẩm hot</option>
                <option value="COLLECTION">Danh mục bộ sưu tập nổi bật</option>
                <option value="VIDEO">Video trải nghiệm / Livestream preview</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="decorationModuleTitle"
                className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-300"
              >
                Tên tiêu đề module
              </label>
              <input
                id="decorationModuleTitle"
                type="text"
                placeholder="Ví dụ: Top 10 Áo Thun Bán Chạy Nhất Tháng"
                value={newBlockTitle}
                onChange={(e) => setNewBlockTitle(e.target.value)}
                className="w-full rounded-full border border-zinc-300 px-3 py-2 text-xs focus:border-blue-600 focus:outline-none dark:border-white/15 dark:bg-white/10"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-zinc-100 pt-2 dark:border-white/10">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="rounded-full border border-zinc-300 px-4 py-2 text-xs text-zinc-600 hover:bg-zinc-50 dark:border-white/15 dark:text-zinc-300 dark:hover:bg-white/10"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={handleAddBlock}
              className="btn-primary rounded-full px-4 py-2 text-xs font-semibold"
            >
              Xác nhận thêm
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
