import { getAuthClient } from './auth'

export class ApiError extends Error {
  status: number
  data?: unknown

  constructor(status: number, message: string, data?: unknown) {
    super(message)
    this.status = status
    this.data = data
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
    let bodyData: unknown = null
    let errorDetail = ''
    try {
      bodyData = await response.json()
      if (bodyData !== null && typeof bodyData === 'object') {
        const record = bodyData as Record<string, unknown>
        if (typeof record.detail === 'string' && record.detail.trim() !== '') {
          errorDetail = record.detail.trim()
        } else if (typeof record.message === 'string' && record.message.trim() !== '') {
          errorDetail = record.message.trim()
        }
      }
    } catch {
      // Body is not JSON
    }

    let errorMessage = `Request failed with status ${response.status}`
    if (errorDetail !== '') {
      errorMessage = errorDetail
    }
    throw new ApiError(response.status, errorMessage, bodyData)
  }
  if (response.status === 204) {
    return undefined as T
  }
  // Orval sinh type dang { data, status, headers } nen phai goi dung hinh do,
  // khong tra JSON tran.
  const body = (await response.json()) as unknown
  return { data: body, status: response.status, headers: response.headers } as T
}
