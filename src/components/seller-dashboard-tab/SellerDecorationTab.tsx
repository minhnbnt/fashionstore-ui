import { useState } from 'react'
import { Link } from 'react-router'

import {
  getGetDecorationQueryKey,
  useDiscardDraft,
  useGetDecoration,
  usePublish,
  useSaveDraft,
} from '@generated/endpoints/seller-decoration/seller-decoration'
import { getGetPublishedLayoutQueryKey } from '@generated/endpoints/shops-decoration/shops-decoration'
import {
  ArrowClockwise,
  ArrowDown,
  ArrowSquareOut,
  ArrowUp,
  Broadcast,
  Desktop,
  DeviceMobile,
  DotsSixVertical,
  Eye,
  EyeSlash,
  FloppyDisk,
  Gear,
  Image as ImageIcon,
  Plus,
  SquaresFour,
  Trash,
  VideoCamera,
} from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import Modal from '@/components/Modal'
import ShopDecorationRenderer from '@/components/shop-storefront/ShopDecorationRenderer'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import UserAvatar from '@/components/UserAvatar'
import { formatDateTime } from '@/lib/admin/admin'
import { takeData } from '@/lib/api/apiAdapters'
import { notify } from '@/lib/notifications'
import { reorderBlocks } from '@/lib/seller/decoration'
import { decorationBlocks, decorationDraftJson } from '@/lib/seller/sellerAdapters'
import { useSellerPermissions } from '@/lib/seller/sellerPermissions'
import {
  badgeToneClass,
  cn,
  FOCUS_RING_CLASS,
  INPUT_CLASS,
  LABEL_CLASS,
  PANEL_CLASS,
  primaryButtonClass,
  secondaryButtonClass,
  segmentedItemClass,
  segmentedTrackClass,
} from '@/lib/ui/styles'

import BannerSliderConfigModal from './decoration/BannerSliderConfigModal'
import CollectionConfigModal from './decoration/CollectionConfigModal'
import VideoConfigModal from './decoration/VideoConfigModal'

import type { DecorationBlock } from '@/types/seller'
import type { DecorationResponse } from '@generated/model/decorationResponse'

type ConfigKind = 'SLIDER' | 'COLLECTION' | 'VIDEO'

const ADDABLE_TYPES: { type: DecorationBlock['type']; label: string; hint: string }[] = [
  {
    type: 'BANNER_SLIDER',
    label: 'Banner trình chiếu',
    hint: 'Tối đa 5 ảnh ngang, tự chuyển',
  },
  {
    type: 'BANNER',
    label: 'Banner đơn',
    hint: 'Một ảnh ngang cố định',
  },
  {
    type: 'PRODUCT_COLLECTION',
    label: 'Bộ sưu tập sản phẩm',
    hint: 'Hàng mới, bán chạy, đang giảm giá hoặc theo danh mục',
  },
  {
    type: 'CATEGORY_GRID',
    label: 'Lưới danh mục',
    hint: 'Các danh mục shop đang bán, bấm để lọc',
  },
  {
    type: 'VIDEO',
    label: 'Video',
    hint: 'Một video giới thiệu sản phẩm hoặc shop',
  },
]

function newBlockId(): string {
  return `block-${Date.now()}`
}

function configKindOf(type: DecorationBlock['type']): ConfigKind | null {
  if (type === 'BANNER_SLIDER' || type === 'BANNER') {
    return 'SLIDER'
  }
  if (type === 'PRODUCT_COLLECTION' || type === 'COLLECTION') {
    return 'COLLECTION'
  }
  if (type === 'VIDEO') {
    return 'VIDEO'
  }
  return null
}

function defaultTitleOf(type: DecorationBlock['type']): string {
  const match = ADDABLE_TYPES.find((item) => item.type === type)
  return match?.label ?? 'Khối mới'
}

