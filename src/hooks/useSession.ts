import { useEffect } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'

import { fetchSession, subscribeToSessionChanges } from '../lib/auth'

export const SESSION_KEY = ['session'] as const

export function useSessionQuery() {
  const queryClient = useQueryClient()

  useEffect(() => {
    return subscribeToSessionChanges(function (session) {
      queryClient.setQueryData(SESSION_KEY, session)
    })
  }, [queryClient])

  return useQuery({
    queryKey: SESSION_KEY,
    queryFn: function (context) {
      return fetchSession(context.signal)
    },
    staleTime: Infinity,
  })
}
