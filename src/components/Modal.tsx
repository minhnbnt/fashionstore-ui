import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'

import { X } from '@phosphor-icons/react'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Modal chan tuong tac ben ngoai: backdrop, khoa scroll, focus trap, Escape de dong.
// widthClass: do rong panel, moi form truyen rieng (mac dinh max-w-lg giong cac modal hien co).
export default function Modal(props: {
  title: string
  onClose: () => void
  widthClass?: string
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
    const previous = document.activeElement
    const panel = panelRef.current
    if (panel !== null && panel.contains(document.activeElement) === false) {
      panel.focus()
    }

    function handleKey(event: KeyboardEvent) {
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
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = previousOverflow
      if (previous instanceof HTMLElement) {
        previous.focus()
      }
    }
  }, [])

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-zinc-950/55 p-4 backdrop-blur-sm">
      <dialog
        ref={panelRef}
        open
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`static max-h-[calc(100dvh-2rem)] w-full ${props.widthClass ?? 'max-w-lg'} overflow-y-auto rounded-3xl border border-white/30 bg-white p-6 shadow-2xl outline-none dark:border-white/10 dark:bg-[#11182a]`}
      >
        <div className="flex min-h-9 items-center justify-between">
          <h2 id={titleId} className="text-xl font-extrabold tracking-tight">
            {props.title}
          </h2>
          <button
            type="button"
            aria-label="Đóng"
            onClick={props.onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-white/10"
          >
            <X size={18} />
          </button>
        </div>
        {props.children}
      </dialog>
    </div>
  )
}
