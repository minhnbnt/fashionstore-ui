import { useState } from 'react'

import { X } from '@phosphor-icons/react'

import { imageUrl, PLACEHOLDER_IMAGE } from '@/lib/api/apiAdapters'

interface Props {
  imageKey: string
  alt?: string
}

export default function ChatImageBubble({ imageKey, alt = 'Ảnh đính kèm' }: Props) {
  const [modalOpen, setModalOpen] = useState(false)
  const src = imageUrl(imageKey)

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        aria-label={`Xem ảnh lớn: ${alt}`}
        className="group relative block overflow-hidden rounded-2xl border border-zinc-200 transition hover:opacity-95 dark:border-white/10"
      >
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="max-h-48 max-w-[240px] rounded-2xl object-cover transition duration-150 group-hover:scale-105"
          onError={(e) => {
            if (e.currentTarget.src !== PLACEHOLDER_IMAGE) {
              e.currentTarget.src = PLACEHOLDER_IMAGE
            }
          }}
        />
      </button>

      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs"
        >
          <div className="relative max-h-[90vh] max-w-[90vw]">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              aria-label="Đóng xem ảnh"
              className="absolute -top-10 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/40"
            >
              <X size={18} weight="bold" />
            </button>
            <img
              src={src}
              alt={`${alt} (phóng to)`}
              className="max-h-[85vh] max-w-[85vw] rounded-2xl object-contain shadow-2xl"
              onError={(e) => {
                if (e.currentTarget.src !== PLACEHOLDER_IMAGE) {
                  e.currentTarget.src = PLACEHOLDER_IMAGE
                }
              }}
            />
          </div>
        </div>
      )}
    </>
  )
}
