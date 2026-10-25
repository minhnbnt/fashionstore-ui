import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'

import { useListPopups } from '@generated/endpoints/site-content/site-content'
import { X } from '@phosphor-icons/react'

import { imageUrl, PLACEHOLDER_IMAGE, takeData } from '@/lib/apiAdapters'
import { browserSeenStore, isInternalLink, markPopupSeen, pickPopup } from '@/lib/siteContent'

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

  useEffect(
    function () {
      if (popup === null) {
        return
      }
      const shown = popup
      function onKey(event: KeyboardEvent) {
        if (event.key === 'Escape') {
          markPopupSeen(shown, browserSeenStore, new Date())
          setPopup(null)
        }
      }
      window.addEventListener('keydown', onKey)
      return () => window.removeEventListener('keydown', onKey)
    },
    [popup],
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

  const imageKey = popup.imageKey ?? ''
  const title = popup.title ?? ''
  const body = popup.body ?? ''
  const ctaLabel = popup.ctaLabel ?? ''
  let ariaLabel = title
  if (ariaLabel === '') {
    ariaLabel = 'Khuyến mãi'
  }

  return (
    <dialog
      open
      aria-label={ariaLabel}
      className="fixed inset-0 z-[60] m-0 flex h-full max-h-none w-full max-w-none items-center justify-center border-0 bg-black/60 p-4 text-inherit backdrop-blur-xs"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-2xl dark:border-white/10 dark:bg-[#11182a]">
        <button
          type="button"
          onClick={close}
          aria-label="Đóng"
          className="absolute top-3 right-3 z-10 rounded-full bg-black/40 p-2 text-white transition hover:bg-black/60"
        >
          <X size={16} weight="bold" />
        </button>

        {imageKey !== '' && (
          <PopupAction popup={popup} onClose={close} className="block">
            <img
              src={imageUrl(imageKey)}
              alt={title}
              width={800}
              height={800}
              onError={handleImageError}
              className="aspect-square w-full object-cover"
            />
          </PopupAction>
        )}

        {(title !== '' || body !== '' || ctaLabel !== '') && (
          <div className="space-y-3 p-6 text-center">
            {title !== '' && <h2 className="text-2xl font-extrabold tracking-tighter">{title}</h2>}
            {body !== '' && (
              <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{body}</p>
            )}
            {ctaLabel !== '' && (
              <PopupAction
                popup={popup}
                onClose={close}
                className="btn-primary inline-flex rounded-full px-7 py-3 text-sm font-bold"
              >
                {ctaLabel}
              </PopupAction>
            )}
          </div>
        )}
      </div>
    </dialog>
  )
}
