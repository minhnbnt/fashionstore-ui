import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'

import { useListPopups } from '@generated/endpoints/site-content/site-content'

import Modal from '@/components/Modal'
import { PLACEHOLDER_IMAGE, takeData, urlOrPlaceholder } from '@/lib/api/apiAdapters'
import {
  browserSeenStore,
  isInternalLink,
  markPopupSeen,
  pickPopup,
} from '@/lib/content/siteContent'
import { cn, FOCUS_RING_CLASS, primaryButtonClass } from '@/lib/ui/styles'

import { useSessionQuery } from '../hooks/useSession'

import type { PublicPopupResponse } from '@generated/model/publicPopupResponse'

function handleImageError(event: React.SyntheticEvent<HTMLImageElement>) {
  const target = event.currentTarget
  if (target.src !== PLACEHOLDER_IMAGE) {
    target.src = PLACEHOLDER_IMAGE
  }
}

function PopupAction({
  popup,
  onClose,
  className,
  children,
}: {
  popup: PublicPopupResponse
  onClose: () => void
  className: string
  children: React.ReactNode
}) {
  const link = popup.linkUrl ?? ''
  if (link === '') {
    return (
      <button type="button" onClick={onClose} className={className}>
        {children}
      </button>
    )
  }
  if (isInternalLink(link)) {
    return (
      <Link to={link} onClick={onClose} className={className}>
        {children}
      </Link>
    )
  }
  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClose}
      className={className}
    >
      {children}
    </a>
  )
}

/**
 * Popup trang chủ: chọn popup ưu tiên cao nhất khớp đối tượng + chưa vượt tần suất, chờ delay rồi hiện.
 * Mỗi lượt xem tối đa 1 popup; đóng hay bấm CTA đều tính là đã xem.
 */
export default function SitePopup() {
  const popupsQuery = useListPopups({ query: { staleTime: 5 * 60_000 } })
  const sessionQuery = useSessionQuery()
  const [popup, setPopup] = useState<PublicPopupResponse | null>(null)
  // Chọn đúng 1 lần mỗi lượt vào trang; timer chỉ hủy khi rời trang, không hủy khi query refetch.
  const decidedRef = useRef(false)
  const timerRef = useRef<number | null>(null)

  useEffect(function () {
    return function () {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
      }
    }
  }, [])

  useEffect(
    function () {
      if (decidedRef.current || popupsQuery.isSuccess === false || sessionQuery.isPending) {
        return
      }
      decidedRef.current = true

      const loggedIn = sessionQuery.data !== null && sessionQuery.data !== undefined
      const chosen = pickPopup(takeData(popupsQuery.data), loggedIn, browserSeenStore, new Date())
      if (chosen === null) {
        return
      }
      timerRef.current = window.setTimeout(
        function () {
          setPopup(chosen)
        },
        (chosen.delaySeconds ?? 0) * 1000,
      )
    },
    [popupsQuery.isSuccess, popupsQuery.data, sessionQuery.isPending, sessionQuery.data],
  )

  function close() {
    if (popup !== null) {
      markPopupSeen(popup, browserSeenStore, new Date())
    }
    setPopup(null)
  }

  if (popup === null) {
    return null
  }

  const imageUrl = popup.imageUrl ?? ''
  const title = popup.title ?? ''
  const body = popup.body ?? ''
  const ctaLabel = popup.ctaLabel ?? ''
  let modalTitle = title
  if (modalTitle === '') {
    modalTitle = 'Khuyến mãi'
  }

  return (
    <Modal title={modalTitle} onClose={close} widthClass="max-w-md" closeOnBackdrop={true}>
      <div className="mt-4 space-y-4">
        {imageUrl !== '' && (
          <PopupAction
            popup={popup}
            onClose={close}
            className={cn('block cursor-pointer overflow-hidden rounded-2xl', FOCUS_RING_CLASS)}
          >
            <img
              src={urlOrPlaceholder(imageUrl)}
              alt={modalTitle}
              width={800}
              height={800}
              onError={handleImageError}
              className="aspect-square w-full object-cover transition duration-300 hover:scale-[1.02]"
            />
          </PopupAction>
        )}

        {(body !== '' || ctaLabel !== '') && (
          <div className="space-y-3 text-center">
            {body !== '' && (
              <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{body}</p>
            )}
            {ctaLabel !== '' && (
              <PopupAction
                popup={popup}
                onClose={close}
                className={cn(
                  primaryButtonClass(),
                  'inline-flex rounded-full px-7 py-3 text-sm font-bold',
                )}
              >
                {ctaLabel}
              </PopupAction>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
