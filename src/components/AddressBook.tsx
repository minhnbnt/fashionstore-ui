import { useState } from 'react'

import {
  getList1QueryKey,
  useChangeDefault,
  useDelete,
  useList1,
} from '@generated/endpoints/addresses/addresses'
import { MapPin, PencilSimple, Plus, Star, Trash } from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import { hookErrorMessage, takeData } from '@/lib/apiAdapters'
import { formatFullAddress } from '@/lib/format'

import AddressFormDialog from './AddressFormDialog'
import ConfirmDialog from './admin/ConfirmDialog'

import type { AddressResponse } from '@generated/model/addressResponse'

export default function AddressBook() {
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<AddressResponse | null>(null)
  const [deleting, setDeleting] = useState<AddressResponse | null>(null)

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: getList1QueryKey() })
  }

  const remove = useDelete({
    mutation: {
      onSuccess: function () {
        setDeleting(null)
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

  function openAdd() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(address: AddressResponse) {
    setEditing(address)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
  }

  function makeDefault(address: AddressResponse) {
    const id = address.id
    if (id === undefined) {
      return
    }
    changeDefault.mutate({ id })
  }

  function handleSaved() {
    setFormOpen(false)
    invalidate()
  }

  function closeDelete() {
    setDeleting(null)
    remove.reset()
  }

  let deleteError: string | undefined
  if (remove.isError) {
    deleteError = hookErrorMessage('addressBook', remove.error)
  }

  let body = (
    <div className="mt-4 space-y-2" aria-busy="true">
      {[0, 1].map(function (index) {
        return (
          <div key={index} className="h-20 animate-pulse rounded-2xl bg-white/60 dark:bg-white/5" />
        )
      })}
    </div>
  )

  if (query.isError) {
    body = (
      <p className="mt-4 text-sm text-red-600 dark:text-red-400">
        {hookErrorMessage('addressBook', query.error)}
      </p>
    )
  }

  if (query.isLoading === false && query.isError === false && addresses.length === 0) {
    body = (
      <p className="mt-4 rounded-2xl bg-white/70 px-4 py-6 text-center text-sm text-zinc-500 dark:bg-white/5 dark:text-zinc-400">
        Chưa có địa chỉ nào. Thêm một địa chỉ để dùng khi thanh toán.
      </p>
    )
  }

  if (addresses.length > 0) {
    body = (
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {addresses.map(function (address) {
          const isDefault = address.defaultAddress === true
          return (
            <div
              key={address.id ?? ''}
              className="flex flex-col gap-3 rounded-2xl bg-white/70 p-4 dark:bg-white/5"
            >
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

              <div className="flex flex-wrap items-center gap-1 text-xs font-bold">
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
                  onClick={() => setDeleting(address)}
                  className="flex items-center gap-1 rounded-full px-3 py-1.5 text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                >
                  <Trash size={13} weight="bold" />
                  Xoá
                </button>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <section id="addresses" className="glass mb-6 scroll-mt-24 rounded-3xl p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-indigo-900 uppercase dark:text-indigo-200">
            Giao hàng
          </p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tighter">Sổ địa chỉ</h2>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="btn-primary flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold"
        >
          <Plus size={16} weight="bold" />
          Thêm địa chỉ
        </button>
      </div>

      {changeDefault.isError && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">
          {hookErrorMessage('addressBook', changeDefault.error)}
        </p>
      )}

      {body}

      {formOpen && (
        <AddressFormDialog address={editing} onClose={closeForm} onSaved={handleSaved} />
      )}

      <ConfirmDialog
        open={deleting !== null}
        title="Xoá địa chỉ"
        description="Địa chỉ này sẽ bị xoá khỏi sổ. Các đơn hàng cũ không bị ảnh hưởng."
        confirmLabel="Xoá"
        pending={remove.isPending}
        error={deleteError}
        onClose={closeDelete}
        onConfirm={function () {
          const id = deleting?.id
          if (id !== undefined) {
            remove.mutate({ id })
          }
        }}
      />
    </section>
  )
}
