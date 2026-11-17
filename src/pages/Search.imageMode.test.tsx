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
  default: function FakePanel(props: {
    onResults: (hits: { id: string }[]) => void
    onClear: () => void
  }) {
    return (
      <div>
        <div>panel anh gia</div>
        <button type="button" onClick={() => props.onResults([{ id: 'p1' }])}>
          tra ket qua
        </button>
        <button type="button" onClick={() => props.onClear()}>
          xoa ket qua
        </button>
      </div>
    )
  },
}))
vi.mock('../components/home/Sections', () => ({
  ProductCard: function FakeCard(props: { item: { id?: string } }) {
    return <div>card {props.item.id}</div>
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

  it('don ket qua anh khi quay lai che do text', () => {
    render(
      <MemoryRouter initialEntries={['/search']}>
        <Search />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Tìm bằng ảnh' }))
    fireEvent.click(screen.getByRole('button', { name: 'tra ket qua' }))
    expect(screen.getByText('card p1')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Tìm bằng từ khóa' }))
    fireEvent.click(screen.getByRole('button', { name: 'Tìm bằng ảnh' }))
    expect(screen.queryByText('card p1')).toBeNull()
  })
})
