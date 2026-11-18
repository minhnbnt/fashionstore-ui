import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

import { X } from '@phosphor-icons/react'

import { isTopOverlay, popOverlay, pushOverlay } from '@/components/ui/overlayStack'
import { cn, FOCUS_RING_CLASS } from '@/lib/ui/styles'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export interface DrawerProps {
  open: boolean
  side?: 'left' | 'right' | 'bottom'
  title: string
  onClose: () => void
  widthClass?: string
  children: ReactNode
}

function wrapperAlignmentClass(side: 'left' | 'right' | 'bottom'): string {
  if (side === 'left') {
    return 'items-stretch justify-start'
  }
  if (side === 'bottom') {
    return 'items-end justify-center'
  }
  return 'items-stretch justify-end'
}

function panelLayoutClass(side: 'left' | 'right' | 'bottom', widthClass?: string): string {
  if (side === 'left') {
    return cn('h-full w-full rounded-r-3xl', widthClass ?? 'max-w-sm')
  }
  if (side === 'bottom') {
    return cn('max-h-[85dvh] w-full rounded-t-3xl', widthClass ?? 'max-w-2xl')
  }
  return cn('h-full w-full rounded-l-3xl', widthClass ?? 'max-w-md')
}

export function Drawer(props: DrawerProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDialogElement>(null)
  const closeRef = useRef(props.onClose)

  useEffect(
    function () {
      closeRef.current = props.onClose
    },
    [props.onClose],
  )

  useEffect(
    function () {
      if (props.open === false) {
        return
      }

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
    },
    [props.open],
  )

  if (props.open === false) {
    return null
  }

  const side = props.side ?? 'right'

  const content = (
    <div className={cn('fixed inset-0 z-[70] flex', wrapperAlignmentClass(side))}>
      <button
        type="button"
        aria-label="Đóng bảng trượt"
        tabIndex={-1}
        onClick={props.onClose}
        className="fixed inset-0 cursor-pointer bg-zinc-950/55 backdrop-blur-sm"
      />
      <dialog
        ref={panelRef}
        open
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'static z-10 m-0 flex flex-col overflow-hidden border border-zinc-200/80 bg-white text-[#17203a] shadow-2xl outline-none dark:border-white/10 dark:bg-[#11182a] dark:text-[#e2e8f0]',
          panelLayoutClass(side, props.widthClass),
        )}
      >
        <div className="flex min-h-14 shrink-0 items-center justify-between border-b border-zinc-200/80 px-6 py-4 dark:border-white/10">
          <h2 id={titleId} className="text-lg font-extrabold tracking-tight">
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
        <div className="flex-1 overflow-y-auto overscroll-contain p-6">{props.children}</div>
      </dialog>
    </div>
  )

  if (typeof document === 'undefined') {
    return content
  }
  return createPortal(content, document.body)
}

export default Drawer
