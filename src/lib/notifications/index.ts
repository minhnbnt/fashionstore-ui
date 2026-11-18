import { toast } from 'sonner'

import { hookErrorMessage } from '@/lib/api/apiAdapters'
import { ApiError } from '@/lib/api/apiFetch'

import { TOAST_DURATIONS } from './config'

import type {
  ApiEndpoint,
  ErrorCategory,
  NotifyId,
  NotifyOptions,
  NotifyPromiseMessages,
} from './types'
import type { ExternalToast } from 'sonner'

const DEFAULT_ERROR_MESSAGE = 'Đã xảy ra lỗi. Vui lòng thử lại sau.'
const SERVER_ERROR_MESSAGE = 'Hệ thống đang gặp sự cố. Vui lòng thử lại sau.'
const NETWORK_ERROR_MESSAGE = 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng và thử lại.'
const AUTH_ERROR_MESSAGE = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
const PERMISSION_ERROR_MESSAGE = 'Bạn không có quyền thực hiện thao tác này.'

const NETWORK_MESSAGE_PATTERN =
  /failed to fetch|networkerror|network request failed|load failed|err_network/i

const UNSAFE_TECHNICAL_PATTERNS: RegExp[] = [
  /\b(sql|jdbc|postgresql|hibernate|psqlexception|constraintviolation|dataintegrityviolation)\b/i,
  /\b(select\s+.+\s+from|insert\s+into|update\s+.+\s+set|delete\s+from)\b/i,
  /syntax error at or near|duplicate key value|violates foreign key/i,
  /\b(nullpointerexception|illegalargumentexception|runtimeexception|org\.springframework|java\.lang\.)/i,
  /request failed with status \d+/i,
  /internal server error/i,
  /\n\s*at\s+\S+/,
  /\bat\s+\S+\s*\([^)]*:\d+/,
]

function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) {
    return true
  }
  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      return true
    }
    if (NETWORK_MESSAGE_PATTERN.test(error.message)) {
      return true
    }
  }
  return false
}

function isUnsafeTechnicalMessage(message: string): boolean {
  for (const pattern of UNSAFE_TECHNICAL_PATTERNS) {
    if (pattern.test(message)) {
      return true
    }
  }
  return false
}

function buildToastOptions(
  defaultDuration: number,
  description?: string,
  options?: NotifyOptions,
): ExternalToast {
  const result: ExternalToast = {
    duration: defaultDuration,
  }
  if (options?.duration !== undefined) {
    result.duration = options.duration
  }
  const resolvedDescription = description ?? options?.description
  if (resolvedDescription !== undefined && resolvedDescription !== '') {
    result.description = resolvedDescription
  }
  if (options?.id !== undefined) {
    result.id = options.id
  }
  if (options?.action !== undefined) {
    result.action = {
      label: options.action.label,
      onClick: options.action.onClick,
    }
  }
  return result
}

export function classifyError(error: unknown): ErrorCategory {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return 'auth'
    }
    if (error.status === 403) {
      return 'permission'
    }
    if (error.status === 400 || error.status === 422) {
      return 'validation'
    }
    if (error.status >= 400 && error.status < 500) {
      return 'business'
    }
    if (error.status >= 500) {
      return 'server'
    }
    return 'unknown'
  }
  if (isNetworkError(error)) {
    return 'network'
  }
  return 'unknown'
}

