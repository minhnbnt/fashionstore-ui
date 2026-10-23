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
    try {
      body = await response.json()
    } catch {
      // loi khong co body JSON (vd 401 tu security filter)
    }
    throw new ApiError(response.status, `Request failed with status ${response.status}`, body)
  }
  if (response.status === 204) {
    return undefined as T
  }
  // Orval sinh type dang { data, status, headers } nen phai goi dung hinh do,
  // khong tra JSON tran.
  const body = (await response.json()) as unknown
  return { data: body, status: response.status, headers: response.headers } as T
}
