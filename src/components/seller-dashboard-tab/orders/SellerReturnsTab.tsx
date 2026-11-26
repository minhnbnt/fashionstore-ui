import { useState } from 'react'
import { useSearchParams } from 'react-router'

import { useList5 } from '@generated/endpoints/seller-orders/seller-orders'
import {
  getList4QueryKey,
  useApprove,
  useComplete,
  useList4,
  useReject,
} from '@generated/endpoints/seller-returns/seller-returns'
import { ArrowUUpLeft, CheckCircle } from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import Modal from '@/components/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import StatusBadge from '@/components/ui/StatusBadge'
import { PLACEHOLDER_IMAGE, takeData } from '@/lib/api/apiAdapters'
import { formatNumberWithDots, formatVnd, parseNumberFromDots } from '@/lib/format'
import { notify } from '@/lib/notifications'
import { orderStatusMeta } from '@/lib/order/orderStatus'
import { returnItem } from '@/lib/seller/sellerAdapters'
import { useSellerPermissions } from '@/lib/seller/sellerPermissions'
import { sellerStatusMeta } from '@/lib/seller/sellerStatus'
import {
  cn,
  dangerButtonClass,
  INPUT_CLASS,
  PANEL_CLASS,
  primaryButtonClass,
  secondaryButtonClass,
  successButtonClass,
  TEXTAREA_CLASS,
} from '@/lib/ui/styles'

import type { ReturnItem } from '@/types/seller'
import type { OrderResponse } from '@generated/model/orderResponse'

function handleImageError(event: React.SyntheticEvent<HTMLImageElement>) {
  const target = event.currentTarget
  if (target.src !== PLACEHOLDER_IMAGE) {
    target.src = PLACEHOLDER_IMAGE
  }
}

interface Props {
  shopId: string
  shopPickupAddress?: string
}

