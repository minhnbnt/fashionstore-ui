// Logic thuần cho banner/popup/trang tĩnh/FAQ: nhãn tiếng Việt, chọn popup, slug, giờ local.

export type BannerPlacementValue = 'HOME_CAROUSEL' | 'HOME_STRIP'
export type PopupAudienceValue = 'ALL' | 'GUEST' | 'MEMBER'
export type PopupFrequencyValue = 'EVERY_VISIT' | 'ONCE_PER_SESSION' | 'ONCE_PER_DAY' | 'ONCE'
export type ScheduleStateValue = 'INACTIVE' | 'SCHEDULED' | 'RUNNING' | 'EXPIRED'
export type FooterGroupValue = 'ABOUT' | 'POLICY' | 'SUPPORT' | 'NONE'
export type FaqCategoryValue = 'ORDER' | 'PAYMENT' | 'SHIPPING' | 'RETURN' | 'ACCOUNT' | 'OTHER'

export const PLACEMENT_OPTIONS: { value: BannerPlacementValue; label: string; hint: string }[] = [
  {
    value: 'HOME_CAROUSEL',
    label: 'Carousel trang chủ',
    hint: 'Ngay dưới hero, tự chuyển. Ảnh 1500×500 (3:1), mobile 800×600.',
  },
  {
    value: 'HOME_STRIP',
    label: 'Dải giữa trang chủ',
    hint: 'Sau lưới sản phẩm, xếp lưới 2 cột. Ảnh 1200×300 (4:1).',
  },
]

export const AUDIENCE_OPTIONS: { value: PopupAudienceValue; label: string }[] = [
  { value: 'ALL', label: 'Mọi người' },
  { value: 'GUEST', label: 'Khách chưa đăng nhập' },
  { value: 'MEMBER', label: 'Thành viên đã đăng nhập' },
]

export const FREQUENCY_OPTIONS: { value: PopupFrequencyValue; label: string }[] = [
  { value: 'ONCE_PER_DAY', label: 'Mỗi ngày 1 lần' },
  { value: 'ONCE_PER_SESSION', label: 'Mỗi phiên 1 lần' },
  { value: 'ONCE', label: 'Chỉ 1 lần duy nhất' },
  { value: 'EVERY_VISIT', label: 'Mỗi lần vào trang chủ' },
]

export const FOOTER_GROUP_OPTIONS: { value: FooterGroupValue; label: string }[] = [
  { value: 'ABOUT', label: 'Về nét' },
  { value: 'POLICY', label: 'Chính sách' },
  { value: 'SUPPORT', label: 'Hỗ trợ' },
  { value: 'NONE', label: 'Không hiện ở footer' },
]

export const FAQ_CATEGORY_OPTIONS: { value: FaqCategoryValue; label: string }[] = [
  { value: 'ORDER', label: 'Đặt hàng' },
  { value: 'PAYMENT', label: 'Thanh toán' },
  { value: 'SHIPPING', label: 'Vận chuyển' },
  { value: 'RETURN', label: 'Đổi trả & hoàn tiền' },
  { value: 'ACCOUNT', label: 'Tài khoản' },
  { value: 'OTHER', label: 'Khác' },
]

function labelOf<T extends string>(
  options: { value: T; label: string }[],
  value: string | undefined,
): string {
  const match = options.find((option) => option.value === value)
  if (match === undefined) {
    return value ?? ''
  }
  return match.label
}

export function placementLabel(value: string | undefined): string {
  return labelOf(PLACEMENT_OPTIONS, value)
}

export function audienceLabel(value: string | undefined): string {
  return labelOf(AUDIENCE_OPTIONS, value)
}

export function frequencyLabel(value: string | undefined): string {
  return labelOf(FREQUENCY_OPTIONS, value)
}

export function footerGroupLabel(value: string | undefined): string {
  return labelOf(FOOTER_GROUP_OPTIONS, value)
}

export function faqCategoryLabel(value: string | undefined): string {
  return labelOf(FAQ_CATEGORY_OPTIONS, value)
}

const SCHEDULE_LABELS: Record<ScheduleStateValue, string> = {
  RUNNING: 'Đang chạy',
  SCHEDULED: 'Chờ chạy',
  EXPIRED: 'Hết hạn',
  INACTIVE: 'Đang tắt',
}

const SCHEDULE_BADGES: Record<ScheduleStateValue, string> = {
  RUNNING: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200',
  SCHEDULED: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200',
  EXPIRED: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200',
  INACTIVE: 'bg-zinc-200 text-zinc-700 dark:bg-white/10 dark:text-zinc-300',
}

const BADGE_BASE = 'inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold'

function isScheduleState(value: string | undefined): value is ScheduleStateValue {
  return value !== undefined && value in SCHEDULE_LABELS
}

export function scheduleLabel(state: string | undefined): string {
  if (isScheduleState(state)) {
    return SCHEDULE_LABELS[state]
  }
  return ''
}

export function scheduleBadgeClass(state: string | undefined): string {
  if (isScheduleState(state)) {
    return `${BADGE_BASE} ${SCHEDULE_BADGES[state]}`
  }
  return BADGE_BASE
}

export function pageStatusBadgeClass(status: string | undefined): string {
  if (status === 'PUBLISHED') {
    return `${BADGE_BASE} ${SCHEDULE_BADGES.RUNNING}`
  }
  return `${BADGE_BASE} ${SCHEDULE_BADGES.INACTIVE}`
}

export function pageStatusLabel(status: string | undefined): string {
  if (status === 'PUBLISHED') {
    return 'Đã xuất bản'
  }
  return 'Nháp'
}

