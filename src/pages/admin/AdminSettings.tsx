import { useState } from 'react'

import {
  getGetSystemSettingsQueryKey,
  getListConfigAuditQueryKey,
  useGetSystemSettings,
  useListConfigAudit,
  useUpdateSystemSettings,
} from '@generated/endpoints/admin-settings/admin-settings'
import { ListConfigAuditEntity } from '@generated/model/listConfigAuditEntity'
import {
  ArrowCounterClockwise,
  ArrowRight,
  ClockCounterClockwise,
  FloppyDisk,
  Money,
  Storefront,
  Truck,
} from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import AdminShell from '@/components/admin/AdminShell'
import Pagination from '@/components/search/Pagination'
import EmptyState from '@/components/ui/EmptyState'
import { Skeleton, TableRowsSkeleton } from '@/components/ui/Skeleton'
import StatePanel from '@/components/ui/StatePanel'
import { takeData } from '@/lib/api/apiAdapters'
import { formatDateTime, formatVnd } from '@/lib/format'
import { notify, safeErrorMessage } from '@/lib/notifications'
import {
  cn,
  iconChipClass,
  INPUT_CLASS,
  LABEL_CLASS,
  PANEL_CLASS,
  primaryButtonClass,
  secondaryButtonClass,
  sectionLabelClass,
  segmentedItemClass,
  segmentedTrackClass,
} from '@/lib/ui/styles'

import type { ConfigAuditResponse } from '@generated/model/configAuditResponse'
import type { ListConfigAuditParams } from '@generated/model/listConfigAuditParams'
import type { SystemSettingsResponse } from '@generated/model/systemSettingsResponse'
import type { UpdateSettingsRequest } from '@generated/model/updateSettingsRequest'

const AUDIT_PAGE_SIZE = 15

type EntityFilterValue = 'ALL' | ListConfigAuditEntity

const ENTITY_FILTERS: { value: EntityFilterValue; label: string }[] = [
  { value: 'ALL', label: 'Tất cả' },
  { value: ListConfigAuditEntity.SETTING, label: 'Cấu hình chung' },
  { value: ListConfigAuditEntity.CARRIER, label: 'Đơn vị vận chuyển' },
  { value: ListConfigAuditEntity.SHIPPING_RATE, label: 'Biểu phí vận chuyển' },
  { value: ListConfigAuditEntity.PAYMENT_GATEWAY, label: 'Cổng thanh toán' },
  { value: ListConfigAuditEntity.PAYMENT_TRANSACTION, label: 'Giao dịch thanh toán' },
]

interface SettingsFormState {
  siteName: string
  hotline: string
  supportEmail: string
  freeShippingThreshold: string
  baseItems: string
  paymentHoldMinutes: string
  autoCompleteDays: string
  codMinTotal: string
  codMaxTotal: string
}

type SettingsFieldErrors = Partial<Record<keyof SettingsFormState, string>>

const EMPTY_FORM: SettingsFormState = {
  siteName: '',
  hotline: '',
  supportEmail: '',
  freeShippingThreshold: '0',
  baseItems: '1',
  paymentHoldMinutes: '30',
  autoCompleteDays: '7',
  codMinTotal: '0',
  codMaxTotal: '0',
}

function toNumberString(value: number | undefined, fallback: string): string {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return fallback
  }
  return String(value)
}

function toFormState(settings: SystemSettingsResponse | undefined): SettingsFormState {
  if (settings === undefined) {
    return EMPTY_FORM
  }
  return {
    siteName: settings.siteName ?? '',
    hotline: settings.hotline ?? '',
    supportEmail: settings.supportEmail ?? '',
    freeShippingThreshold: toNumberString(settings.freeShippingThreshold, '0'),
    baseItems: toNumberString(settings.baseItems, '1'),
    paymentHoldMinutes: toNumberString(settings.paymentHoldMinutes, '30'),
    autoCompleteDays: toNumberString(settings.autoCompleteDays, '7'),
    codMinTotal: toNumberString(settings.codMinTotal, '0'),
    codMaxTotal: toNumberString(settings.codMaxTotal, '0'),
  }
}

