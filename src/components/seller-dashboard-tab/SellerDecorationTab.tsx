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
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:flex-row md:items-center dark:border-zinc-800 dark:bg-zinc-900">
        <div>
          <div className="flex items-center gap-2">
            <PaintBrushBroad size={24} className="text-blue-600" />
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
              Trang Trí Gian Hàng (Store Decoration)
            </h2>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
            Thiết kế bố cục trang chủ shop, kéo-thả sắp xếp banner, flash sale và danh mục nổi bật
            thu hút người mua.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasLocalChanges && (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              Có thay đổi chưa lưu
            </span>
          )}
          {hasLocalChanges && (
            <button
              type="button"
              onClick={handleDiscard}
              className="flex items-center gap-1.5 rounded-2xl border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <ArrowClockwise size={16} />
              Bỏ thay đổi
            </button>
          )}
          <button
            type="button"
            onClick={handleSaveDraft}
            className="flex items-center gap-1.5 rounded-2xl border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <FloppyDisk size={16} />
            Lưu nháp
          </button>
          <button
            type="button"
            onClick={handlePublish}
            className="flex items-center gap-1.5 rounded-2xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            <Broadcast size={16} />
            Áp dụng gian hàng
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {saveSuccessMsg && (
        <div className="flex items-center justify-between rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950/40 dark:text-green-300">
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
        <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-zinc-800">
            <div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white">Bố cục các module trang chủ</h3>
              <span className="text-xs text-gray-500 dark:text-zinc-400">
                {blocks.length} khối nội dung đang cấu hình
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1 rounded-2xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/40 dark:text-sky-300"
            >
              <Plus size={14} />
              Thêm module
            </button>
          </div>

          <div className="space-y-2">
            {blocks.map((block, idx) => (
              <div
                key={block.id}
                className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 p-3 transition-all hover:border-blue-300 hover:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-blue-700"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-400">
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
                        <VideoCamera size={14} className="text-purple-500" />
                      )}
                      <span className="text-xs font-semibold text-gray-800">{block.title}</span>
                    </div>
                    <span className="font-mono text-[10px] tracking-wider text-gray-400 uppercase">
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
                    className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30 disabled:hover:text-gray-400"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    title="Di chuyển xuống"
                    onClick={() => handleMoveDown(idx)}
                    disabled={idx === blocks.length - 1}
                    className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30 disabled:hover:text-gray-400"
                  >
                    <ArrowDown size={14} />
                  </button>

                  {/* Toggle Visibility */}
                  <button
                    type="button"
                    title="Ẩn/Hiện module"
                    onClick={() => handleToggle(block.id)}
                    className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-blue-600 dark:hover:bg-zinc-800"
                  >
                    {block.enabled && <Eye size={15} className="text-emerald-600" />}
                    {!block.enabled && <EyeSlash size={15} className="text-gray-400" />}
                  </button>

                  {/* Delete */}
                  <button
                    type="button"
                    title="Xóa module"
                    onClick={() => handleDelete(block.id)}
                    className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600 dark:hover:bg-zinc-800"
                  >
                    <Trash size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3.5 text-[11px] leading-relaxed text-blue-900 dark:border-blue-800 dark:bg-blue-950/40 dark:text-sky-300">
            💡 <strong>Mẹo gian hàng chuẩn nét Official:</strong> Đặt <em>Banner Khuyến Mãi</em> ở vị trí
            đầu tiên, tiếp theo là <em>Flash Sale Giờ Vàng</em> để tối ưu tỷ lệ chuyển đổi đơn hàng
            lên tới +35%.
          </div>
        </div>

        {/* Right Column: Live Storefront Preview (7 cols) */}
        <div className="flex flex-col items-center rounded-2xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-7 dark:border-zinc-800 dark:bg-zinc-900">
          {/* Preview Controls */}
          <div className="mb-4 flex w-full items-center justify-between border-b border-gray-100 pb-3 dark:border-zinc-800">
            <span className="text-xs font-semibold text-gray-600 dark:text-zinc-400">
              Xem trước trực tiếp (Live Preview)
            </span>
            <div className="flex items-center gap-1 rounded-2xl bg-gray-100 p-1 dark:bg-zinc-800">
              <button
                type="button"
                onClick={() => setDevicePreview('MOBILE')}
                className={`flex items-center gap-1 rounded-xl px-3 py-1 text-xs font-medium transition-all ${
                  devicePreview === 'MOBILE' && 'bg-white text-blue-600 shadow-sm dark:bg-zinc-900'
                } ${devicePreview !== 'MOBILE' && 'text-gray-500 hover:text-gray-800 dark:text-zinc-400 dark:hover:text-white'}`}
              >
                <DeviceMobile size={14} />
                Ứng dụng Mobile
              </button>
              <button
                type="button"
                onClick={() => setDevicePreview('DESKTOP')}
                className={`flex items-center gap-1 rounded-xl px-3 py-1 text-xs font-medium transition-all ${
                  devicePreview === 'DESKTOP' && 'bg-white text-blue-600 shadow-sm dark:bg-zinc-900'
                } ${devicePreview !== 'DESKTOP' && 'text-gray-500 hover:text-gray-800 dark:text-zinc-400 dark:hover:text-white'}`}
              >
                <Desktop size={14} />
                Giao diện Máy tính
              </button>
            </div>
          </div>

          {/* Preview Viewport */}
          {devicePreview === 'MOBILE' && (
            <div className="w-[340px] overflow-hidden rounded-[32px] border-8 border-gray-800 bg-gray-100 shadow-2xl dark:bg-zinc-950">
              {/* Phone Notch / Header */}
              <div className="flex items-center justify-between bg-blue-600 p-3 text-center text-xs font-bold text-white">
                <span>9:41</span>
                <span>NÉT STORE OFFICIAL</span>
                <span className="text-[10px]">100%</span>
              </div>

              {/* Shop Header Bar in phone */}
              <div className="flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 p-3 text-white">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-white/20 text-sm font-bold">
                  nét
                </div>
                <div>
                  <h4 className="text-xs font-bold">nét Official Store</h4>
                  <p className="text-[10px] text-white/80">Online 5 phút trước | 4.9 ⭐</p>
                </div>
              </div>

              {/* Dynamic Blocks Stream */}
              <div className="max-h-[500px] space-y-2 overflow-y-auto p-2">
                {blocks.map((b) => {
                  if (!b.enabled) return null

                  if (b.type === 'BANNER') {
                    return (
                      <div key={b.id} className="relative overflow-hidden rounded-xl shadow-sm">
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
                        className="rounded-xl border border-red-100 bg-white p-2.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
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
                          <div className="rounded-lg bg-gray-50 p-1 text-center dark:bg-zinc-800">
                            <div className="mb-1 h-12 rounded bg-gray-200 dark:bg-zinc-700" />
                            <span className="text-[10px] font-bold text-red-600">189k</span>
                          </div>
                          <div className="rounded-lg bg-gray-50 p-1 text-center dark:bg-zinc-800">
                            <div className="mb-1 h-12 rounded bg-gray-200 dark:bg-zinc-700" />
                            <span className="text-[10px] font-bold text-red-600">349k</span>
                          </div>
                          <div className="rounded-lg bg-gray-50 p-1 text-center dark:bg-zinc-800">
                            <div className="mb-1 h-12 rounded bg-gray-200 dark:bg-zinc-700" />
                            <span className="text-[10px] font-bold text-red-600">450k</span>
                          </div>
                        </div>
                      </div>
                    )
                  }

                  if (b.type === 'COLLECTION') {
                    return (
                      <div key={b.id} className="rounded-xl bg-white p-2.5 shadow-sm dark:bg-zinc-900">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-800 dark:text-white">{b.title}</span>
                          <span className="text-[10px] text-blue-600">Xem tất cả &gt;</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-lg border border-gray-100 p-1.5 dark:border-zinc-800">
                            <div className="mb-1 h-16 rounded bg-gray-200 dark:bg-zinc-700" />
                            <p className="truncate text-[10px] font-medium dark:text-zinc-200">Áo thun Oversize</p>
                            <span className="text-[10px] font-bold text-blue-600">189.000đ</span>
                          </div>
                          <div className="rounded-lg border border-gray-100 p-1.5 dark:border-zinc-800">
                            <div className="mb-1 h-16 rounded bg-gray-200 dark:bg-zinc-700" />
                            <p className="truncate text-[10px] font-medium dark:text-zinc-200">Quần Jeans Baggy</p>
                            <span className="text-[10px] font-bold text-blue-600">349.000đ</span>
                          </div>
                        </div>
                      </div>
                    )
                  }

                  if (b.type === 'VIDEO') {
                    return (
                      <div
                        key={b.id}
                        className="flex items-center justify-center gap-2 rounded-xl bg-gray-900 p-3 text-xs text-white"
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
            <div className="w-full overflow-hidden rounded-2xl border bg-gray-100 shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center gap-2 border-b bg-gray-200 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
                </div>
                <div className="max-w-sm flex-1 truncate rounded-lg bg-white px-3 py-0.5 text-[11px] text-gray-500 dark:bg-zinc-800 dark:text-zinc-300">
                  https://netfashion.vn/shops/net-official
                </div>
              </div>
              <div className="max-h-[500px] space-y-4 overflow-y-auto bg-gray-50 p-4 dark:bg-zinc-900">
                {blocks.map((b) => {
                  if (!b.enabled) return null
                  return (
                    <div
                      key={b.id}
                      className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
                    >
                      <div className="mb-2 flex items-center justify-between border-b pb-2 dark:border-zinc-800">
                        <span className="text-xs font-bold tracking-wider text-gray-700 uppercase dark:text-zinc-300">
                          {b.type}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-zinc-400">{b.title}</span>
                      </div>
                      <div className="flex h-20 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-100 text-xs text-gray-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-500">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900">
            <h3 className="text-base font-bold text-gray-800 dark:text-white">Thêm module trang trí mới</h3>

            <div className="space-y-3">
              <div>
                <label
                  htmlFor="decorationModuleType"
                  className="mb-1 block text-xs font-semibold text-gray-600 dark:text-zinc-300"
                >
                  Loại module
                </label>
                <select
                  id="decorationModuleType"
                  value={newBlockType}
                  onChange={(e) => setNewBlockType(e.target.value as DecorationBlock['type'])}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
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
                  className="mb-1 block text-xs font-semibold text-gray-600 dark:text-zinc-300"
                >
                  Tên tiêu đề module
                </label>
                <input
                  id="decorationModuleTitle"
                  type="text"
                  placeholder="Ví dụ: Top 10 Áo Thun Bán Chạy Nhất Tháng"
                  value={newBlockTitle}
                  onChange={(e) => setNewBlockTitle(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-100 pt-2 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-xl border border-gray-300 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleAddBlock}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Xác nhận thêm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
