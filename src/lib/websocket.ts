import { Client } from '@stomp/stompjs'

/** Đổi base URL API (http…) thành URL WebSocket endpoint /ws của backend. */
export function chatSocketUrl(): string {
  const apiUrl = import.meta.env.VITE_API_URL as string | undefined
  if (apiUrl === undefined || apiUrl === '') {
    throw new Error('Thiếu VITE_API_URL trong .env')
  }
  return apiUrl.replace(/^http/, 'ws') + '/ws'
}

/** Tạo STOMP client đính kèm JWT; thư viện tự reconnect mỗi 5s khi mất kết nối. */
export function createChatSocketClient(token: string): Client {
  return new Client({
    brokerURL: chatSocketUrl(),
    connectHeaders: {
      Authorization: `Bearer ${token}`,
    },
  })
}
