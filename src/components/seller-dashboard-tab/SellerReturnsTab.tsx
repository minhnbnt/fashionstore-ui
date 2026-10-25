import { useState } from 'react'

import { useList5 } from '@generated/endpoints/seller-orders/seller-orders'
import {
  getList4QueryKey,
  useApprove,
  useComplete,
  useList4,
  useReject,
} from '@generated/endpoints/seller-returns/seller-returns'
import { CheckCircle } from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import Modal from '@/components/Modal'
import StatusBadge from '@/components/ui/StatusBadge'
import { takeData } from '@/lib/apiAdapters'
import { returnItem } from '@/lib/sellerAdapters'
import { sellerStatusMeta } from '@/lib/sellerStatus'

import { formatVnd } from '../../lib/format'

import type { ReturnItem } from '@/types/seller'
import type { OrderResponse } from '@generated/model/orderResponse'

interface Props {
  shopId: string
}

export default function SellerReturnsTab({ shopId }: Props) {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<
    'ALL' | 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'COMPLETED'
  >('ALL')
  const [approveTarget, setApproveTarget] = useState<ReturnItem | null>(null)
  const [rejectTarget, setRejectTarget] = useState<ReturnItem | null>(null)
  const [resolution, setResolution] = useState('REFUND')
  const [refundAmount, setRefundAmount] = useState(378000)
  const [returnAddress, setReturnAddress] = useState(
    'Kho hàng FashionHub, 45 Kim Mã, Ba Đình, Hà Nội',
  )
  const [rejectNote, setRejectNote] = useState(
    'Sản phẩm đã qua sử dụng quá 30 ngày hoặc không có video bóc hàng',
  )
  const [notification, setNotification] = useState<string | null>(null)

  const returnsQuery = useList4({ shopId }, { query: { enabled: shopId !== '' } })
  // Danh mục đơn hàng để resolve mã đơn / tên người mua cho từng yêu cầu trả hàng
  const ordersQuery = useList5({ shopId }, { query: { enabled: shopId !== '' } })

  const approveMutation = useApprove({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getList4QueryKey() })
      },
    },
  })
  const rejectMutation = useReject({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getList4QueryKey() })
      },
    },
  })
  const completeMutation = useComplete({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getList4QueryKey() })
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

  function handleApproveReturn(
    returnId: string,
    nextResolution: string,
    nextRefundAmount: number,
    nextReturnAddress: string,
  ) {
    approveMutation.mutate({
      id: returnId,
      data: {
        resolution: nextResolution,
        refundAmount: nextRefundAmount,
        sellerNote: 'Địa chỉ nhận lại: ' + nextReturnAddress,
      },
    })
  }

  function handleRejectReturn(returnId: string, sellerNote: string) {
    rejectMutation.mutate({ id: returnId, data: { sellerNote } })
  }

  function handleCompleteReturn(returnId: string) {
    completeMutation.mutate({ id: returnId })
  }

  function showToast(msg: string) {
    setNotification(msg)
    setTimeout(function () {
      setNotification(null)
    }, 3000)
  }

  function handleConfirmApprove() {
    if (approveTarget !== null) {
      handleApproveReturn(approveTarget.id, resolution, refundAmount, returnAddress)
      setApproveTarget(null)
      showToast('Đã phê duyệt yêu cầu đổi trả và gửi địa chỉ kho nhận hàng cho khách!')
    }
  }

  function handleConfirmReject() {
    if (rejectTarget !== null) {
      handleRejectReturn(rejectTarget.id, rejectNote)
      setRejectTarget(null)
      showToast('Đã từ chối yêu cầu đổi trả kèm lý do!')
    }
  }

  const filteredReturns = returns.filter(function (r) {
    if (activeTab !== 'ALL' && r.status !== activeTab) {
      return false
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Toast */}
      {notification !== null && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-bold text-white shadow-xl dark:bg-white dark:text-zinc-900">
          <CheckCircle size={18} weight="bold" className="text-emerald-400" />
          {notification}
        </div>
      )}

      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-zinc-900 dark:text-white">
          Xử lý Đổi / Trả hàng & Hoàn tiền
        </h2>
        <p className="text-xs text-zinc-500">
          Tiếp nhận khiếu nại, xem ảnh chứng từ của khách và đưa ra phương án giải quyết
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="rounded-3xl border border-zinc-200/80 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-[#11182a]">
        <div className="flex flex-wrap items-center gap-1 border-b border-zinc-100 pb-3 dark:border-white/10">
          {[
            { id: 'ALL', label: 'Tất cả' },
            { id: 'REQUESTED', label: 'Chờ xử lý' },
            { id: 'APPROVED', label: 'Đã duyệt' },
            { id: 'COMPLETED', label: 'Hoàn tất' },
            { id: 'REJECTED', label: 'Đã từ chối' },
          ].map(function (tab) {
            const isCurrent = activeTab === tab.id
            let tabClass =
              'rounded-2xl px-4 py-2 text-xs font-bold transition text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            if (isCurrent) {
              tabClass =
                'rounded-2xl px-4 py-2 text-xs font-bold transition bg-indigo-900 text-white shadow-lg shadow-indigo-900/20 dark:bg-indigo-300 dark:text-indigo-950'
            }
            return (
              <button
                key={tab.id}
                type="button"
                onClick={function () {
                  setActiveTab(
                    tab.id as 'ALL' | 'REQUESTED' | 'APPROVED' | 'COMPLETED' | 'REJECTED',
                  )
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
                className="rounded-2xl border border-zinc-100 bg-zinc-50/50 p-4 transition hover:border-zinc-200 dark:border-white/10 dark:bg-white/5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-3 dark:border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-zinc-900 dark:text-white">
                      Mã đơn: {ret.orderCode}
                    </span>
                    <span className="text-[11px] text-zinc-400">• Người mua: {ret.buyerName}</span>
                    <span className="text-[11px] text-zinc-400">• {ret.createdAt}</span>
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
                      <span className="font-semibold text-red-600 dark:text-red-400">
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
                    {ret.resolution !== undefined && (
                      <div className="rounded-xl bg-blue-50 p-2.5 text-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
                        <p className="font-bold">Phương án đã phê duyệt: {ret.resolution}</p>
                        {ret.refundAmount !== undefined && (
                          <p className="mt-0.5">Số tiền hoàn: {formatVnd(ret.refundAmount)}</p>
                        )}
                      </div>
                    )}
                    {ret.sellerNote !== undefined && (
                      <div className="rounded-xl bg-red-50 p-2.5 text-red-900 dark:bg-red-950/30 dark:text-red-200">
                        <p className="font-bold">Ghi chú từ chối: {ret.sellerNote}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-start gap-2 sm:items-end">
                    <span className="text-[11px] font-semibold text-zinc-500">Ảnh chứng từ:</span>
                    <img
                      src={ret.evidenceImage}
                      alt="Chứng từ"
                      className="h-20 w-20 rounded-xl border border-zinc-200 object-cover shadow-sm dark:border-white/10"
                    />
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex justify-end gap-2 border-t border-zinc-100 pt-3 dark:border-white/10">
                  {ret.status === 'REQUESTED' && (
                    <button
                      type="button"
                      onClick={function () {
                        setRejectTarget(ret)
                      }}
                      className="rounded-xl border border-red-200 px-3.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-950/20"
                    >
                      Từ chối yêu cầu
                    </button>
                  )}
                  {ret.status === 'REQUESTED' && (
                    <button
                      type="button"
                      onClick={function () {
                        setApproveTarget(ret)
                      }}
                      className="btn-primary rounded-xl px-4 py-1.5 text-xs font-bold shadow-sm"
                    >
                      Phê duyệt phương án
                    </button>
                  )}
                  {ret.status === 'APPROVED' && (
                    <button
                      type="button"
                      onClick={function () {
                        handleCompleteReturn(ret.id)
                        showToast('Đã xác nhận nhận lại hàng và tự động cập nhật tồn kho!')
                      }}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
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
            <div className="py-12 text-center text-zinc-400">
              <p className="text-sm">Không có yêu cầu đổi/trả hàng nào.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Phê duyệt */}
      {approveTarget !== null && (
        <Modal
          title="Phê duyệt yêu cầu đổi trả"
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
                className="mt-1 w-full rounded-full border border-zinc-300 p-2.5 text-xs outline-none focus:border-blue-600 dark:border-white/15 dark:bg-white/10 dark:text-white"
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
                type="number"
                value={refundAmount}
                onChange={function (e) {
                  setRefundAmount(Number(e.target.value))
                }}
                className="mt-1 w-full rounded-full border border-zinc-300 p-2.5 text-xs font-bold outline-none focus:border-blue-600 dark:border-white/15 dark:bg-white/10 dark:text-white"
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
                className="mt-1 w-full rounded-2xl border border-zinc-300 p-2.5 text-xs outline-none focus:border-blue-600 dark:border-white/15 dark:bg-white/10 dark:text-white"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={function () {
                setApproveTarget(null)
              }}
              className="rounded-2xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-300"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleConfirmApprove}
              className="btn-primary rounded-2xl px-5 py-2 text-xs font-bold"
            >
              Xác nhận phê duyệt
            </button>
          </div>
        </Modal>
      )}

      {/* Modal Từ chối */}
      {rejectTarget !== null && (
        <Modal
          title="Từ chối yêu cầu đổi trả"
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
              className="mt-1.5 w-full rounded-2xl border border-zinc-300 p-2.5 text-xs outline-none focus:border-blue-600 dark:border-white/15 dark:bg-white/10 dark:text-white"
            />
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={function () {
                setRejectTarget(null)
              }}
              className="rounded-2xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-300"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleConfirmReject}
              className="rounded-2xl bg-red-600 px-5 py-2 text-xs font-bold text-white hover:bg-red-700"
            >
              Xác nhận từ chối
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
