import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError, createProduct, getProduct, listProducts, updateProduct, uploadImage } from '@/lib/api'

const { signOutMock, getSessionMock } = vi.hoisted(() => ({
  signOutMock: vi.fn(),
  getSessionMock: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  supabase: {
    getSession: getSessionMock,
    signOut: signOutMock,
  },
}))

function okResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => {
  vi.stubEnv('VITE_API_URL', 'http://localhost:8080')
  vi.stubEnv('VITE_USE_MOCK', '')
  vi.stubEnv('VITE_ASSETS_URL', 'http://fashionstore.web.garage.localhost:3902')
  vi.unstubAllGlobals()
  getSessionMock.mockReset()
  signOutMock.mockReset()
  getSessionMock.mockResolvedValue({ data: { session: { access_token: 'tok123' } }, error: null })
})

describe('listProducts (mock mode)', () => {
  it('returns seeded products with images without touching the network', async () => {
    vi.stubEnv('VITE_USE_MOCK', '1')
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    const products = await listProducts()
    const first = products[0]

    expect(products.length).toBeGreaterThan(0)
    expect(typeof first.id).toBe('number')
    expect(typeof first.name).toBe('string')
    expect(typeof first.price).toBe('number')
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

describe('listProducts (real API)', () => {
  it('sends Bearer token from the current session', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(okResponse([]))

    const products = await listProducts()

    expect(products).toEqual([])
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const call = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect((call[1].headers as Headers).get('Authorization')).toBe('Bearer tok123')
  })

  it('signs out and redirects to /login with the return path on 401', async () => {
    const assignMock = vi.fn()
    vi.stubGlobal('location', { pathname: '/products', search: '?page=2', assign: assignMock })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 401 }))

    const error = await listProducts().catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(401)
    expect(signOutMock).toHaveBeenCalledTimes(1)
    expect(assignMock).toHaveBeenCalledWith('/login?from=%2Fproducts%3Fpage%3D2')
  })

  it('surfaces the API error message for non-401 failures', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'price must be >= 0' }), { status: 400 }),
    )

    await expect(listProducts()).rejects.toThrow('price must be >= 0')
  })
})

describe('mock CRUD', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_USE_MOCK', '1')
  })

  it('gets a seeded product by id', async () => {
    const product = await getProduct(1)

    expect(product.id).toBe(1)
    expect(product.name.length).toBeGreaterThan(0)
  })

  it('throws 404 for an unknown id', async () => {
    const error = await getProduct(999999).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(404)
  })

  it('creates then reads back the new product', async () => {
    const created = await createProduct({
      name: 'Áo test mock',
      description: null,
      price: 100000,
      imageKey: null,
    })

    expect(created.id).toBeGreaterThan(0)
    const found = await getProduct(created.id)
    expect(found.name).toBe('Áo test mock')
    expect(found.price).toBe(100000)
  })

  it('updates fields while keeping the id', async () => {
    const created = await createProduct({
      name: 'Áo cần sửa',
      description: 'cũ',
      price: 100000,
      imageKey: null,
    })

    const updated = await updateProduct(created.id, {
      name: 'Áo đã sửa',
      description: 'mới',
      price: 200000,
      imageKey: 'mock-uploads/ao.png',
    })

    expect(updated.id).toBe(created.id)
    expect(updated.name).toBe('Áo đã sửa')
    expect(updated.imageKey).toBe('mock-uploads/ao.png')
  })

  it('returns a key for uploads without touching the real network', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const file = new File(['png'], 'ao.png', { type: 'image/png' })

    const key = await uploadImage(file)

    expect(key).toContain('ao.png')
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
