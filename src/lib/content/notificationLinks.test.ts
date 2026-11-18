import { describe, expect, it } from 'vite-plus/test'

import { getTargetNotificationLink, realtimeInvalidationKeys } from './notificationLinks'

import type { NotificationResponse } from '@generated/model/notificationResponse'

describe('notificationLinks', () => {
  describe('getTargetNotificationLink', () => {
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

    it('giữ nguyên link Q&A khi có hashtag màu trong nội dung thông báo', () => {
      const item: NotificationResponse = {
        id: 'n1',
        title: 'Khách hàng đặt câu hỏi mới',
        body: 'Áo có màu #black không shop?',
        link: '/shop?shopId=s1&tab=qna&questionId=q1',
        type: 'QNA_NEW_QUESTION',
        createdAt: '2026-11-18T10:00:00Z',
      }

      const result = getTargetNotificationLink(item)
      expect(result).toBe('/shop?shopId=s1&tab=qna&questionId=q1')
    })

    it('vẫn trích xuất orderId cho thông báo đơn hàng ORDER_PLACED', () => {
      const item: NotificationResponse = {
        id: 'n2',
        title: 'Đơn hàng mới #ORD-123 đã được đặt',
        body: 'Vui lòng xác nhận đơn hàng',
        link: '/shop?shopId=s1&tab=orders',
        type: 'ORDER_PLACED',
        createdAt: '2026-11-18T10:00:00Z',
      }

      const result = getTargetNotificationLink(item)
      expect(result).toBe('/shop?shopId=s1&tab=orders&orderId=ORD-123')
    })

    it('giữ nguyên link chi tiết sản phẩm cho thông báo QNA_NEW_ANSWER', () => {
      const item: NotificationResponse = {
        id: 'n3',
        title: 'Shop đã trả lời câu hỏi của bạn',
        body: 'Dạ shop còn màu đen size L nha bạn!',
        link: '/product/p1?questionId=q1#product-qna',
        type: 'QNA_NEW_ANSWER',
        createdAt: '2026-11-18T10:00:00Z',
      }

      const result = getTargetNotificationLink(item)
      expect(result).toBe('/product/p1?questionId=q1#product-qna')
    })

    it('bỏ qua trích xuất orderId nếu link chứa tab=qna kể cả khi type không bắt đầu bằng QNA_', () => {
      const item: NotificationResponse = {
        id: 'n4',
        title: 'Thông báo chung',
        body: 'Mã tham chiếu #xyz123',
        link: '/shop?shopId=s1&tab=qna&questionId=q2',
        createdAt: '2026-11-18T10:00:00Z',
      }

      const result = getTargetNotificationLink(item)
      expect(result).toBe('/shop?shopId=s1&tab=qna&questionId=q2')
    })
  })

  describe('realtimeInvalidationKeys', () => {
    it('bổ sung query keys cho QNA_NEW_QUESTION', () => {
      const keys = realtimeInvalidationKeys('QNA_NEW_QUESTION')
      expect(keys).toContainEqual(['/api/seller/qna'])
      expect(keys).toContainEqual(['/api/products'])
    })

    it('bổ sung query keys cho QNA_NEW_ANSWER', () => {
      const keys = realtimeInvalidationKeys('QNA_NEW_ANSWER')
      expect(keys).toContainEqual(['/api/seller/qna'])
      expect(keys).toContainEqual(['/api/products'])
    })
  })
})
