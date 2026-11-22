import { useState } from 'react'

import { Eye, EyeSlash, Key, LockKey, WarningCircle, X } from '@phosphor-icons/react'

import { notify } from '@/lib/notifications'

import { useUpdatePassword } from '../../hooks/useAuthMutations'
import { friendlyAuthError, validatePasswordReset } from '../../lib/auth'
import { cardClass, cn, INPUT_CLASS } from '../../lib/ui/styles'

export default function ChangePasswordForm() {
  const [isOpen, setIsOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const updatePassword = useUpdatePassword()

  function handleOpen() {
    setIsOpen(true)
    setFormError(null)
  }

  function handleClose() {
    setIsOpen(false)
    setPassword('')
    setConfirmPassword('')
    setFormError(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errorMsg = validatePasswordReset(password, confirmPassword)
    if (errorMsg !== null) {
      setFormError(errorMsg)
      notify.warning(errorMsg, undefined, { id: 'change-password-validation' })
      return
    }
    setFormError(null)

    updatePassword.mutate(password, {
      onSuccess: function () {
        setPassword('')
        setConfirmPassword('')
        setIsOpen(false)
        notify.success('Đổi mật khẩu thành công')
      },
      onError: function (err) {
        const msg = friendlyAuthError(err)
        setFormError(msg)
        notify.error(msg, undefined, { id: 'change-password-error' })
      },
    })
  }

  let inputType = 'password'
  let passwordToggleLabel = 'Hiện mật khẩu mới'
  if (showPassword) {
    inputType = 'text'
    passwordToggleLabel = 'Ẩn mật khẩu mới'
  }

  let confirmInputType = 'password'
  let confirmToggleLabel = 'Hiện xác nhận mật khẩu'
  if (showConfirm) {
    confirmInputType = 'text'
    confirmToggleLabel = 'Ẩn xác nhận mật khẩu'
  }

  return (
    <div className={cn(cardClass(), 'p-4 transition')}>
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
            className="flex cursor-pointer items-center gap-1 rounded-full bg-indigo-50 px-3.5 py-1.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 dark:bg-indigo-500/20 dark:text-indigo-300 dark:hover:bg-indigo-500/30"
          >
            <Key size={13} weight="bold" />
            <span>Đổi mật khẩu</span>
          </button>
        )}

        {isOpen && (
          <button
            type="button"
            onClick={handleClose}
            className="cursor-pointer rounded-full p-1 text-zinc-400 transition hover:text-zinc-700 dark:hover:text-zinc-200"
            aria-label="Đóng form đổi mật khẩu"
          >
            <X size={16} weight="bold" />
          </button>
        )}
      </div>

      {isOpen && (
        <form
          onSubmit={handleSubmit}
          className="mt-4 space-y-3 border-t border-zinc-200/60 pt-3 dark:border-white/10"
        >
          {formError !== null && (
            <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-medium text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300">
              <WarningCircle size={15} weight="bold" className="shrink-0" />
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
                className={cn(
                  INPUT_CLASS,
                  'px-3.5 py-2 pr-9 text-xs transition disabled:opacity-60',
                )}
              />
              <button
                type="button"
                onClick={function () {
                  setShowPassword(function (prev) {
                    return !prev
                  })
                }}
                className="absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer text-zinc-400 transition hover:text-zinc-700 dark:hover:text-zinc-200"
                aria-label={passwordToggleLabel}
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
                className={cn(
                  INPUT_CLASS,
                  'px-3.5 py-2 pr-9 text-xs transition disabled:opacity-60',
                )}
              />
              <button
                type="button"
                onClick={function () {
                  setShowConfirm(function (prev) {
                    return !prev
                  })
                }}
                className="absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer text-zinc-400 transition hover:text-zinc-700 dark:hover:text-zinc-200"
                aria-label={confirmToggleLabel}
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
              className="btn-primary flex-1 cursor-pointer rounded-full py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-60"
            >
              {updatePassword.isPending && <span>Đang lưu…</span>}
              {updatePassword.isPending === false && <span>Lưu mật khẩu mới</span>}
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={updatePassword.isPending}
              className="cursor-pointer rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/15 dark:text-zinc-300 dark:hover:bg-white/5"
            >
              Hủy
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
