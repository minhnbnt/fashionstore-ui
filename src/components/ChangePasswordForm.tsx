import { useState } from 'react'

import { CheckCircle, Eye, EyeSlash, Key, LockKey, WarningCircle, X } from '@phosphor-icons/react'

import { useUpdatePassword } from '../hooks/useAuthMutations'
import { friendlyAuthError, validatePasswordReset } from '../lib/auth'

export default function ChangePasswordForm() {
  const [isOpen, setIsOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [successNotice, setSuccessNotice] = useState<string | null>(null)

  const updatePassword = useUpdatePassword()

  function handleOpen() {
    setIsOpen(true)
    setFormError(null)
    setSuccessNotice(null)
  }

  function handleClose() {
    setIsOpen(false)
    setPassword('')
    setConfirmPassword('')
    setFormError(null)
    setSuccessNotice(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errorMsg = validatePasswordReset(password, confirmPassword)
    if (errorMsg !== null) {
      setFormError(errorMsg)
      return
    }
    setFormError(null)
    setSuccessNotice(null)

    updatePassword.mutate(password, {
      onSuccess: function () {
        setPassword('')
        setConfirmPassword('')
        setSuccessNotice('Mật khẩu của bạn đã được cập nhật thành công!')
      },
      onError: function (err) {
        setFormError(friendlyAuthError(err))
      },
    })
  }

  let inputType = 'password'
  if (showPassword) {
    inputType = 'text'
  }

  let confirmInputType = 'password'
  if (showConfirm) {
    confirmInputType = 'text'
  }

  return (
    <div className="rounded-2xl bg-white/70 p-4 transition dark:bg-white/10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
            <LockKey size={16} weight="bold" />
          </div>
          <div>
            <p className="text-sm font-semibold">Mật khẩu</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">Bảo mật tài khoản của bạn</p>
          </div>
        </div>

        {isOpen === false && (
          <button
            type="button"
            onClick={handleOpen}
            className="flex items-center gap-1 rounded-full bg-indigo-50 px-3.5 py-1.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 dark:bg-indigo-500/20 dark:text-indigo-300 dark:hover:bg-indigo-500/30"
          >
            <Key size={13} weight="bold" />
            <span>Đổi mật khẩu</span>
          </button>
        )}

        {isOpen && (
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full p-1 text-zinc-400 transition hover:text-zinc-700 dark:hover:text-zinc-200"
            aria-label="Đóng form đổi mật khẩu"
          >
            <X size={16} weight="bold" />
          </button>
        )}
      </div>

      {successNotice !== null && (
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
          <CheckCircle size={16} weight="bold" />
          <span>{successNotice}</span>
        </div>
      )}

      {isOpen && (
        <form
          onSubmit={handleSubmit}
          className="mt-4 space-y-3 border-t border-zinc-200/60 pt-3 dark:border-white/10"
        >
          {formError !== null && (
            <div className="flex items-center gap-2 rounded-2xl bg-red-50 px-3.5 py-2 text-xs font-medium text-red-600 dark:bg-red-500/10 dark:text-red-300">
              <WarningCircle size={15} weight="bold" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label
              htmlFor="change-new-password"
              className="block text-xs font-bold text-zinc-600 dark:text-zinc-300"
            >
              Mật khẩu mới
            </label>
            <div className="relative mt-1">
              <input
                id="change-new-password"
                type={inputType}
                autoComplete="new-password"
                value={password}
                onChange={function (e) {
                  setPassword(e.target.value)
                }}
                disabled={updatePassword.isPending}
                placeholder="Tối thiểu 6 ký tự"
                className="w-full rounded-xl border border-zinc-200 bg-white/80 px-3 py-2 pr-9 text-xs transition outline-none focus:border-indigo-600 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:focus:border-indigo-400"
              />
              <button
                type="button"
                onClick={function () {
                  setShowPassword(function (prev) {
                    return !prev
                  })
                }}
                className="absolute top-1/2 right-2.5 -translate-y-1/2 text-zinc-400 transition hover:text-zinc-700 dark:hover:text-zinc-200"
                aria-label="Ẩn hiện mật khẩu mới"
              >
                {showPassword && <EyeSlash size={15} />}
                {showPassword === false && <Eye size={15} />}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="change-confirm-password"
              className="block text-xs font-bold text-zinc-600 dark:text-zinc-300"
            >
              Xác nhận mật khẩu mới
            </label>
            <div className="relative mt-1">
              <input
                id="change-confirm-password"
                type={confirmInputType}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={function (e) {
                  setConfirmPassword(e.target.value)
                }}
                disabled={updatePassword.isPending}
                placeholder="Nhập lại mật khẩu mới"
                className="w-full rounded-xl border border-zinc-200 bg-white/80 px-3 py-2 pr-9 text-xs transition outline-none focus:border-indigo-600 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:focus:border-indigo-400"
              />
              <button
                type="button"
                onClick={function () {
                  setShowConfirm(function (prev) {
                    return !prev
                  })
                }}
                className="absolute top-1/2 right-2.5 -translate-y-1/2 text-zinc-400 transition hover:text-zinc-700 dark:hover:text-zinc-200"
                aria-label="Ẩn hiện xác nhận mật khẩu"
              >
                {showConfirm && <EyeSlash size={15} />}
                {showConfirm === false && <Eye size={15} />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={updatePassword.isPending}
              className="btn-primary flex-1 rounded-full py-2 text-xs font-bold disabled:opacity-60"
            >
              {updatePassword.isPending && <span>Đang lưu…</span>}
              {updatePassword.isPending === false && <span>Lưu mật khẩu mới</span>}
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={updatePassword.isPending}
              className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-100 disabled:opacity-60 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/5"
            >
              Hủy
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
