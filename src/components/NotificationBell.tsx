import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'

import {
  getGetUnreadNotificationCountQueryKey,
  getListNotificationsQueryKey,
  useDeleteNotification,
  useGetUnreadNotificationCount,
  useListNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from '@generated/endpoints/notifications/notifications'
import { Bell, CheckCircle, X } from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import { useSessionQuery } from '@/hooks/useSession'
import { useWebSocket } from '@/hooks/useWebSocket'
import { takeData } from '@/lib/apiAdapters'
import { formatDateTime } from '@/lib/format'
import { getTargetNotificationLink } from '@/lib/notificationLinks'

import type { GetUnreadNotificationCountParams, ListNotificationsParams } from '@generated/model'
import type { NotificationResponse } from '@generated/model/notificationResponse'

const TAB_LABELS = {
  ORDER: 'Đơn hàng',
  ACTIVITY: 'Hoạt động',
  SELLING: 'Bán hàng',
} as const

export interface NotificationBellProps {
  categories?: Array<'ORDER' | 'ACTIVITY' | 'SELLING'>
  defaultOpen?: boolean
}

function getNotificationClass(isRead: boolean): string {
  if (isRead) {
    return 'w-full text-left p-3 rounded-xl transition hover:bg-zinc-100 dark:hover:bg-white/5 opacity-80'
  }
  return 'w-full text-left p-3 rounded-xl transition bg-indigo-50/80 hover:bg-indigo-100/80 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50'
}

export default function NotificationBell(props: NotificationBellProps) {
  const categories = props?.categories
  const defaultOpen = props?.defaultOpen

  let initialOpen = false
  if (defaultOpen !== undefined) {
    initialOpen = defaultOpen
  }
  const [open, setOpen] = useState(initialOpen)

  let initialTab: 'ORDER' | 'ACTIVITY' | 'SELLING' = 'ORDER'
  if (categories && categories.length > 0) {
    initialTab = categories[0]
  }
  const [activeTab, setActiveTab] = useState<'ORDER' | 'ACTIVITY' | 'SELLING'>(initialTab)

  const dropdownRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: session } = useSessionQuery()
  const isLoggedIn = session !== null && session !== undefined

  let unreadParams: GetUnreadNotificationCountParams | undefined = undefined
  if (categories && categories.length > 0) {
    unreadParams = { categories: categories.join(',') }
  }

  const unreadQuery = useGetUnreadNotificationCount(unreadParams, {
    query: {
      refetchInterval: 30000,
      enabled: isLoggedIn,
    },
  })

  let tabListParam: string | undefined = undefined
  if (categories && categories.length > 1) {
    tabListParam = activeTab
  } else if (categories && categories.length === 1) {
    tabListParam = categories[0]
  }

  const listParams: ListNotificationsParams = { page: 0, size: 20 }
  if (tabListParam !== undefined) {
    listParams.categories = tabListParam
  }

  const listQuery = useListNotifications(listParams, {
    query: {
      refetchInterval: 30000,
      enabled: isLoggedIn,
    },
  })

  const markReadMutation = useMarkNotificationRead({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: getGetUnreadNotificationCountQueryKey() })
        void queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() })
      },
    },
  })

  const markAllMutation = useMarkAllNotificationsRead({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: getGetUnreadNotificationCountQueryKey() })
        void queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() })
      },
    },
  })

  const deleteMutation = useDeleteNotification({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: getGetUnreadNotificationCountQueryKey() })
        void queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() })
      },
    },
  })

  useWebSocket('/user/queue/notifications', function () {
    void queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() })
    void queryClient.invalidateQueries({ queryKey: getGetUnreadNotificationCountQueryKey() })
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
  let countsByCategory: Record<string, number> = {}
  if (unreadQuery.data !== undefined) {
    const countData = takeData(unreadQuery.data)
    if (countData.unread !== undefined && countData.unread !== null) {
      unreadCount = countData.unread
    }
    if (countData.byCategory !== undefined && countData.byCategory !== null) {
      countsByCategory = countData.byCategory
    }
  }

  let notifications: NotificationResponse[] = []
  if (listQuery.data !== undefined) {
    const pageData = takeData(listQuery.data)
    if (pageData.items !== undefined && pageData.items !== null) {
      notifications = pageData.items
    }
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
    if (item.type === 'CHAT_MESSAGE' && (item.link === null || item.link === undefined)) {
      window.dispatchEvent(new CustomEvent('fashionstore:open-chat'))
      return
    }
    const targetLink = getTargetNotificationLink(item)
    if (targetLink !== null) {
      void navigate(targetLink)
    }
  }

  function handleMarkAllRead() {
    let variables: { params?: { categories?: string } } = {}
    if (tabListParam !== undefined) {
      variables = { params: { categories: tabListParam } }
    }
    markAllMutation.mutate(variables)
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
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-2xl backdrop-blur-md sm:w-96 dark:border-white/15 dark:bg-[#0a0f1e]">
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

          {categories && categories.length > 1 && (
            <div className="flex border-b border-zinc-100 px-4 dark:border-white/10">
              {categories.map((cat) => {
                let tabClass =
                  'border-b-2 border-transparent px-3 py-2 text-xs font-semibold text-zinc-500 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                if (activeTab === cat) {
                  tabClass =
                    'border-b-2 border-indigo-600 px-3 py-2 text-xs font-semibold text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                }
                let catCount = 0
                if (countsByCategory[cat] !== undefined) {
                  catCount = countsByCategory[cat]
                }
                let catBadgeText = String(catCount)
                if (catCount > 99) {
                  catBadgeText = '99+'
                }
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveTab(cat)}
                    className={tabClass}
                  >
                    <span className="flex items-center gap-1.5">
                      <span>{TAB_LABELS[cat]}</span>
                      {catCount > 0 && (
                        <span className="py-0.2 inline-flex items-center justify-center rounded-full bg-indigo-100 px-1.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                          {catBadgeText}
                        </span>
                      )}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          <div className="max-h-96 divide-y divide-zinc-100 overflow-y-auto p-2 dark:divide-white/5">
            {notifications.length === 0 && (
              <div className="py-8 text-center text-xs text-zinc-400 dark:text-zinc-500">
                Chưa có thông báo nào
              </div>
            )}
            {notifications.map((item) => {
              const isRead = Boolean(item.readAt)
              let itemKey = item.createdAt
              if (item.id) {
                itemKey = item.id
              }
              return (
                <div key={itemKey} className="group relative">
                  <button
                    type="button"
                    onClick={() => handleItemClick(item)}
                    className={getNotificationClass(isRead)}
                  >
                    <div className="flex items-start justify-between gap-2 pr-6">
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
                  <button
                    type="button"
                    aria-label="Xóa thông báo"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (item.id) {
                        deleteMutation.mutate({ id: item.id })
                      }
                    }}
                    className="absolute top-2 right-2 rounded-full p-1 text-zinc-400 opacity-0 transition group-hover:opacity-100 hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-white/10 dark:hover:text-zinc-200"
                  >
                    <X size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
