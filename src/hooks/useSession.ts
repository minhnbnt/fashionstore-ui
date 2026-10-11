import { useEffect } from 'react'

import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query'

import { fetchSession, subscribeToSessionChanges } from '../lib/auth'

export const SESSION_KEY = ['session'] as const

const sessionOptions = queryOptions({
  queryKey: SESSION_KEY,
  queryFn: function (context) {
    return fetchSession(context.signal)
  },
  staleTime: Infinity,
})

export function useSessionQuery() {
  const queryClient = useQueryClient()

  useEffect(() => {
    return subscribeToSessionChanges(function (session) {
      queryClient.setQueryData(SESSION_KEY, session)
    })
  }, [queryClient])

  return useQuery(sessionOptions)
}
