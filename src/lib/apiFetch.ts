import { getAuthClient } from './auth'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
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
    throw new ApiError(response.status, `Request failed with status ${response.status}`)
  }
  if (response.status === 204) {
    return undefined as T
  }
  // Orval sinh type dang { data, status, headers } nen phai goi dung hinh do,
  // khong tra JSON tran.
  const body = (await response.json()) as unknown
  return { data: body, status: response.status, headers: response.headers } as T
}
