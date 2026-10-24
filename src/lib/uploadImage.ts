import { presign } from '@generated/endpoints/uploads/uploads'

import { takeData } from './apiAdapters'

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024

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

export function checkVideoDuration(file: File, maxSeconds = 60): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    let timer: number | null = null

    const cleanup = (url: string) => {
      if (timer !== null) {
        window.clearTimeout(timer)
      }
      window.URL.revokeObjectURL(url)
    }

    const blobUrl = URL.createObjectURL(file)
    timer = window.setTimeout(() => {
      cleanup(blobUrl)
      resolve(0)
    }, 6000)

    video.onloadedmetadata = () => {
      const duration = Math.round(video.duration)
      cleanup(blobUrl)
      if (isNaN(duration)) {
        resolve(0)
        return
      }
      if (duration > maxSeconds) {
        reject(
          new Error(`Video dài ${duration} giây, vượt quá giới hạn tối đa ${maxSeconds} giây.`),
        )
        return
      }
      resolve(duration)
    }
    video.onerror = () => {
      cleanup(blobUrl)
      resolve(0)
    }
    video.src = blobUrl
  })
}

export async function uploadVideo(file: File): Promise<string> {
  if (file.type.startsWith('video/') === false) {
    throw new Error('Chỉ nhận file video.')
  }
  if (file.size > MAX_VIDEO_BYTES) {
    throw new Error('Video tối đa 50 MB.')
  }

  await checkVideoDuration(file, 60)

  const signed = takeData(await presign({ contentType: file.type }))
  if (signed.url === undefined || signed.key === undefined) {
    throw new Error('Không xin được URL upload video.')
  }

  const response = await fetch(signed.url, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  })
  if (response.ok === false) {
    throw new Error('Upload video thất bại, thử lại sau.')
  }
  return signed.key
}
