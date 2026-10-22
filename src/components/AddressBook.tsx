import { useState } from 'react'

import {
  getList1QueryKey,
  useChangeDefault,
  useDelete,
  useList1,
} from '@generated/endpoints/addresses/addresses'
import { CaretRight, MapPin, PencilSimple, Plus, Star, Trash } from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import { hookErrorMessage, takeData } from '@/lib/apiAdapters'
import { formatFullAddress } from '@/lib/format'

import AddressForm from './AddressForm'
import Modal from './Modal'

import type { AddressResponse } from '@generated/model/addressResponse'

export default function AddressBook() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'list' | 'form'>('list')
  const [editing, setEditing] = useState<AddressResponse | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: getList1QueryKey() })
  }

  const remove = useDelete({
    mutation: {
      onSuccess: function () {
        setConfirmingId(null)
        invalidate()
      },
    },
  })
  const changeDefault = useChangeDefault({
    mutation: {
      onSuccess: invalidate,
    },
  })

  const query = useList1()
  let addresses: AddressResponse[] = []
  if (query.isSuccess) {
    addresses = takeData(query.data)
  }

  function closeModal() {
    setOpen(false)
    setMode('list')
    setEditing(null)
    setConfirmingId(null)
    remove.reset()
  }

  function openAdd() {
    setEditing(null)
    setMode('form')
  }

  function openEdit(address: AddressResponse) {
    setEditing(address)
    setMode('form')
  }

  function backToList() {
    setMode('list')
    setEditing(null)
  }

  function handleSaved() {
    setMode('list')
    setEditing(null)
    invalidate()
  }

  function makeDefault(address: AddressResponse) {
    const id = address.id
    if (id === undefined) {
      return
    }
    changeDefault.mutate({ id })
  }

  function confirmDelete(address: AddressResponse) {
    const id = address.id
    if (id === undefined) {
      return
    }
    remove.mutate({ id })
  }

  let countLabel = 'Chưa có'
  if (addresses.length > 0) {
    countLabel = `${addresses.length} địa chỉ`
  }
  if (query.isError) {
    countLabel = 'Lỗi tải'
  }

  let title = 'Sổ địa chỉ'
  if (mode === 'form') {
    title = 'Thêm địa chỉ'
  }
  if (mode === 'form' && editing !== null) {
    title = 'Sửa địa chỉ'
  }

  let listBody = (
    <div className="mt-4 space-y-2" aria-busy="true">
      {[0, 1].map(function (index) {
        return (
          <div key={index} className="h-20 animate-pulse rounded-2xl bg-white/60 dark:bg-white/5" />
        )
      })}
    </div>
  )

  if (query.isError) {
    listBody = (
      <p className="mt-4 text-sm text-red-600 dark:text-red-400">
        {hookErrorMessage('addressBook', query.error)}
      </p>
    )
  }

  if (query.isLoading === false && query.isError === false && addresses.length === 0) {
    listBody = (
      <p className="mt-4 rounded-2xl bg-white/70 px-4 py-6 text-center text-sm text-zinc-500 dark:bg-white/5 dark:text-zinc-400">
        Chưa có địa chỉ nào. Thêm một địa chỉ để dùng khi thanh toán.
      </p>
    )
  }

  if (addresses.length > 0) {
    listBody = (
      <div className="mt-4 space-y-2">
        {addresses.map(function (address) {
          const isDefault = address.defaultAddress === true
          const id = address.id ?? ''
          return (
            <div key={id} className="rounded-2xl bg-white/70 p-4 dark:bg-white/5">
              <div className="flex items-start gap-2">
                <MapPin size={18} weight="bold" className="mt-0.5 shrink-0 text-indigo-500" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{formatFullAddress(address)}</p>
                  {isDefault && (
                    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200">
                      <Star size={11} weight="fill" />
                      Mặc định
                    </span>
                  )}
                </div>
              </div>

              {confirmingId === id && (
                <div className="mt-3 flex items-center justify-between gap-2 rounded-full bg-red-50 px-3 py-1.5 dark:bg-red-500/10">
                  <span className="text-xs font-bold text-red-700 dark:text-red-200">
                    Xoá địa chỉ này?
                  </span>
                  <span className="flex items-center gap-1 text-xs font-bold">
                    <button
                      type="button"
                      disabled={remove.isPending}
                      onClick={() => setConfirmingId(null)}
                      className="rounded-full px-3 py-1 text-zinc-600 hover:bg-white/70 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-white/10"
                    >
                      Huỷ
                    </button>
                    <button
                      type="button"
                      disabled={remove.isPending}
                      onClick={() => confirmDelete(address)}
                      className="rounded-full bg-red-600 px-3 py-1 text-white disabled:opacity-50"
                    >
                      Xoá
                    </button>
                  </span>
                </div>
              )}

              {confirmingId !== id && (
                <div className="mt-2 flex flex-wrap items-center gap-1 text-xs font-bold">
                  {isDefault === false && (
                    <button
                      type="button"
                      disabled={changeDefault.isPending}
                      onClick={() => makeDefault(address)}
                      className="rounded-full px-3 py-1.5 text-indigo-700 transition hover:bg-indigo-50 disabled:opacity-50 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
                    >
                      Đặt mặc định
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openEdit(address)}
                    className="flex items-center gap-1 rounded-full px-3 py-1.5 text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/10"
                  >
                    <PencilSimple size={13} weight="bold" />
                    Sửa
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingId(id)}
                    className="flex items-center gap-1 rounded-full px-3 py-1.5 text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                  >
                    <Trash size={13} weight="bold" />
                    Xoá
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between gap-2 rounded-2xl bg-white/70 px-4 py-3 text-left dark:bg-white/10"
      >
        <span className="flex items-center gap-2 font-medium">
          <MapPin size={16} weight="bold" className="text-indigo-500" />
          Sổ địa chỉ
        </span>
        <span className="flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500">
          {countLabel}
          <CaretRight size={12} weight="bold" />
        </span>
      </button>

      {open && (
        <Modal title={title} onClose={closeModal}>
          {mode === 'list' && (
            <>
              {changeDefault.isError && (
                <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                  {hookErrorMessage('addressBook', changeDefault.error)}
                </p>
              )}
              {remove.isError && (
                <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                  {hookErrorMessage('addressBook', remove.error)}
                </p>
              )}

              {listBody}

              <button
                type="button"
                onClick={openAdd}
                className="btn-primary mt-4 flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-sm font-bold"
              >
                <Plus size={16} weight="bold" />
                Thêm địa chỉ
              </button>
            </>
          )}

          {mode === 'form' && (
            <AddressForm address={editing} onSaved={handleSaved} onCancel={backToList} />
          )}
        </Modal>
      )}
    </>
  )
}
