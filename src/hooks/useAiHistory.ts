import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { takeData } from '@/lib/api/apiAdapters'
import { customFetch } from '@/lib/api/apiFetch'

import type { BackendAiMessageResponse } from '@/lib/ai/agentHistory'

export interface AiConversationItem {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

export interface CustomFetchResponse<T> {
  status: 200 | 201
  data: T
}

export const AI_CONVERSATIONS_QUERY_KEY = ['ai', 'conversations'] as const

export function getAiMessagesQueryKey(conversationId: string) {
  return ['ai', 'conversations', conversationId, 'messages'] as const
}

export const aiConversationsOptions = queryOptions({
  queryKey: AI_CONVERSATIONS_QUERY_KEY,
  queryFn: async function () {
    const res =
      await customFetch<CustomFetchResponse<AiConversationItem[]>>('/api/ai/conversations')
    return takeData(res)
  },
})

export function useAiConversations(enabled = true) {
  return useQuery({
    ...aiConversationsOptions,
    enabled,
  })
}

export function aiMessagesOptions(conversationId: string | null) {
  return queryOptions({
    queryKey: getAiMessagesQueryKey(conversationId ?? ''),
    queryFn: async function () {
      if (conversationId === null || conversationId === '') {
        return []
      }
      const res = await customFetch<CustomFetchResponse<BackendAiMessageResponse[]>>(
        '/api/ai/conversations/' + conversationId + '/messages',
      )
      return takeData(res)
    },
  })
}

export function useAiMessages(conversationId: string | null, enabled = true) {
  return useQuery({
    ...aiMessagesOptions(conversationId),
    enabled: enabled && conversationId !== null && conversationId !== '',
  })
}

export function useCreateAiConversation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async function (title?: string) {
      const res = await customFetch<CustomFetchResponse<AiConversationItem>>(
        '/api/ai/conversations',
        {
          method: 'POST',
          body: JSON.stringify({ title }),
        },
      )
      return takeData(res)
    },
    onSuccess: function () {
      void queryClient.invalidateQueries({ queryKey: AI_CONVERSATIONS_QUERY_KEY })
    },
  })
}

export function useDeleteAiConversation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async function (id: string) {
      await customFetch<void>('/api/ai/conversations/' + id, {
        method: 'DELETE',
      })
    },
    onSuccess: function () {
      void queryClient.invalidateQueries({ queryKey: AI_CONVERSATIONS_QUERY_KEY })
    },
  })
}

export function useSaveAiMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async function (params: {
      conversationId: string
      role: string
      content: string
      metadata?: string
    }) {
      const res = await customFetch<CustomFetchResponse<BackendAiMessageResponse>>(
        '/api/ai/conversations/' + params.conversationId + '/messages',
        {
          method: 'POST',
          body: JSON.stringify({
            role: params.role,
            content: params.content,
            metadata: params.metadata,
          }),
        },
      )
      return takeData(res)
    },
    onSuccess: function (_data, variables) {
      void queryClient.invalidateQueries({
        queryKey: getAiMessagesQueryKey(variables.conversationId),
      })
      void queryClient.invalidateQueries({
        queryKey: AI_CONVERSATIONS_QUERY_KEY,
      })
    },
  })
}
