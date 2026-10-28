import { createElement } from 'react'
import { renderToString } from 'react-dom/server'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'

import LocationAddressSelector from './LocationAddressSelector'

vi.mock('@generated/endpoints/locations/locations', () => ({
  useListProvinces: vi.fn(() => ({
    data: {
      data: [
        { code: '01', name: 'Thành phố Hà Nội' },
        { code: '79', name: 'Thành phố Hồ Chí Minh' },
      ],
    },
    isPending: false,
  })),
  useListWards: vi.fn(() => ({
    data: {
      data: [
        { code: '001', name: 'Phường Dịch Vọng Hậu' },
        { code: '002', name: 'Phường Tràng Tiền' },
      ],
    },
    isPending: false,
  })),
}))

describe('LocationAddressSelector', () => {
  it('khi value chi co tinh thanh thi khong duoc dien xuong o so nha detail', () => {
    const queryClient = new QueryClient()

    const html = renderToString(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(LocationAddressSelector, {
          value: 'Thành phố Hà Nội',
          onChange: vi.fn(),
          idPrefix: 'test-addr',
        }),
      ),
    )

    // Ô tìm kiếm Tỉnh/TP phải có value là 'Thành phố Hà Nội'
    expect(html).toContain('value="Thành phố Hà Nội"')
    // Ô input detail không được chứa value="Thành phố Hà Nội"
    expect(html).not.toMatch(/id="test-addr-detail"[^>]*value="Thành phố Hà Nội"/)
  })

  it('khi value day du 3 phan thi hien thi dung ca 3 truong', () => {
    const queryClient = new QueryClient()

    const html = renderToString(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(LocationAddressSelector, {
          value: 'Số 18 Duy Tân, Phường Dịch Vọng Hậu, Thành phố Hà Nội',
          onChange: vi.fn(),
          idPrefix: 'test-addr-full',
        }),
      ),
    )

    expect(html).toContain('value="Thành phố Hà Nội"')
    expect(html).toContain('value="Phường Dịch Vọng Hậu"')
    expect(html).toContain('value="Số 18 Duy Tân"')
  })
})
