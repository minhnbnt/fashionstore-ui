import { MemoryRouter, useLocation } from 'react-router'

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

function LocationProbe() {
  const location = useLocation()
  return <p data-testid="probe">{location.pathname + location.search}</p>
}

afterEach(cleanup)

describe('Search — che do tim bang anh', () => {
  it('chuyen sang che do anh roi quay lai ma khong xoa query', () => {
    render(
      <MemoryRouter initialEntries={['/search?q=ao']}>
        <Search />
        <LocationProbe />
      </MemoryRouter>,
    )

    expect(screen.getByText('Xu hướng:')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Tìm bằng ảnh' }))

    expect(screen.getByText('panel anh gia')).toBeTruthy()
    expect(screen.queryByText('Xu hướng:')).toBeNull()
    expect(screen.getByTestId('probe').textContent).toBe('/search?q=ao&by-image=1')

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

  it('mo /search?by-image=1 thi vao ngay che do anh', () => {
    render(
      <MemoryRouter initialEntries={['/search?by-image=1']}>
        <Search />
        <LocationProbe />
      </MemoryRouter>,
    )

    expect(screen.getByText('panel anh gia')).toBeTruthy()
    expect(screen.queryByText('Xu hướng:')).toBeNull()
  })

  it('quay lai che do text thi bo by-image khoi URL va giu q', () => {
    render(
      <MemoryRouter initialEntries={['/search?q=ao&by-image=1']}>
        <Search />
        <LocationProbe />
      </MemoryRouter>,
    )

    expect(screen.getByText('panel anh gia')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Tìm bằng từ khóa' }))

    expect(screen.getByText('Xu hướng:')).toBeTruthy()
    expect(screen.getByTestId('probe').textContent).toBe('/search?q=ao')
  })
})
