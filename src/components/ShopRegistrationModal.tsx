import { useState } from 'react'

import { Storefront, X } from '@phosphor-icons/react'

import { useRegister } from '@generated/endpoints/shops/shops'
import { useUpsert } from '@generated/endpoints/users/users'

interface Props {
  isOpen: boolean
  userEmail: string
  onClose: () => void
  onSuccess: () => void
}

function slugify(text: string): string {
  let str = text.toLowerCase().trim()
  str = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  str = str.replace(/[đĐ]/g, 'd')
  str = str.replace(/[^a-z0-9\s-]/g, '')
  str = str.replace(/[\s-]+/g, '-')
  str = str.replace(/^-+|-+$/g, '')
  return str
}

export default function ShopRegistrationModal({
  isOpen,
  userEmail,
  onClose,
  onSuccess,
}: Props) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [description, setDescription] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [autoSlug, setAutoSlug] = useState(true)

  const upsertUser = useUpsert()
  const registerShop = useRegister()

  if (isOpen === false) {
    return null
  }

  const isBusy = upsertUser.isPending || registerShop.isPending

  function handleNameChange(val: string) {
    setName(val)
    if (autoSlug) {
      setSlug(slugify(val))
    }
  }

  function handleSlugChange(val: string) {
    setAutoSlug(false)
    setSlug(slugify(val))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMessage(null)

    const trimmedName = name.trim()
    const trimmedSlug = slug.trim()

    if (trimmedName === '') {
      setErrorMessage('Vui lòng nhập tên gian hàng.')
      return
    }

    if (trimmedSlug === '') {
      setErrorMessage('Vui lòng nhập định danh shop (slug).')
      return
    }

    const slugRegex = /^[a-z0-9-]+$/
    if (slugRegex.test(trimmedSlug) === false) {
      setErrorMessage('Slug chỉ được chứa chữ thường không dấu, số và dấu gạch ngang.')
      return
    }

    try {
      const displayName = userEmail.split('@')[0] || 'Chủ shop'
      await upsertUser.mutateAsync({
        data: {
          email: userEmail,
          displayName,
          avatarKey: null,
        },
      })

      let fullDesc = description.trim()
      if (phone.trim() !== '') {
        fullDesc = fullDesc + '\nHotline kho: ' + phone.trim()
      }
      if (address.trim() !== '') {
        fullDesc = fullDesc + '\nĐịa chỉ kho: ' + address.trim()
      }

      await registerShop.mutateAsync({
        data: {
          name: trimmedName,
          slug: trimmedSlug,
          description: fullDesc,
          logoKey: null,
          bannerKey: null,
        },
      })

      setName('')
      setSlug('')
      setPhone('')
      setAddress('')
      setDescription('')
      setAutoSlug(true)
      onSuccess()
    } catch (err: unknown) {
      let msg = 'Đăng ký shop không thành công. Vui lòng thử lại.'
      if (err !== null && typeof err === 'object' && 'message' in err) {
        const raw = String((err as { message?: string }).message)
        if (raw.includes('409') || raw.includes('Conflict') || raw.includes('taken')) {
          msg = 'Định danh shop (slug) này đã có người đăng ký. Vui lòng chọn slug khác.'
        }
      }
      setErrorMessage(msg)
    }
  }

  return (
    <div
      id="shop-registration-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div
        id="shop-registration-modal"
        className="w-full max-w-lg rounded-3xl border border-white/20 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-zinc-900"
      >
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-300">
              <Storefront size={22} weight="bold" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-zinc-900 dark:text-white">
                Đăng ký mở Shop bán hàng
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Gia nhập hệ thống người bán chuẩn Shopee trên nét
              </p>
            </div>
          </div>
          <button
            type="button"
            id="btn-close-shop-modal"
            onClick={onClose}
            className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-white/10"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-sm">
          <div>
            <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider dark:text-zinc-300">
              Tên gian hàng <span className="text-red-500">*</span>
              <input
                id="input-shop-name"
                type="text"
                value={name}
                onChange={function (e) {
                  handleNameChange(e.target.value)
                }}
                placeholder="Ví dụ: Chic Boutique, Nét Trend..."
                required
                className="mt-1 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 font-normal outline-none focus:border-indigo-500 focus:bg-white dark:border-white/10 dark:bg-zinc-800"
              />
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider dark:text-zinc-300">
              Định danh Shop / Slug (URL) <span className="text-red-500">*</span>
              <div className="mt-1 flex items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-1 dark:border-white/10 dark:bg-zinc-800">
                <span className="text-xs text-zinc-400">net.vn/shop/</span>
                <input
                  id="input-shop-slug"
                  type="text"
                  value={slug}
                  onChange={function (e) {
                    handleSlugChange(e.target.value)
                  }}
                  placeholder="chic-boutique"
                  required
                  className="w-full bg-transparent px-2 py-1.5 font-normal outline-none"
                />
              </div>
            </label>
            <span className="mt-1 block text-[11px] text-zinc-400">
              Chỉ gồm chữ cái thường, số và dấu gạch ngang (-).
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider dark:text-zinc-300">
                Số điện thoại kho
                <input
                  id="input-shop-phone"
                  type="tel"
                  value={phone}
                  onChange={function (e) {
                    setPhone(e.target.value)
                  }}
                  placeholder="0901234567"
                  className="mt-1 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 font-normal outline-none focus:border-indigo-500 focus:bg-white dark:border-white/10 dark:bg-zinc-800"
                />
              </label>
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider dark:text-zinc-300">
                Địa chỉ lấy hàng
                <input
                  id="input-shop-address"
                  type="text"
                  value={address}
                  onChange={function (e) {
                    setAddress(e.target.value)
                  }}
                  placeholder="Quận 1, TP. Hồ Chí Minh"
                  className="mt-1 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 font-normal outline-none focus:border-indigo-500 focus:bg-white dark:border-white/10 dark:bg-zinc-800"
                />
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider dark:text-zinc-300">
              Mô tả ngắn gian hàng
              <textarea
                id="input-shop-desc"
                rows={3}
                value={description}
                onChange={function (e) {
                  setDescription(e.target.value)
                }}
                placeholder="Giới thiệu phong cách thời trang, định vị sản phẩm của shop..."
                className="mt-1 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-2 font-normal outline-none focus:border-indigo-500 focus:bg-white dark:border-white/10 dark:bg-zinc-800"
              />
            </label>
          </div>

          {errorMessage !== null && (
            <div
              id="shop-registration-error"
              className="rounded-2xl bg-red-50 p-3 text-xs font-medium text-red-600 dark:bg-red-500/10 dark:text-red-300"
            >
              {errorMessage}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              id="btn-cancel-shop-registration"
              onClick={onClose}
              disabled={isBusy}
              className="rounded-full px-5 py-2.5 text-xs font-bold text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-white/10"
            >
              Hủy
            </button>
            <button
              type="submit"
              id="btn-submit-shop-registration"
              disabled={isBusy}
              className="btn-primary flex items-center gap-2 rounded-full px-6 py-2.5 text-xs font-bold disabled:opacity-50"
            >
              <Storefront size={16} weight="bold" />
              {isBusy && <span>Đang đăng ký…</span>}
              {isBusy === false && <span>Gửi hồ sơ mở shop</span>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
