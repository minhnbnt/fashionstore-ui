// @vitest-environment happy-dom
import { useContext } from 'react'

import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { useWebSocket, WebSocketContext } from './useWebSocket'
import { WebSocketProvider } from './WebSocketProvider'

import type { Client, IFrame, IMessage } from '@stomp/stompjs'

class MockStompClient {
  connected = false
  deactivated = false
  onConnect: (frame: IFrame) => void = function () {}
  onDisconnect: (frame: IFrame) => void = function () {}
  onWebSocketClose: (evt: unknown) => void = function () {}
  subscribeCalls = 0
  unsubscribeCalls = 0

  activate() {
    this.connected = true
    this.onConnect({} as IFrame)
  }

  async deactivate() {
    this.deactivated = true
    this.connected = false
    this.onWebSocketClose({})
  }

  subscribe(_destination: string, _callback: (message: IMessage) => void) {
    if (this.connected === false) {
      throw new TypeError('There is no underlying STOMP connection')
    }
    this.subscribeCalls += 1
    return {
      id: `sub-${this.subscribeCalls}`,
      unsubscribe: () => {
        if (this.connected === false) {
          throw new TypeError('There is no underlying STOMP connection')
        }
        this.unsubscribeCalls += 1
      },
    }
  }
}

const { createdClients, createChatSocketClientMock, sessionState } = vi.hoisted(() => ({
  createdClients: [] as MockStompClient[],
  createChatSocketClientMock: vi.fn<(token: string) => Promise<Client>>(),
  sessionState: {
    data: null as { access_token: string; user: { id: string } } | null,
  },
}))

vi.mock('@/lib/api/websocket', () => ({
  createChatSocketClient: createChatSocketClientMock,
}))

vi.mock('./useSession', () => ({
  useSessionQuery: () => ({ data: sessionState.data }),
}))

function ContextProbe() {
  const client = useContext(WebSocketContext)
  if (client === null) {
    return <span data-testid="ws-status">disconnected</span>
  }
  return <span data-testid="ws-status">connected</span>
}

function StorefrontSubscriber() {
  useWebSocket('/user/queue/notifications', function () {})
  return <div data-testid="storefront-subscriber">mounted</div>
}

beforeEach(() => {
  createdClients.length = 0
  sessionState.data = null
  createChatSocketClientMock.mockReset()
  createChatSocketClientMock.mockImplementation(async function () {
    const mockClient = new MockStompClient()
    createdClients.push(mockClient)
    return mockClient as unknown as Client
  })
})

afterEach(cleanup)

describe('WebSocketProvider & useWebSocket lifecycle', () => {
  it('clears STOMP client on sign out so newly mounted storefront subscribers do not crash', async () => {
    sessionState.data = {
      access_token: 'seller-token-1',
      user: { id: 'seller-1' },
    }

    const { rerender } = render(
      <WebSocketProvider>
        <ContextProbe />
      </WebSocketProvider>,
    )

    await waitFor(function () {
      expect(screen.getByTestId('ws-status').textContent).toBe('connected')
    })
    expect(createdClients).toHaveLength(1)
    const firstClient = createdClients[0]

    // Simulate signing out from /shop: session becomes null and storefront chrome mounts
    sessionState.data = null
    await act(async function () {
      rerender(
        <WebSocketProvider>
          <ContextProbe />
          <StorefrontSubscriber />
        </WebSocketProvider>,
      )
    })

    expect(firstClient.deactivated).toBe(true)
    expect(screen.getByTestId('ws-status').textContent).toBe('disconnected')
    expect(screen.getByTestId('storefront-subscriber').textContent).toBe('mounted')
  })

  it('drops stale client immediately when token changes until new socket connects', async () => {
    sessionState.data = {
      access_token: 'token-1',
      user: { id: 'seller-1' },
    }

    let resolveSecondClient: ((client: Client) => void) | null = null
    createChatSocketClientMock
      .mockImplementationOnce(async function () {
        const mockClient = new MockStompClient()
        createdClients.push(mockClient)
        return mockClient as unknown as Client
      })
      .mockImplementationOnce(function () {
        return new Promise<Client>(function (resolve) {
          resolveSecondClient = resolve
        })
      })

    const { rerender } = render(
      <WebSocketProvider>
        <ContextProbe />
      </WebSocketProvider>,
    )

    await waitFor(function () {
      expect(screen.getByTestId('ws-status').textContent).toBe('connected')
    })

    sessionState.data = {
      access_token: 'token-2',
      user: { id: 'seller-1' },
    }
    await act(async function () {
      rerender(
        <WebSocketProvider>
          <ContextProbe />
        </WebSocketProvider>,
      )
    })

    expect(createdClients[0].deactivated).toBe(true)
    expect(screen.getByTestId('ws-status').textContent).toBe('disconnected')

    const secondClient = new MockStompClient()
    createdClients.push(secondClient)
    await act(async function () {
      resolveSecondClient?.(secondClient as unknown as Client)
    })

    await waitFor(function () {
      expect(screen.getByTestId('ws-status').textContent).toBe('connected')
    })
  })

  it('useWebSocket does not throw when context client is already disconnected on subscribe or unmount', () => {
    const disconnectedClient = new MockStompClient()
    disconnectedClient.connected = false

    expect(function () {
      render(
        <WebSocketContext.Provider value={disconnectedClient as unknown as Client}>
          <StorefrontSubscriber />
        </WebSocketContext.Provider>,
      )
    }).not.toThrow()

    cleanup()

    const liveClient = new MockStompClient()
    liveClient.connected = true

    const { unmount } = render(
      <WebSocketContext.Provider value={liveClient as unknown as Client}>
        <StorefrontSubscriber />
      </WebSocketContext.Provider>,
    )
    expect(liveClient.subscribeCalls).toBe(1)

    // Socket drops before unmount
    liveClient.connected = false
    expect(function () {
      unmount()
    }).not.toThrow()
  })
})