export function safeErrorMessage(
  error: unknown,
  endpoint?: ApiEndpoint,
  fallback?: string,
): string {
  let resolvedFallback = DEFAULT_ERROR_MESSAGE
  if (fallback !== undefined && fallback.trim() !== '') {
    resolvedFallback = fallback.trim()
  }

  if (isNetworkError(error)) {
    return NETWORK_ERROR_MESSAGE
  }

  if (error instanceof ApiError) {
    if (error.status === 401) {
      return AUTH_ERROR_MESSAGE
    }
    if (error.status === 403) {
      if (endpoint !== undefined && endpoint !== '') {
        const mapped = hookErrorMessage(endpoint, error)
        if (mapped !== DEFAULT_ERROR_MESSAGE) {
          return mapped
        }
      }
      return PERMISSION_ERROR_MESSAGE
    }
    if (error.status >= 500) {
      if (endpoint !== undefined && endpoint !== '') {
        const mapped = hookErrorMessage(endpoint, error)
        if (mapped !== DEFAULT_ERROR_MESSAGE) {
          return mapped
        }
      }
      if (fallback !== undefined && fallback.trim() !== '') {
        return fallback.trim()
      }
      return SERVER_ERROR_MESSAGE
    }
    if (endpoint !== undefined && endpoint !== '') {
      const mapped = hookErrorMessage(endpoint, error)
      if (mapped !== DEFAULT_ERROR_MESSAGE) {
        return mapped
      }
    }
    const trimmed = error.message.trim()
    if (trimmed !== '' && isUnsafeTechnicalMessage(trimmed) === false) {
      return trimmed
    }
    return resolvedFallback
  }

  if (error instanceof Error) {
    const trimmed = error.message.trim()
    if (trimmed !== '' && isUnsafeTechnicalMessage(trimmed) === false) {
      return trimmed
    }
    return resolvedFallback
  }

  if (typeof error === 'string') {
    const trimmed = error.trim()
    if (trimmed !== '' && isUnsafeTechnicalMessage(trimmed) === false) {
      return trimmed
    }
    return resolvedFallback
  }

  return resolvedFallback
}

export const notify = {
  success(title: string, description?: string, options?: NotifyOptions): NotifyId {
    return toast.success(title, buildToastOptions(TOAST_DURATIONS.success, description, options))
  },

  error(title: string, description?: string, options?: NotifyOptions): NotifyId {
    return toast.error(title, buildToastOptions(TOAST_DURATIONS.error, description, options))
  },

  warning(title: string, description?: string, options?: NotifyOptions): NotifyId {
    return toast.warning(title, buildToastOptions(TOAST_DURATIONS.warning, description, options))
  },

  info(title: string, description?: string, options?: NotifyOptions): NotifyId {
    return toast.info(title, buildToastOptions(TOAST_DURATIONS.info, description, options))
  },

  loading(title: string, description?: string, options?: NotifyOptions): NotifyId {
    return toast.loading(title, buildToastOptions(TOAST_DURATIONS.loading, description, options))
  },

  promise<T>(
    promise: Promise<T> | (() => Promise<T>),
    messages: NotifyPromiseMessages<T>,
    options?: NotifyOptions,
  ): Promise<T> {
    let targetPromise: Promise<T>
    if (typeof promise === 'function') {
      targetPromise = promise()
    } else {
      targetPromise = promise
    }

    let successDuration: number = TOAST_DURATIONS.success
    if (options?.duration !== undefined) {
      successDuration = options.duration
    }

    let errorDuration: number = TOAST_DURATIONS.error
    if (options?.duration !== undefined) {
      errorDuration = options.duration
    }

    const toastResult = toast.promise(targetPromise, {
      id: options?.id,
      duration: TOAST_DURATIONS.loading,
      description: options?.description,
      action: options?.action,
      loading: messages.loading,
      success(data: T) {
        let message: string
        if (typeof messages.success === 'function') {
          message = messages.success(data)
        } else {
          message = messages.success
        }
        return { message, duration: successDuration }
      },
      error(err: unknown) {
        let message: string
        if (typeof messages.error === 'function') {
          message = messages.error(err)
        } else {
          message = messages.error
        }
        return { message, duration: errorDuration }
      },
    })

    if (
      toastResult !== null &&
      toastResult !== undefined &&
      typeof toastResult === 'object' &&
      'unwrap' in toastResult &&
      typeof toastResult.unwrap === 'function'
    ) {
      return toastResult.unwrap()
    }
    return targetPromise
  },

  classifyError,

  safeErrorMessage,

  fromError(
    error: unknown,
    endpoint?: ApiEndpoint,
    fallbackTitle?: string,
    options?: NotifyOptions,
  ): NotifyId {
    const title = safeErrorMessage(error, endpoint, fallbackTitle)
    return notify.error(title, options?.description, options)
  },

  dismiss(id?: NotifyId): void {
    toast.dismiss(id)
  },
}

export * from './config'
export * from './types'
