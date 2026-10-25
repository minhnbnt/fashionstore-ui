import { getAuthClient } from './auth'

export class ApiError extends Error {
  status: number
  body: unknown

  constructor(status: number, message: string, body?: unknown) {
    super(message)
    this.status = status
    this.body = body
  }
}

export async function customFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const baseUrl = import.meta.env.VITE_API_URL as string | undefined
  if (baseUrl === undefined || baseUrl === '') {
    throw new Error('Thiếu VITE_API_URL trong .env')
  }

  const { data } = await getAuthClient().getSession()
  const token = data.session?.access_token

  const headers = new Headers(options?.headers)
  if (token !== undefined && token !== '') {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${baseUrl}${url}`, { ...options, headers })
  if (response.ok === false) {
    let body: unknown = null
    let errorDetail = ''
    try {
      body = await response.json()
      if (body !== null && typeof body === 'object') {
        const record = body as Record<string, unknown>
        if (typeof record.detail === 'string' && record.detail.trim() !== '') {
          errorDetail = record.detail.trim()
        } else if (typeof record.message === 'string' && record.message.trim() !== '') {
          errorDetail = record.message.trim()
        }
      }
    } catch {
      // Lỗi không có body JSON (vd 401 từ security filter)
    }

    let errorMessage = `Request failed with status ${response.status}`
    if (errorDetail !== '') {
      errorMessage = errorDetail
    }
    throw new ApiError(response.status, errorMessage, body)
  }
  if (response.status === 204) {
    return undefined as T
  }
  // Orval sinh type dang { data, status, headers } nen phai goi dung hinh do,
  // khong tra JSON tran.
  const contentType = response.headers.get('content-type') ?? ''
  let body: unknown = null
  if (
    contentType.includes('application/vnd.openxmlformats-officedocument') ||
    contentType.includes('application/vnd.ms-excel') ||
    contentType.includes('application/pdf') ||
    contentType.includes('application/zip') ||
    contentType.includes('application/octet-stream')
  ) {
    body = (await response.blob()) as unknown
  } else if (
    contentType.includes('text/csv') ||
    contentType.includes('text/plain')
  ) {
    body = (await response.text()) as unknown
  } else {
    try {
      body = (await response.json()) as unknown
    } catch {
      body = (await response.text()) as unknown
    }
  }
  return { data: body, status: response.status, headers: response.headers } as T
}
