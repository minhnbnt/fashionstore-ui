import type { AddressRequest } from '@generated/model/addressRequest'

// Chan luu dia chi rong: backend cho phep moi field null, UI thi khong.
export function hasAddressContent(address: AddressRequest): boolean {
  const values = [address.houseNumber, address.street, address.ward, address.district, address.city]
  return values.some(function (value) {
    if (value === null || value === undefined) {
      return false
    }
    return value.trim() !== ''
  })
}
