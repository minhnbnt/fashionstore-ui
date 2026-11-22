import { useRef, useState } from 'react'
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

import { useMenuDisclosure } from '@/hooks/useMenuDisclosure'
import { useSessionQuery } from '@/hooks/useSession'
import { useWebSocket } from '@/hooks/useWebSocket'
import { takeData } from '@/lib/api/apiAdapters'
import {
  getTargetNotificationLink,
  realtimeInvalidationKeys,
} from '@/lib/content/notificationLinks'
import { formatDateTime } from '@/lib/format'
import { cn, FOCUS_RING_CLASS, segmentedItemClass, segmentedTrackClass } from '@/lib/ui/styles'

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
    return cn(
      'w-full cursor-pointer rounded-2xl p-3 text-left opacity-80 transition hover:bg-zinc-100 dark:hover:bg-white/5',
      FOCUS_RING_CLASS,
    )
  }
  return cn(
    'w-full cursor-pointer rounded-2xl bg-sky-50/85 p-3 text-left transition hover:bg-sky-100/80 dark:bg-blue-700/15 dark:hover:bg-blue-700/25',
    FOCUS_RING_CLASS,
  )
}

function tabBadgeClass(active: boolean): string {
  if (active) {
    return 'inline-flex items-center justify-center rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold text-white tabular-nums'
  }
  return 'inline-flex items-center justify-center rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 tabular-nums dark:bg-white/10 dark:text-sky-300'
}

export default function NotificationBell(props: NotificationBellProps) {
  const categories = props?.categories
  const defaultOpen = props?.defaultOpen

  let initialOpen = false
  if (defaultOpen !== undefined) {
    initialOpen = defaultOpen
  }
  const bellContainerRef = useRef<HTMLDivElement>(null)
  const bellTriggerRef = useRef<HTMLButtonElement>(null)
  const menu = useMenuDisclosure({
    containerRef: bellContainerRef,
    triggerRef: bellTriggerRef,
    initialOpen,
  })

  let initialTab: 'ORDER' | 'ACTIVITY' | 'SELLING' = 'ORDER'
  if (categories && categories.length > 0) {
    initialTab = categories[0]
  }
  const [activeTab, setActiveTab] = useState<'ORDER' | 'ACTIVITY' | 'SELLING'>(initialTab)
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

  useWebSocket('/user/queue/notifications', function (frame) {
    void queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() })
    void queryClient.invalidateQueries({ queryKey: getGetUnreadNotificationCountQueryKey() })
    let notificationType: string | undefined
    if (frame?.body) {
      try {
        const payload = JSON.parse(frame.body) as { type?: string }
        notificationType = payload.type
      } catch {
        notificationType = undefined
      }
    }
    const keys = realtimeInvalidationKeys(notificationType)
    if (keys.length === 0) {
      return
    }
    const prefixes = keys.map((k) => k[0])
    void queryClient.invalidateQueries({
      predicate: (query) => {
        const first = query.queryKey[0]
        if (typeof first !== 'string') {
          return false
        }
        return prefixes.some((prefix) => first.startsWith(prefix))
      },
    })
  })

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
    menu.close()
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
    <div className="relative" ref={bellContainerRef}>
      <button
        type="button"
        id="btn-notification-bell"
        ref={bellTriggerRef}
        aria-label="Thông báo"
        aria-expanded={menu.open}
        aria-controls="notification-menu"
        onClick={menu.toggle}
        className={cn(
          'relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-zinc-600 transition hover:bg-indigo-100 active:scale-[0.98] dark:text-zinc-300 dark:hover:bg-white/10',
          FOCUS_RING_CLASS,
        )}
      >
        <Bell size={20} weight={bellWeight} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white tabular-nums shadow-sm">
            {unreadBadgeText}
          </span>
        )}
      </button>

      {menu.open && (
        <div
          id="notification-menu"
          className="fixed inset-x-4 top-[76px] z-50 overflow-hidden rounded-3xl border border-zinc-200/90 bg-white/95 shadow-2xl backdrop-blur-md sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:mt-2 sm:w-96 dark:border-white/15 dark:bg-[#0a0f1e]"
        >
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-white/10">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Thông báo</h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-bold text-blue-700 tabular-nums dark:bg-blue-700/25 dark:text-sky-300">
                  {unreadCount} mới
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={markAllMutation.isPending}
                className={cn(
                  'flex cursor-pointer items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-blue-700 transition hover:bg-sky-50 hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-50 dark:text-sky-300 dark:hover:bg-white/10 dark:hover:text-sky-200',
                  FOCUS_RING_CLASS,
                )}
              >
                <CheckCircle size={14} />
                <span>Đã đọc tất cả</span>
              </button>
            )}
          </div>

          {categories && categories.length > 1 && (
            <div className="border-b border-zinc-100 px-3 py-2.5 dark:border-white/10">
              <div
                role="tablist"
                aria-label="Danh mục thông báo"
                className={cn(segmentedTrackClass(), 'w-full')}
              >
                {categories.map((cat) => {
                  const isSelected = activeTab === cat
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
                      role="tab"
                      aria-selected={isSelected}
                      onClick={() => setActiveTab(cat)}
                      className={cn(segmentedItemClass(isSelected), 'flex-1 justify-center')}
                    >
                      <span className="flex items-center gap-1.5">
                        <span>{TAB_LABELS[cat]}</span>
                        {catCount > 0 && (
                          <span className={tabBadgeClass(isSelected)}>{catBadgeText}</span>
                        )}
                      </span>
                    </button>
                  )
                })}
              </div>
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
                    <div className="flex items-start justify-between gap-2 pr-7">
                      <p className="line-clamp-1 text-xs font-bold text-zinc-800 dark:text-zinc-100">
                        {item.title}
                      </p>
                      {!isRead && (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-700 dark:bg-sky-400" />
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
                    className={cn(
                      'absolute top-2 right-2 cursor-pointer rounded-full p-1.5 text-zinc-400 opacity-100 transition hover:bg-rose-50 hover:text-rose-600 focus-visible:opacity-100 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100 dark:hover:bg-rose-500/15 dark:hover:text-rose-300',
                      FOCUS_RING_CLASS,
                    )}
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