function formsEqual(a: SettingsFormState, b: SettingsFormState): boolean {
  return (
    a.siteName === b.siteName &&
    a.hotline === b.hotline &&
    a.supportEmail === b.supportEmail &&
    a.freeShippingThreshold === b.freeShippingThreshold &&
    a.baseItems === b.baseItems &&
    a.paymentHoldMinutes === b.paymentHoldMinutes &&
    a.autoCompleteDays === b.autoCompleteDays &&
    a.codMinTotal === b.codMinTotal &&
    a.codMaxTotal === b.codMaxTotal
  )
}

function parseStrictInt(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed === '' || /^-?\d+$/.test(trimmed) === false) {
    return null
  }
  const parsed = Number(trimmed)
  if (Number.isSafeInteger(parsed) === false) {
    return null
  }
  return parsed
}

function vndPreviewText(raw: string, allowZeroUnlimited?: boolean): string | null {
  const parsed = parseStrictInt(raw)
  if (parsed === null || parsed < 0) {
    return null
  }
  if (allowZeroUnlimited && parsed === 0) {
    return 'Hiện tại: Không giới hạn'
  }
  return `Hiển thị: ${formatVnd(parsed)}`
}

function entityLabel(entity: string | undefined): string {
  if (entity === ListConfigAuditEntity.SETTING) {
    return 'Cấu hình chung'
  }
  if (entity === ListConfigAuditEntity.CARRIER) {
    return 'Đơn vị vận chuyển'
  }
  if (entity === ListConfigAuditEntity.SHIPPING_RATE) {
    return 'Biểu phí vận chuyển'
  }
  if (entity === ListConfigAuditEntity.PAYMENT_GATEWAY) {
    return 'Cổng thanh toán'
  }
  if (entity === ListConfigAuditEntity.PAYMENT_TRANSACTION) {
    return 'Giao dịch thanh toán'
  }
  if (entity !== undefined && entity !== '') {
    return entity
  }
  return '—'
}

function actionLabel(action: string | undefined): string {
  if (action === 'UPDATE') {
    return 'Cập nhật'
  }
  if (action === 'CREATE') {
    return 'Tạo mới'
  }
  if (action === 'DELETE') {
    return 'Xóa'
  }
  if (action !== undefined && action !== '') {
    return action
  }
  return '—'
}

