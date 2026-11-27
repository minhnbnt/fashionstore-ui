import { Client } from '@gradio/client'

import { getAuthClient } from '@/lib/auth'

export const DEFAULT_VTON_API_URL = 'http://localhost:8001'

export type TryOnMode = 'top' | 'bottom' | 'full'

export interface VtonConfig {
  vtonUrl: string
}

export interface DirectTryOnInput {
  personFile: File
  garmentImageUrl: string
  mode: TryOnMode
  vtonUrl?: string
}

export interface DirectTryOnResult {
  objectUrl: string
  blob: Blob
}

export function readVtonConfig(): VtonConfig {
  const raw = import.meta.env.VITE_VTON_API_URL as string | undefined
  if (raw === undefined || raw.trim() === '') {
    return { vtonUrl: DEFAULT_VTON_API_URL }
  }
  return { vtonUrl: raw.trim() }
}

export function inferTryOnMode(name: string, description: string): TryOnMode {
  const combined = (name + ' ' + description).toLowerCase()
  if (
    combined.includes('đầm') ||
    combined.includes('váy liền') ||
    combined.includes('jumpsuit') ||
    combined.includes('set') ||
    combined.includes('bộ')
  ) {
    return 'full'
  }
  if (combined.includes('quần') || combined.includes('chân váy')) {
    return 'bottom'
  }
  return 'top'
}

function resolveGarmentFormat(mimeType: string, url: string): { ext: string; mime: string } {
  const lowerMime = mimeType.toLowerCase()
  const lowerUrl = url.toLowerCase()
  if (
    lowerMime.includes('jpeg') ||
    lowerMime.includes('jpg') ||
    lowerUrl.endsWith('.jpg') ||
    lowerUrl.endsWith('.jpeg')
  ) {
    return { ext: 'jpg', mime: 'image/jpeg' }
  }
  if (lowerMime.includes('webp') || lowerUrl.endsWith('.webp')) {
    return { ext: 'webp', mime: 'image/webp' }
  }
  return { ext: 'png', mime: 'image/png' }
}

function extractGradioGalleryUrl(node: unknown, baseUrl: string): string | null {
  if (node === null || node === undefined) {
    return null
  }
  if (typeof node === 'string') {
    const trimmed = node.trim()
    if (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('blob:')
    ) {
      return trimmed
    }
    if (trimmed.startsWith('/')) {
      return baseUrl.replace(/\/+$/, '') + trimmed
    }
    return null
  }
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = extractGradioGalleryUrl(item, baseUrl)
      if (found !== null) {
        return found
      }
    }
    return null
  }
  if (typeof node === 'object') {
    const record = node as Record<string, unknown>
    if ('image' in record) {
      const fromImage = extractGradioGalleryUrl(record.image, baseUrl)
      if (fromImage !== null) {
        return fromImage
      }
    }
    if ('url' in record) {
      const fromUrl = extractGradioGalleryUrl(record.url, baseUrl)
      if (fromUrl !== null) {
        return fromUrl
      }
    }
    if ('path' in record && typeof record.path === 'string' && record.path.trim() !== '') {
      const rawPath = record.path.trim()
      if (rawPath.startsWith('http://') || rawPath.startsWith('https://')) {
        return rawPath
      }
      return baseUrl.replace(/\/+$/, '') + '/gradio_api/file=' + rawPath.replace(/^\/+/, '')
    }
  }
  return null
}

async function fetchGarmentFile(garmentImageUrl: string): Promise<File> {
  let response: Response
  try {
    response = await fetch(garmentImageUrl)
  } catch {
    throw new Error('Không tải được ảnh sản phẩm, vui lòng thử lại sau.')
  }
  if (!response.ok) {
    throw new Error('Không tải được ảnh sản phẩm, vui lòng thử lại sau.')
  }
  let blob: Blob
  try {
    blob = await response.blob()
  } catch {
    throw new Error('Không tải được ảnh sản phẩm, vui lòng thử lại sau.')
  }
  let headerType = response.headers.get('content-type') ?? ''
  if (headerType === '') {
    headerType = blob.type
  }
  const format = resolveGarmentFormat(headerType, garmentImageUrl)
  return new File([blob], 'garment.' + format.ext, { type: format.mime })
}

export async function runDirectTryOn(input: DirectTryOnInput): Promise<DirectTryOnResult> {
  const { data } = await getAuthClient().getSession()
  const token = data.session?.access_token
  if (token === undefined || token.trim() === '') {
    throw new Error('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.')
  }

  let targetUrl = readVtonConfig().vtonUrl
  if (input.vtonUrl !== undefined && input.vtonUrl.trim() !== '') {
    targetUrl = input.vtonUrl.trim()
  }

  const garmentFile = await fetchGarmentFile(input.garmentImageUrl)
  const authHeaders = {
    Authorization: 'Bearer ' + token,
  }

  let resultUrl: string | null = null
  try {
    const app = await Client.connect(targetUrl, {
      headers: authHeaders,
    })
    const prediction = await app.predict('/process_images', {
      images: [input.personFile, garmentFile],
      mode: input.mode,
    })
    resultUrl = extractGradioGalleryUrl(prediction.data, targetUrl)
  } catch {
    throw new Error('Tạo ảnh thử đồ thất bại, vui lòng thử lại sau.')
  }

  if (resultUrl === null) {
    throw new Error('Tạo ảnh thử đồ thất bại, vui lòng thử lại sau.')
  }

  let resultResponse: Response
  try {
    resultResponse = await fetch(resultUrl, {
      headers: authHeaders,
    })
  } catch {
    throw new Error('Không tải được ảnh kết quả thử đồ, vui lòng thử lại sau.')
  }
  if (!resultResponse.ok) {
    throw new Error('Không tải được ảnh kết quả thử đồ, vui lòng thử lại sau.')
  }

  let resultBlob: Blob
  try {
    resultBlob = await resultResponse.blob()
  } catch {
    throw new Error('Không tải được ảnh kết quả thử đồ, vui lòng thử lại sau.')
  }

  return {
    blob: resultBlob,
    objectUrl: window.URL.createObjectURL(resultBlob),
  }
}
