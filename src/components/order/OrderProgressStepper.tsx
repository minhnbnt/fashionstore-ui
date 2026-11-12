import { CheckCircle, Clock, Package, Receipt, Truck, XCircle } from '@phosphor-icons/react'

import { formatDateTime } from '@/lib/format'
import { returnStatusMeta } from '@/lib/order/orderStatus'

interface Props {
  status: string | null | undefined
  createdAt?: string | null
  confirmedAt?: string | null
  shippedAt?: string | null
  deliveredAt?: string | null
  receivedAt?: string | null
  cancelledAt?: string | null
  returnStatus?: string | null
  compact?: boolean
}

interface StepDef {
  key: string
  label: string
  time?: string | null
  done: boolean
  active: boolean
}

function resolveSteps(props: Props): StepDef[] {
  const status = props.status ?? 'PENDING'
  const isConfirmed = status === 'CONFIRMED' || status === 'SHIPPING' || status === 'DELIVERED'
  const isShipping = status === 'SHIPPING' || status === 'DELIVERED'
  const isDelivered = status === 'DELIVERED'
  const isReceived = Boolean(props.receivedAt)

  return [
    {
      key: 'PENDING',
      label: 'Đặt hàng',
      time: props.createdAt,
      done: true,
      active: status === 'PENDING',
    },
    {
      key: 'CONFIRMED',
      label: 'Đang chuẩn bị',
      time: props.confirmedAt,
      done: isConfirmed,
      active: status === 'CONFIRMED',
    },
    {
      key: 'SHIPPING',
      label: 'Đang giao',
      time: props.shippedAt,
      done: isShipping,
      active: status === 'SHIPPING',
    },
    {
      key: 'DELIVERED',
      label: 'Đã giao',
      time: props.deliveredAt,
      done: isDelivered,
      active: isDelivered && !isReceived,
    },
    {
      key: 'RECEIVED',
      label: 'Hoàn thành',
      time: props.receivedAt,
      done: isReceived,
      active: isReceived,
    },
  ]
}

function progressPercent(steps: StepDef[]): number {
  let doneCount = 0
  for (const step of steps) {
    if (step.done) {
      doneCount += 1
    }
  }
  if (steps.length <= 1) {
    return 100
  }
  const index = Math.max(0, doneCount - 1)
  return Math.round((index / (steps.length - 1)) * 100)
}

function stepIcon(key: string) {
  if (key === 'CONFIRMED') {
    return <Package size={16} weight="bold" />
  }
  if (key === 'SHIPPING') {
    return <Truck size={16} weight="bold" />
  }
  if (key === 'DELIVERED') {
    return <CheckCircle size={16} weight="bold" />
  }
  if (key === 'RECEIVED') {
    return <Clock size={16} weight="bold" />
  }
  return <Receipt size={16} weight="bold" />
}

function circleClass(step: StepDef): string {
  if (step.done) {
    return 'flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm'
  }
  if (step.active) {
    return 'flex h-8 w-8 items-center justify-center rounded-full border-2 border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200'
  }
  return 'flex h-8 w-8 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-400 dark:border-white/15 dark:bg-[#11182a] dark:text-zinc-500'
}

export default function OrderProgressStepper(props: Props) {
  const returnMeta = returnStatusMeta(props.returnStatus)

  if (props.status === 'CANCELLED') {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-800 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-200">
          <XCircle size={20} weight="bold" className="shrink-0" />
          <div>
            <p className="font-bold">Đơn hàng đã hủy</p>
            {Boolean(props.cancelledAt) && (
              <p className="text-xs opacity-80">{formatDateTime(props.cancelledAt)}</p>
            )}
          </div>
        </div>
        {returnMeta !== null && (
          <div className="inline-flex rounded-full border border-white/10 px-3 py-1 text-xs font-bold">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${returnMeta.className}`}
            >
              {returnMeta.label}
            </span>
          </div>
        )}
      </div>
    )
  }

  const steps = resolveSteps(props)
  const percent = progressPercent(steps)
  let wrapperSpacing = 'space-y-4'
  if (props.compact) {
    wrapperSpacing = 'space-y-2.5'
  }

  return (
    <div className={wrapperSpacing}>
      {/* Desktop horizontal stepper */}
      <div className="hidden sm:block">
        <div className="relative flex items-start justify-between gap-2">
          <div className="absolute top-4 right-8 left-8 h-1 rounded-full bg-zinc-200 dark:bg-white/10">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-300 motion-reduce:transition-none"
              style={{ width: `${percent}%` }}
            />
          </div>
          {steps.map((step) => (
            <div
              key={step.key}
              className="relative z-10 flex flex-1 flex-col items-center text-center"
            >
              <div className={circleClass(step)}>{stepIcon(step.key)}</div>
              <span className="mt-2 text-xs font-bold text-zinc-900 dark:text-white">
                {step.label}
              </span>
              {!props.compact && Boolean(step.time) && (
                <span className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                  {formatDateTime(step.time)}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile vertical stepper */}
      <div className="space-y-2 sm:hidden">
        {steps.map((step) => (
          <div key={step.key} className="flex items-center gap-3">
            <div className={circleClass(step)}>{stepIcon(step.key)}</div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-zinc-900 dark:text-white">{step.label}</p>
              {!props.compact && Boolean(step.time) && (
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {formatDateTime(step.time)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {!props.compact && returnMeta !== null && (
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-sky-100 bg-white/70 px-3.5 py-2 dark:border-white/10 dark:bg-white/5">
          <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
            Trạng thái đổi trả:
          </span>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${returnMeta.className}`}>
            {returnMeta.label}
          </span>
        </div>
      )}
    </div>
  )
}
