import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it } from 'vite-plus/test'

import ShopDecorationRenderer from './ShopDecorationRenderer'

describe('ShopDecorationRenderer — block VIDEO', () => {
  it('render block VIDEO đã gắn videoKey thành <video> cho buyer', () => {
    const queryClient = new QueryClient()

    const html = renderToString(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(
          MemoryRouter,
          null,
          createElement(ShopDecorationRenderer, {
            shopId: 'shop-uuid-1',
            blocks: [
              {
                id: 'b-video-1',
                type: 'VIDEO',
                title: 'Video giới thiệu',
                enabled: true,
                videoUrl: 'https://s3.test/decoration/shop-intro.mp4',
              },
            ],
          }),
        ),
      ),
    )

    // Video stream từ S3 qua urlOrPlaceholder, có controls để buyer phát
    expect(html).toContain('<video')
    expect(html).toContain('shop-intro.mp4')
    expect(html).toContain('Video giới thiệu')
  })

  it('bỏ qua block VIDEO chưa có videoUrl thay vì render hộp rỗng', () => {
    const queryClient = new QueryClient()

    const html = renderToString(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(
          MemoryRouter,
          null,
          createElement(ShopDecorationRenderer, {
            shopId: 'shop-uuid-1',
            blocks: [
              {
                id: 'b-video-empty',
                type: 'VIDEO',
                title: 'Video trống',
                enabled: true,
              },
              {
                id: 'b-banner-1',
                type: 'BANNER_SLIDER',
                title: 'Banner chính',
                enabled: true,
                banners: [{ id: 's1', imageUrl: 'https://s3.test/banner.jpg', title: 'Xuân Hè' }],
              },
            ],
          }),
        ),
      ),
    )

    // Block VIDEO rỗng → không render gì, block thật bên cạnh vẫn nguyên
    expect(html).not.toContain('<video')
    expect(html).not.toContain('Video trống')
    expect(html).toContain('banner.jpg')
    expect(html).toContain('Xuân Hè')
  })
})

function renderBlocks(
  blocks: Parameters<typeof ShopDecorationRenderer>[0]['blocks'],
  preview = false,
): string {
  const queryClient = new QueryClient()
  return renderToString(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(
        MemoryRouter,
        null,
        createElement(ShopDecorationRenderer, { shopId: 'shop-uuid-1', blocks, preview }),
      ),
    ),
  )
}

describe('ShopDecorationRenderer — banner và chế độ xem trước', () => {
  it('link javascript: trong banner không thành thẻ <a>', () => {
    const html = renderBlocks([
      {
        id: 'b-1',
        type: 'BANNER_SLIDER',
        title: 'Banner',
        enabled: true,
        banners: [{ id: 's1', imageUrl: 'https://s3.test/a.jpg', linkUrl: 'javascript:alert(1)' }],
      },
    ])
    expect(html).toContain('a.jpg')
    expect(html).not.toContain('javascript:')
    expect(html).not.toContain('<a ')
  })

  it('slide chưa có ảnh bị bỏ với khách, còn xem trước thì hiện khung gợi ý', () => {
    const block = {
      id: 'b-empty',
      type: 'BANNER_SLIDER' as const,
      title: 'Banner trống',
      enabled: true,
      banners: [{ id: 's1', imageUrl: '' }],
    }

    expect(renderBlocks([block])).not.toContain('Banner trống')
    expect(renderBlocks([block], true)).toContain('Chưa có ảnh nào')
  })

  it('xem trước hiện khung gợi ý cho video chưa tải', () => {
    const html = renderBlocks(
      [{ id: 'v', type: 'VIDEO', title: 'Video shop', enabled: true }],
      true,
    )
    expect(html).toContain('Video shop')
    expect(html).toContain('Chưa tải video lên')
  })
})
