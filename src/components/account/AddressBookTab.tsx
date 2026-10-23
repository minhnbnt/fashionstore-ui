import { useState } from 'react'

import {
  getList1QueryKey,
  useChangeDefault,
  useDelete,
  useList1,
} from '@generated/endpoints/addresses/addresses'
import {
  ArrowClockwise,
  CheckCircle,
  MapPin,
  PencilSimple,
  Plus,
  ShieldCheck,
  Trash,
  WarningCircle,
} from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import { takeData } from '@/lib/apiAdapters'

import AddressFormModal from './AddressFormModal'

import type { AddressResponse } from '@generated/model/addressResponse'

const MAX_ADDRESSES = 10

function addAddressButtonClass(isMaxReached: boolean): string {
  if (isMaxReached) {
    return 'cursor-not-allowed bg-zinc-200 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600'
  }
  return 'bg-gradient-to-r from-indigo-900 via-blue-700 to-sky-400 text-white shadow-indigo-900/20 hover:opacity-90'
}

function addAddressButtonTitle(isMaxReached: boolean): string {
  if (isMaxReached) {
    return 'Bạn đã đạt giới hạn 10 địa chỉ'
  }
  return 'Thêm địa chỉ mới'
}

export default function AddressBookTab() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [editingAddr, setEditingAddr] = useState<AddressResponse | null>(null)

  const [toast, setToast] = useState<string | null>(null)
  const [toastError, setToastError] = useState<string | null>(null)

  // Queries
  const addressesQuery = useList1()

  let addresses: AddressResponse[] = []
  if (addressesQuery.data !== undefined) {
    try {
      const raw = takeData(addressesQuery.data)
      if (Array.isArray(raw)) {
        addresses = raw
      }
    } catch {
      addresses = []
    }
  }

  const isMaxReached = addresses.length >= MAX_ADDRESSES

  function showToast(msg: string) {
    setToast(msg)
    window.setTimeout(function () {
      setToast(null)
    }, 3000)
  }

  function showToastError(msg: string) {
    setToastError(msg)
    window.setTimeout(function () {
      setToastError(null)
    }, 4000)
  }

  function openCreateModal() {
    if (isMaxReached) {
      showToastError(`Bạn chỉ có thể lưu tối đa ${MAX_ADDRESSES} địa chỉ nhận hàng.`)
      return
    }
    setEditingAddr(null)
    setModalMode('create')
    setModalOpen(true)
  }

  function openEditModal(addr: AddressResponse) {
    setEditingAddr(addr)
    setModalMode('edit')
    setModalOpen(true)
  }

  const deleteAddressMutation = useDelete({
    mutation: {
      onSuccess: function () {
        showToast('Đã xóa địa chỉ thành công.')
        void queryClient.invalidateQueries({ queryKey: getList1QueryKey() })
      },
      onError: function () {
        showToastError('Không thể xóa địa chỉ. Vui lòng thử lại.')
      },
    },
  })

  const changeDefaultMutation = useChangeDefault({
    mutation: {
      onSuccess: function () {
        showToast('Đã đặt làm địa chỉ mặc định.')
        void queryClient.invalidateQueries({ queryKey: getList1QueryKey() })
      },
      onError: function () {
        showToastError('Không thể thay đổi địa chỉ mặc định.')
      },
    },
  })

  function handleDeleteAddress(id: string | undefined) {
    if (id === undefined || id === '') {
      return
    }
    const confirmed = window.confirm('Bạn có chắc chắn muốn xóa địa chỉ nhận hàng này?')
    if (confirmed === false) {
      return
    }
    deleteAddressMutation.mutate({ id })
  }

  function handleSetDefault(id: string | undefined) {
    if (id === undefined || id === '') {
      return
    }
    changeDefaultMutation.mutate({ id })
  }

  const isMutating = deleteAddressMutation.isPending || changeDefaultMutation.isPending

  return (
    <div className="space-y-6">
      {/* Header with Title, Counter and Add Button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            Địa chỉ của tôi
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Quản lý danh sách địa chỉ nhận hàng để thanh toán nhanh hơn
          </p>
        </div>

        <div>
          <button
            id="openAddAddressModalBtn"
            type="button"
            onClick={openCreateModal}
            disabled={isMaxReached}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold shadow-sm transition ${addAddressButtonClass(isMaxReached)}`}
            title={addAddressButtonTitle(isMaxReached)}
          >
            <Plus size={16} weight="bold" />
            <span>Thêm địa chỉ mới</span>
          </button>
        </div>
      </div>

      {/* Limit Alert when 10/10 reached */}
      {isMaxReached && (
        <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
          <WarningCircle size={18} weight="fill" className="shrink-0 text-amber-600" />
          <span>
            Bạn đã sử dụng tối đa {MAX_ADDRESSES} địa chỉ nhận hàng. Vui lòng xóa bớt địa chỉ cũ nếu
            cần thêm địa chỉ mới.
          </span>
        </div>
      )}

      {/* Toast Feedback */}
      {toast && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle size={18} weight="fill" className="shrink-0 text-emerald-600" />
          <span>{toast}</span>
        </div>
      )}

      {toastError && (
        <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
          <WarningCircle size={18} weight="fill" className="shrink-0 text-rose-600" />
          <span>{toastError}</span>
        </div>
      )}

      {/* Loading State */}
      {addressesQuery.isLoading && (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-zinc-200 bg-white/80 py-16 dark:border-white/10 dark:bg-white/5">
          <ArrowClockwise size={28} className="animate-spin text-blue-600" />
          <p className="mt-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            Đang tải sổ địa chỉ…
          </p>
        </div>
      )}

      {/* Empty State */}
      {addressesQuery.isLoading === false && addresses.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-200 bg-white/80 py-16 text-center dark:border-white/10 dark:bg-white/5">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sky-100 text-blue-700 dark:bg-white/10 dark:text-sky-300">
            <MapPin size={32} weight="duotone" />
          </div>
          <h3 className="mt-4 text-base font-extrabold text-zinc-900 dark:text-white">
            Chưa có địa chỉ nhận hàng
          </h3>
          <p className="mt-1 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
            Thêm địa chỉ nhận hàng để thuận tiện khi mua sắm và tự động điền nhanh lúc đặt hàng.
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-900 via-blue-700 to-sky-400 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-900/20 transition hover:opacity-90"
          >
            <Plus size={15} weight="bold" />
            <span>Thêm địa chỉ ngay</span>
          </button>
        </div>
      )}

      {/* Address List */}
      {addressesQuery.isLoading === false && addresses.length > 0 && (
        <div className="space-y-3.5">
          {addresses.map(function (addr) {
            const isDef = addr.defaultAddress === true

            let containerClass =
              'rounded-3xl border p-5 transition flex flex-col md:flex-row md:items-start md:justify-between gap-4'
            if (isDef) {
              containerClass +=
                ' border-blue-200 bg-sky-50/50 dark:border-sky-400/30 dark:bg-white/5'
            } else {
              containerClass +=
                ' border-zinc-200 bg-white/80 hover:border-zinc-300 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/20'
            }

            return (
              <div key={addr.id} className={containerClass}>
                <div className="space-y-2">
                  {/* Row 1: Recipient Name, Phone, Default Badge */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-extrabold text-zinc-900 dark:text-white">
                      {addr.recipientName || 'Khách hàng'}
                    </span>
                    <span className="text-zinc-300 dark:text-zinc-700">|</span>
                    <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                      {addr.phoneNumber || 'Chưa có SĐT'}
                    </span>

                    {isDef && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-indigo-900 via-blue-700 to-sky-400 px-2.5 py-0.5 text-[10px] font-extrabold text-white">
                        <ShieldCheck size={12} weight="fill" />
                        Mặc định
                      </span>
                    )}
                  </div>

                  {/* Row 2: Full address built by the frontend from /api/public/locations */}
                  <div className="space-y-0.5 text-xs text-zinc-600 dark:text-zinc-300">
                    <p className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {addr.fullAddress}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0">
                  <button
                    type="button"
                    onClick={function () {
                      openEditModal(addr)
                    }}
                    className="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-2xs transition hover:border-blue-500 hover:text-blue-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    <PencilSimple size={13} />
                    <span>Sửa</span>
                  </button>

                  {isDef === false && (
                    <>
                      <button
                        type="button"
                        onClick={function () {
                          handleSetDefault(addr.id)
                        }}
                        disabled={isMutating}
                        className="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-2xs transition hover:border-blue-500 hover:text-blue-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      >
                        <span>Đặt làm mặc định</span>
                      </button>

                      <button
                        type="button"
                        onClick={function () {
                          handleDeleteAddress(addr.id)
                        }}
                        disabled={isMutating}
                        className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-600 shadow-2xs transition hover:border-rose-300 hover:bg-rose-50 dark:border-zinc-800 dark:bg-zinc-800 dark:hover:bg-rose-950/30"
                        title="Xóa địa chỉ"
                      >
                        <Trash size={13} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Form thêm/sửa địa chỉ — component dùng chung với Checkout, portal ra <body>
          để thoát containing block của .glass (backdrop-filter làm position: fixed
          quy chiếu theo section thay vì viewport) */}
      {modalOpen && (
        <AddressFormModal
          mode={modalMode}
          initial={editingAddr}
          onClose={function () {
            setModalOpen(false)
          }}
          onSaved={function () {
            if (modalMode === 'create') {
              showToast('Đã thêm địa chỉ nhận hàng mới thành công!')
            } else {
              showToast('Đã cập nhật thông tin địa chỉ thành công!')
            }
          }}
        />
      )}
    </div>
  )
}
