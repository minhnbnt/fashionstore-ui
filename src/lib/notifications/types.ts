export type NotifyId = string | number

export type ApiEndpoint = string

export interface NotifyAction {
  label: string
  onClick: () => void
}

export interface NotifyOptions {
  id?: NotifyId
  duration?: number
  description?: string
  action?: NotifyAction
}

export interface NotifyPromiseMessages<T> {
  loading: string
  success: string | ((data: T) => string)
  error: string | ((error: unknown) => string)
}

export type ErrorCategory =
  | 'validation'
  | 'auth'
  | 'permission'
  | 'business'
  | 'network'
  | 'server'
  | 'unknown'