// ---------- Popup: đối tượng + tần suất, đếm ở trình duyệt ----------

export interface PopupCandidate {
  id?: string
  audience?: string
  frequency?: string
}

/** Bọc localStorage/sessionStorage để test được và nuốt lỗi khi trình duyệt chặn storage. */
export interface SeenStore {
  getLocal: (key: string) => string | null
  setLocal: (key: string, value: string) => void
  getSession: (key: string) => string | null
  setSession: (key: string, value: string) => void
}

const DAY_MS = 24 * 3600_000

function seenKey(popup: PopupCandidate): string {
  return `net.popup.${popup.id ?? ''}`
}

export function isPopupDue(popup: PopupCandidate, store: SeenStore, now: Date): boolean {
  if (popup.frequency === 'EVERY_VISIT') {
    return true
  }
  if (popup.frequency === 'ONCE_PER_SESSION') {
    return store.getSession(seenKey(popup)) === null
  }

  const seenAt = store.getLocal(seenKey(popup))
  if (seenAt === null) {
    return true
  }
  if (popup.frequency === 'ONCE') {
    return false
  }
  return now.getTime() - Number(seenAt) >= DAY_MS
}

export function markPopupSeen(popup: PopupCandidate, store: SeenStore, now: Date): void {
  if (popup.frequency === 'EVERY_VISIT') {
    return
  }
  if (popup.frequency === 'ONCE_PER_SESSION') {
    store.setSession(seenKey(popup), '1')
    return
  }
  store.setLocal(seenKey(popup), String(now.getTime()))
}

function matchesAudience(popup: PopupCandidate, loggedIn: boolean): boolean {
  if (popup.audience === 'GUEST') {
    return loggedIn === false
  }
  if (popup.audience === 'MEMBER') {
    return loggedIn
  }
  return true
}

/** Backend đã xếp theo ưu tiên; lấy popup đầu tiên còn hợp lệ, mỗi lượt xem tối đa 1 popup. */
export function pickPopup<T extends PopupCandidate>(
  popups: T[],
  loggedIn: boolean,
  store: SeenStore,
  now: Date,
): T | null {
  const match = popups.find(
    (popup) => matchesAudience(popup, loggedIn) && isPopupDue(popup, store, now),
  )
  if (match === undefined) {
    return null
  }
  return match
}

function safely(action: () => string | null): string | null {
  try {
    return action()
  } catch {
    return null
  }
}

export const browserSeenStore: SeenStore = {
  getLocal: (key) => safely(() => window.localStorage.getItem(key)),
  setLocal: (key, value) => {
    safely(() => {
      window.localStorage.setItem(key, value)
      return null
    })
  },
  getSession: (key) => safely(() => window.sessionStorage.getItem(key)),
  setSession: (key, value) => {
    safely(() => {
      window.sessionStorage.setItem(key, value)
      return null
    })
  },
}

// ---------- Form helpers ----------

export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

/** Cùng luật backend: đường dẫn nội bộ (không phải //host) hoặc URL http(s); rỗng là không có link. */
export function isSafeLink(link: string): boolean {
  if (link === '') {
    return true
  }
  return /^(\/(?!\/)\S*|https?:\/\/\S+)$/.test(link)
}

export function isInternalLink(link: string): boolean {
  return link.startsWith('/') && link.startsWith('//') === false
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** ISO → giá trị cho input datetime-local theo giờ máy người dùng. */
export function toLocalInput(iso: string | null | undefined): string {
  if (iso === null || iso === undefined || iso === '') {
    return ''
  }
  const date = new Date(iso)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function fromLocalInput(value: string): string | null {
  if (value === '') {
    return null
  }
  return new Date(value).toISOString()
}

export interface ScheduleValue {
  active: boolean
  /** Giá trị input datetime-local, rỗng = không giới hạn. */
  startsAt: string
  endsAt: string
}

/** Cùng luật backend: có cả hai mốc thì kết thúc phải sau bắt đầu. */
export function scheduleError(value: ScheduleValue): string | null {
  if (value.startsAt === '' || value.endsAt === '') {
    return null
  }
  if (new Date(value.endsAt).getTime() <= new Date(value.startsAt).getTime()) {
    return 'Giờ kết thúc phải sau giờ bắt đầu.'
  }
  return null
}

/** Orval đặt URL làm phần tử đầu query key; dùng để invalidate cả list admin lẫn API public. */
export function queryKeyStartsWith(queryKey: readonly unknown[], prefixes: string[]): boolean {
  const head = queryKey[0]
  if (typeof head !== 'string') {
    return false
  }
  return prefixes.some((prefix) => head.startsWith(prefix))
}

export function scheduleWindowLabel(
  startsAt: string | undefined,
  endsAt: string | undefined,
): string {
  const format = (iso: string) =>
    new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
  if (startsAt === undefined && endsAt === undefined) {
    return 'Không giới hạn thời gian'
  }
  if (startsAt === undefined) {
    return `Đến ${format(endsAt ?? '')}`
  }
  if (endsAt === undefined) {
    return `Từ ${format(startsAt)}`
  }
  return `${format(startsAt)} → ${format(endsAt)}`
}

export function groupBy<T, K extends string>(
  items: T[],
  order: K[],
  keyOf: (item: T) => string | undefined,
): { key: K; items: T[] }[] {
  const groups: { key: K; items: T[] }[] = []
  for (const key of order) {
    const matched = items.filter((item) => keyOf(item) === key)
    if (matched.length > 0) {
      groups.push({ key, items: matched })
    }
  }
  return groups
}
