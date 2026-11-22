// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import { ConfirmDialog } from './ConfirmDialog'

describe('ConfirmDialog', () => {
  afterEach(function () {
    cleanup()
  })

  it('không render khi open = false', function () {
    render(
      <ConfirmDialog
        open={false}
        title="Xóa sản phẩm"
        description="Bạn có chắc chắn muốn xóa?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.queryByText('Xóa sản phẩm')).toBeNull()
  })

  it('hiển thị tiêu đề, mô tả và kích hoạt onConfirm / onCancel', function () {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()

    render(
      <ConfirmDialog
        open
        title="Xác nhận đặt hàng"
        description="Đơn hàng sẽ được gửi tới shop ngay lập tức."
        confirmLabel="Đặt ngay"
        cancelLabel="Quay lại"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    )

    expect(screen.getByText('Xác nhận đặt hàng')).toBeTruthy()
    expect(screen.getByText('Đơn hàng sẽ được gửi tới shop ngay lập tức.')).toBeTruthy()

    const confirmBtn = screen.getByRole('button', { name: 'Đặt ngay' })
    expect(confirmBtn.className).toContain('btn-primary')
    fireEvent.click(confirmBtn)
    expect(onConfirm).toHaveBeenCalledTimes(1)

    const cancelBtn = screen.getByRole('button', { name: 'Quay lại' })
    fireEvent.click(cancelBtn)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('dùng style nguy hiểm khi variant = danger', function () {
    render(
      <ConfirmDialog
        open
        title="Gỡ sản phẩm"
        description="Hành động này không thể hoàn tác."
        variant="danger"
        confirmLabel="Gỡ ngay"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    const confirmBtn = screen.getByRole('button', { name: 'Gỡ ngay' })
    expect(confirmBtn.className).toContain('bg-rose-600')
    expect(confirmBtn.className).not.toContain('btn-primary')
  })

  it('khóa nút và chặn đóng khi isPending = true', function () {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()

    render(
      <ConfirmDialog
        open
        title="Đang hủy đơn"
        description="Vui lòng chờ giây lát."
        isPending
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    )

    const confirmBtn = screen.getByRole('button', { name: 'Xác nhận' }) as HTMLButtonElement
    const cancelBtn = screen.getByRole('button', { name: 'Hủy' }) as HTMLButtonElement
    expect(confirmBtn.disabled).toBe(true)
    expect(cancelBtn.disabled).toBe(true)

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onCancel).not.toHaveBeenCalled()
  })
})
