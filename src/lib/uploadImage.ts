import { presign } from '@generated/endpoints/uploads/uploads'

import { takeData } from './apiAdapters'

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024

/** Xin URL presign rồi PUT thẳng file lên S3, trả về S3 key để lưu vào banner/popup. */
export async function uploadImage(file: File): Promise<string> {
  if (file.type.startsWith('image/') === false) {
    throw new Error('Chỉ nhận file ảnh.')
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error('Ảnh tối đa 5 MB.')
  }

  const signed = takeData(await presign({ contentType: file.type }))
  if (signed.url === undefined || signed.key === undefined) {
    throw new Error('Không xin được URL upload.')
  }

  const response = await fetch(signed.url, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  })
  if (response.ok === false) {
    throw new Error('Upload ảnh thất bại, thử lại sau.')
  }
  return signed.key
}
