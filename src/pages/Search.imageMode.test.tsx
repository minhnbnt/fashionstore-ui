import { MemoryRouter } from 'react-router'

// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

vi.mock('@generated/endpoints/search/search', () => ({
  useSearch: vi.fn(() => ({
    data: { status: 200, data: { items: [], total: 0 } },
    isSuccess: true,
    isPending: false,
    isError: false,
  })),
  useFacets: vi.fn(() => ({ data: undefined })),
}))
vi.mock('@generated/endpoints/categories/categories', () => ({
  useListCategories: vi.fn(() => ({ data: { status: 200, data: [] } })),
}))
vi.mock('@/components/search/ImageSearchPanel', () => ({
  default: function FakePanel() {
    return <div>panel anh gia</div>
  },
}))

import Search from './Search'

afterEach(cleanup)

describe('Search — che do tim bang anh', () => {
  it('chuyen sang che do anh roi quay lai ma khong xoa query', () => {
    render(
      <MemoryRouter initialEntries={['/search?q=ao']}>
        <Search />
      </MemoryRouter>,
    )

    expect(screen.getByText('Xu hướng:')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Tìm bằng ảnh' }))

    expect(screen.getByText('panel anh gia')).toBeTruthy()
    expect(screen.queryByText('Xu hướng:')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Tìm bằng từ khóa' }))
    expect(screen.getByText('Xu hướng:')).toBeTruthy()
  })
})
