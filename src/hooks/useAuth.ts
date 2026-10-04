import { useMutation } from '@tanstack/react-query'

import { supabase } from '@/lib/auth'

export type AuthMode = 'signin' | 'signup'

export async function authenticateSignIn(email: string, password: string) {
  const result = await supabase.signInWithPassword({ email, password })
  if (result.error != null) {
    throw result.error
  }
  return result.data
}

export async function authenticateSignUp(email: string, password: string) {
  const result = await supabase.signUp({ email, password })
  if (result.error != null) {
    throw result.error
  }
  return result.data
}

export function useAuthenticate(options: { onSuccess: () => void }) {
  return useMutation({
    mutationFn: async (variables: { mode: AuthMode; email: string; password: string }) => {
      if (variables.mode === 'signin') {
        return authenticateSignIn(variables.email, variables.password)
      }
      return authenticateSignUp(variables.email, variables.password)
    },
    onSuccess: () => {
      options.onSuccess()
    },
  })
}
