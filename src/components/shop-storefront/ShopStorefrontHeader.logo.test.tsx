// @vitest-environment happy-dom
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vite-plus/test'

import ShopStorefrontHeader from './ShopStorefrontHeader'

import type { ShopResponse } from '@generated/model/shopResponse'

function shopWithBrokenLogo(): ShopResponse {
  // logoKey có giá trị nhưng object 404 trên S3 (case shop import từ marketplace)
  return {
    id: 'shop-uuid-2',
    name: 'Shopee & Lazada Import',
    slug: 'browser-marketplace-import',
    logoKey: 'seeds/market-logo.webp',
    bannerKey: 'seeds/market-banner.webp',
  }
}

describe('ShopStorefrontHeader — logo load lỗi', () => {
  afterEach(cleanup)

  it('logo 404 thì fallback sang avatar generated, không dùng ảnh placeholder', async () => {
    const { container } = render(
      <ShopStorefrontHeader
        shop={shopWithBrokenLogo()}
        activeTab="HOME"
        onTabChange={function () {}}
      />,
    )

    const logoBox = container.querySelector('div.h-28')
    expect(logoBox).not.toBeNull()
    expect(logoBox?.querySelector('img')).not.toBeNull()

    // Object 404 trên S3 → trình duyệt bắn error cho <img> logo
    fireEvent.error(logoBox?.querySelector('img') as Element)

    await waitFor(function () {
      // Logo img biến mất, thay bằng svg avatar generated của UserAvatar
      expect(logoBox?.querySelector('img')).toBeNull()
      expect(logoBox?.querySelector('span[aria-hidden="true"] svg')).not.toBeNull()
    })
  })
})