export default function SellerReturnsTab({ shopId, shopPickupAddress = '' }: Props) {
  const { can } = useSellerPermissions(shopId)
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  const statusParam = searchParams.get('status')
  const orderIdFilter = searchParams.get('orderId') ?? ''
  let activeTab: 'ALL' | 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'COMPLETED' = 'ALL'
  if (
    statusParam === 'REQUESTED' ||
    statusParam === 'APPROVED' ||
    statusParam === 'REJECTED' ||
    statusParam === 'COMPLETED'
  ) {
    activeTab = statusParam
  }

  const [approveTarget, setApproveTarget] = useState<ReturnItem | null>(null)
  const [rejectTarget, setRejectTarget] = useState<ReturnItem | null>(null)
  const [completeTarget, setCompleteTarget] = useState<ReturnItem | null>(null)
  const [resolution, setResolution] = useState('REFUND')
  const [refundAmount, setRefundAmount] = useState(0)
  const [returnAddress, setReturnAddress] = useState(shopPickupAddress)
  const [rejectNote, setRejectNote] = useState('')

  const returnsQuery = useList4({ shopId }, { query: { enabled: shopId !== '' } })
  const ordersQuery = useList5({ shopId }, { query: { enabled: shopId !== '' } })

  const approveMutation = useApprove({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getList4QueryKey() })
        notify.success('Đã phê duyệt yêu cầu đổi trả và gửi địa chỉ kho nhận hàng cho khách!')
      },
      onError: function (err: unknown) {
        notify.fromError(err, undefined, 'Không thể phê duyệt yêu cầu đổi trả.')
      },
    },
  })
  const rejectMutation = useReject({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getList4QueryKey() })
        notify.success('Đã từ chối yêu cầu đổi trả kèm lý do!')
      },
      onError: function (err: unknown) {
        notify.fromError(err, undefined, 'Không thể từ chối yêu cầu đổi trả.')
      },
    },
  })
  const completeMutation = useComplete({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getList4QueryKey() })
        setCompleteTarget(null)
        notify.success('Đã xác nhận nhận lại hàng và tự động cập nhật tồn kho!')
      },
      onError: function (err: unknown) {
        notify.fromError(err, undefined, 'Không thể xác nhận nhận lại hàng.')
      },
    },
  })

  const orderById = new Map<string, OrderResponse>()
  if (ordersQuery.data !== undefined) {
    for (const o of takeData(ordersQuery.data)) {
      orderById.set(o.id ?? '', o)
    }
  }

  let returns: ReturnItem[] = []
  if (returnsQuery.data !== undefined) {
    returns = takeData(returnsQuery.data).map(function (r) {
      return returnItem(r, orderById)
    })
  }

  function handleOpenApproveModal(ret: ReturnItem) {
    const matchedOrder = orderById.get(ret.orderId)
    let initialRefund = 0
    if (ret.refundAmount !== undefined && ret.refundAmount !== null && ret.refundAmount > 0) {
      initialRefund = ret.refundAmount
    } else if (matchedOrder !== undefined) {
      initialRefund = matchedOrder.total ?? matchedOrder.subtotal ?? 0
    }

    let initialResolution = 'REFUND'
    if (
      ret.resolution === 'REFUND' ||
      ret.resolution === 'EXCHANGE' ||
      ret.resolution === 'PARTIAL_REFUND'
    ) {
      initialResolution = ret.resolution
    }

    setResolution(initialResolution)
    setRefundAmount(initialRefund)
    setReturnAddress(shopPickupAddress)
    setApproveTarget(ret)
  }

  function handleOpenRejectModal(ret: ReturnItem) {
    setRejectNote('')
    setRejectTarget(ret)
  }

  function handleApproveReturn(
    returnId: string,
    nextResolution: string,
    nextRefundAmount: number,
    nextReturnAddress: string,
  ) {
    let sellerNote = ''
    if (nextReturnAddress.trim() !== '') {
      sellerNote = 'Địa chỉ nhận lại: ' + nextReturnAddress.trim()
    }
    approveMutation.mutate({
      id: returnId,
      data: {
        resolution: nextResolution,
        refundAmount: nextRefundAmount,
        sellerNote,
      },
    })
  }

  function handleRejectReturn(returnId: string, sellerNote: string) {
    rejectMutation.mutate({ id: returnId, data: { sellerNote } })
  }

  function handleCompleteReturn(returnId: string) {
    completeMutation.mutate({ id: returnId })
  }

  function handleConfirmApprove() {
    if (approveTarget === null) {
      return
    }
    if (refundAmount < 0) {
      notify.warning('Số tiền hoàn không được âm.')
      return
    }
    if (returnAddress.trim() === '') {
      notify.warning('Vui lòng nhập địa chỉ kho nhận hàng hoàn.')
      return
    }
    handleApproveReturn(approveTarget.id, resolution, refundAmount, returnAddress)
    setApproveTarget(null)
  }

  function handleConfirmReject() {
    if (rejectTarget === null) {
      return
    }
    if (rejectNote.trim() === '') {
      notify.warning('Vui lòng nhập lý do từ chối gửi cho khách hàng.')
      return
    }
    handleRejectReturn(rejectTarget.id, rejectNote.trim())
    setRejectTarget(null)
  }

  const filteredReturns = returns.filter(function (r) {
    if (orderIdFilter !== '' && r.orderId !== orderIdFilter) {
      return false
    }
    if (activeTab !== 'ALL' && r.status !== activeTab) {
      return false
    }
    return true
  })

  let completeConfirmDesc = 'Xác nhận shop đã kiểm tra và nhận lại hàng hoàn từ khách hàng?'
  if (completeTarget !== null) {
    completeConfirmDesc = `Xác nhận đã nhận lại hàng hoàn của đơn #${completeTarget.orderCode}? Hệ thống sẽ hoàn tất quy trình đổi trả và cập nhật lại tồn kho.`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-[#17203a] dark:text-white">
          Xử lý Đổi / Trả hàng & Hoàn tiền
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Tiếp nhận khiếu nại, xem ảnh chứng từ của khách và đưa ra phương án giải quyết
        </p>
      </div>

      {/* Filter Tabs */}
      <div className={PANEL_CLASS}>
        {orderIdFilter !== '' && (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-sky-200 bg-sky-50/70 px-3.5 py-2 text-xs font-semibold text-sky-900 dark:border-sky-500/30 dark:bg-sky-500/15 dark:text-sky-200">
            <span>Đang lọc yêu cầu đổi trả của một đơn hàng cụ thể</span>
            <button
              type="button"
              onClick={function () {
                setSearchParams(function (prev) {
                  const next = new URLSearchParams(prev)
                  next.delete('orderId')
                  return next
                })
              }}
              className="cursor-pointer rounded-full bg-white px-3 py-1 text-[11px] font-bold text-blue-700 shadow-xs hover:bg-sky-50 dark:bg-white/10 dark:text-white"
            >
              Xem tất cả
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-1.5 border-b border-zinc-200/80 pb-3 dark:border-white/10">
          {[
            { id: 'ALL', label: 'Tất cả' },
            { id: 'REQUESTED', label: 'Chờ xử lý' },
            { id: 'APPROVED', label: 'Đã duyệt' },
            { id: 'COMPLETED', label: 'Hoàn tất' },
            { id: 'REJECTED', label: 'Đã từ chối' },
          ].map(function (tab) {
            const isCurrent = activeTab === tab.id
            let tabClass =
              'cursor-pointer rounded-full px-4 py-2 text-xs font-bold transition text-zinc-600 hover:bg-zinc-100 hover:text-[#17203a] dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-white'
            if (isCurrent) {
              tabClass =
                'btn-primary cursor-pointer rounded-full px-4 py-2 text-xs font-bold transition'
            }
            return (
              <button
                key={tab.id}
                type="button"
                onClick={function () {
                  const nextTab = tab.id as
                    | 'ALL'
                    | 'REQUESTED'
                    | 'APPROVED'
                    | 'COMPLETED'
                    | 'REJECTED'
                  setSearchParams(function (prev) {
                    const next = new URLSearchParams(prev)
                    if (nextTab === 'ALL') {
                      next.delete('status')
                    } else {
                      next.set('status', nextTab)
                    }
                    return next
                  })
                }}
                className={tabClass}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Danh sách yêu cầu */}
        <div className="mt-5 space-y-4">
          {filteredReturns.map(function (ret) {
            return (
              <div
                key={ret.id}
                className="rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-4 transition hover:border-zinc-300 dark:border-white/10 dark:bg-white/5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200/70 pb-3 dark:border-white/10">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#17203a] dark:text-white">
                      Mã đơn: {ret.orderCode}
                    </span>
                    {ret.orderStatus !== '' && (
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${orderStatusMeta(ret.orderStatus).className}`}
                      >
                        {orderStatusMeta(ret.orderStatus).label}
                      </span>
                    )}
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      • Người mua: {ret.buyerName}
                    </span>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      • {ret.createdAt}
                    </span>
                  </div>
                  <div>
                    <StatusBadge status={ret.status} meta={sellerStatusMeta} />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 py-3 sm:grid-cols-4">
                  <div className="space-y-2 text-xs sm:col-span-3">
                    <div>
                      <span className="font-bold text-zinc-700 dark:text-zinc-300">
                        Lý do khiếu nại:{' '}
                      </span>
                      <span className="font-semibold text-rose-600 dark:text-rose-400">
                        {ret.reason}
                      </span>
                    </div>
                    <div>
                      <span className="font-bold text-zinc-700 dark:text-zinc-300">
                        Mô tả của khách:{' '}
                      </span>
                      <span className="leading-relaxed text-zinc-600 dark:text-zinc-400">
                        {ret.description}
                      </span>
                    </div>
                    {ret.resolution !== undefined && ret.resolution !== '' && (
                      <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-2.5 text-sky-900 dark:border-sky-500/30 dark:bg-sky-500/15 dark:text-sky-200">
                        <p className="font-bold">Phương án đã phê duyệt: {ret.resolution}</p>
                        {ret.refundAmount !== undefined && ret.refundAmount !== null && (
                          <p className="mt-0.5">Số tiền hoàn: {formatVnd(ret.refundAmount)}</p>
                        )}
                      </div>
                    )}
                    {ret.sellerNote !== undefined && ret.sellerNote !== '' && (
                      <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-2.5 text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-200">
                        <p className="font-bold">Ghi chú từ shop: {ret.sellerNote}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-start gap-2 sm:items-end">
                    <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                      Chứng từ đổi trả:
                    </span>
                    {ret.evidenceImages.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {ret.evidenceImages.map(function (src, idx) {
                          const isVideo = /\.(mp4|webm|mov|m4v)(\?|$)/i.test(src)
                          if (isVideo) {
                            return (
                              <video
                                key={`${ret.id}-vid-${idx}`}
                                controls
                                src={src}
                                className="h-24 w-36 rounded-2xl border border-zinc-200 bg-black object-cover shadow-sm dark:border-white/10"
                              >
                                <track kind="captions" />
                              </video>
                            )
                          }
                          return (
                            <img
                              key={`${ret.id}-img-${idx}`}
                              src={src}
                              alt={`Chứng từ ${idx + 1}`}
                              onError={handleImageError}
                              className="h-20 w-20 rounded-2xl border border-zinc-200 object-cover shadow-sm dark:border-white/10"
                            />
                          )
                        })}
                      </div>
                    )}
                    {ret.evidenceImages.length === 0 && (
                      <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-dashed border-zinc-300 text-center text-[10px] text-zinc-400 dark:border-white/15">
                        Không có chứng từ
                      </div>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-200/70 pt-3 dark:border-white/10">
                  {ret.status === 'REQUESTED' && can('RETURN_PROCESS') && (
                    <button
                      type="button"
                      onClick={function () {
                        handleOpenRejectModal(ret)
                      }}
                      className="cursor-pointer rounded-full border border-rose-200 px-4 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/15"
                    >
                      Từ chối yêu cầu
                    </button>
                  )}
                  {ret.status === 'REQUESTED' && can('RETURN_PROCESS') && (
                    <button
                      type="button"
                      onClick={function () {
                        handleOpenApproveModal(ret)
                      }}
                      className={cn(
                        primaryButtonClass(),
                        'rounded-full px-4 py-1.5 text-xs font-bold shadow-sm',
                      )}
                    >
                      Phê duyệt phương án
                    </button>
                  )}
                  {ret.status === 'APPROVED' && can('RETURN_PROCESS') && (
                    <button
                      type="button"
                      onClick={function () {
                        setCompleteTarget(ret)
                      }}
                      className={cn(successButtonClass(), 'px-4 py-1.5 text-xs')}
                    >
                      <CheckCircle size={14} weight="bold" />
                      Xác nhận đã nhận hàng hoàn
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          {filteredReturns.length === 0 && (
            <EmptyState
              icon={<ArrowUUpLeft size={26} weight="bold" />}
              title="Không có yêu cầu đổi/trả hàng nào"
              description="Các yêu cầu khiếu nại và hoàn tiền từ người mua phù hợp với bộ lọc sẽ hiển thị tại đây."
            />
          )}
        </div>
      </div>

      {/* Modal Phê duyệt */}
      {approveTarget !== null && (
        <Modal
          title={`Phê duyệt yêu cầu đổi trả — #${approveTarget.orderCode}`}
          onClose={function () {
            setApproveTarget(null)
          }}
          widthClass="max-w-md"
        >
          <div className="mt-4 space-y-4 text-xs">
            <div>
              <label
                htmlFor="returnResolutionSelect"
                className="block font-semibold text-zinc-700 dark:text-zinc-300"
              >
                Phương án giải quyết
              </label>
              <select
                id="returnResolutionSelect"
                value={resolution}
                onChange={function (e) {
                  setResolution(e.target.value)
                }}
                className="mt-1.5 w-full rounded-full border border-zinc-300 bg-white/85 px-4 py-2.5 text-xs outline-none focus:border-blue-600 dark:border-white/15 dark:bg-[#0a0f1e] dark:text-white"
              >
                <option value="REFUND">Hoàn tiền 100% khi nhận lại hàng</option>
                <option value="EXCHANGE">Đổi sản phẩm mới cho khách</option>
                <option value="PARTIAL_REFUND">Hoàn tiền một phần (khách giữ hàng)</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="returnRefundAmountInput"
                className="block font-semibold text-zinc-700 dark:text-zinc-300"
              >
                Số tiền hoàn (VND)
              </label>
              <input
                id="returnRefundAmountInput"
                type="text"
                inputMode="numeric"
                value={formatNumberWithDots(refundAmount)}
                onChange={function (e) {
                  setRefundAmount(parseNumberFromDots(e.target.value) ?? 0)
                }}
                placeholder="Nhập số tiền hoàn theo giá trị đơn hàng"
                className={cn(INPUT_CLASS, 'mt-1.5 text-xs font-bold tabular-nums')}
              />
            </div>

            <div>
              <label
                htmlFor="returnWarehouseAddress"
                className="block font-semibold text-zinc-700 dark:text-zinc-300"
              >
                Địa chỉ kho nhận hàng gửi về
              </label>
              <textarea
                id="returnWarehouseAddress"
                rows={2}
                value={returnAddress}
                onChange={function (e) {
                  setReturnAddress(e.target.value)
                }}
                placeholder="Nhập địa chỉ kho nhận hàng hoàn của shop..."
                className={cn(TEXTAREA_CLASS, 'mt-1.5 text-xs')}
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={function () {
                setApproveTarget(null)
              }}
              className={cn(secondaryButtonClass(), 'text-xs')}
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={approveMutation.isPending}
              onClick={handleConfirmApprove}
              className={cn(
                primaryButtonClass(),
                'rounded-full px-5 py-2 text-xs font-bold disabled:opacity-50',
              )}
            >
              Xác nhận phê duyệt
            </button>
          </div>
        </Modal>
      )}

      {/* Modal Từ chối */}
      {rejectTarget !== null && (
        <Modal
          title={`Từ chối yêu cầu đổi trả — #${rejectTarget.orderCode}`}
          onClose={function () {
            setRejectTarget(null)
          }}
          widthClass="max-w-md"
        >
          <div className="mt-4 text-xs">
            <label
              htmlFor="rejectNoteContent"
              className="block font-semibold text-zinc-700 dark:text-zinc-300"
            >
              Lý do từ chối gửi cho khách
            </label>
            <textarea
              id="rejectNoteContent"
              rows={3}
              value={rejectNote}
              onChange={function (e) {
                setRejectNote(e.target.value)
              }}
              placeholder="Ví dụ: Sản phẩm đã qua sử dụng, thiếu tem mác hoặc không có video mở hộp..."
              className={cn(TEXTAREA_CLASS, 'mt-1.5 text-xs')}
            />
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={function () {
                setRejectTarget(null)
              }}
              className={cn(secondaryButtonClass(), 'text-xs')}
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={rejectMutation.isPending}
              onClick={handleConfirmReject}
              className={cn(dangerButtonClass(), 'px-5 text-xs')}
            >
              Xác nhận từ chối
            </button>
          </div>
        </Modal>
      )}

      {/* ConfirmDialog Xác nhận đã nhận hàng hoàn */}
      <ConfirmDialog
        open={completeTarget !== null}
        title="Xác nhận đã nhận hàng hoàn?"
        description={completeConfirmDesc}
        confirmLabel="Xác nhận đã nhận hàng"
        cancelLabel="Hủy"
        isPending={completeMutation.isPending}
        onConfirm={function () {
          if (completeTarget !== null) {
            handleCompleteReturn(completeTarget.id)
          }
        }}
        onCancel={function () {
          setCompleteTarget(null)
        }}
      />
    </div>
  )
}
