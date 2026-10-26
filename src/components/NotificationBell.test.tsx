import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router'

import { describe, expect, it, vi } from 'vitest'

import NotificationBell from './NotificationBell'

import type { NotificationResponse } from '@generated/model/notificationResponse'

vi.mock('@tanstack/react-query', async () => {
  const actual =
    await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query')
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: vi.fn(),
    }),
  }
})

vi.mock('@/hooks/useSession', () => ({
  useSessionQuery: () => ({
    data: { id: 'user-1', name: 'Test User' },
  }),
}))

vi.mock('@/hooks/useWebSocket', () => ({
  useWebSocket: vi.fn(),
}))

vi.mock('@generated/endpoints/notifications/notifications', () => ({
  useGetUnreadNotificationCount: vi.fn(),
  useListNotifications: vi.fn(),
  useMarkNotificationRead: () => ({ mutate: vi.fn() }),
  useMarkAllNotificationsRead: () => ({ mutate: vi.fn() }),
  useDeleteNotification: () => ({ mutate: vi.fn() }),
  getListNotificationsQueryKey: vi.fn(),
  getGetUnreadNotificationCountQueryKey: vi.fn(),
}))

import {
  useGetUnreadNotificationCount,
  useListNotifications,
} from '@generated/endpoints/notifications/notifications'

