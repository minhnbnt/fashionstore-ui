export interface Credentials {
  email: string
  password: string
}

export type UserRole = 'admin' | 'shop' | 'customer'

export interface MaybeAuthError {
  message?: string
}

export type Mode = 'login' | 'signup' | 'forgot'

export type Status = 'loading' | 'error'

export type PageStatus = 'checking' | 'ready' | 'success' | 'invalid'
