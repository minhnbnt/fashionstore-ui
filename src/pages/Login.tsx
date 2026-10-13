import { useState } from 'react'
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router'

import { ArrowsLeftRight, Eye, EyeSlash, Tag, Truck } from '@phosphor-icons/react'

import {
  usePasswordReset,
  useSignIn,
  useSignInWithGoogle,
  useSignUp,
} from '../hooks/useAuthMutations'
import { useSessionQuery } from '../hooks/useSession'
import { friendlyAuthError, getDefaultPathForRole, getRoleFromSession, validateLoginInput } from '../lib/auth'

type Mode = 'login' | 'signup' | 'forgot'

const PERKS = [
  { icon: Truck, text: 'Miễn phí vận chuyển cho đơn từ 500K' },
  { icon: Tag, text: 'Ưu đãi sớm trước 24 giờ' },
  { icon: ArrowsLeftRight, text: 'Đổi trả trong 30 ngày' },
]

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  )
}

export default function Login() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const from = (location.state as { from?: string } | null)?.from || ''

  const { data: session, isPending } = useSessionQuery()
  const signIn = useSignIn()
  const signUp = useSignUp()
  const reset = usePasswordReset()
  const googleSignIn = useSignInWithGoogle()

  if (isPending) {
    return <p className="mx-auto max-w-[1400px] px-4 py-24 text-center">Đang tải…</p>
  }

  if (session !== null && session !== undefined) {
    const role = getRoleFromSession(session)
    const defaultPath = getDefaultPathForRole(role)
    const dest = from !== '' ? from : defaultPath
    return <Navigate to={dest} replace />
  }

  const oauthError = searchParams.get('error')
  const busy = signIn.isPending || signUp.isPending || reset.isPending || googleSignIn.isPending

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
    reset.reset()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (mode === 'forgot') {
      if (email.trim() === '') {
        setFormError('Vui lòng nhập email.')
        return
      }
      if (email.includes('@') === false) {
        setFormError('Email chưa đúng định dạng.')
        return
      }
      setFormError(null)
      reset.mutate(email.trim(), {
        onSuccess: function () {
          setNotice('Liên kết đặt lại mật khẩu đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.')
        },
        onError: function (err) {
          setFormError(friendlyAuthError(err))
        },
      })
      return
    }

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
            const role = getRoleFromSession(newSession)
            const defaultPath = getDefaultPathForRole(role)
            const dest = from !== '' ? from : defaultPath
            void navigate(dest, { replace: true })
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
          const role = getRoleFromSession(newSession)
          const defaultPath = getDefaultPathForRole(role)
          const dest = from !== '' ? from : defaultPath
          void navigate(dest, { replace: true })
          return
        }
        setNotice('Tài khoản đã được tạo. Vui lòng kiểm tra email để xác nhận.')
      },
      onError: function (err) {
        setFormError(friendlyAuthError(err))
      },
    })
  }

  function handleGoogleSignIn() {
    googleSignIn.mutate(undefined, {
      onError: function (err) {
        setFormError(friendlyAuthError(err))
      },
    })
  }

  return (
    <main className="mx-auto max-w-[1400px] px-4 pt-[100px] pb-12">
      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">
        <aside className="relative hidden overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-blue-700 to-sky-400 p-8 text-white lg:flex lg:flex-col">
          <div className="hero-blob top-[-80px] right-[-80px] h-64 w-64 bg-white/20" />
          <div className="hero-blob bottom-[-100px] left-[-60px] h-72 w-72 bg-indigo-950/40" />
          <p className="relative flex items-center gap-1 text-2xl font-extrabold tracking-tighter">
            <span>nét</span>
            <span className="h-2.5 w-2.5 rounded-full bg-white" />
          </p>
          <h2 className="relative mt-6 text-3xl leading-tight font-extrabold tracking-tighter">
            Một tài khoản,
            <br />
            cả tủ đồ nét
          </h2>
          <ul className="relative mt-6 space-y-3">
            {PERKS.map(function (perk) {
              return (
                <li
                  key={perk.text}
                  className="flex items-center gap-3 rounded-2xl bg-white/15 px-4 py-3 text-sm font-medium"
                >
                  <perk.icon size={20} weight="bold" />
                  {perk.text}
                </li>
              )
            })}
          </ul>
          <figure className="relative mt-auto pt-8">
            <blockquote className="text-sm leading-relaxed text-white/90">
              "Đặt hôm trước, hôm sau đã nhận được. Đóng gói cẩn thận."
            </blockquote>
            <figcaption className="mt-2 text-xs font-bold text-white/70">Trâm, Sài Gòn</figcaption>
          </figure>
        </aside>

        <div className="glass rounded-3xl p-6 md:p-8">
          {mode !== 'forgot' && (
            <div className="flex rounded-full bg-indigo-50 p-1 text-sm font-bold dark:bg-white/10">
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
          )}

          <h1 className="mt-5 text-2xl font-extrabold tracking-tighter">
            {mode === 'login' && <span>Chào mừng quay trở lại</span>}
            {mode === 'signup' && <span>Tạo tài khoản nét</span>}
            {mode === 'forgot' && <span>Quên mật khẩu</span>}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {mode !== 'forgot' && <span>Dùng chung một tài khoản cho mọi đơn hàng.</span>}
            {mode === 'forgot' && <span>Nhập email của bạn để nhận liên kết đặt lại mật khẩu.</span>}
          </p>

          {mode !== 'forgot' && (
            <>
              {/* Google Sign-In */}
              <button
                type="button"
                id="btn-google-signin"
                onClick={handleGoogleSignIn}
                disabled={busy}
                className="mt-5 flex w-full items-center justify-center gap-3 rounded-full border border-zinc-200 bg-white py-3 text-sm font-bold text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:opacity-60 dark:border-white/15 dark:bg-white/10 dark:text-zinc-200 dark:hover:bg-white/15"
              >
                <GoogleIcon />
                {googleSignIn.isPending && <span>Đang chuyển hướng…</span>}
                {googleSignIn.isPending === false && <span>Tiếp tục với Google</span>}
              </button>

              <div className="my-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-zinc-200 dark:bg-white/10" />
                <span className="text-xs text-zinc-400">hoặc</span>
                <div className="h-px flex-1 bg-zinc-200 dark:bg-white/10" />
              </div>

              {oauthError !== null && (
                <p className="mb-3 rounded-2xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 dark:bg-red-500/10 dark:text-red-300">
                  Đăng nhập Google thất bại. Vui lòng thử lại.
                </p>
              )}
            </>
          )}

          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
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
                className="mt-1 w-full rounded-2xl border border-sky-100 bg-white/80 px-4 py-2.5 font-normal outline-none placeholder:text-zinc-400 focus:border-sky-400 dark:border-white/15 dark:bg-white/10"
              />
            </label>

            {mode !== 'forgot' && (
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
                    className="w-full rounded-2xl border border-sky-100 bg-white/80 px-4 py-2.5 pr-11 font-normal outline-none placeholder:text-zinc-400 focus:border-sky-400 dark:border-white/15 dark:bg-white/10"
                  />
                  <button
                    type="button"
                    aria-label="Hiện mật khẩu"
                    onClick={function () {
                      setShowPassword(function (prev) {
                        return !prev
                      })
                    }}
                    className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1 text-zinc-500"
                  >
                    {showPassword && <EyeSlash size={18} />}
                    {showPassword === false && <Eye size={18} />}
                  </button>
                </span>
              </label>
            )}

            {formError !== null && (
              <p className="rounded-2xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 dark:bg-red-500/10 dark:text-red-300">
                {formError}
              </p>
            )}
            {notice !== null && (
              <p className="rounded-2xl bg-sky-50 px-4 py-2.5 text-sm font-medium text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
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
              {busy === false && mode === 'forgot' && <span>Gửi liên kết khôi phục</span>}
            </button>
          </form>

          {mode === 'login' && (
            <button
              type="button"
              onClick={function () {
                handleMode('forgot')
              }}
              className="mt-3 w-full text-center text-sm font-medium text-blue-700 hover:underline dark:text-sky-300"
            >
              Quên mật khẩu?
            </button>
          )}

          {mode === 'forgot' && (
            <button
              type="button"
              onClick={function () {
                handleMode('login')
              }}
              className="mt-3 w-full text-center text-sm font-medium text-blue-700 hover:underline dark:text-sky-300"
            >
              Quay lại đăng nhập
            </button>
          )}
        </div>
      </div>
    </main>
  )
}
