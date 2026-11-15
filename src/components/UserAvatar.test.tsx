import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { describe, expect, it } from 'vite-plus/test'

import UserAvatar from './UserAvatar'

describe('UserAvatar', () => {
  it('hiển thị ảnh đã upload khi có src', () => {
    const html = renderToStaticMarkup(
      createElement(UserAvatar, { name: 'a@t.local', src: 'https://cdn.test/a.png' }),
    )

    expect(html).toContain('src="https://cdn.test/a.png"')
  })

  it('quay về avatar sinh từ tên khi chưa có ảnh', () => {
    const html = renderToStaticMarkup(createElement(UserAvatar, { name: 'a@t.local' }))

    expect(html).not.toContain('<img')
  })
})
