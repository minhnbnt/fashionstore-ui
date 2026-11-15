import { useCallback, useEffect, useState } from 'react'
import type { RefObject } from 'react'

// Quản lý mở/đóng cho dropdown kiểu disclosure (APG): nút bấm mang
// aria-expanded, panel chứa link thật đi Tab bình thường. Menu tự đóng khi:
// bấm Escape (trả focus về trigger), pointerdown ngoài container, hoặc focus
// rời container (Tab hết danh sách). Listener gỡ gọn bằng một dòng
// controller.abort() trong cleanup.
//
// Component sở hữu ref (containerRef/triggerRef) và truyền vào đây: ref là
// của component nên chỉ component được gắn vào DOM, hook chỉ lo hành vi.
export function useMenuDisclosure(options: {
  containerRef: RefObject<HTMLDivElement | null>
  triggerRef: RefObject<HTMLButtonElement | null>
  initialOpen?: boolean
}) {
  const [open, setOpen] = useState(options.initialOpen === true)

  function toggle() {
    setOpen(function (prev) {
      return !prev
    })
  }

  function close() {
    setOpen(false)
  }

  const closeAndFocusTrigger = useCallback(
    function () {
      setOpen(false)
      options.triggerRef.current?.focus()
    },
    [options.triggerRef],
  )

  useEffect(
    function () {
      if (!open) {
        return
      }
      const container = options.containerRef.current
      const controller = new AbortController()

      function isOutside(event: Event) {
        if (container === null) {
          return false
        }
        return !container.contains(event.target as Node)
      }

      document.addEventListener(
        'pointerdown',
        function (event) {
          if (isOutside(event)) {
            setOpen(false)
          }
        },
        { signal: controller.signal },
      )
      document.addEventListener(
        'focusin',
        function (event) {
          if (isOutside(event)) {
            setOpen(false)
          }
        },
        { signal: controller.signal },
      )
      document.addEventListener(
        'keydown',
        function (event) {
          if (event.key === 'Escape') {
            closeAndFocusTrigger()
          }
        },
        { signal: controller.signal },
      )

      return function () {
        controller.abort()
      }
    },
    [open, options.containerRef, closeAndFocusTrigger],
  )

  return {
    open,
    toggle,
    close,
  }
}
