import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import type { MutableRefObject } from 'react'

const UNPIN_THRESHOLD_PX = 64

export interface UsePinToBottomOptions {
  /** Khi giá trị này đổi (vd: conversationId, trạng thái mở), cuộn ghim lại xuống đáy ngay. */
  resetKey?: unknown
  /** Giá trị thay đổi theo tin nhắn / trạng thái streaming / preview composer để bám đáy. */
  contentKey?: unknown
  /** Bật/tắt tự động ghim (mặc định true). */
  enabled?: boolean
}

export interface UsePinToBottomResult {
  scrollRef: MutableRefObject<HTMLDivElement | null>
  /** Ép cuộn xuống đáy ngay (dùng khi gửi tin nhắn mới hoặc nhấn nút về cuối). */
  pinNow: () => void
  /** Gắn vào onScroll của container cuộn tin nhắn. */
  handleScroll: () => void
  /** Gắn vào onLoadCapture của container để cuộn lại khi ảnh hoặc media tải xong. */
  handleLoadCapture: () => void
}

function applyScrollToBottom(
  el: HTMLDivElement,
  lastKnownScrollTopRef: MutableRefObject<number>,
): void {
  el.scrollTop = el.scrollHeight
  lastKnownScrollTopRef.current = el.scrollTop
}

/**
 * Giữ khung tin nhắn luôn ghim ở cuối cùng khi mở hội thoại, nhận/stream tin nhắn,
 * ảnh tải xong hoặc chiều cao thẻ/composer thay đổi; vẫn cho phép người dùng
 * chủ động cuộn ngược lên xem lịch sử mà không bị kéo xuống giữa chừng.
 */
export function usePinToBottom(options: UsePinToBottomOptions = {}): UsePinToBottomResult {
  let enabled = true
  if (options.enabled !== undefined) {
    enabled = options.enabled
  }

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const pinnedRef = useRef(true)
  const lastKnownScrollTopRef = useRef(0)
  const rafIdRef = useRef<number | null>(null)

  const scheduleRafScroll = useCallback(function () {
    if (typeof requestAnimationFrame === 'undefined') {
      return
    }
    if (rafIdRef.current !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(rafIdRef.current)
    }
    rafIdRef.current = requestAnimationFrame(function () {
      rafIdRef.current = null
      const el = scrollRef.current
      if (el !== null && pinnedRef.current) {
        applyScrollToBottom(el, lastKnownScrollTopRef)
      }
    })
  }, [])

  const scrollToBottom = useCallback(
    function () {
      const el = scrollRef.current
      if (el === null) {
        return
      }
      applyScrollToBottom(el, lastKnownScrollTopRef)
      scheduleRafScroll()
    },
    [scheduleRafScroll],
  )

  const pinNow = useCallback(
    function () {
      pinnedRef.current = true
      scrollToBottom()
    },
    [scrollToBottom],
  )

  const handleScroll = useCallback(function () {
    const el = scrollRef.current
    if (el === null) {
      return
    }
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    if (distanceFromBottom <= UNPIN_THRESHOLD_PX) {
      pinnedRef.current = true
    } else if (el.scrollTop < lastKnownScrollTopRef.current) {
      pinnedRef.current = false
    }
    lastKnownScrollTopRef.current = el.scrollTop
  }, [])

  const handleLoadCapture = useCallback(
    function () {
      if (!enabled || !pinnedRef.current) {
        return
      }
      scrollToBottom()
    },
    [enabled, scrollToBottom],
  )

  useLayoutEffect(
    function resetPinOnKeyChange() {
      if (!enabled) {
        return
      }
      pinnedRef.current = true
      scrollToBottom()
    },
    [options.resetKey, enabled, scrollToBottom],
  )

  useLayoutEffect(
    function keepPinnedOnContentChange() {
      if (!enabled || !pinnedRef.current) {
        return
      }
      scrollToBottom()
    },
    [options.contentKey, enabled, scrollToBottom],
  )

  useEffect(
    function observeSizeAndMutations() {
      if (!enabled) {
        return
      }
      const el = scrollRef.current
      if (el === null) {
        return
      }

      let resizeObserver: ResizeObserver | null = null
      const observedChildren = new Set<Element>()

      const syncChildResizeObservations = function () {
        if (resizeObserver === null) {
          return
        }
        for (const child of Array.from(observedChildren)) {
          if (child.parentElement !== el) {
            resizeObserver.unobserve(child)
            observedChildren.delete(child)
          }
        }
        for (const child of Array.from(el.children)) {
          if (!observedChildren.has(child)) {
            resizeObserver.observe(child)
            observedChildren.add(child)
          }
        }
      }

      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(function () {
          if (pinnedRef.current) {
            scrollToBottom()
          }
        })
        resizeObserver.observe(el)
        syncChildResizeObservations()
      }

      let mutationObserver: MutationObserver | null = null
      if (typeof MutationObserver !== 'undefined') {
        mutationObserver = new MutationObserver(function (records) {
          for (const record of records) {
            if (record.type === 'childList') {
              syncChildResizeObservations()
              break
            }
          }
          if (pinnedRef.current) {
            scrollToBottom()
          }
        })
        mutationObserver.observe(el, {
          childList: true,
          subtree: true,
          characterData: true,
        })
      }

      return function cleanup() {
        if (resizeObserver !== null) {
          resizeObserver.disconnect()
        }
        if (mutationObserver !== null) {
          mutationObserver.disconnect()
        }
        if (rafIdRef.current !== null && typeof cancelAnimationFrame !== 'undefined') {
          cancelAnimationFrame(rafIdRef.current)
          rafIdRef.current = null
        }
      }
    },
    [options.resetKey, enabled, scrollToBottom],
  )

  return {
    scrollRef,
    pinNow,
    handleScroll,
    handleLoadCapture,
  }
}
