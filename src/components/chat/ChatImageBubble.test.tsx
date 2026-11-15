// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vite-plus/test'

import ChatImageBubble from './ChatImageBubble'

describe('ChatImageBubble', () => {
  afterEach(() => {
    cleanup()
  })

  it('hiển thị ảnh thumbnail với đúng url', () => {
    render(<ChatImageBubble url="chat/test-image.jpg" alt="Ảnh đính kèm" />)

    const img = screen.getByRole('img', { name: 'Ảnh đính kèm' }) as HTMLImageElement
    expect(img).toBeTruthy()
    expect(img.src).toContain('chat/test-image.jpg')
  })

  it('click vào ảnh mở modal phóng to, click nút đóng thì đóng modal', async () => {
    const user = userEvent.setup()
    render(<ChatImageBubble url="chat/test-image.jpg" alt="Ảnh đính kèm" />)

    expect(screen.queryByRole('dialog')).toBeNull()

    // Click mở modal
    const button = screen.getByRole('button', { name: 'Xem ảnh lớn: Ảnh đính kèm' })
    await user.click(button)

    expect(screen.getByRole('dialog')).toBeTruthy()
    const largeImg = screen.getByRole('img', { name: 'Ảnh đính kèm (phóng to)' })
    expect(largeImg).toBeTruthy()

    // Click nút đóng
    const closeBtn = screen.getByRole('button', { name: 'Đóng xem ảnh' })
    await user.click(closeBtn)

    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('nhấn phím Escape đóng modal phóng to ảnh', async () => {
    const user = userEvent.setup()
    render(<ChatImageBubble url="chat/test-image.jpg" alt="Ảnh đính kèm" />)

    await user.click(screen.getByRole('button', { name: 'Xem ảnh lớn: Ảnh đính kèm' }))
    expect(screen.getByRole('dialog')).toBeTruthy()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
