import AddressForm from './AddressForm'
import Modal from './Modal'

import type { AddressResponse } from '@generated/model/addressResponse'

export default function AddressFormDialog(props: {
  address: AddressResponse | null
  onClose: () => void
  onSaved: (address: AddressResponse) => void
}) {
  let title = 'Thêm địa chỉ'
  if (props.address !== null) {
    title = 'Sửa địa chỉ'
  }

  return (
    <Modal title={title} onClose={props.onClose}>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Điền phần nào bạn có, không bắt buộc đủ.
      </p>
      <AddressForm address={props.address} onSaved={props.onSaved} onCancel={props.onClose} />
    </Modal>
  )
}
