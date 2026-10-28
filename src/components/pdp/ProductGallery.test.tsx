// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vite-plus/test'

import ProductGallery from './ProductGallery'

// Mỗi test trả mảng mới để tránh chia tham chiếu giữa các test
function images() {
  return [
    { id: 'img-1', s3Key: 'products/ao-so-mi-1.jpg', sortOrder: 0 },
    { id: 'img-2', s3Key: 'products/ao-so-mi-2.jpg', sortOrder: 1 },
  ]
}

afterEach(cleanup)

describe('ProductGallery — video sản phẩm (DOM)', () => {
  it('render video làm slot đầu gallery khi sản phẩm có videoKey', () => {
    const { container } = render(
      <ProductGallery name="Áo Sơ Mi Lụa" videoKey="products/ao-so-mi.mp4" images={images()} />,
    )

    // Vùng chính là <video> stream từ key S3
    const video = container.querySelector('video')
    expect(video).not.toBeNull()
    expect(video?.getAttribute('src')).toContain('ao-so-mi.mp4')
    expect(video?.hasAttribute('controls')).toBe(true)
    // Thumbnail strip có đủ: video + 2 ảnh
    expect(screen.getByRole('button', { name: 'Video sản phẩm' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Ảnh 1' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Ảnh 2' })).toBeTruthy()
  })

  it('click thumbnail ảnh → vùng chính đổi sang ảnh; click video → đổi ngược lại', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <ProductGallery name="Áo Sơ Mi Lụa" videoKey="products/ao-so-mi.mp4" images={images()} />,
    )

    await user.click(screen.getByRole('button', { name: 'Ảnh 2' }))
    const mainImg = screen.getByAltText('Áo Sơ Mi Lụa')
    expect(mainImg.getAttribute('src')).toContain('ao-so-mi-2.jpg')
    expect(container.querySelector('video')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Video sản phẩm' }))
    expect(container.querySelector('video')?.getAttribute('src')).toContain('ao-so-mi.mp4')
    expect(screen.queryByAltText('Áo Sơ Mi Lụa')).toBeNull()
  })

  it('chỉ có video không có ảnh → hiện video thay vì "Chưa có ảnh"', () => {
    const { container } = render(
      <ProductGallery name="Áo Sơ Mi Lụa" videoKey="products/ao-so-mi.mp4" images={[]} />,
    )

    expect(container.querySelector('video')).not.toBeNull()
    expect(container.querySelector('video')?.getAttribute('src')).toContain('ao-so-mi.mp4')
    expect(container.textContent).not.toContain('Chưa có ảnh')
  })

  it('không có videoKey → gallery như cũ, không có thẻ video', () => {
    const { container } = render(
      <ProductGallery
        name="Áo Sơ Mi Lụa"
        images={[{ id: 'img-1', s3Key: 'products/ao-so-mi-1.jpg', sortOrder: 0 }]}
      />,
    )

    expect(container.querySelector('video')).toBeNull()
    expect(screen.getByAltText('Áo Sơ Mi Lụa').getAttribute('src')).toContain('ao-so-mi-1.jpg')
  })
})
