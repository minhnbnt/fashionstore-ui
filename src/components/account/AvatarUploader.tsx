import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { getMeQueryKey, useChangeAvatar } from '@generated/endpoints/users/users'
import { useQueryClient } from '@tanstack/react-query'

import { apiErrorText, imageUrl } from '@/lib/api/apiAdapters'
import { uploadImage } from '@/lib/api/uploadImage'

import Modal from '../Modal'
import UserAvatar from '../UserAvatar'

interface Props {
  name: string
  avatarKey: string | null | undefined
}

/** Bấm avatar → modal xem ảnh; nút trong modal chọn ảnh → presign → PUT S3 → lưu key. */
export default function AvatarUploader({ name, avatarKey }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const changeAvatar = useChangeAvatar()
  const [open, setOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  let src: string | undefined
  if (avatarKey !== null && avatarKey !== undefined && avatarKey !== '') {
    src = imageUrl(avatarKey)
  }

  let actionLabel = 'Thêm ảnh đại diện'
  if (src !== undefined) {
    actionLabel = 'Đổi ảnh đại diện'
  }
  if (uploading) {
    actionLabel = 'Đang tải ảnh…'
  }

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file === undefined) {
      return
    }
    setError(null)
    setUploading(true)
    try {
      const key = await uploadImage(file)
      await changeAvatar.mutateAsync({ data: { avatarKey: key } })
      await queryClient.invalidateQueries({ queryKey: getMeQueryKey() })
    } catch (err: unknown) {
      setError(apiErrorText(err, 'Không đổi được ảnh đại diện, thử lại sau.'))
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={function () {
          setOpen(true)
        }}
        aria-label="Xem ảnh đại diện"
        title="Xem ảnh đại diện"
        className="shrink-0 rounded-full transition hover:opacity-90"
      >
        <UserAvatar name={name} size={48} src={src} />
      </button>

      {open &&
        // Portal ra body để thoát containing block của .glass (backdrop-filter làm fixed quy chiếu theo card).
        createPortal(
          <Modal
            title="Ảnh đại diện"
            widthClass="max-w-sm"
            onClose={function () {
              setOpen(false)
            }}
          >
            <div className="mt-6 flex flex-col items-center gap-5">
              <UserAvatar name={name} size={200} src={src} />
              <button
                type="button"
                onClick={function () {
                  inputRef.current?.click()
                }}
                disabled={uploading}
                className="rounded-full bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:opacity-60 dark:bg-indigo-500 dark:hover:bg-indigo-400"
              >
                {actionLabel}
              </button>
              {error !== null && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={(event) => void handleFile(event)}
              disabled={uploading}
              className="sr-only"
            />
          </Modal>,
          document.body,
        )}
    </>
  )
}
