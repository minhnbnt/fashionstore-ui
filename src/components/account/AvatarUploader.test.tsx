// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import AvatarUploader from './AvatarUploader'

vi.mock('@generated/endpoints/users/users', () => ({
  getMeQueryKey: vi.fn(() => ['me']),
  useChangeAvatar: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}))

afterEach(cleanup)

describe('AvatarUploader', () => {
  it('mở modal xem avatar khi bấm avatar, kèm nút đổi ảnh', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <QueryClientProvider client={new QueryClient()}>
        <AvatarUploader name="a@t.local" avatarUrl="https://s3.test/avatar.png" />
      </QueryClientProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'Xem ảnh đại diện' }))

    const dialog = screen.getByRole('dialog')
    expect(dialog.textContent).toContain('Ảnh đại diện')
    expect(screen.getByRole('button', { name: 'Đổi ảnh đại diện' })).toBeTruthy()
    // Portal ra body để không bị .glass (backdrop-filter) làm containing block
    expect(container.contains(dialog)).toBe(false)
  })
})
