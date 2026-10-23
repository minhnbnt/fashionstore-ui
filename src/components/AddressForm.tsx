import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'

import { getList1QueryKey, useAdd, useUpdate } from '@generated/endpoints/addresses/addresses'
import { useQueryClient } from '@tanstack/react-query'

import { hasAddressContent } from '@/lib/address'
import { hookErrorMessage, takeData } from '@/lib/apiAdapters'

import type { AddressResponse } from '@generated/model/addressResponse'

function clean(value: string): string | null {
  const trimmed = value.trim()
  if (trimmed === '') {
    return null
  }
  return trimmed
}

export default function AddressForm(props: {
  address: AddressResponse | null
  onSaved: (address: AddressResponse) => void
  onCancel: () => void
}) {
  const queryClient = useQueryClient()
  const firstFieldRef = useRef<HTMLInputElement>(null)
  const [houseNumber, setHouseNumber] = useState(props.address?.houseNumber ?? '')
  const [street, setStreet] = useState(props.address?.street ?? '')
  const [ward, setWard] = useState(props.address?.ward ?? '')
  const [district, setDistrict] = useState(props.address?.district ?? '')
  const [city, setCity] = useState(props.address?.city ?? '')

  useEffect(function () {
    if (firstFieldRef.current !== null) {
      firstFieldRef.current.focus()
    }
  }, [])

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: getList1QueryKey() })
  }

  const add = useAdd({
    mutation: {
      onSuccess: invalidate,
    },
  })
  const update = useUpdate({
    mutation: {
      onSuccess: invalidate,
    },
  })
  const pending = add.isPending || update.isPending

  let editing = false
  if (props.address !== null) {
    editing = true
  }

  let error: string | undefined
  const failure = add.error ?? update.error
  if (failure !== null && failure !== undefined) {
    error = hookErrorMessage('addressBook', failure)
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const request = {
      houseNumber: clean(houseNumber),
      street: clean(street),
      ward: clean(ward),
      district: clean(district),
      city: clean(city),
    }
    if (hasAddressContent(request) === false) {
      return
    }

    if (props.address === null) {
      add.mutate(
        { data: request },
        {
          onSuccess: function (response) {
            props.onSaved(takeData(response))
          },
        },
      )
      return
    }
    const id = props.address.id
    if (id === undefined) {
      return
    }
    update.mutate(
      { id, data: request },
      {
        onSuccess: function (response) {
          props.onSaved(takeData(response))
        },
      },
    )
  }

  return (
    <form onSubmit={submit} className="mt-5 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-semibold">Số nhà</span>
          <input
            ref={firstFieldRef}
            value={houseNumber}
            onChange={(event) => setHouseNumber(event.target.value)}
            className="mt-1 w-full rounded-full border border-zinc-200 bg-white/80 px-4 py-2.5 outline-none focus:border-indigo-400 dark:border-white/15 dark:bg-white/5"
          />
        </label>
        <label className="block text-sm">
          <span className="font-semibold">Đường</span>
          <input
            value={street}
            onChange={(event) => setStreet(event.target.value)}
            className="mt-1 w-full rounded-full border border-zinc-200 bg-white/80 px-4 py-2.5 outline-none focus:border-indigo-400 dark:border-white/15 dark:bg-white/5"
          />
        </label>
        <label className="block text-sm">
          <span className="font-semibold">Phường / Xã</span>
          <input
            value={ward}
            onChange={(event) => setWard(event.target.value)}
            className="mt-1 w-full rounded-full border border-zinc-200 bg-white/80 px-4 py-2.5 outline-none focus:border-indigo-400 dark:border-white/15 dark:bg-white/5"
          />
        </label>
        <label className="block text-sm">
          <span className="font-semibold">Quận / Huyện</span>
          <input
            value={district}
            onChange={(event) => setDistrict(event.target.value)}
            className="mt-1 w-full rounded-full border border-zinc-200 bg-white/80 px-4 py-2.5 outline-none focus:border-indigo-400 dark:border-white/15 dark:bg-white/5"
          />
        </label>
      </div>
      <label className="block text-sm">
        <span className="font-semibold">Tỉnh / Thành phố</span>
        <input
          value={city}
          onChange={(event) => setCity(event.target.value)}
          className="mt-1 w-full rounded-full border border-zinc-200 bg-white/80 px-4 py-2.5 outline-none focus:border-indigo-400 dark:border-white/15 dark:bg-white/5"
        />
      </label>

      {editing && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Để trống một ô sẽ giữ nguyên giá trị cũ của ô đó.
        </p>
      )}
      {error !== undefined && (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-200">
          {error}
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={props.onCancel}
          disabled={pending}
          className="rounded-full px-4 py-2.5 text-sm font-bold text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-white/10"
        >
          Hủy
        </button>
        <button
          type="submit"
          disabled={
            pending || hasAddressContent({ houseNumber, street, ward, district, city }) === false
          }
          className="btn-primary rounded-full px-5 py-2.5 text-sm font-bold disabled:opacity-50"
        >
          {pending ? 'Đang lưu…' : 'Lưu địa chỉ'}
        </button>
      </div>
    </form>
  )
}
