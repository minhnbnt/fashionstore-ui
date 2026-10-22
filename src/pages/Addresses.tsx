import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'

import {
  getList1QueryKey,
  useChangeDefault,
  useDelete,
  useList1,
} from '@generated/endpoints/addresses/addresses'
import { ArrowLeft, MapPin, PencilSimple, Plus, Star, Trash } from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import { hookErrorMessage, takeData } from '@/lib/apiAdapters'
import { formatFullAddress } from '@/lib/format'

import AddressForm from '../components/AddressForm'

import type { AddressResponse } from '@generated/model/addressResponse'

export default function Addresses() {
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<AddressResponse | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const formRef = useRef<HTMLDivElement>(null)

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

  useEffect(
    function () {
      if (formOpen === false || formRef.current === null) {
        return
      }
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    },
    [formOpen],
  )

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
    setEditing(null)
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

  let formTitle = 'Thêm địa chỉ'
  if (editing !== null) {
    formTitle = 'Sửa địa chỉ'
  }

  let body = (
    <div className="space-y-2" aria-busy="true">
      {[0, 1].map(function (index) {
        return (
          <div key={index} className="h-24 animate-pulse rounded-2xl bg-white/60 dark:bg-white/5" />
        )
      })}
    </div>
  )

  if (query.isError) {
    body = (
      <p className="text-sm text-red-600 dark:text-red-400">
        {hookErrorMessage('addressBook', query.error)}
      </p>
    )
  }

  if (query.isLoading === false && query.isError === false && addresses.length === 0) {
    body = (
      <div className="glass rounded-3xl px-6 py-14 text-center">
        <MapPin size={36} weight="duotone" className="mx-auto text-indigo-500" />
        <p className="mt-3 font-bold">Chưa có địa chỉ nào</p>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Thêm địa chỉ để dùng khi thanh toán.
        </p>
      </div>
    )
  }

  if (addresses.length > 0) {
    body = (
      <div className="space-y-2">
        {addresses.map(function (address) {
          const isDefault = address.defaultAddress === true
          const id = address.id ?? ''
          return (
            <div key={id} className="glass rounded-2xl p-4">
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
    <main className="mx-auto max-w-3xl px-4 pt-[110px] pb-16">
      <Link
        to="/account"
        className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-300"
      >
        <ArrowLeft size={14} weight="bold" />
        Hồ sơ
      </Link>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#312e81] via-[#1d4ed8] to-[#38bdf8] shadow-lg">
            <MapPin size={22} weight="bold" className="text-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tighter">Sổ địa chỉ</h1>
        </div>
        {formOpen === false && (
          <button
            type="button"
            onClick={openAdd}
            className="btn-primary flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold"
          >
            <Plus size={16} weight="bold" />
            Thêm địa chỉ
          </button>
        )}
      </div>

      {changeDefault.isError && (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">
          {hookErrorMessage('addressBook', changeDefault.error)}
        </p>
      )}
      {remove.isError && (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">
          {hookErrorMessage('addressBook', remove.error)}
        </p>
      )}

      {formOpen && (
        <div ref={formRef} id="address-form" className="glass mt-6 scroll-mt-24 rounded-3xl p-5">
          <h2 className="text-lg font-extrabold tracking-tight">{formTitle}</h2>
          <AddressForm address={editing} onSaved={closeForm} onCancel={closeForm} />
        </div>
      )}

      <div className="mt-6">{body}</div>
    </main>
  )
}
