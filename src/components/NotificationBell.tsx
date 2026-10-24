import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'

import {
  getGetUnreadNotificationCountQueryKey,
  getListNotificationsQueryKey,
  useGetUnreadNotificationCount,
  useListNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from '@generated/endpoints/notifications/notifications'
import { Bell, CheckCircle } from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import { useSessionQuery } from '@/hooks/useSession'
import { takeData } from '@/lib/apiAdapters'
import { formatDateTime } from '@/lib/format'

import type { NotificationResponse } from '@generated/model/notificationResponse'

function getNotificationClass(isRead: boolean): string {
  if (isRead) {
    return 'w-full text-left p-3 rounded-xl transition hover:bg-zinc-100 dark:hover:bg-white/5 opacity-80'
  }
  return 'w-full text-left p-3 rounded-xl transition bg-indigo-50/80 hover:bg-indigo-100/80 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50'
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: session } = useSessionQuery()
  const isLoggedIn = session !== null && session !== undefined

  const unreadQuery = useGetUnreadNotificationCount({
    query: {
      refetchInterval: 30000,
      enabled: isLoggedIn,
    },
  })

  const listQuery = useListNotifications(
    { page: 0, size: 20 },
    {
      query: {
        refetchInterval: 30000,
        enabled: isLoggedIn,
      },
    },
  )

  const markReadMutation = useMarkNotificationRead({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: getGetUnreadNotificationCountQueryKey() })
        void queryClient.invalidateQueries({
          queryKey: getListNotificationsQueryKey({ page: 0, size: 20 }),
        })
      },
    },
  })

  const markAllMutation = useMarkAllNotificationsRead({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: getGetUnreadNotificationCountQueryKey() })
        void queryClient.invalidateQueries({
          queryKey: getListNotificationsQueryKey({ page: 0, size: 20 }),
        })
      },
    },
  })

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  if (!isLoggedIn) {
    return null
  }

  let unreadCount = 0
  if (unreadQuery.data !== undefined) {
    const countData = takeData(unreadQuery.data)
    unreadCount = countData.unread ?? 0
  }

  let notifications: NotificationResponse[] = []
  if (listQuery.data !== undefined) {
    const pageData = takeData(listQuery.data)
    notifications = pageData.items ?? []
  }

  let unreadBadgeText = String(unreadCount)
  if (unreadCount > 99) {
    unreadBadgeText = '99+'
  }

  let bellWeight: 'fill' | 'regular' = 'regular'
  if (unreadCount > 0) {
    bellWeight = 'fill'
  }

  function handleItemClick(item: NotificationResponse) {
    if (item.id && !item.readAt) {
      markReadMutation.mutate({ id: item.id })
    }
    setOpen(false)
    if (item.link) {
      void navigate(item.link)
    }
  }

  function handleMarkAllRead() {
    markAllMutation.mutate()
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        id="btn-notification-bell"
        aria-label="Thông báo"
        onClick={() => setOpen(!open)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-zinc-600 transition hover:bg-indigo-100 dark:text-zinc-300 dark:hover:bg-white/10"
      >
        <Bell size={20} weight={bellWeight} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white shadow-sm">
            {unreadBadgeText}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-2xl backdrop-blur-md sm:w-96 dark:border-white/10 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-white/10">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Thông báo</h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                  {unreadCount} mới
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={markAllMutation.isPending}
                className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 disabled:opacity-50 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                <CheckCircle size={14} />
                <span>Đã đọc tất cả</span>
              </button>
            )}
          </div>

          <div className="max-h-96 divide-y divide-zinc-100 overflow-y-auto p-2 dark:divide-white/5">
            {notifications.length === 0 && (
              <div className="py-8 text-center text-xs text-zinc-400 dark:text-zinc-500">
                Chưa có thông báo nào
              </div>
            )}
            {notifications.map((item) => {
              const isRead = Boolean(item.readAt)
              return (
                <button
                  key={item.id ?? item.createdAt}
                  type="button"
                  onClick={() => handleItemClick(item)}
                  className={getNotificationClass(isRead)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-1 text-xs font-bold text-zinc-800 dark:text-zinc-100">
                      {item.title}
                    </p>
                    {!isRead && (
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-zinc-600 dark:text-zinc-300">
                    {item.body}
                  </p>
                  <p className="mt-1.5 text-[11px] text-zinc-400 dark:text-zinc-500">
                    {formatDateTime(item.createdAt)}
                  </p>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
