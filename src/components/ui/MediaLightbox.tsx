import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

import { CaretLeft, CaretRight, X } from '@phosphor-icons/react'

import { isTopOverlay, popOverlay, pushOverlay } from '@/components/ui/overlayStack'
import { fallbackImageOnError } from '@/lib/api/apiAdapters'
import { cn, FOCUS_RING_CLASS } from '@/lib/ui/styles'

export interface MediaLightboxProps {
  open: boolean
  src: string
  alt: string
  kind?: 'image' | 'video'
  caption?: string
  onClose: () => void
  onPrev?: () => void
  onNext?: () => void
}

export function MediaLightbox({
  open,
  src,
  alt,
  kind = 'image',
  caption,
  onClose,
  onPrev,
  onNext,
}: MediaLightboxProps) {
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)
  const onPrevRef = useRef(onPrev)
  const onNextRef = useRef(onNext)

  useEffect(
    function () {
      onCloseRef.current = onClose
      onPrevRef.current = onPrev
      onNextRef.current = onNext
    },
    [onClose, onPrev, onNext],
  )

  useEffect(
    function () {
      if (open === false) {
        return
      }
      const token = pushOverlay()
      const previous = document.activeElement
      closeBtnRef.current?.focus()

      function handleKey(event: KeyboardEvent) {
        if (isTopOverlay(token) === false) {
          return
        }
        if (event.key === 'Escape') {
          onCloseRef.current()
          return
        }
        if (event.key === 'ArrowLeft' && onPrevRef.current !== undefined) {
          onPrevRef.current()
          return
        }
        if (event.key === 'ArrowRight' && onNextRef.current !== undefined) {
          onNextRef.current()
        }
      }

      document.addEventListener('keydown', handleKey)
      const previousOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'

      return function () {
        popOverlay(token)
        document.removeEventListener('keydown', handleKey)
        document.body.style.overflow = previousOverflow
        if (previous instanceof HTMLElement) {
          previous.focus()
        }
      }
    },
    [open],
  )

  if (open === false) {
    return null
  }

  const content = (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Đóng xem phóng to"
        onClick={onClose}
        className="fixed inset-0 cursor-pointer bg-zinc-950/90 backdrop-blur-md"
      />
      <dialog
        open
        aria-modal="true"
        aria-label={alt}
        className="static z-10 m-0 flex max-h-[92dvh] max-w-[94vw] flex-col items-center justify-center border-0 bg-transparent p-0 text-white outline-none"
      >
        <button
          ref={closeBtnRef}
          type="button"
          aria-label="Đóng xem phóng to"
          onClick={onClose}
          className={cn(
            'fixed top-4 right-4 z-20 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20',
            FOCUS_RING_CLASS,
          )}
        >
          <X size={20} weight="bold" />
        </button>

        {onPrev !== undefined && (
          <button
            type="button"
            aria-label="Ảnh trước"
            onClick={onPrev}
            className={cn(
              'fixed top-1/2 left-4 z-20 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20',
              FOCUS_RING_CLASS,
            )}
          >
            <CaretLeft size={20} weight="bold" />
          </button>
        )}

        {onNext !== undefined && (
          <button
            type="button"
            aria-label="Ảnh tiếp theo"
            onClick={onNext}
            className={cn(
              'fixed top-1/2 right-4 z-20 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20',
              FOCUS_RING_CLASS,
            )}
          >
            <CaretRight size={20} weight="bold" />
          </button>
        )}

        <div className="flex max-h-[88dvh] max-w-[92vw] flex-col items-center justify-center gap-3">
          {kind === 'video' && (
            // eslint-disable-next-line jsx-a11y/media-has-caption -- video người dùng/gian hàng tải lên không có phụ đề
            <video
              src={src}
              controls
              autoPlay
              playsInline
              className="max-h-[82dvh] max-w-[90vw] rounded-2xl bg-black shadow-2xl"
            />
          )}
          {kind !== 'video' && (
            <img
              src={src}
              alt={alt}
              onError={fallbackImageOnError}
              className="max-h-[82dvh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
            />
          )}
          {caption !== undefined && caption !== '' && (
            <p className="max-w-xl text-center text-xs font-medium text-zinc-200">{caption}</p>
          )}
        </div>
      </dialog>
    </div>
  )

  if (typeof document === 'undefined') {
    return content
  }
  return createPortal(content, document.body)
}

export default MediaLightbox
