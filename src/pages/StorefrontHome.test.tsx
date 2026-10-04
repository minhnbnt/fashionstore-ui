import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { listProducts } from '@/lib/api'
import type { Product } from '@/lib/api'
import StorefrontHome from '@/pages/StorefrontHome'

vi.mock('@/lib/api', () => ({
  listProducts: vi.fn(),
}))

const listMock = vi.mocked(listProducts)

const SAMPLE: Product[] = [
  {
    id: 1,
    name: 'Áo sơ mi lụa trắng',
    description: null,
    price: 890000,
    imageKey: 'mock/ao.jpg',
    createdAt: '2026-10-04T00:00:00Z',
    updatedAt: '2026-10-04T00:00:00Z',
  },
  {
    id: 2,
    name: 'Váy midi đen',
    description: null,
    price: 1250000,
    imageKey: 'mock/vay.jpg',
    createdAt: '2026-10-04T00:00:00Z',
    updatedAt: '2026-10-04T00:00:00Z',
  },
]

function renderHome() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/']}>
        <StorefrontHome />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('StorefrontHome', () => {
  async function grid() {
    const region = await screen.findByRole('region', { name: 'Tất cả sản phẩm' })
    return within(region)
  }

  it('renders hero, product grid and footer commitments', async () => {
    listMock.mockResolvedValue(SAMPLE)
    renderHome()

    expect((await grid()).getByText('Áo sơ mi lụa trắng')).toBeInTheDocument()
    expect(screen.getByText('2 sản phẩm')).toBeInTheDocument()
  })

  it('filters by search text', async () => {
    const user = userEvent.setup()
    listMock.mockResolvedValue(SAMPLE)
    renderHome()

    await user.type(await screen.findByPlaceholderText('Tìm sản phẩm…'), 'váy')

    expect((await grid()).queryByText('Áo sơ mi lụa trắng')).not.toBeInTheDocument()
    expect((await grid()).getByText('Váy midi đen')).toBeInTheDocument()
  })

  it('links each card to its PDP', async () => {
    listMock.mockResolvedValue(SAMPLE)
    renderHome()

    const card = (await grid()).getByRole('link', { name: /Áo sơ mi lụa trắng/ })
    expect(card).toHaveAttribute('href', '/products/1')
  })
})
