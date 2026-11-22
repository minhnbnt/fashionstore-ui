import { createContext, useContext, useEffect, useRef } from 'react'

import type { Client, IMessage, StompSubscription } from '@stomp/stompjs'

export const WebSocketContext = createContext<Client | null>(null)

export type WebSocketMessageHandler = (message: IMessage) => void

/**
 * Subscribe một destination của socket đang kết nối; tự hủy subscription khi
 * unmount hoặc đổi destination. Callback giữ qua ref nên không bị resubscribe
 * khi component re-render.
 */
export function useWebSocket(destination: string, onMessage: WebSocketMessageHandler) {
  const client = useContext(WebSocketContext)
  const handlerRef = useRef(onMessage)

  useEffect(
    function syncHandler() {
      handlerRef.current = onMessage
    },
    [onMessage],
  )

  useEffect(
    function subscribe() {
      if (client === null || destination === '' || client.connected === false) {
        return
      }

      let subscription: StompSubscription | null = null
      try {
        subscription = client.subscribe(destination, function (message: IMessage) {
          handlerRef.current(message)
        })
      } catch {
        // Kết nối STOMP vừa đóng ngay trước khi effect chạy; bỏ qua để không vỡ UI.
        return
      }

      return function cleanup() {
        if (subscription === null || client.connected === false) {
          return
        }
        try {
          subscription.unsubscribe()
        } catch {
          // Socket đã đóng trước khi unmount; broker tự dọn subscription.
        }
      }
    },
    [client, destination],
  )
}
