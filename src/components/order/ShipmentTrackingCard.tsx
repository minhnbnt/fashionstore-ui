import { useState } from 'react'

import { Check, Copy, MapPin, Package, Truck } from '@phosphor-icons/react'

import { formatDateTime } from '@/lib/format'
import { actorLabel, timelineTitle } from '@/lib/order/orderMonitoring'

import type { BuyerOrderTimelineResponse } from '@generated/model/buyerOrderTimelineResponse'
import type { OrderTrackingEventResponse } from '@generated/model/orderTrackingEventResponse'

interface Props {
  shippingCarrier?: string | null
  trackingCode?: string | null
  events?: OrderTrackingEventResponse[]
  timeline?: BuyerOrderTimelineResponse[]
  isLoading?: boolean
}

function trackingStatusBadge(code: string | undefined): string {
  if (code === 'DELIVERED') {
    return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200'
  }
  if (code === 'OUT_FOR_DELIVERY' || code === 'IN_TRANSIT') {
    return 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200'
  }
  return 'bg-zinc-100 text-zinc-700 dark:bg-white/10 dark:text-zinc-200'
}

export default function ShipmentTrackingCard(props: Props) {
  const [copied, setCopied] = useState(false)
  const events = props.events ?? []
  const timeline = props.timeline ?? []

  async function handleCopy() {
    if (!props.trackingCode) {
      return
    }
    try {
      await navigator.clipboard.writeText(props.trackingCode)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      // ignore clipboard errors in non-HTTPS contexts
    }
  }

  return (
    <div className="space-y-4 rounded-3xl border border-zinc-200 bg-white/80 p-5 dark:border-white/10 dark:bg-[#11182a]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Truck size={20} weight="bold" className="text-blue-600 dark:text-sky-300" />
          <h2 className="text-base font-extrabold tracking-tight text-zinc-900 dark:text-white">
            Thông tin vận chuyển &amp; Hành trình
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {Boolean(props.shippingCarrier) && (
            <span className="rounded-full bg-blue-50 px-3 py-1 font-bold text-blue-700 dark:bg-blue-500/15 dark:text-sky-200">
              {props.shippingCarrier}
            </span>
          )}
          {Boolean(props.trackingCode) && (
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 px-3 py-1 font-mono font-bold text-zinc-700 transition hover:bg-zinc-100 dark:border-white/15 dark:text-zinc-200 dark:hover:bg-white/10"
            >
              <span>{props.trackingCode}</span>
              {copied && <Check size={14} weight="bold" className="text-emerald-500" />}
              {!copied && <Copy size={14} />}
            </button>
          )}
          {!props.shippingCarrier && !props.trackingCode && (
            <span className="text-zinc-500 dark:text-zinc-400">Chưa bàn giao ĐVVC</span>
          )}
        </div>
      </div>

      {props.isLoading && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Đang tải hành trình gói hàng…</p>
      )}

      {events.length > 0 && (
        <div className="space-y-3 border-t border-zinc-200 pt-4 dark:border-white/10">
          <p className="text-xs font-bold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
            Lịch sử di chuyển gói hàng
          </p>
          <ol className="space-y-3">
            {events.map((ev, index) => (
              <li
                key={ev.id ?? `${ev.statusCode ?? 'ev'}-${index}`}
                className="flex gap-3 rounded-2xl bg-zinc-50/80 p-3 dark:bg-white/5"
              >
                <Package
                  size={16}
                  weight="bold"
                  className="mt-0.5 shrink-0 text-blue-600 dark:text-sky-300"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-bold text-zinc-900 dark:text-white">
                      {ev.title}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${trackingStatusBadge(ev.statusCode)}`}
                    >
                      {ev.statusCode}
                    </span>
                  </div>
                  {Boolean(ev.location) && (
                    <p className="flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-300">
                      <MapPin size={13} />
                      <span>{ev.location}</span>
                    </p>
                  )}
                  {Boolean(ev.description) && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{ev.description}</p>
                  )}
                  {Boolean(ev.eventTime) && (
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                      {formatDateTime(ev.eventTime)}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {events.length === 0 && Boolean(props.trackingCode) && !props.isLoading && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Đơn vị vận chuyển đang cập nhật hành trình chi tiết.
        </p>
      )}

      {timeline.length > 0 && (
        <div className="space-y-2 border-t border-zinc-200 pt-4 dark:border-white/10">
          <p className="text-xs font-bold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
            Mốc xử lý đơn hàng
          </p>
          <ul className="space-y-2">
            {timeline.map((entry, idx) => (
              <li
                key={`${entry.toStatus ?? 'st'}-${entry.createdAt ?? idx}`}
                className="flex items-start justify-between gap-3 text-xs"
              >
                <div className="space-y-0.5">
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {timelineTitle(entry.fromStatus, entry.toStatus, entry.actor)}
                  </p>
                  {Boolean(entry.note) && (
                    <p className="text-zinc-500 dark:text-zinc-400">{entry.note}</p>
                  )}
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                    {actorLabel(entry.actor)}
                  </p>
                </div>
                {Boolean(entry.createdAt) && (
                  <span className="shrink-0 text-[11px] text-zinc-400 dark:text-zinc-500">
                    {formatDateTime(entry.createdAt)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
