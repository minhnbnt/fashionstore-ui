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
                videoKey: 'decoration/shop-intro.mp4',
              },
            ],
          }),
        ),
      ),
    )

    // Video stream từ S3 qua imageUrl, có controls để buyer phát
    expect(html).toContain('<video')
    expect(html).toContain('shop-intro.mp4')
    expect(html).toContain('Video giới thiệu')
  })

  it('bỏ qua block VIDEO chưa có videoKey thay vì render hộp rỗng', () => {
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
                banners: [{ id: 's1', imageKey: 'banner.jpg', title: 'Xuân Hè' }],
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
