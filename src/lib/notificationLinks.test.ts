import { describe, expect, it } from 'vite-plus/test'

import { getTargetNotificationLink } from './notificationLinks'

import type { NotificationResponse } from '@generated/model/notificationResponse'

describe('notificationLinks', () => {
  it('extracts orderId from title if link is /shop?tab=orders without orderId', () => {
    const item: NotificationResponse = {
      id: 'notif-1',
      category: 'SELLING',
      type: 'ORDER_PLACED',
      title: 'Có đơn hàng mới #ORD-84F2B019',
      body: 'Khách hàng vừa đặt đơn #ORD-84F2B019 tại shop của bạn.',
      link: '/shop?tab=orders',
      createdAt: '2026-10-26T10:00:00Z',
    }

    const resolved = getTargetNotificationLink(item)
    expect(resolved).toBe('/shop?tab=orders&orderId=ORD-84F2B019')
  })

  it('extracts orderId from body if title does not have hash code', () => {
    const item: NotificationResponse = {
      id: 'notif-body',
      category: 'SELLING',
      type: 'ORDER_PLACED',
      title: 'Có đơn hàng mới',
      body: 'Khách hàng vừa đặt đơn #ORD-9999 tại shop của bạn.',
      link: '/shop?tab=orders',
      createdAt: '2026-10-26T10:00:00Z',
    }

    const resolved = getTargetNotificationLink(item)
    expect(resolved).toBe('/shop?tab=orders&orderId=ORD-9999')
  })

  it('extracts ORD code directly without hash prefix', () => {
    const item: NotificationResponse = {
      id: 'notif-nohash',
      category: 'SELLING',
      type: 'ORDER_PLACED',
      title: 'Đơn hàng ORD-122E4658 mới',
      body: 'Khách hàng đặt hàng',
      link: '/shop?tab=orders',
      createdAt: '2026-10-26T10:00:00Z',
    }

    const resolved = getTargetNotificationLink(item)
    expect(resolved).toBe('/shop?tab=orders&orderId=ORD-122E4658')
  })

  it('preserves link when orderId is already present in url', () => {
    const item: NotificationResponse = {
      id: 'notif-2',
      category: 'SELLING',
      type: 'ORDER_PLACED',
      title: 'Có đơn hàng mới #ORD-84F2B019',
      body: 'Khách hàng vừa đặt đơn',
      link: '/shop?shopId=shop-1&tab=orders&orderId=uuid-1',
      createdAt: '2026-10-26T10:00:00Z',
    }

    const resolved = getTargetNotificationLink(item)
    expect(resolved).toBe('/shop?shopId=shop-1&tab=orders&orderId=uuid-1')
  })

  it('returns null if item has no link', () => {
    const item: NotificationResponse = {
      id: 'notif-3',
      category: 'ACTIVITY',
      type: 'CHAT_MESSAGE',
      title: 'Tin nhắn mới',
      body: 'Xin chào',
      link: undefined,
      createdAt: '2026-10-26T10:00:00Z',
    }

    expect(getTargetNotificationLink(item)).toBeNull()
  })
})
