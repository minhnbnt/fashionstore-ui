import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError, customFetch } from './apiFetch'

function stubFetch(json: unknown, status: number) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      headers: new Headers(),
      json: () => Promise.resolve(json),
    }),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('customFetch', () => {
  it('goi response dang {data, status} dung kieu orval sinh ra', async () => {
    stubFetch([{ id: 'p1' }], 200)
    const res = (await customFetch('/api/search/products?q=ao')) as {
      data: unknown
      status: number
    }
    expect(res.status).toBe(200)
    expect(res.data).toEqual([{ id: 'p1' }])
  })

  it('status loi thi nem ApiError giu status', async () => {
    stubFetch({ title: 'Not found' }, 404)
    const caught = await customFetch('/api/products/x').then(
      () => null,
      (e: unknown) => e,
    )
    expect(caught).toBeInstanceOf(ApiError)
    expect((caught as ApiError).status).toBe(404)
  })

  it('status loi co detail thi nem ApiError voi message la detail', async () => {
    stubFetch({ detail: 'SKU already taken' }, 409)
    const caught = await customFetch('/api/shops/1/products').then(
      () => null,
      (e: unknown) => e,
    )
    expect(caught).toBeInstanceOf(ApiError)
    expect((caught as ApiError).status).toBe(409)
    expect((caught as ApiError).message).toBe('SKU already taken')
  })
})
