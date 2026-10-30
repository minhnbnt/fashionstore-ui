import { useEffect, useState } from 'react'
import type { PropsWithChildren } from 'react'

import { createChatSocketClient } from '@/lib/websocket'

import { useSessionQuery } from './useSession'
import { WebSocketContext } from './useWebSocket'

import type { Client } from '@stomp/stompjs'

/**
 * Giữ một kết nối STOMP cho cả app khi đã đăng nhập, tự hủy khi đăng xuất.
 * Context chỉ nhận giá trị sau khi socket CONNECT xong (onConnect).
 * Đổi token (refresh) sẽ tái tạo kết nối với token mới; thư viện tự
 * khôi phục toàn bộ subscription sau mỗi lần reconnect.
 */
export function WebSocketProvider({ children }: PropsWithChildren) {
  const session = useSessionQuery().data
  const [client, setClient] = useState<Client | null>(null)

  const token = session?.access_token
  const userId = session?.user.id

  useEffect(
    function connect() {
      if (userId === undefined || token === undefined) {
        return
      }

      // Client được tạo bất đồng bộ (stompjs lazy-load); cờ cancelled chặn case
      // unmount/đổi token diễn ra trước khi import kịp resolve.
      let cancelled = false
      let stompClient: Client | null = null

      void createChatSocketClient(token)
        .then(function (created) {
          if (cancelled) {
            return
          }
          stompClient = created
          created.onConnect = function onConnected() {
            setClient(created)
          }
          created.onWebSocketClose = function onClosed() {
            setClient(null)
          }
          created.activate()
        })
        .catch(function () {
          // Lỗi mạng/env: bỏ qua — chỉ mất realtime chat, đừng làm vỡ app.
        })

      return function cleanup() {
        cancelled = true
        if (stompClient !== null) {
          stompClient.onConnect = function () {}
          stompClient.onWebSocketClose = function () {}
          void stompClient.deactivate()
        }
      }
    },
    [userId, token],
  )

  return <WebSocketContext.Provider value={client}>{children}</WebSocketContext.Provider>
}
