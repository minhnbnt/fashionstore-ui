import type { Client } from '@stomp/stompjs'

/** Đổi base URL API (http…) thành URL WebSocket endpoint /ws của backend. */
export function chatSocketUrl(): string {
  const apiUrl = import.meta.env.VITE_API_URL as string | undefined
  if (apiUrl === undefined || apiUrl === '') {
    throw new Error('Thiếu VITE_API_URL trong .env')
  }
  return apiUrl.replace(/^http/, 'ws') + '/ws'
}

/**
 * Tạo STOMP client đính kèm JWT; thư viện tự reconnect mỗi 5s khi mất kết nối.
 * stompjs được import động — 68KB chỉ tải lúc thật sự tạo kết nối, không nằm
 * trong bundle chính (khách chưa đăng nhập không bao giờ tải).
 */
export async function createChatSocketClient(token: string): Promise<Client> {
  const { Client } = await import('@stomp/stompjs')
  return new Client({
    brokerURL: chatSocketUrl(),
    connectHeaders: {
      Authorization: `Bearer ${token}`,
    },
  })
}
