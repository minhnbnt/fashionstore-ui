import { useEffect } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'

import { fetchSession, getAuthClient } from '../lib/auth'

import type { AuthChangeEvent, Session } from '@supabase/auth-js'

export const SESSION_KEY = ['session'] as const

export function useSessionQuery() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const { data: sub } = getAuthClient().onAuthStateChange(function (
      _event: AuthChangeEvent,
      session: Session | null,
    ) {
      queryClient.setQueryData(SESSION_KEY, session)
    })
    return () => {
      sub.subscription.unsubscribe()
    }
  }, [queryClient])

  return useQuery({
    queryKey: SESSION_KEY,
    queryFn: function (context) {
      return fetchSession(context.signal)
    },
    staleTime: Infinity,
  })
}