describe('NotificationBell', () => {
  it('rendersTabsWhenCategoriesProvided', () => {
    vi.mocked(useGetUnreadNotificationCount).mockReturnValue({
      data: { status: 200, data: { unread: 0 } },
    } as unknown as ReturnType<typeof useGetUnreadNotificationCount>)

    vi.mocked(useListNotifications).mockReturnValue({
      data: { status: 200, data: { items: [], total: 0 } },
    } as unknown as ReturnType<typeof useListNotifications>)

    const html = renderToString(
      createElement(
        MemoryRouter,
        null,
        createElement(NotificationBell, {
          categories: ['ORDER', 'ACTIVITY'],
          defaultOpen: true,
        }),
      ),
    )

    expect(html).toContain('Đơn hàng')
    expect(html).toContain('Hoạt động')
    expect(html).not.toContain('Bán hàng')
  })

  it('rendersUnreadBadgeOnTabsWhenCountsGreaterThanZero', () => {
    vi.mocked(useGetUnreadNotificationCount).mockReturnValue({
      data: { status: 200, data: { unread: 5, byCategory: { ORDER: 2, ACTIVITY: 3 } } },
    } as unknown as ReturnType<typeof useGetUnreadNotificationCount>)

    vi.mocked(useListNotifications).mockReturnValue({
      data: { status: 200, data: { items: [], total: 0 } },
    } as unknown as ReturnType<typeof useListNotifications>)

    const html = renderToString(
      createElement(
        MemoryRouter,
        null,
        createElement(NotificationBell, {
          categories: ['ORDER', 'ACTIVITY'],
          defaultOpen: true,
        }),
      ),
    )

    expect(html).toContain('Đơn hàng')
    expect(html).toContain('Hoạt động')
    expect(html).toContain('>2</span>')
    expect(html).toContain('>3</span>')
  })

  it('hidesUnreadBadgeOnTabsWhenCountIsZero', () => {
    vi.mocked(useGetUnreadNotificationCount).mockReturnValue({
      data: { status: 200, data: { unread: 1, byCategory: { ORDER: 0, ACTIVITY: 1 } } },
    } as unknown as ReturnType<typeof useGetUnreadNotificationCount>)

    vi.mocked(useListNotifications).mockReturnValue({
      data: { status: 200, data: { items: [], total: 0 } },
    } as unknown as ReturnType<typeof useListNotifications>)

    const html = renderToString(
      createElement(
        MemoryRouter,
        null,
        createElement(NotificationBell, {
          categories: ['ORDER', 'ACTIVITY'],
          defaultOpen: true,
        }),
      ),
    )

    expect(html).toContain('>1</span>')
    expect(html).not.toContain('>0</span>')
  })

  it('rendersCapAt99PlusOnTabs', () => {
    vi.mocked(useGetUnreadNotificationCount).mockReturnValue({
      data: { status: 200, data: { unread: 120, byCategory: { ORDER: 120 } } },
    } as unknown as ReturnType<typeof useGetUnreadNotificationCount>)

    vi.mocked(useListNotifications).mockReturnValue({
      data: { status: 200, data: { items: [], total: 0 } },
    } as unknown as ReturnType<typeof useListNotifications>)

    const html = renderToString(
      createElement(
        MemoryRouter,
        null,
        createElement(NotificationBell, {
          categories: ['ORDER', 'ACTIVITY'],
          defaultOpen: true,
        }),
      ),
    )

    expect(html).toContain('>99+</span>')
  })

  it('singleCategoryRendersNoTabs', () => {
    const item: NotificationResponse = {
      id: 'notif-1',
      category: 'SELLING',
      type: 'ORDER_PLACED',
      title: 'Có đơn hàng mới #101',
      body: 'Khách hàng vừa đặt đơn #101',
      createdAt: '2026-10-24T10:00:00Z',
    }

    vi.mocked(useGetUnreadNotificationCount).mockReturnValue({
      data: { status: 200, data: { unread: 1 } },
    } as unknown as ReturnType<typeof useGetUnreadNotificationCount>)

    vi.mocked(useListNotifications).mockReturnValue({
      data: { status: 200, data: { items: [item], total: 1 } },
    } as unknown as ReturnType<typeof useListNotifications>)

    const html = renderToString(
      createElement(
        MemoryRouter,
        null,
        createElement(NotificationBell, {
          categories: ['SELLING'],
          defaultOpen: true,
        }),
      ),
    )

    expect(html).not.toContain('Bán hàng')
    expect(html).toContain('Có đơn hàng mới #101')
  })

  it('legacyModeRendersNoTabs', () => {
    vi.mocked(useGetUnreadNotificationCount).mockReturnValue({
      data: { status: 200, data: { unread: 0 } },
    } as unknown as ReturnType<typeof useGetUnreadNotificationCount>)

    vi.mocked(useListNotifications).mockReturnValue({
      data: { status: 200, data: { items: [], total: 0 } },
    } as unknown as ReturnType<typeof useListNotifications>)

    const html = renderToString(
      createElement(MemoryRouter, null, createElement(NotificationBell, { defaultOpen: true })),
    )

    expect(html).not.toContain('Đơn hàng')
    expect(html).not.toContain('Hoạt động')
    expect(html).not.toContain('Bán hàng')
  })

  it('unreadBadgeShowsCount', () => {
    vi.mocked(useGetUnreadNotificationCount).mockReturnValue({
      data: { status: 200, data: { unread: 2 } },
    } as unknown as ReturnType<typeof useGetUnreadNotificationCount>)

    vi.mocked(useListNotifications).mockReturnValue({
      data: { status: 200, data: { items: [], total: 0 } },
    } as unknown as ReturnType<typeof useListNotifications>)

    const html = renderToString(
      createElement(MemoryRouter, null, createElement(NotificationBell, null)),
    )

    expect(html).toContain('2')
  })

  it('readItemRendersDimmed', () => {
    const item: NotificationResponse = {
      id: 'notif-read',
      category: 'ORDER',
      type: 'ORDER_CONFIRMED',
      title: 'Đơn đã xác nhận',
      body: 'Shop đã xác nhận đơn',
      readAt: '2026-10-24T12:00:00Z',
      createdAt: '2026-10-24T10:00:00Z',
    }

    vi.mocked(useGetUnreadNotificationCount).mockReturnValue({
      data: { status: 200, data: { unread: 0 } },
    } as unknown as ReturnType<typeof useGetUnreadNotificationCount>)

    vi.mocked(useListNotifications).mockReturnValue({
      data: { status: 200, data: { items: [item], total: 1 } },
    } as unknown as ReturnType<typeof useListNotifications>)

    const html = renderToString(
      createElement(MemoryRouter, null, createElement(NotificationBell, { defaultOpen: true })),
    )

    expect(html).toContain('opacity-80')
  })
})
