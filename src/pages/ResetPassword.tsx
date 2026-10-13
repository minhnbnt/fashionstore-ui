import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { CheckCircle, Eye, EyeSlash, Lock, WarningCircle } from '@phosphor-icons/react'

import { useUpdatePassword } from '../hooks/useAuthMutations'
import {
  fetchSession,
  friendlyAuthError,
  subscribeToSessionChanges,
  validatePasswordReset,
} from '../lib/auth'

type PageStatus = 'checking' | 'ready' | 'success' | 'invalid'

export default function ResetPassword() {
  const [status, setStatus] = useState<PageStatus>('checking')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(3)

  const navigate = useNavigate()
  const updatePassword = useUpdatePassword()

  useEffect(
    function () {
      let cancelled = false

      function checkRecoverySession() {
        fetchSession()
          .then(function (session) {
            if (cancelled) {
              return
            }
            if (session !== null) {
              setStatus('ready')
              return
            }
          })
          .catch(function () {
            // Wait for subscription or timeout
          })
      }

      checkRecoverySession()

      const unsubscribe = subscribeToSessionChanges(function (session) {
        if (cancelled) {
          return
        }
        if (session !== null) {
          setStatus('ready')
        }
      })

      const timer = setTimeout(function () {
        if (cancelled) {
          return
        }
        fetchSession()
          .then(function (session) {
            if (cancelled) {
              return
            }
            if (session !== null) {
              setStatus('ready')
            }
            if (session === null) {
              setStatus('invalid')
            }
          })
          .catch(function () {
            if (cancelled === false) {
              setStatus('invalid')
            }
          })
      }, 2500)

      return function () {
        cancelled = true
        unsubscribe()
        clearTimeout(timer)
      }
    },
    [],
  )

  useEffect(
    function () {
      if (status !== 'success') {
        return
      }
      if (countdown <= 0) {
        void navigate('/login', { replace: true })
        return
      }
      const interval = setInterval(function () {
        setCountdown(function (prev) {
          return prev - 1
        })
      }, 1000)
      return function () {
        clearInterval(interval)
      }
    },
    [status, countdown, navigate],
  )

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errorMsg = validatePasswordReset(password, confirmPassword)
    if (errorMsg !== null) {
      setFormError(errorMsg)
      return
    }
    setFormError(null)

    updatePassword.mutate(password, {
      onSuccess: function () {
        setStatus('success')
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

  if (status === 'checking') {
    return (
      <main className="mx-auto flex max-w-[1400px] flex-col items-center justify-center px-4 pt-[100px] pb-12">
        <div className="glass mx-auto w-full max-w-md rounded-3xl p-8 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
          <p className="mt-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Đang xác thực liên kết khôi phục…
          </p>
        </div>
      </main>
    )
  }

  if (status === 'invalid') {
    return (
      <main className="mx-auto max-w-[1400px] px-4 pt-[100px] pb-12 text-center">
        <div className="glass mx-auto w-full max-w-md rounded-3xl p-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400">
            <WarningCircle size={28} weight="bold" />
          </div>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tighter text-zinc-900 dark:text-white">
            Liên kết không hợp lệ
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Liên kết đặt lại mật khẩu đã hết hạn hoặc không hợp lệ. Vui lòng gửi yêu cầu khôi phục mới.
          </p>
          <Link
            to="/login"
            className="btn-primary mt-6 inline-block rounded-full px-6 py-2.5 text-sm font-bold"
          >
            Quay lại đăng nhập
          </Link>
        </div>
      </main>
    )
  }

  if (status === 'success') {
    return (
      <main className="mx-auto max-w-[1400px] px-4 pt-[100px] pb-12 text-center">
        <div className="glass mx-auto w-full max-w-md rounded-3xl p-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
            <CheckCircle size={28} weight="bold" />
          </div>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tighter text-zinc-900 dark:text-white">
            Đặt lại mật khẩu thành công!
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Mật khẩu của bạn đã được cập nhật. Hệ thống sẽ tự động chuyển về trang đăng nhập sau {countdown} giây.
          </p>
          <Link
            to="/login"
            className="btn-primary mt-6 inline-block rounded-full px-6 py-2.5 text-sm font-bold"
          >
            Đăng nhập ngay
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-[1400px] px-4 pt-[100px] pb-12">
      <div className="glass mx-auto w-full max-w-md rounded-3xl p-6 md:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
            <Lock size={20} weight="bold" />
          </div>
          <div>
            <p className="text-xs font-bold tracking-[0.18em] text-indigo-900 uppercase dark:text-indigo-200">
              Bảo mật
            </p>
            <h1 className="text-xl font-extrabold tracking-tighter">Đặt lại mật khẩu mới</h1>
          </div>
        </div>

        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
          Vui lòng nhập mật khẩu mới cho tài khoản của bạn (tối thiểu 6 ký tự).
        </p>

        {formError !== null && (
          <p className="mt-4 rounded-2xl bg-red-50 px-4 py-2.5 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-300">
            {formError}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="reset-new-password"
              className="block text-xs font-bold tracking-[0.12em] text-zinc-600 uppercase dark:text-zinc-300"
            >
              Mật khẩu mới
            </label>
            <div className="relative mt-1">
              <input
                id="reset-new-password"
                type={inputType}
                autoComplete="new-password"
                value={password}
                onChange={function (e) {
                  setPassword(e.target.value)
                }}
                disabled={updatePassword.isPending}
                placeholder="Ít nhất 6 ký tự"
                className="w-full rounded-2xl border border-zinc-200 bg-white/70 px-4 py-3 pr-11 text-sm outline-none transition focus:border-indigo-600 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:focus:border-indigo-400"
              />
              <button
                type="button"
                onClick={function () {
                  setShowPassword(function (prev) {
                    return !prev
                  })
                }}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-zinc-400 transition hover:text-zinc-700 dark:hover:text-zinc-200"
                aria-label="Ẩn hiện mật khẩu mới"
              >
                {showPassword && <EyeSlash size={18} />}
                {showPassword === false && <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="reset-confirm-password"
              className="block text-xs font-bold tracking-[0.12em] text-zinc-600 uppercase dark:text-zinc-300"
            >
              Xác nhận mật khẩu mới
            </label>
            <div className="relative mt-1">
              <input
                id="reset-confirm-password"
                type={confirmInputType}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={function (e) {
                  setConfirmPassword(e.target.value)
                }}
                disabled={updatePassword.isPending}
                placeholder="Nhập lại mật khẩu mới"
                className="w-full rounded-2xl border border-zinc-200 bg-white/70 px-4 py-3 pr-11 text-sm outline-none transition focus:border-indigo-600 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:focus:border-indigo-400"
              />
              <button
                type="button"
                onClick={function () {
                  setShowConfirm(function (prev) {
                    return !prev
                  })
                }}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-zinc-400 transition hover:text-zinc-700 dark:hover:text-zinc-200"
                aria-label="Ẩn hiện xác nhận mật khẩu"
              >
                {showConfirm && <EyeSlash size={18} />}
                {showConfirm === false && <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={updatePassword.isPending}
            className="btn-primary mt-2 w-full rounded-full py-3 text-sm font-bold disabled:opacity-60"
          >
            {updatePassword.isPending && <span>Đang cập nhật…</span>}
            {updatePassword.isPending === false && <span>Cập nhật mật khẩu</span>}
          </button>
        </form>

        <div className="mt-5 text-center">
          <Link
            to="/login"
            className="text-xs font-medium text-zinc-500 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-300"
          >
            Quay lại đăng nhập
          </Link>
        </div>
      </div>
    </main>
  )
}
