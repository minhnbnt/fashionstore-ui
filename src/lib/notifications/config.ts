export const TOAST_POSITION = 'top-right' as const

export const TOAST_VISIBLE_LIMIT = 4

export const TOAST_GAP = 10

// Tránh đè header cố định (h-16 + mt-3 = 76px)
export const TOAST_DESKTOP_OFFSET = { top: 88, right: 16 } as const

export const TOAST_MOBILE_OFFSET = { top: 80, right: 12, left: 12 } as const

export const TOAST_DURATIONS = {
  success: 3000,
  info: 3500,
  warning: 4500,
  error: 5000,
  loading: Infinity,
} as const