function collectionSummary(block: DecorationBlock): string {
  const limit = block.itemLimit ?? 8
  let criterion = 'Hàng mới về'
  if (block.collectionType === 'BEST_SELLER') {
    criterion = 'Bán chạy'
  }
  if (block.collectionType === 'SALE_OFF') {
    criterion = 'Đang giảm giá'
  }
  if (block.collectionType === 'CUSTOM') {
    criterion = 'Theo danh mục'
  }
  let style = 'dạng lưới'
  if (block.displayStyle === 'SLIDER') {
    style = 'cuộn ngang'
  }
  return `${criterion}, tối đa ${limit} sản phẩm, ${style}`
}

/** Một dòng mô tả khối bằng ngôn ngữ của seller, kèm cảnh báo nếu khối đang trống. */
function blockSummary(block: DecorationBlock): { text: string; empty: boolean } {
  if (block.type === 'BANNER_SLIDER' || block.type === 'BANNER') {
    const count = (block.banners ?? []).filter((b) => b.imageUrl !== '').length
    if (count === 0) {
      return { text: 'Chưa có ảnh', empty: true }
    }
    return { text: `${count} ảnh`, empty: false }
  }
  if (block.type === 'PRODUCT_COLLECTION' || block.type === 'COLLECTION') {
    if (block.collectionType === 'CUSTOM' && (block.categoryId ?? '') === '') {
      return { text: 'Chưa chọn danh mục', empty: true }
    }
    return { text: collectionSummary(block), empty: false }
  }
  if (block.type === 'CATEGORY_GRID') {
    return { text: 'Tự lấy các danh mục đang bán', empty: false }
  }
  if (block.type === 'VIDEO') {
    if (block.videoUrl === undefined || block.videoUrl === '') {
      return { text: 'Chưa tải video', empty: true }
    }
    return { text: 'Đã có video', empty: false }
  }
  return { text: '', empty: false }
}

function BlockIcon({ type }: { type: DecorationBlock['type'] }) {
  if (type === 'BANNER_SLIDER' || type === 'BANNER') {
    return <ImageIcon size={16} aria-hidden="true" />
  }
  if (type === 'VIDEO') {
    return <VideoCamera size={16} aria-hidden="true" />
  }
  return <SquaresFour size={16} aria-hidden="true" />
}

function PublishStatus({
  decoration,
  hasLocalChanges,
}: {
  decoration: DecorationResponse | undefined
  hasLocalChanges: boolean
}) {
  if (hasLocalChanges) {
    return (
      <span className={cn('rounded-full px-3 py-1 text-xs font-bold', badgeToneClass('warning'))}>
        Có thay đổi chưa lưu
      </span>
    )
  }
  const hasDraft =
    decoration?.draft !== undefined && decoration.draft !== null && decoration.draft !== ''
  if (hasDraft) {
    return (
      <span className={cn('rounded-full px-3 py-1 text-xs font-bold', badgeToneClass('info'))}>
        Bản nháp chưa xuất bản
      </span>
    )
  }
  if (decoration?.publishedAt !== undefined && decoration.publishedAt !== null) {
    return (
      <span className={cn('rounded-full px-3 py-1 text-xs font-bold', badgeToneClass('success'))}>
        Đang hiển thị, xuất bản {formatDateTime(decoration.publishedAt)}
      </span>
    )
  }
  return (
    <span className={cn('rounded-full px-3 py-1 text-xs font-bold', badgeToneClass('neutral'))}>
      Chưa xuất bản, khách đang thấy bố cục mặc định
    </span>
  )
}

interface SellerDecorationTabProps {
  shopId: string
  shopName: string
  shopSlug?: string
}

