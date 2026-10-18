export const NAME_MAX = 200

const WEEKDAYS = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']

interface SyncCounts {
  year?: number
  added?: number
  updated?: number
  removed?: number
  keptManual?: number
}

export function kindLabel(kind: string | undefined): string {
  if (kind === 'HOLIDAY') {
    return 'Nghỉ lễ'
  }
  if (kind === 'WORKING_DAY') {
    return 'Đi làm bù'
  }
  return kind ?? ''
}

export function sourceLabel(source: string | undefined): string {
  if (source === 'CALENDARIFIC') {
    return 'Calendarific'
  }
  if (source === 'MANUAL') {
    return 'Sửa tay'
  }
  if (source === 'SEED') {
    return 'Có sẵn'
  }
  return source ?? ''
}

/** Ngày dạng yyyy-MM-dd đọc theo UTC để không lệch ngày theo múi giờ trình duyệt. */
function utcDate(day: string): Date {
  return new Date(`${day}T00:00:00Z`)
}

export function formatDay(day: string | undefined): string {
  if (day === undefined) {
    return ''
  }
  const [year, month, date] = day.split('-')
  return `${date}/${month}/${year}`
}

export function weekdayLabel(day: string | undefined): string {
  if (day === undefined) {
    return ''
  }
  return WEEKDAYS[utcDate(day).getUTCDay()] ?? ''
}

export function yearOptions(current: number): number[] {
  return [current - 1, current, current + 1]
}

export function holidayNameError(name: string): string | null {
  const length = name.trim().length
  if (length === 0) {
    return 'Nhập tên ngày nghỉ.'
  }
  if (length > NAME_MAX) {
    return `Tên tối đa ${NAME_MAX} ký tự.`
  }
  return null
}

export function syncResultMessage(result: SyncCounts): string {
  return (
    `Đã đồng bộ năm ${result.year ?? ''}: thêm ${result.added ?? 0}, cập nhật ${result.updated ?? 0}, ` +
    `xóa ${result.removed ?? 0}, giữ ${result.keptManual ?? 0} ngày sửa tay.`
  )
}
