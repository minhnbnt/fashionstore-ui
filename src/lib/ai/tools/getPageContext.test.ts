// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vite-plus/test'

import { createGetPageContextTool, pageContextFromPath } from './getPageContext'

// Options bắt buộc của tool execute, test không dùng tới nội dung bên trong.
function executeOptions() {
  return { toolCallId: 'tc-test', messages: [] } as never
}

afterEach(function () {
  window.history.pushState({}, '', '/')
})

describe('pageContextFromPath', () => {
  // Bảng route → ngữ cảnh trang: mỗi dòng một nhánh của route map.
  const cases: Array<[string, Record<string, string>]> = [
    ['/', { page: 'home' }],
    ['/product/p-123', { page: 'product', productId: 'p-123' }],
    ['/shops/ao-cuoi', { page: 'shop', shopSlug: 'ao-cuoi' }],
    ['/search', { page: 'search' }],
    ['/cart', { page: 'cart' }],
    ['/wishlist', { page: 'wishlist' }],
    ['/checkout', { page: 'checkout' }],
    ['/account/orders/o-9', { page: 'order-detail', orderId: 'o-9' }],
    ['/account/orders', { page: 'orders' }],
    ['/account/addresses', { page: 'account' }],
    ['/login', { page: 'other', path: '/login' }],
    ['/khong-ton-tai', { page: 'other', path: '/khong-ton-tai' }],
  ]
  for (const [pathname, expected] of cases) {
    it('route ' + pathname + ' → ' + JSON.stringify(expected), function () {
      expect(pageContextFromPath(pathname)).toEqual(expected)
    })
  }
})

describe('createGetPageContextTool', () => {
  it('execute đọc pathname hiện tại của browser lúc gọi', async function () {
    window.history.pushState({}, '', '/cart')

    const tools = createGetPageContextTool()
    const output = await tools.execute?.({}, executeOptions())

    expect(output).toEqual({ page: 'cart' })
  })

  it('khách chuyển trang thì lần gọi sau thấy trang mới, không dính trang cũ', async function () {
    window.history.pushState({}, '', '/cart')
    const tools = createGetPageContextTool()
    await tools.execute?.({}, executeOptions())

    window.history.pushState({}, '', '/product/p-9')
    const output = await tools.execute?.({}, executeOptions())

    expect(output).toEqual({ page: 'product', productId: 'p-9' })
  })
})
