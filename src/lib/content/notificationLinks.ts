import type { NotificationResponse } from '@generated/model/notificationResponse'

export function getTargetNotificationLink(item: NotificationResponse): string | null {
  if (item.link === null || item.link === undefined) {
    return null
  }
  let link = item.link
  if (link.startsWith('/shop') && !link.includes('orderId=')) {
    let orderCode: string | null = null

    if (item.title !== undefined && item.title !== null) {
      const matchHash = item.title.match(/#\s*([A-Za-z0-9-]+)/)
      if (matchHash && matchHash[1]) {
        orderCode = matchHash[1]
      } else {
        const matchOrd = item.title.match(/\b(ORD-[A-Za-z0-9]+)\b/)
        if (matchOrd && matchOrd[1]) {
          orderCode = matchOrd[1]
        }
      }
    }

    if (orderCode === null && item.body !== undefined && item.body !== null) {
      const matchHash = item.body.match(/#\s*([A-Za-z0-9-]+)/)
      if (matchHash && matchHash[1]) {
        orderCode = matchHash[1]
      } else {
        const matchOrd = item.body.match(/\b(ORD-[A-Za-z0-9]+)\b/)
        if (matchOrd && matchOrd[1]) {
          orderCode = matchOrd[1]
        }
      }
    }

    if (orderCode !== null) {
      let separator = '&'
      if (!link.includes('?')) {
        separator = '?'
      }
      link = `${link}${separator}orderId=${orderCode}`
    }
  }
  return link
}
