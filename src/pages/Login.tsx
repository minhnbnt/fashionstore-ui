import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'

import { Eye, EyeSlash } from '@phosphor-icons/react'

import { usePasswordReset, useSignIn, useSignUp } from '../hooks/useAuthMutations'
import { useSessionQuery } from '../hooks/useSession'
import { friendlyAuthError, validateLoginInput } from '../lib/auth'

type Mode = 'login' | 'signup'

export default function Login() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from || '/tai-khoan'

  const { data: session, isPending } = useSessionQuery()
  const signIn = useSignIn()
  const signUp = useSignUp()
  const reset = usePasswordReset()

  if (isPending) {
    return <p className="mx-auto max-w-[1400px] px-4 py-24 text-center">Đang tải…</p>
  }
  if (session !== null) {
    return <Navigate to="/tai-khoan" replace />
  }

  const busy = signIn.isPending || signUp.isPending || reset.isPending

  let inputType = 'password'
  if (showPassword) {
    inputType = 'text'
  }

  let autoComplete = 'new-password'
  if (mode === 'login') {
    autoComplete = 'current-password'
  }

  function handleMode(next: Mode) {
    setMode(next)
    setFormError(null)
    setNotice(null)
    signIn.reset()
    signUp.reset()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const invalid = validateLoginInput(email, password)
    if (invalid !== null) {
      setFormError(invalid)
      return
    }
    setFormError(null)
    setNotice(null)
    const creds = { email: email.trim(), password }
    if (mode === 'login') {
      signIn.mutate(creds, {
        onSuccess: function (newSession) {
          if (newSession !== null) {
            void navigate(from, { replace: true })
          }
        },
        onError: function (err) {
          setFormError(friendlyAuthError(err))
        },
      })
      return
    }
    signUp.mutate(creds, {
      onSuccess: function (newSession) {
        if (newSession !== null) {
          void navigate(from, { replace: true })
          return
        }
        setNotice('Tạo tài khoản xong. Kiểm tra email để xác nhận nhé.')
      },
      onError: function (err) {
        setFormError(friendlyAuthError(err))
      },
    })
  }

  function handleForgot() {
    if (email.trim() === '') {
      setFormError('Nhập email trước rồi hãy bấm quên mật khẩu nhé.')
      return
    }
    setFormError(null)
    reset.mutate(email.trim(), {
      onSuccess: function () {
        setNotice('Đã gửi link đặt lại mật khẩu. Kiểm tra email nhé.')
      },
      onError: function (err) {
        setFormError(friendlyAuthError(err))
      },
    })
  }

  return (
    <main className="mx-auto max-w-[1400px] px-4 pt-[100px] pb-12">
      <div className="glass mx-auto w-full max-w-md rounded-3xl p-6 md:p-8">
        <div className="flex rounded-full bg-indigo-50 p-1 text-sm font-bold">
          <button
            type="button"
            onClick={function () {
              handleMode('login')
            }}
            className="flex-1 rounded-full py-2"
            style={{ ...(mode === 'login' && { background: '#312e81', color: '#fff' }) }}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            onClick={function () {
              handleMode('signup')
            }}
            className="flex-1 rounded-full py-2"
            style={{ ...(mode === 'signup' && { background: '#312e81', color: '#fff' }) }}
          >
            Đăng ký
          </button>
        </div>

        <h1 className="mt-5 text-2xl font-extrabold tracking-tighter">
          {mode === 'login' && <span>Chào bạn quay lại</span>}
          {mode === 'signup' && <span>Tạo tài khoản nét</span>}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">Thành viên được free ship + săn sale sớm.</p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          <label className="block text-sm font-bold">
            Email
            <input
              type="email"
              value={email}
              onChange={function (e) {
                setEmail(e.target.value)
              }}
              placeholder="ban@net.vn"
              autoComplete="email"
              className="mt-1 w-full rounded-2xl border border-sky-100 bg-white/80 px-4 py-2.5 font-normal outline-none placeholder:text-zinc-400 focus:border-sky-400"
            />
          </label>
          <label className="block text-sm font-bold">
            Mật khẩu
            <span className="relative mt-1 block">
              <input
                type={inputType}
                value={password}
                onChange={function (e) {
                  setPassword(e.target.value)
                }}
                placeholder="Tối thiểu 6 ký tự"
                autoComplete={autoComplete}
                className="w-full rounded-2xl border border-sky-100 bg-white/80 px-4 py-2.5 pr-11 font-normal outline-none placeholder:text-zinc-400 focus:border-sky-400"
              />
              <button
                type="button"
                aria-label="Hiện mật khẩu"
                onClick={function () {
                  setShowPassword(!showPassword)
                }}
                className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1 text-zinc-500"
              >
                {showPassword && <EyeSlash size={18} />}
                {showPassword === false && <Eye size={18} />}
              </button>
            </span>
          </label>

          {formError !== null && (
            <p className="rounded-2xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600">
              {formError}
            </p>
          )}
          {notice !== null && (
            <p className="rounded-2xl bg-sky-50 px-4 py-2.5 text-sm font-medium text-sky-700">
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="btn-primary w-full rounded-full py-3 text-sm font-bold disabled:opacity-60"
          >
            {busy && <span>Đang xử lý…</span>}
            {busy === false && mode === 'login' && <span>Đăng nhập</span>}
            {busy === false && mode === 'signup' && <span>Tạo tài khoản</span>}
          </button>
        </form>

        <button
          type="button"
          onClick={handleForgot}
          className="mt-3 w-full text-center text-sm font-medium text-blue-700 hover:underline"
        >
          Quên mật khẩu?
        </button>
      </div>
    </main>
  )
}