function actionBadgeClass(action: string | undefined): string {
  const base = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold'
  if (action === 'CREATE') {
    return cn(base, 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300')
  }
  if (action === 'DELETE') {
    return cn(base, 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300')
  }
  return cn(base, 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300')
}

function formatAuditValue(raw: string | null | undefined): string {
  if (raw === null || raw === undefined) {
    return '—'
  }
  const trimmed = raw.trim()
  if (trimmed === '') {
    return '—'
  }
  try {
    const parsed: unknown = JSON.parse(trimmed)
    if (typeof parsed === 'string') {
      if (parsed === '') {
        return '—'
      }
      return parsed
    }
    if (typeof parsed === 'number' || typeof parsed === 'boolean') {
      return String(parsed)
    }
  } catch {
    return trimmed
  }
  return trimmed
}

function fieldInputClass(hasError: boolean, extra?: string): string {
  if (hasError) {
    return cn(
      INPUT_CLASS,
      'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20 dark:border-rose-400 dark:focus:border-rose-400',
      extra,
    )
  }
  return cn(INPUT_CLASS, extra)
}

function SettingsFormSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Đang tải cấu hình hệ thống">
      {[0, 1, 2].map(function (sectionIdx) {
        return (
          <div key={sectionIdx} className={PANEL_CLASS}>
            <div className="mb-5 flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-2xl" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-3.5 w-72 max-w-full" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map(function (fieldIdx) {
                return (
                  <div key={fieldIdx} className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-11 w-full" />
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function AdminSettings() {
  const queryClient = useQueryClient()
  const settingsQuery = useGetSystemSettings()
  const updateMutation = useUpdateSystemSettings()

  const [draft, setDraft] = useState<SettingsFormState | null>(null)
  const [fieldErrors, setFieldErrors] = useState<SettingsFieldErrors>({})
  const [entityFilter, setEntityFilter] = useState<EntityFilterValue>('ALL')
  const [auditPage, setAuditPage] = useState(0)

  const auditParams: ListConfigAuditParams = {
    page: auditPage,
    size: AUDIT_PAGE_SIZE,
  }
  if (entityFilter !== 'ALL') {
    auditParams.entity = entityFilter
  }
  const auditQuery = useListConfigAudit(auditParams)

  let serverSettings: SystemSettingsResponse | undefined
  if (settingsQuery.data !== undefined && settingsQuery.data.status === 200) {
    serverSettings = takeData(settingsQuery.data)
  }
  const serverForm = toFormState(serverSettings)
  const form = draft ?? serverForm
  const isDirty = draft !== null && formsEqual(draft, serverForm) === false

  let auditItems: ConfigAuditResponse[] = []
  let auditTotal = 0
  if (auditQuery.data !== undefined && auditQuery.data.status === 200) {
    const auditPageData = takeData(auditQuery.data)
    auditItems = auditPageData.items ?? []
    auditTotal = auditPageData.total ?? 0
  }

  let totalAuditPages = Math.ceil(auditTotal / AUDIT_PAGE_SIZE)
  if (totalAuditPages < 1) {
    totalAuditPages = 1
  }

  function updateField(field: keyof SettingsFormState, value: string) {
    setDraft({
      ...form,
      [field]: value,
    })
    if (fieldErrors[field] !== undefined) {
      setFieldErrors(function (prev) {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  function handleReset() {
    setDraft(null)
    setFieldErrors({})
  }

  function submitSettings() {
    const trimmedSiteName = form.siteName.trim()
    if (trimmedSiteName === '') {
      const msg = 'Vui lòng nhập tên sàn hiển thị trước khi lưu.'
      setFieldErrors({ siteName: msg })
      notify.warning('Thiếu tên sàn', msg)
      return
    }

    const trimmedEmail = form.supportEmail.trim()
    if (trimmedEmail !== '' && trimmedEmail.includes('@') === false) {
      const msg = 'Vui lòng nhập địa chỉ email có chứa ký tự @ hoặc để trống.'
      setFieldErrors({ supportEmail: msg })
      notify.warning('Email hỗ trợ không hợp lệ', msg)
      return
    }

    const freeShippingThreshold = parseStrictInt(form.freeShippingThreshold)
    if (freeShippingThreshold === null || freeShippingThreshold < 0) {
      const msg = 'Ngưỡng miễn phí vận chuyển phải là số nguyên từ 0 trở lên.'
      setFieldErrors({ freeShippingThreshold: msg })
      notify.warning('Ngưỡng freeship không hợp lệ', msg)
      return
    }

    const baseItems = parseStrictInt(form.baseItems)
    if (baseItems === null || baseItems < 1 || baseItems > 20) {
      const msg = 'Giá trị phải là số nguyên trong khoảng từ 1 đến 20.'
      setFieldErrors({ baseItems: msg })
      notify.warning('Số sản phẩm phí cơ bản không hợp lệ', msg)
      return
    }

    const paymentHoldMinutes = parseStrictInt(form.paymentHoldMinutes)
    if (paymentHoldMinutes === null || paymentHoldMinutes < 5 || paymentHoldMinutes > 1440) {
      const msg = 'Số phút giữ đơn chờ thanh toán phải từ 5 đến 1440 phút.'
      setFieldErrors({ paymentHoldMinutes: msg })
      notify.warning('Thời gian giữ đơn không hợp lệ', msg)
      return
    }

    const autoCompleteDays = parseStrictInt(form.autoCompleteDays)
    if (autoCompleteDays === null || autoCompleteDays < 1 || autoCompleteDays > 30) {
      const msg = 'Số ngày tự hoàn tất đơn phải từ 1 đến 30 ngày.'
      setFieldErrors({ autoCompleteDays: msg })
      notify.warning('Thời gian tự hoàn tất không hợp lệ', msg)
      return
    }

    const codMinTotal = parseStrictInt(form.codMinTotal)
    if (codMinTotal === null || codMinTotal < 0) {
      const msg = 'Tổng đơn tối thiểu cho COD phải là số nguyên từ 0 trở lên.'
      setFieldErrors({ codMinTotal: msg })
      notify.warning('Tổng đơn COD tối thiểu không hợp lệ', msg)
      return
    }

    const codMaxTotal = parseStrictInt(form.codMaxTotal)
    if (codMaxTotal === null || codMaxTotal < 0) {
      const msg = 'Tổng đơn tối đa cho COD phải là số nguyên từ 0 trở lên (0 = không giới hạn).'
      setFieldErrors({ codMaxTotal: msg })
      notify.warning('Tổng đơn COD tối đa không hợp lệ', msg)
      return
    }

    if (codMaxTotal > 0 && codMaxTotal < codMinTotal) {
      const msg =
        'Tổng đơn COD tối đa phải lớn hơn hoặc bằng mức tối thiểu (hoặc đặt 0 để không giới hạn).'
      setFieldErrors({ codMaxTotal: msg })
      notify.warning('Giới hạn COD không hợp lệ', msg)
      return
    }

    setFieldErrors({})

    const payload: UpdateSettingsRequest = {
      siteName: trimmedSiteName,
      hotline: form.hotline.trim(),
      supportEmail: trimmedEmail,
      freeShippingThreshold,
      baseItems,
      paymentHoldMinutes,
      autoCompleteDays,
      codMinTotal,
      codMaxTotal,
    }

    void notify
      .promise(
        updateMutation.mutateAsync({ data: payload }),
        {
          loading: 'Đang lưu cấu hình hệ thống...',
          success: 'Cập nhật cấu hình hệ thống thành công',
          error: function (err) {
            return safeErrorMessage(err, 'adminSettings', 'Không thể cập nhật cấu hình hệ thống.')
          },
        },
        { id: 'admin-settings-save' },
      )
      .then(function () {
        setDraft(null)
        setFieldErrors({})
        void queryClient.invalidateQueries({ queryKey: getGetSystemSettingsQueryKey() })
        void queryClient.invalidateQueries({ queryKey: getListConfigAuditQueryKey() })
      })
      .catch(function () {
        // Toast lỗi đã được xử lý bởi notify.promise
      })
  }

  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    submitSettings()
  }

  function handleSelectEntity(nextEntity: EntityFilterValue) {
    setEntityFilter(nextEntity)
    setAuditPage(0)
  }

  const freeShippingPreview = vndPreviewText(form.freeShippingThreshold)
  const codMinPreview = vndPreviewText(form.codMinTotal)
  const codMaxPreview = vndPreviewText(form.codMaxTotal, true)

  const formReady = settingsQuery.isLoading === false && settingsQuery.isError === false

  return (
    <AdminShell
      title="Cấu hình hệ thống"
      description="Quản lý thông tin sàn DHMQ, chính sách vận chuyển, thời hạn đơn hàng và giới hạn thanh toán COD."
      actions={
        <>
          <button
            type="button"
            onClick={handleReset}
            disabled={isDirty === false || updateMutation.isPending || formReady === false}
            className={secondaryButtonClass()}
          >
            <ArrowCounterClockwise size={16} weight="bold" />
            <span>Hoàn tác thay đổi</span>
          </button>
          <button
            type="button"
            onClick={submitSettings}
            disabled={isDirty === false || updateMutation.isPending || formReady === false}
            className={cn(
              primaryButtonClass(),
              'inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            <FloppyDisk size={16} weight="bold" />
            {updateMutation.isPending && <span>Đang lưu...</span>}
            {updateMutation.isPending === false && <span>Lưu cấu hình</span>}
          </button>
        </>
      }
    >
      <div className="space-y-6">
        {settingsQuery.isLoading && <SettingsFormSkeleton />}

        {settingsQuery.isError && (
          <StatePanel
            title="Không thể tải cấu hình hệ thống"
            description={safeErrorMessage(
              settingsQuery.error,
              'adminSettings',
              'Đã xảy ra lỗi khi tải thông số hệ thống. Vui lòng thử lại.',
            )}
            action={
              <button
                type="button"
                onClick={function () {
                  void settingsQuery.refetch()
                }}
                className={cn(
                  primaryButtonClass(),
                  'mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold',
                )}
              >
                <span>Thử lại</span>
              </button>
            }
          />
        )}

        {formReady && (
          <form onSubmit={handleFormSubmit} noValidate className="space-y-5">
            {/* Section 1: Thông tin sàn */}
            <section className={PANEL_CLASS}>
              <div className="mb-5 flex items-start gap-3">
                <span className={cn(iconChipClass(), 'h-10 w-10 rounded-2xl')}>
                  <Storefront size={20} weight="bold" />
                </span>
                <div>
                  <h2 className="text-lg font-extrabold tracking-tight text-[#17203a] dark:text-[#e2e8f0]">
                    Thông tin sàn
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Thông tin định danh và kênh liên hệ hỗ trợ hiển thị công khai cho khách hàng.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label htmlFor="setting-site-name" className={LABEL_CLASS}>
                    Tên sàn
                  </label>
                  <input
                    id="setting-site-name"
                    type="text"
                    maxLength={100}
                    value={form.siteName}
                    aria-invalid={fieldErrors.siteName !== undefined}
                    onChange={function (event) {
                      updateField('siteName', event.target.value)
                    }}
                    placeholder="DHMQ"
                    className={fieldInputClass(fieldErrors.siteName !== undefined)}
                  />
                  {fieldErrors.siteName !== undefined && (
                    <p
                      role="alert"
                      className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400"
                    >
                      {fieldErrors.siteName}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="setting-hotline" className={LABEL_CLASS}>
                    Hotline hiển thị
                  </label>
                  <input
                    id="setting-hotline"
                    type="text"
                    maxLength={20}
                    value={form.hotline}
                    onChange={function (event) {
                      updateField('hotline', event.target.value)
                    }}
                    placeholder="1900 1234"
                    className={cn(INPUT_CLASS, 'tabular-nums')}
                  />
                </div>

                <div>
                  <label htmlFor="setting-support-email" className={LABEL_CLASS}>
                    Email hỗ trợ
                  </label>
                  <input
                    id="setting-support-email"
                    type="email"
                    value={form.supportEmail}
                    aria-invalid={fieldErrors.supportEmail !== undefined}
                    onChange={function (event) {
                      updateField('supportEmail', event.target.value)
                    }}
                    placeholder="support@dhmq.vn"
                    className={fieldInputClass(fieldErrors.supportEmail !== undefined)}
                  />
                  {fieldErrors.supportEmail !== undefined && (
                    <p
                      role="alert"
                      className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400"
                    >
                      {fieldErrors.supportEmail}
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* Section 2: Vận chuyển & Vòng đời đơn hàng */}
            <section className={PANEL_CLASS}>
              <div className="mb-5 flex items-start gap-3">
                <span className={cn(iconChipClass(), 'h-10 w-10 rounded-2xl')}>
                  <Truck size={20} weight="bold" />
                </span>
                <div>
                  <h2 className="text-lg font-extrabold tracking-tight text-[#17203a] dark:text-[#e2e8f0]">
                    Vận chuyển &amp; Vòng đời đơn hàng
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Ngưỡng miễn phí vận chuyển, số lượng sản phẩm tính phí cơ bản và thời hạn tự
                    động xử lý đơn.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label htmlFor="setting-free-shipping" className={LABEL_CLASS}>
                    Ngưỡng freeship (VND)
                  </label>
                  <input
                    id="setting-free-shipping"
                    type="number"
                    min={0}
                    step={1000}
                    value={form.freeShippingThreshold}
                    aria-invalid={fieldErrors.freeShippingThreshold !== undefined}
                    onChange={function (event) {
                      updateField('freeShippingThreshold', event.target.value)
                    }}
                    className={fieldInputClass(
                      fieldErrors.freeShippingThreshold !== undefined,
                      'tabular-nums',
                    )}
                  />
                  {fieldErrors.freeShippingThreshold !== undefined && (
                    <p
                      role="alert"
                      className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400"
                    >
                      {fieldErrors.freeShippingThreshold}
                    </p>
                  )}
                  {fieldErrors.freeShippingThreshold === undefined &&
                    freeShippingPreview !== null && (
                      <p className="mt-1.5 text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
                        {freeShippingPreview}
                      </p>
                    )}
                </div>

                <div>
                  <label htmlFor="setting-base-items" className={LABEL_CLASS}>
                    Số SP tối đa phí cơ bản
                  </label>
                  <input
                    id="setting-base-items"
                    type="number"
                    min={1}
                    max={20}
                    value={form.baseItems}
                    aria-invalid={fieldErrors.baseItems !== undefined}
                    onChange={function (event) {
                      updateField('baseItems', event.target.value)
                    }}
                    className={fieldInputClass(fieldErrors.baseItems !== undefined, 'tabular-nums')}
                  />
                  {fieldErrors.baseItems !== undefined && (
                    <p
                      role="alert"
                      className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400"
                    >
                      {fieldErrors.baseItems}
                    </p>
                  )}
                  {fieldErrors.baseItems === undefined && (
                    <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                      Cho phép từ 1 đến 20 sản phẩm
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="setting-payment-hold" className={LABEL_CLASS}>
                    Phút giữ đơn chờ thanh toán
                  </label>
                  <input
                    id="setting-payment-hold"
                    type="number"
                    min={5}
                    max={1440}
                    value={form.paymentHoldMinutes}
                    aria-invalid={fieldErrors.paymentHoldMinutes !== undefined}
                    onChange={function (event) {
                      updateField('paymentHoldMinutes', event.target.value)
                    }}
                    className={fieldInputClass(
                      fieldErrors.paymentHoldMinutes !== undefined,
                      'tabular-nums',
                    )}
                  />
                  {fieldErrors.paymentHoldMinutes !== undefined && (
                    <p
                      role="alert"
                      className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400"
                    >
                      {fieldErrors.paymentHoldMinutes}
                    </p>
                  )}
                  {fieldErrors.paymentHoldMinutes === undefined && (
                    <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                      Từ 5 đến 1.440 phút (tối đa 24 giờ)
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="setting-auto-complete" className={LABEL_CLASS}>
                    Ngày tự hoàn tất đơn
                  </label>
                  <input
                    id="setting-auto-complete"
                    type="number"
                    min={1}
                    max={30}
                    value={form.autoCompleteDays}
                    aria-invalid={fieldErrors.autoCompleteDays !== undefined}
                    onChange={function (event) {
                      updateField('autoCompleteDays', event.target.value)
                    }}
                    className={fieldInputClass(
                      fieldErrors.autoCompleteDays !== undefined,
                      'tabular-nums',
                    )}
                  />
                  {fieldErrors.autoCompleteDays !== undefined && (
                    <p
                      role="alert"
                      className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400"
                    >
                      {fieldErrors.autoCompleteDays}
                    </p>
                  )}
                  {fieldErrors.autoCompleteDays === undefined && (
                    <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                      Từ 1 đến 30 ngày sau khi giao hàng
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* Section 3: Giới hạn thanh toán COD */}
            <section className={PANEL_CLASS}>
              <div className="mb-5 flex items-start gap-3">
                <span className={cn(iconChipClass(), 'h-10 w-10 rounded-2xl')}>
                  <Money size={20} weight="bold" />
                </span>
                <div>
                  <h2 className="text-lg font-extrabold tracking-tight text-[#17203a] dark:text-[#e2e8f0]">
                    Giới hạn thanh toán COD
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Kiểm soát giá trị đơn hàng tối thiểu và tối đa được phép thanh toán khi nhận
                    hàng.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="setting-cod-min" className={LABEL_CLASS}>
                    Tổng đơn tối thiểu COD (VND)
                  </label>
                  <input
                    id="setting-cod-min"
                    type="number"
                    min={0}
                    step={1000}
                    value={form.codMinTotal}
                    aria-invalid={fieldErrors.codMinTotal !== undefined}
                    onChange={function (event) {
                      updateField('codMinTotal', event.target.value)
                    }}
                    className={fieldInputClass(
                      fieldErrors.codMinTotal !== undefined,
                      'tabular-nums',
                    )}
                  />
                  {fieldErrors.codMinTotal !== undefined && (
                    <p
                      role="alert"
                      className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400"
                    >
                      {fieldErrors.codMinTotal}
                    </p>
                  )}
                  {fieldErrors.codMinTotal === undefined && codMinPreview !== null && (
                    <p className="mt-1.5 text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
                      {codMinPreview}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="setting-cod-max" className={LABEL_CLASS}>
                    Tổng đơn tối đa COD (VND)
                  </label>
                  <input
                    id="setting-cod-max"
                    type="number"
                    min={0}
                    step={1000}
                    value={form.codMaxTotal}
                    aria-invalid={fieldErrors.codMaxTotal !== undefined}
                    onChange={function (event) {
                      updateField('codMaxTotal', event.target.value)
                    }}
                    className={fieldInputClass(
                      fieldErrors.codMaxTotal !== undefined,
                      'tabular-nums',
                    )}
                  />
                  {fieldErrors.codMaxTotal !== undefined && (
                    <p
                      role="alert"
                      className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400"
                    >
                      {fieldErrors.codMaxTotal}
                    </p>
                  )}
                  {fieldErrors.codMaxTotal === undefined && (
                    <p className="mt-1.5 text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
                      0 = không giới hạn
                      {codMaxPreview !== null && ` · ${codMaxPreview}`}
                    </p>
                  )}
                </div>
              </div>
            </section>
          </form>
        )}

        {/* Section 4: Lịch sử thay đổi cấu hình */}
        <section className={PANEL_CLASS}>
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <span className={cn(iconChipClass(), 'h-10 w-10 rounded-2xl')}>
                <ClockCounterClockwise size={20} weight="bold" />
              </span>
              <div>
                <h2 className="text-lg font-extrabold tracking-tight text-[#17203a] dark:text-[#e2e8f0]">
                  Lịch sử thay đổi cấu hình
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Theo dõi mọi thao tác cập nhật cấu hình từ quản trị viên, mới nhất lên đầu.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto pb-1">
              <div
                role="tablist"
                aria-label="Lọc theo loại đối tượng cấu hình"
                className={cn(segmentedTrackClass(), 'w-max')}
              >
                {ENTITY_FILTERS.map(function (option) {
                  const active = entityFilter === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={function () {
                        handleSelectEntity(option.value)
                      }}
                      className={segmentedItemClass(active)}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {auditQuery.isLoading && <TableRowsSkeleton rows={5} columns={5} />}

          {auditQuery.isError && (
            <StatePanel
              title="Không thể tải lịch sử cấu hình"
              description={safeErrorMessage(
                auditQuery.error,
                'adminSettings',
                'Đã xảy ra lỗi khi tải nhật ký thay đổi cấu hình.',
              )}
              action={
                <button
                  type="button"
                  onClick={function () {
                    void auditQuery.refetch()
                  }}
                  className={cn(
                    primaryButtonClass(),
                    'mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold',
                  )}
                >
                  <span>Thử lại</span>
                </button>
              }
            />
          )}

          {auditQuery.isLoading === false &&
            auditQuery.isError === false &&
            auditItems.length === 0 && (
              <EmptyState
                icon={<ClockCounterClockwise size={26} weight="bold" />}
                title="Chưa có lịch sử thay đổi"
                description="Mọi thay đổi cấu hình hệ thống khớp bộ lọc sẽ được hiển thị tại đây."
              />
            )}

          {auditQuery.isLoading === false &&
            auditQuery.isError === false &&
            auditItems.length > 0 && (
              <>
                {/* Desktop table */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200/80 dark:border-white/10">
                        <th className={cn(sectionLabelClass(), 'pr-4 pb-3')}>Thời điểm</th>
                        <th className={cn(sectionLabelClass(), 'pr-4 pb-3')}>Đối tượng</th>
                        <th className={cn(sectionLabelClass(), 'pr-4 pb-3')}>Hành động</th>
                        <th className={cn(sectionLabelClass(), 'pr-4 pb-3')}>
                          Giá trị cũ → Giá trị mới
                        </th>
                        <th className={cn(sectionLabelClass(), 'pb-3')}>Người thực hiện</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200/70 dark:divide-white/10">
                      {auditItems.map(function (item, idx) {
                        const rowKey = item.id ?? `${item.entityKey ?? 'audit'}-${idx}`
                        let actor = 'Hệ thống / Đã xóa'
                        if (item.changedBy !== undefined && item.changedBy !== '') {
                          actor = item.changedBy
                        }
                        return (
                          <tr
                            key={rowKey}
                            className="transition hover:bg-sky-50/50 dark:hover:bg-white/5"
                          >
                            <td className="py-3.5 pr-4 text-xs font-medium whitespace-nowrap text-zinc-600 tabular-nums dark:text-zinc-300">
                              {formatDateTime(item.changedAt)}
                            </td>
                            <td className="py-3.5 pr-4">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-xs font-bold text-[#17203a] dark:text-[#e2e8f0]">
                                  {entityLabel(item.entity)}
                                </span>
                                {item.entityKey !== undefined && item.entityKey !== '' && (
                                  <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                                    {item.entityKey}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 pr-4 whitespace-nowrap">
                              <span className={actionBadgeClass(item.action)}>
                                {actionLabel(item.action)}
                              </span>
                            </td>
                            <td className="max-w-md py-3.5 pr-4">
                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-medium break-all text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
                                  {formatAuditValue(item.oldValue)}
                                </span>
                                <ArrowRight
                                  size={14}
                                  weight="bold"
                                  className="shrink-0 text-zinc-400"
                                />
                                <span className="rounded-full bg-indigo-50 px-2.5 py-1 font-bold break-all text-indigo-800 dark:bg-sky-500/15 dark:text-sky-300">
                                  {formatAuditValue(item.newValue)}
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                              <span className="block max-w-[180px] truncate" title={actor}>
                                {actor}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="space-y-3 md:hidden">
                  {auditItems.map(function (item, idx) {
                    const cardKey = item.id ?? `${item.entityKey ?? 'audit-card'}-${idx}`
                    let actor = 'Hệ thống / Đã xóa'
                    if (item.changedBy !== undefined && item.changedBy !== '') {
                      actor = item.changedBy
                    }
                    return (
                      <article
                        key={cardKey}
                        className="rounded-2xl border border-zinc-200/80 bg-zinc-50/70 p-4 dark:border-white/10 dark:bg-white/5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={actionBadgeClass(item.action)}>
                            {actionLabel(item.action)}
                          </span>
                          <span className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
                            {formatDateTime(item.changedAt)}
                          </span>
                        </div>
                        <div className="mt-2.5">
                          <p className="text-sm font-bold text-[#17203a] dark:text-[#e2e8f0]">
                            {entityLabel(item.entity)}
                          </p>
                          {item.entityKey !== undefined && item.entityKey !== '' && (
                            <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                              {item.entityKey}
                            </p>
                          )}
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                          <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-medium break-all text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
                            {formatAuditValue(item.oldValue)}
                          </span>
                          <ArrowRight size={14} weight="bold" className="shrink-0 text-zinc-400" />
                          <span className="rounded-full bg-indigo-50 px-2.5 py-1 font-bold break-all text-indigo-800 dark:bg-sky-500/15 dark:text-sky-300">
                            {formatAuditValue(item.newValue)}
                          </span>
                        </div>
                        <p className="mt-2.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                          Thực hiện: {actor}
                        </p>
                      </article>
                    )
                  })}
                </div>

                {/* Summary + Shared Pagination */}
                <div className="mt-5 border-t border-zinc-200/80 pt-4 dark:border-white/10">
                  <p className="text-xs font-medium text-zinc-500 tabular-nums dark:text-zinc-400">
                    Tổng {auditTotal.toLocaleString('vi-VN')} bản ghi · Trang {auditPage + 1} /{' '}
                    {totalAuditPages}
                  </p>
                  <Pagination
                    page={auditPage}
                    totalPages={totalAuditPages}
                    onPage={function (nextPage) {
                      setAuditPage(nextPage)
                    }}
                  />
                </div>
              </>
            )}
        </section>
      </div>
    </AdminShell>
  )
}
