import { useEffect, useState } from 'react'

import { MagnifyingGlassPlus, X } from '@phosphor-icons/react'

import { imageUrl, PLACEHOLDER_IMAGE } from '@/lib/api/apiAdapters'

interface Props {
  imageKey: string
  alt?: string
}

export default function ChatImageBubble({ imageKey, alt = 'Ảnh đính kèm' }: Props) {
  const [modalOpen, setModalOpen] = useState(false)
  const src = imageUrl(imageKey)

  useEffect(
    function closeOnEscape() {
      if (!modalOpen) {
        return
      }
      function handleKey(event: KeyboardEvent) {
        if (event.key === 'Escape') {
          setModalOpen(false)
        }
      }
      window.addEventListener('keydown', handleKey)
      return function () {
        window.removeEventListener('keydown', handleKey)
      }
    },
    [modalOpen],
  )

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        aria-label={`Xem ảnh lớn: ${alt}`}
        className="group relative block overflow-hidden rounded-2xl border border-zinc-200/80 shadow-xs transition active:scale-[0.98] dark:border-white/10"
      >
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="max-h-52 max-w-[240px] rounded-2xl object-cover transition duration-200 group-hover:scale-105"
          onError={(e) => {
            if (e.currentTarget.src !== PLACEHOLDER_IMAGE) {
              e.currentTarget.src = PLACEHOLDER_IMAGE
            }
          }}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-2 bottom-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#0a0f1e]/60 text-white opacity-0 backdrop-blur-xs transition group-hover:opacity-100"
        >
          <MagnifyingGlassPlus size={14} weight="bold" />
        </span>
      </button>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0f1e]/85 p-4 backdrop-blur-md">
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={() => setModalOpen(false)}
            className="absolute inset-0 cursor-default"
          />
          <dialog
            open
            aria-modal="true"
            className="relative z-10 m-0 max-h-[90vh] max-w-[90vw] border-0 bg-transparent p-0"
          >
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              aria-label="Đóng xem ảnh"
              className="absolute -top-11 right-0 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/15 text-white transition hover:bg-white/30 active:scale-95"
            >
              <X size={18} weight="bold" />
            </button>
            <img
              src={src}
              alt={`${alt} (phóng to)`}
              className="max-h-[85vh] max-w-[85vw] rounded-3xl object-contain shadow-2xl"
              onError={(e) => {
                if (e.currentTarget.src !== PLACEHOLDER_IMAGE) {
                  e.currentTarget.src = PLACEHOLDER_IMAGE
                }
              }}
            />
          </dialog>
        </div>
      )}
    </>
  )
}
