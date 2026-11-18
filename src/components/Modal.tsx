import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

import { X } from '@phosphor-icons/react'

import { isTopOverlay, popOverlay, pushOverlay } from '@/components/ui/overlayStack'
import { cn, FOCUS_RING_CLASS } from '@/lib/ui/styles'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Modal chan tuong tac ben ngoai: backdrop, khoa scroll, focus trap, Escape de dong.
// widthClass: do rong panel, moi form truyen rieng (mac dinh max-w-lg giong cac modal hien co).
export default function Modal(props: {
  title: string
  onClose: () => void
  widthClass?: string
  closeOnBackdrop?: boolean
  children: ReactNode
}) {
  const titleId = useId()
  const panelRef = useRef<HTMLDialogElement>(null)
  const closeRef = useRef(props.onClose)

  useEffect(
    function () {
      closeRef.current = props.onClose
    },
    [props.onClose],
  )

  useEffect(function () {
    const token = pushOverlay()
    const previous = document.activeElement
    const panel = panelRef.current
    if (panel !== null && panel.contains(document.activeElement) === false) {
      panel.focus()
    }

    function handleKey(event: KeyboardEvent) {
      if (isTopOverlay(token) === false) {
        return
      }
      if (event.key === 'Escape') {
        closeRef.current()
        return
      }
      if (event.key !== 'Tab' || panel === null) {
        return
      }
      const nodes = panel.querySelectorAll<HTMLElement>(FOCUSABLE)
      if (nodes.length === 0) {
        event.preventDefault()
        return
      }
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      if (panel.contains(document.activeElement) === false) {
        event.preventDefault()
        first.focus()
        return
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
        return
      }
      if (event.shiftKey === false && document.activeElement === last) {
        event.preventDefault()
        first.focus()
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
  }, [])

  const content = (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-zinc-950/55 p-4 backdrop-blur-sm">
      {props.closeOnBackdrop === true && (
        <button
          type="button"
          tabIndex={-1}
          aria-label="Đóng hộp thoại"
          onClick={props.onClose}
          className="fixed inset-0 cursor-pointer bg-transparent"
        />
      )}
      <dialog
        ref={panelRef}
        open
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'static z-10 max-h-[calc(100dvh-2rem)] w-full overflow-y-auto overscroll-contain rounded-3xl border border-zinc-200/80 bg-white p-6 text-[#17203a] shadow-2xl outline-none dark:border-white/10 dark:bg-[#11182a] dark:text-[#e2e8f0]',
          props.widthClass ?? 'max-w-lg',
        )}
      >
        <div className="flex min-h-9 items-center justify-between gap-3">
          <h2 id={titleId} className="text-xl font-extrabold tracking-tight">
            {props.title}
          </h2>
          <button
            type="button"
            aria-label="Đóng"
            onClick={props.onClose}
            className={cn(
              'flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-zinc-600 transition hover:bg-zinc-100 hover:text-[#17203a] dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-white',
              FOCUS_RING_CLASS,
            )}
          >
            <X size={18} weight="bold" />
          </button>
        </div>
        {props.children}
      </dialog>
    </div>
  )

  if (typeof document === 'undefined') {
    return content
  }
  return createPortal(content, document.body)
}
