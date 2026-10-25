import { createContext, useContext, useEffect, useRef } from 'react'

import type { Client, IMessage } from '@stomp/stompjs'

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
      if (client === null || destination === '') {
        return
      }

      const subscription = client.subscribe(destination, function (message) {
        handlerRef.current(message)
      })

      return function cleanup() {
        subscription.unsubscribe()
      }
    },
    [client, destination],
  )
}
