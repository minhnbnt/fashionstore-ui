import { describe, expect, it } from 'vitest'

import { appendPushedMessage, markOwnMessagesRead } from './useChatRealtime'

import type { MessagesQueryResult } from '@generated/endpoints/chat/chat'
import type { ChatMessageResponse } from '@generated/model/chatMessageResponse'

function messageOf(
  id: string,
  senderType: 'BUYER' | 'SELLER',
  isRead = false,
): ChatMessageResponse {
  return {
    id,
    conversationId: 'conv-1',
    senderId: 'sender-1',
    senderType,
    content: 'xin chao',
    sentAt: '2026-01-01T00:00:00Z',
    isRead,
  }
}

function envelopeOf(list: ChatMessageResponse[]): MessagesQueryResult {
  return { data: list, status: 200, headers: new Headers() } as MessagesQueryResult
}

describe('appendPushedMessage', function () {
  it('appends pushed message into cached envelope', function () {
    const cached = envelopeOf([messageOf('m1', 'BUYER')])

    const result = appendPushedMessage(cached, messageOf('m2', 'SELLER'))

    expect(Array.isArray(result?.data)).toBe(true)
    const list = (result?.data ?? []) as ChatMessageResponse[]
    expect(list).toHaveLength(2)
    expect(list[list.length - 1]?.id).toBe('m2')
  })

  it('keeps same envelope when pushed message id already exists', function () {
    const cached = envelopeOf([messageOf('m1', 'BUYER')])

    const result = appendPushedMessage(cached, messageOf('m1', 'BUYER'))

    expect(result).toBe(cached)
  })

  it('keeps undefined when cache is still empty', function () {
    const result = appendPushedMessage(undefined, messageOf('m1', 'BUYER'))

    expect(result).toBeUndefined()
  })

  it('keeps error envelope untouched', function () {
    const cached = {
      data: { title: 'Not found' },
      status: 404,
      headers: new Headers(),
    } as MessagesQueryResult

    const result = appendPushedMessage(cached, messageOf('m1', 'BUYER'))

    expect(result).toBe(cached)
  })
})

describe('markOwnMessagesRead', function () {
  it('marks only own messages as read', function () {
    const cached = envelopeOf([messageOf('m1', 'BUYER', false), messageOf('m2', 'SELLER', false)])

    const result = markOwnMessagesRead(cached, 'BUYER')
    const list = (result?.data ?? []) as ChatMessageResponse[]

    expect(list[0]?.isRead).toBe(true)
    expect(list[1]?.isRead).toBe(false)
  })

  it('keeps undefined when cache is still empty', function () {
    const result = markOwnMessagesRead(undefined, 'BUYER')

    expect(result).toBeUndefined()
  })

  it('keeps error envelope untouched', function () {
    const cached = {
      data: { title: 'Not found' },
      status: 404,
      headers: new Headers(),
    } as MessagesQueryResult

    const result = markOwnMessagesRead(cached, 'BUYER')

    expect(result).toBe(cached)
  })
})
