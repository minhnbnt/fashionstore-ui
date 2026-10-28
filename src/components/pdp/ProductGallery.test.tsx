import { createElement } from 'react'
import { renderToString } from 'react-dom/server'

import { describe, expect, it } from 'vitest'

import ProductGallery from './ProductGallery'

describe('ProductGallery — video sản phẩm', () => {
  it('render video làm slot đầu gallery khi sản phẩm có videoKey', () => {
    const html = renderToString(
      createElement(ProductGallery, {
        name: 'Áo Sơ Mi Lụa',
        videoKey: 'products/ao-so-mi.mp4',
        images: [
          { id: 'img-1', s3Key: 'products/ao-so-mi-1.jpg', sortOrder: 0 },
          { id: 'img-2', s3Key: 'products/ao-so-mi-2.jpg', sortOrder: 1 },
        ],
      }),
    )

    expect(html).toContain('<video')
    expect(html).toContain('ao-so-mi.mp4')
    // Ảnh vẫn render đầy đủ (thumbnail strip)
    expect(html).toContain('ao-so-mi-1.jpg')
    expect(html).toContain('ao-so-mi-2.jpg')
  })

  it('chỉ có video không có ảnh → hiện video thay vì "Chưa có ảnh"', () => {
    const html = renderToString(
      createElement(ProductGallery, {
        name: 'Áo Sơ Mi Lụa',
        videoKey: 'products/ao-so-mi.mp4',
        images: [],
      }),
    )

    expect(html).toContain('<video')
    expect(html).toContain('ao-so-mi.mp4')
    expect(html).not.toContain('Chưa có ảnh')
  })

  it('không có videoKey → gallery như cũ, không có thẻ video', () => {
    const html = renderToString(
      createElement(ProductGallery, {
        name: 'Áo Sơ Mi Lụa',
        images: [{ id: 'img-1', s3Key: 'products/ao-so-mi-1.jpg', sortOrder: 0 }],
      }),
    )

    expect(html).not.toContain('<video')
    expect(html).toContain('ao-so-mi-1.jpg')
  })
})
