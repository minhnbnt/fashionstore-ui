import { AuthClient } from '@supabase/auth-js'

import type { Session } from '@supabase/auth-js'

let client: InstanceType<typeof AuthClient> | null = null

export function getAuthClient(): InstanceType<typeof AuthClient> {
  if (client !== null) {
    return client
  }
  const url = import.meta.env.VITE_GOTRUE_URL as string | undefined
  if (url === undefined || url === '') {
    throw new Error('Thiếu VITE_GOTRUE_URL trong .env')
  }
  client = new AuthClient({ url })
  return client
}

export async function fetchSession(signal?: AbortSignal): Promise<Session | null> {
  if (signal !== undefined && signal.aborted) {
    throw new DOMException('Aborted', 'AbortError')
  }
  const { data, error } = await getAuthClient().getSession()
  if (signal !== undefined && signal.aborted) {
    throw new DOMException('Aborted', 'AbortError')
  }
  if (error !== null) {
    throw error
  }
  return data.session
}

export interface Credentials {
  email: string
  password: string
}

export async function signInWithPassword(creds: Credentials): Promise<Session | null> {
  const { data, error } = await getAuthClient().signInWithPassword(creds)
  if (error !== null) {
    throw error
  }
  return data.session
}

export async function signUpWithPassword(creds: Credentials): Promise<Session | null> {
  const { data, error } = await getAuthClient().signUp(creds)
  if (error !== null) {
    throw error
  }
  return data.session
}

export async function signOutEverywhere(): Promise<void> {
  const { error } = await getAuthClient().signOut()
  if (error !== null) {
    throw error
  }
}

export async function sendPasswordReset(email: string): Promise<void> {
  const { error } = await getAuthClient().resetPasswordForEmail(email)
  if (error !== null) {
    throw error
  }
}

export function validateLoginInput(email: string, password: string): string | null {
  if (email.trim() === '') {
    return 'Nhập email nhé.'
  }
  if (email.includes('@') === false) {
    return 'Email chưa đúng định dạng.'
  }
  if (password.length < 6) {
    return 'Mật khẩu tối thiểu 6 ký tự.'
  }
  return null
}

interface MaybeAuthError {
  message?: string
}

export function friendlyAuthError(error: unknown): string {
  if (error !== null && typeof error === 'object' && 'message' in error) {
    const message = (error as MaybeAuthError).message || ''
    if (message.includes('Invalid login credentials')) {
      return 'Email hoặc mật khẩu chưa đúng.'
    }
    if (message.includes('User already registered')) {
      return 'Email này đã có tài khoản. Hãy đăng nhập.'
    }
    if (message.includes('Password should be')) {
      return 'Mật khẩu tối thiểu 6 ký tự.'
    }
  }
  return 'Có lỗi xảy ra. Thử lại sau nhé.'
}
