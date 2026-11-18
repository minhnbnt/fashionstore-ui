import { useState } from 'react'
import { createPortal } from 'react-dom'

import { MagnifyingGlassPlus } from '@phosphor-icons/react'

import MediaLightbox from '@/components/ui/MediaLightbox'
import { PLACEHOLDER_IMAGE, urlOrPlaceholder } from '@/lib/api/apiAdapters'
import { cn, FOCUS_RING_CLASS } from '@/lib/ui/styles'

interface Props {
  url: string
  alt?: string
}

export default function ChatImageBubble({ url, alt = 'Ảnh đính kèm' }: Props) {
  const [modalOpen, setModalOpen] = useState(false)
  const src = urlOrPlaceholder(url)

  function handleClose() {
    setModalOpen(false)
  }

  let legacyCloseAction: React.ReactNode = null
  if (modalOpen && typeof document !== 'undefined') {
    legacyCloseAction = createPortal(
      <button
        type="button"
        tabIndex={-1}
        aria-label="Đóng xem ảnh"
        onClick={handleClose}
        className="sr-only"
      />,
      document.body,
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        aria-label={`Xem ảnh lớn: ${alt}`}
        className={cn(
          'group relative block cursor-pointer overflow-hidden rounded-2xl border border-zinc-200/80 shadow-xs transition active:scale-[0.98] dark:border-white/10',
          FOCUS_RING_CLASS,
        )}
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

      <MediaLightbox open={modalOpen} src={src} alt={`${alt} (phóng to)`} onClose={handleClose} />
      {legacyCloseAction}
    </>
  )
}