export function SellerDecorationTab({ shopId, shopName, shopSlug = '' }: SellerDecorationTabProps) {
  const { can } = useSellerPermissions(shopId)
  const canWrite = can('DECORATION_WRITE')
  const queryClient = useQueryClient()
  const [draftBlocks, setDraftBlocks] = useState<DecorationBlock[] | null>(null)
  const [devicePreview, setDevicePreview] = useState<'MOBILE' | 'DESKTOP'>('MOBILE')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newBlockType, setNewBlockType] = useState<DecorationBlock['type']>('BANNER_SLIDER')
  const [newBlockTitle, setNewBlockTitle] = useState('')
  const [isPublishingWithSave, setIsPublishingWithSave] = useState(false)

  const [editingBlock, setEditingBlock] = useState<DecorationBlock | null>(null)
  const [configKind, setConfigKind] = useState<ConfigKind | null>(null)

  const [deleteTargetBlock, setDeleteTargetBlock] = useState<DecorationBlock | null>(null)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)

  const [draggedIdx, setDraggedIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  const decorationQuery = useGetDecoration(shopId, { query: { enabled: shopId !== '' } })

  function invalidateDecoration() {
    void queryClient.invalidateQueries({ queryKey: getGetDecorationQueryKey(shopId) })
    // Trang gian hàng công khai đọc layout qua query khác — làm mới luôn để mở tab là thấy ngay.
    void queryClient.invalidateQueries({ queryKey: getGetPublishedLayoutQueryKey(shopId) })
  }

  const saveDraftMutation = useSaveDraft({
    mutation: {
      onSuccess: function () {
        invalidateDecoration()
      },
      onError: function (err: unknown) {
        notify.fromError(err, undefined, 'Không lưu được bản nháp. Thử lại sau ít phút.')
      },
    },
  })
  const publishMutation = usePublish({
    mutation: {
      onSuccess: function () {
        invalidateDecoration()
        setDraftBlocks(null)
        notify.success('Đã xuất bản', 'Khách vào trang gian hàng sẽ thấy bố cục mới.')
      },
      onError: function (err: unknown) {
        notify.fromError(err, undefined, 'Không xuất bản được giao diện gian hàng.')
      },
    },
  })
  const discardDraftMutation = useDiscardDraft({
    mutation: {
      onSuccess: function () {
        invalidateDecoration()
        setDraftBlocks(null)
        setShowDiscardConfirm(false)
        notify.info('Đã bỏ bản nháp', 'Trình trang trí quay về bố cục đang hiển thị.')
      },
      onError: function (err: unknown) {
        notify.fromError(err, undefined, 'Không bỏ được bản nháp.')
      },
    },
  })

  let decoration: DecorationResponse | undefined
  if (decorationQuery.data !== undefined) {
    decoration = takeData(decorationQuery.data)
  }
  let blocks = decorationBlocks(decoration)
  if (draftBlocks !== null) {
    blocks = draftBlocks
  }
  const hasLocalChanges = draftBlocks !== null
  const hasServerDraft =
    decoration?.draft !== undefined && decoration.draft !== null && decoration.draft !== ''

  function openConfig(block: DecorationBlock) {
    const kind = configKindOf(block.type)
    if (kind === null) {
      return
    }
    setEditingBlock(block)
    setConfigKind(kind)
  }

  function closeConfig() {
    setEditingBlock(null)
    setConfigKind(null)
  }

  const handleToggle = (id: string) => {
    const updated = blocks.map((b) => {
      if (b.id === id) {
        return { ...b, enabled: !b.enabled }
      }
      return b
    })
    setDraftBlocks(updated)
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
    setDraggedIdx(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverIdx !== index) {
      setDragOverIdx(index)
    }
  }

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    const sourceIndex = draggedIdx
    setDraggedIdx(null)
    setDragOverIdx(null)
    if (sourceIndex === null) return
    setDraftBlocks(reorderBlocks(blocks, sourceIndex, targetIndex))
  }

  const handleDragEnd = () => {
    setDraggedIdx(null)
    setDragOverIdx(null)
  }

  const handleConfirmDelete = () => {
    if (deleteTargetBlock === null) {
      return
    }
    setDraftBlocks(blocks.filter((b) => b.id !== deleteTargetBlock.id))
    setDeleteTargetBlock(null)
  }

  const handleAddBlock = () => {
    let title = newBlockTitle.trim()
    if (title === '') {
      title = defaultTitleOf(newBlockType)
    }
    const newBlock: DecorationBlock = {
      id: newBlockId(),
      type: newBlockType,
      title,
      enabled: true,
    }
    if (newBlockType === 'BANNER_SLIDER' || newBlockType === 'BANNER') {
      newBlock.banners = []
    }
    if (newBlockType === 'PRODUCT_COLLECTION') {
      newBlock.collectionType = 'NEW_ARRIVALS'
      newBlock.itemLimit = 8
      newBlock.displayStyle = 'GRID'
    }
    setDraftBlocks([...blocks, newBlock])
    setNewBlockTitle('')
    setIsAddModalOpen(false)
    // Khối cần nội dung (ảnh, video, tiêu chí) thì mở cấu hình luôn, khỏi phải tìm nút bánh răng.
    openConfig(newBlock)
  }

  const handleSaveConfig = (updated: DecorationBlock) => {
    setDraftBlocks(
      blocks.map((b) => {
        if (b.id === updated.id) {
          return updated
        }
        return b
      }),
    )
    closeConfig()
  }

  const handleSaveDraft = () => {
    saveDraftMutation.mutate(
      { shopId, data: { layoutJson: decorationDraftJson(blocks) } },
      {
        onSuccess: function () {
          setDraftBlocks(null)
          notify.success('Đã lưu nháp', 'Khách chưa thấy thay đổi cho tới khi bạn xuất bản.')
        },
      },
    )
  }

  const handlePublish = async () => {
    if (hasLocalChanges) {
      setIsPublishingWithSave(true)
      try {
        await saveDraftMutation.mutateAsync({
          shopId,
          data: { layoutJson: decorationDraftJson(blocks) },
        })
        await publishMutation.mutateAsync({ shopId })
      } catch {
        // Lỗi đã báo qua onError của từng mutation
      } finally {
        setIsPublishingWithSave(false)
      }
      return
    }
    publishMutation.mutate({ shopId })
  }

  const isBusy =
    saveDraftMutation.isPending ||
    publishMutation.isPending ||
    discardDraftMutation.isPending ||
    isPublishingWithSave

  let deleteBlockDescription = 'Xóa khối này khỏi bố cục?'
  if (deleteTargetBlock !== null) {
    deleteBlockDescription = `Xóa khối "${deleteTargetBlock.title}" khỏi bố cục? Thay đổi chỉ áp dụng khi bạn lưu nháp hoặc xuất bản.`
  }

  const canPublish = hasLocalChanges || hasServerDraft
  const iconButton = cn(
    'cursor-pointer rounded-full p-1.5 text-zinc-500 transition-colors hover:bg-zinc-200/70 hover:text-[#17203a] disabled:cursor-not-allowed disabled:opacity-30 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white',
    FOCUS_RING_CLASS,
  )

  const preview = (
    <ShopDecorationRenderer
      blocks={blocks}
      shopId={shopId}
      preview
      onViewAllProducts={function () {
        // Trong khung xem trước không điều hướng
      }}
    />
  )

  return (
    <div className="space-y-6">
      <div
        className={cn(
          PANEL_CLASS,
          'flex flex-col justify-between gap-4 lg:flex-row lg:items-center',
        )}
      >
        <div className="min-w-0">
          <h2 className="sr-only">Trạng thái xuất bản</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Lưu nháp để thử, xuất bản để khách thấy.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <PublishStatus decoration={decoration} hasLocalChanges={hasLocalChanges} />
            {shopSlug !== '' && (
              <Link
                to={`/shops/${shopSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold text-blue-700 hover:underline dark:text-sky-300',
                  FOCUS_RING_CLASS,
                )}
              >
                Xem trang gian hàng
                <ArrowSquareOut size={13} weight="bold" aria-hidden="true" />
              </Link>
            )}
          </div>
        </div>

        {canWrite && (
          <div className="flex flex-wrap items-center gap-2">
            {(hasLocalChanges || hasServerDraft) && (
              <button
                type="button"
                disabled={isBusy}
                onClick={function () {
                  setShowDiscardConfirm(true)
                }}
                className={cn(secondaryButtonClass(), 'px-3.5 py-2 text-xs')}
              >
                <ArrowClockwise size={16} />
                Bỏ bản nháp
              </button>
            )}
            <button
              type="button"
              disabled={isBusy || hasLocalChanges === false}
              onClick={handleSaveDraft}
              className={cn(secondaryButtonClass(), 'px-3.5 py-2 text-xs')}
            >
              <FloppyDisk size={16} />
              Lưu nháp
            </button>
            <button
              type="button"
              disabled={isBusy || canPublish === false}
              onClick={function () {
                void handlePublish()
              }}
              className={cn(
                primaryButtonClass(),
                'flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold shadow-sm disabled:cursor-not-allowed disabled:opacity-50',
              )}
            >
              <Broadcast size={16} />
              Xuất bản
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className={cn(PANEL_CLASS, 'space-y-4 lg:col-span-5')}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#17203a] dark:text-zinc-100">
                Khối trên trang chủ
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Thứ tự từ trên xuống, kéo để đổi chỗ
              </p>
            </div>
            {canWrite && (
              <button
                type="button"
                onClick={function () {
                  setIsAddModalOpen(true)
                }}
                className={cn(secondaryButtonClass(), 'px-3 py-1.5 text-xs')}
              >
                <Plus size={14} weight="bold" />
                Thêm khối
              </button>
            )}
          </div>

          {blocks.length === 0 && (
            <div className="rounded-2xl border border-dashed border-zinc-300 px-4 py-8 text-center dark:border-white/15">
              <p className="text-sm font-semibold text-[#17203a] dark:text-zinc-100">
                Chưa có khối nào
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Khách đang thấy bố cục mặc định: hàng mới, danh mục, bán chạy. Thêm khối để tự sắp
                xếp trang của bạn.
              </p>
            </div>
          )}

          <div className="space-y-2">
            {blocks.map((block, idx) => {
              const summary = blockSummary(block)
              let rowClass =
                'flex items-center justify-between gap-2 rounded-2xl border border-zinc-200/80 bg-zinc-50/70 p-3 transition-colors dark:border-white/10 dark:bg-white/5'
              if (draggedIdx === idx) {
                rowClass = cn(rowClass, 'opacity-50')
              }
              if (dragOverIdx === idx && draggedIdx !== idx) {
                rowClass = cn(
                  rowClass,
                  'border-blue-500 bg-sky-50/70 dark:border-sky-400 dark:bg-sky-500/10',
                )
              }
              if (block.enabled === false) {
                rowClass = cn(rowClass, 'bg-transparent dark:bg-transparent')
              }

              let summaryClass = 'text-zinc-500 dark:text-zinc-400'
              if (summary.empty) {
                summaryClass = 'text-amber-700 dark:text-amber-300'
              }

              return (
                <div
                  key={block.id}
                  draggable={canWrite}
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragLeave={() => setDragOverIdx(null)}
                  onDrop={(e) => handleDrop(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={rowClass}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    {canWrite && (
                      <span
                        className="cursor-grab text-zinc-400 active:cursor-grabbing dark:text-zinc-500"
                        title="Kéo thả để sắp xếp vị trí"
                      >
                        <DotsSixVertical size={16} />
                      </span>
                    )}
                    <span
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-blue-700 ring-1 ring-zinc-200 dark:bg-white/10 dark:text-sky-300 dark:ring-white/10',
                        block.enabled === false && 'text-zinc-400 dark:text-zinc-500',
                      )}
                    >
                      <BlockIcon type={block.type} />
                    </span>
                    <div className="min-w-0">
                      <p
                        className={cn(
                          'truncate text-sm font-semibold text-[#17203a] dark:text-zinc-100',
                          block.enabled === false &&
                            'text-zinc-400 line-through dark:text-zinc-500',
                        )}
                      >
                        {block.title || defaultTitleOf(block.type)}
                      </p>
                      <p className={cn('truncate text-xs', summaryClass)}>
                        {block.enabled === false && 'Đang ẩn. '}
                        {summary.text}
                      </p>
                    </div>
                  </div>

                  {canWrite && (
                    <div className="flex shrink-0 items-center">
                      {configKindOf(block.type) !== null && (
                        <button
                          type="button"
                          aria-label={`Cấu hình ${block.title}`}
                          title="Cấu hình"
                          onClick={() => openConfig(block)}
                          className={iconButton}
                        >
                          <Gear size={15} />
                        </button>
                      )}
                      <button
                        type="button"
                        aria-label={`Di chuyển ${block.title} lên`}
                        title="Lên"
                        onClick={() => setDraftBlocks(reorderBlocks(blocks, idx, idx - 1))}
                        disabled={idx === 0}
                        className={iconButton}
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Di chuyển ${block.title} xuống`}
                        title="Xuống"
                        onClick={() => setDraftBlocks(reorderBlocks(blocks, idx, idx + 1))}
                        disabled={idx === blocks.length - 1}
                        className={iconButton}
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Ẩn hoặc hiện ${block.title}`}
                        aria-pressed={block.enabled === false}
                        title="Ẩn hoặc hiện khối"
                        onClick={() => handleToggle(block.id)}
                        className={iconButton}
                      >
                        {block.enabled && <Eye size={15} />}
                        {!block.enabled && <EyeSlash size={15} />}
                      </button>
                      <button
                        type="button"
                        aria-label={`Xóa khối ${block.title}`}
                        title="Xóa"
                        onClick={() => setDeleteTargetBlock(block)}
                        className={cn(
                          iconButton,
                          'hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/15 dark:hover:text-rose-300',
                        )}
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className={cn(PANEL_CLASS, 'lg:sticky lg:top-24 lg:col-span-7')}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-[#17203a] dark:text-zinc-100">Xem trước</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Dữ liệu thật của shop. Khung nét đứt chỉ bạn thấy.
              </p>
            </div>
            <fieldset className={cn(segmentedTrackClass(), 'm-0 min-w-0 border-0')}>
              <legend className="sr-only">Thiết bị xem trước</legend>
              <button
                type="button"
                aria-pressed={devicePreview === 'MOBILE'}
                onClick={function () {
                  setDevicePreview('MOBILE')
                }}
                className={segmentedItemClass(devicePreview === 'MOBILE')}
              >
                <DeviceMobile size={14} />
                Điện thoại
              </button>
              <button
                type="button"
                aria-pressed={devicePreview === 'DESKTOP'}
                onClick={function () {
                  setDevicePreview('DESKTOP')
                }}
                className={segmentedItemClass(devicePreview === 'DESKTOP')}
              >
                <Desktop size={14} />
                Máy tính
              </button>
            </fieldset>
          </div>

          {devicePreview === 'MOBILE' && (
            <div className="mx-auto w-full max-w-[380px] overflow-hidden rounded-[2.25rem] border-[10px] border-[#17203a] bg-[#f6f9ff] shadow-xl dark:border-white/15 dark:bg-[#0a0f1e]">
              <div className="flex items-center gap-3 border-b border-zinc-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#11182a]">
                <UserAvatar name={shopName} size={36} />
                <p className="min-w-0 truncate text-sm font-bold text-[#17203a] dark:text-zinc-100">
                  {shopName}
                </p>
              </div>
              <div className="max-h-[620px] overflow-y-auto p-3">{preview}</div>
            </div>
          )}

          {devicePreview === 'DESKTOP' && (
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-[#f6f9ff] shadow-md dark:border-white/15 dark:bg-[#0a0f1e]">
              <div className="flex items-center gap-2 border-b border-zinc-200 bg-zinc-100 px-4 py-2 dark:border-white/10 dark:bg-white/5">
                <span className="h-2.5 w-2.5 rounded-full bg-zinc-300 dark:bg-white/20" />
                <span className="h-2.5 w-2.5 rounded-full bg-zinc-300 dark:bg-white/20" />
                <span className="h-2.5 w-2.5 rounded-full bg-zinc-300 dark:bg-white/20" />
                <span className="ml-2 min-w-0 flex-1 truncate rounded-full bg-white px-3 py-0.5 text-[11px] text-zinc-500 dark:bg-[#11182a] dark:text-zinc-400">
                  dhmq.vn/shops/{shopSlug}
                </span>
              </div>
              <div className="max-h-[620px] overflow-y-auto p-4">{preview}</div>
            </div>
          )}
        </div>
      </div>

      {isAddModalOpen && (
        <Modal title="Thêm khối" onClose={() => setIsAddModalOpen(false)} widthClass="max-w-md">
          <fieldset className="mt-4">
            <legend className={LABEL_CLASS}>Loại khối</legend>
            <div className="space-y-2">
              {ADDABLE_TYPES.map(function (item) {
                const checked = newBlockType === item.type
                return (
                  <label
                    key={item.type}
                    aria-label={item.label}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition-colors',
                      checked &&
                        'border-blue-600 bg-sky-50/70 dark:border-sky-400 dark:bg-sky-500/10',
                      checked === false &&
                        'border-zinc-200 hover:border-zinc-300 dark:border-white/10 dark:hover:border-white/20',
                    )}
                  >
                    <input
                      type="radio"
                      name="decorationBlockType"
                      value={item.type}
                      checked={checked}
                      onChange={function () {
                        setNewBlockType(item.type)
                      }}
                      className="mt-1 accent-blue-700"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-[#17203a] dark:text-zinc-100">
                        {item.label}
                      </span>
                      <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                        {item.hint}
                      </span>
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>

          <div className="mt-4">
            <label htmlFor="decorationModuleTitle" className={LABEL_CLASS}>
              Tiêu đề hiển thị
            </label>
            <input
              id="decorationModuleTitle"
              type="text"
              placeholder={defaultTitleOf(newBlockType)}
              value={newBlockTitle}
              onChange={(e) => setNewBlockTitle(e.target.value)}
              className={INPUT_CLASS}
            />
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Để trống sẽ dùng tên loại khối.
            </p>
          </div>

          <div className="mt-5 flex justify-end gap-2 border-t border-zinc-200/80 pt-3 dark:border-white/10">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className={cn(secondaryButtonClass(), 'text-xs')}
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleAddBlock}
              className={cn(primaryButtonClass(), 'rounded-full px-5 py-2 text-xs font-bold')}
            >
              Thêm khối
            </button>
          </div>
        </Modal>
      )}

      {configKind === 'SLIDER' && editingBlock !== null && (
        <BannerSliderConfigModal
          block={editingBlock}
          isOpen
          onClose={closeConfig}
          onSave={handleSaveConfig}
        />
      )}

      {configKind === 'COLLECTION' && editingBlock !== null && (
        <CollectionConfigModal
          block={editingBlock}
          shopId={shopId}
          isOpen
          onClose={closeConfig}
          onSave={handleSaveConfig}
        />
      )}

      {configKind === 'VIDEO' && editingBlock !== null && (
        <VideoConfigModal
          block={editingBlock}
          isOpen
          onClose={closeConfig}
          onSave={handleSaveConfig}
        />
      )}

      <ConfirmDialog
        open={deleteTargetBlock !== null}
        title="Xóa khối?"
        description={deleteBlockDescription}
        confirmLabel="Xóa khối"
        cancelLabel="Giữ lại"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={function () {
          setDeleteTargetBlock(null)
        }}
      />

      <ConfirmDialog
        open={showDiscardConfirm}
        title="Bỏ bản nháp?"
        description="Mọi thay đổi chưa xuất bản sẽ mất, trình trang trí quay về bố cục khách đang thấy."
        confirmLabel="Bỏ bản nháp"
        cancelLabel="Tiếp tục sửa"
        variant="danger"
        isPending={discardDraftMutation.isPending}
        onConfirm={function () {
          if (hasServerDraft) {
            discardDraftMutation.mutate({ shopId })
            return
          }
          setDraftBlocks(null)
          setShowDiscardConfirm(false)
        }}
        onCancel={function () {
          setShowDiscardConfirm(false)
        }}
      />
    </div>
  )
}
