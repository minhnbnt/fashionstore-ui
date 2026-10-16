import { AuthClient } from '@supabase/auth-js'

import type { AuthChangeEvent, Session } from '@supabase/auth-js'

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

export async function refreshAuthSession(): Promise<Session | null> {
  const { data, error } = await getAuthClient().refreshSession()
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
  const { error } = await getAuthClient().resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })
  if (error !== null) {
    throw error
  }
}

export async function updateUserPassword(password: string): Promise<void> {
  const { error } = await getAuthClient().updateUser({ password })
  if (error !== null) {
    throw error
  }
}

export async function signInWithGoogle(): Promise<void> {
  const { error } = await getAuthClient().signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  })
  if (error !== null) {
    throw error
  }
}

export type UserRole = 'admin' | 'shop' | 'customer'

export function getRoleFromSession(session: Session): UserRole {
  const meta = session.user.app_metadata as { role?: string } | undefined
  if (meta?.role === 'admin') {
    return 'admin'
  }
  if (meta?.role === 'shop') {
    return 'shop'
  }
  return 'customer'
}

export function getDefaultPathForRole(role: UserRole): string {
  if (role === 'admin') {
    return '/admin'
  }
  if (role === 'shop') {
    return '/shop'
  }
  return '/account'
}

export function subscribeToSessionChanges(callback: (session: Session | null) => void): () => void {
  const { data: sub } = getAuthClient().onAuthStateChange(function (
    _event: AuthChangeEvent,
    session: Session | null,
  ) {
    callback(session)
  })
  return function () {
    sub.subscription.unsubscribe()
  }
}

export function validateLoginInput(email: string, password: string): string | null {
  if (email.trim() === '') {
    return 'Vui lòng nhập email.'
  }
  if (email.includes('@') === false) {
    return 'Email chưa đúng định dạng.'
  }
  if (password.length < 6) {
    return 'Mật khẩu tối thiểu 6 ký tự.'
  }
  return null
}

export function validatePasswordReset(password: string, confirmPassword: string): string | null {
  if (password.length < 6) {
    return 'Mật khẩu mới tối thiểu 6 ký tự.'
  }
  if (password !== confirmPassword) {
    return 'Mật khẩu xác nhận không khớp.'
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
      return 'Email này đã được đăng ký. Vui lòng đăng nhập.'
    }
    if (message.includes('Password should be')) {
      return 'Mật khẩu tối thiểu 6 ký tự.'
    }
    if (message.includes('New password should be different')) {
      return 'Mật khẩu mới phải khác mật khẩu cũ.'
    }
    if (message.includes('Token has expired') || message.includes('token has expired')) {
      return 'Liên kết khôi phục đã hết hạn. Vui lòng yêu cầu lại.'
    }
  }
  return 'Đã xảy ra lỗi. Vui lòng thử lại sau.'
}
