export function formatVnd(value: number) {
  const rounded = Math.round(value)
  const grouped = new Intl.NumberFormat('vi-VN', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(rounded)
  return `${grouped} ₫`
}

export function resolveImageUrl(imageKey: string | null) {
  if (imageKey === null) {
    return null
  }
  if (imageKey.startsWith('http://') || imageKey.startsWith('https://')) {
    return imageKey
  }
  const base = import.meta.env.VITE_ASSETS_URL
  return `${base}/${imageKey}`
}
