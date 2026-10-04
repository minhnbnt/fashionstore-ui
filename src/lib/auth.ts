import { useEffect, useState } from 'react'

import { GoTrueClient } from '@supabase/auth-js'
import type { AuthChangeEvent, Session } from '@supabase/auth-js'

// GoTrue self-host (không multi-tenant) bỏ qua giá trị apikey — auth-js gọi thẳng
// root API (/token, /signup), khác với supabase-js vốn ghép /auth/v1 vào URL
export const supabase = new GoTrueClient({
  url: import.meta.env.VITE_GOTRUE_URL,
  persistSession: true,
  autoRefreshToken: true,
})

export function useSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function restore() {
      const { data } = await supabase.getSession()
      if (cancelled) {
        return
      }
      setSession(data.session)
      setLoading(false)
    }

    void restore()

    const { data } = supabase.onAuthStateChange(
      (_event: AuthChangeEvent, nextSession: Session | null) => {
        setSession(nextSession)
      },
    )

    return () => {
      cancelled = true
      data.subscription.unsubscribe()
    }
  }, [])

  return { session, loading }
}

export async function signOut() {
  await supabase.signOut()
}
