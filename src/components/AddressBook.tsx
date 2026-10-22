import { Link } from 'react-router'

import { useList1 } from '@generated/endpoints/addresses/addresses'
import { CaretRight, MapPin } from '@phosphor-icons/react'

import { takeData } from '@/lib/apiAdapters'

import type { AddressResponse } from '@generated/model/addressResponse'

export default function AddressBook() {
  const query = useList1()
  let addresses: AddressResponse[] = []
  if (query.isSuccess) {
    addresses = takeData(query.data)
  }

  let countLabel = 'Chưa có'
  if (addresses.length > 0) {
    countLabel = `${addresses.length} địa chỉ`
  }
  if (query.isError) {
    countLabel = 'Lỗi tải'
  }

  return (
    <Link
      to="/account/addresses"
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
    </Link>
  )
}
