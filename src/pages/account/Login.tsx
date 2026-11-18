import { useState } from 'react'
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router'

import {
  ArrowsLeftRight,
  Eye,
  EyeSlash,
  Headset,
  LockSimple,
  ShieldCheck,
  Tag,
  Truck,
} from '@phosphor-icons/react'

import { notify } from '@/lib/notifications'
import { cn, INPUT_CLASS, segmentedItemClass, segmentedTrackClass } from '@/lib/ui/styles'

import {
  usePasswordReset,
  useSignIn,
  useSignInWithGoogle,
  useSignUp,
} from '../../hooks/useAuthMutations'
import { useSessionQuery } from '../../hooks/useSession'
import {
  friendlyAuthError,
  getDefaultPathForRole,
  getRoleFromSession,
  validateLoginInput,
} from '../../lib/auth'

import type { Mode } from '@/types/auth'

const PERKS = [
  { icon: Truck, text: 'Miễn phí vận chuyển cho đơn từ 500K' },
  { icon: Tag, text: 'Ưu đãi sớm trước 24 giờ' },
  { icon: ArrowsLeftRight, text: 'Đổi trả trong 30 ngày' },
]

const TRUST_HIGHLIGHTS = [
  {
    icon: ShieldCheck,
    label: 'Gian hàng xác thực',
    detail: 'Kiểm duyệt rõ ràng trên nền tảng DHMQ',
  },
  {
    icon: LockSimple,
    label: 'Bảo mật tài khoản',
    detail: 'Mã hóa phiên đăng nhập & giao dịch an toàn',
  },
  {
    icon: Headset,
    label: 'Hỗ trợ tận tâm',
    detail: 'Đồng hành xử lý đơn hàng và đổi trả mỗi ngày',
  },
]

// Không ternary (AGENTS.md): helper if/return.
function resolveDest(from: string, defaultPath: string): string {
  if (from !== '') {
    return from
  }
  return defaultPath
}

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
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
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
  const oauthError = searchParams.get('error')

  if (isPending) {
    return <p className="mx-auto max-w-6xl px-4 py-24 text-center">Đang tải…</p>
  }

  if (session !== null && session !== undefined) {
    const role = getRoleFromSession(session)
    const defaultPath = getDefaultPathForRole(role)
    const dest = resolveDest(from, defaultPath)
    return <Navigate to={dest} replace />
  }

  const busy = signIn.isPending || signUp.isPending || reset.isPending || googleSignIn.isPending

  let inputType = 'password'
  let passwordToggleLabel = 'Hiện mật khẩu'
  if (showPassword) {
    inputType = 'text'
    passwordToggleLabel = 'Ẩn mật khẩu'
  }

  let confirmInputType = 'password'
  let confirmToggleLabel = 'Hiện xác nhận mật khẩu'
  if (showConfirmPassword) {
    confirmInputType = 'text'
    confirmToggleLabel = 'Ẩn xác nhận mật khẩu'
  }

  let autoComplete = 'new-password'
  if (mode === 'login') {
    autoComplete = 'current-password'
  }

  function handleMode(next: Mode) {
    setMode(next)
    setConfirmPassword('')
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
          setNotice(
            'Liên kết đặt lại mật khẩu đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.',
          )
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
    if (mode === 'signup') {
      if (confirmPassword === '') {
        setFormError('Vui lòng xác nhận lại mật khẩu.')
        return
      }
      if (confirmPassword !== password) {
        setFormError('Mật khẩu xác nhận không khớp.')
        return
      }
    }
    setFormError(null)
    setNotice(null)
    const creds = { email: email.trim(), password }
    if (mode === 'login') {
      signIn.mutate(creds, {
        onSuccess: function (newSession) {
          if (newSession !== null) {
            notify.success('Đăng nhập thành công')
            const role = getRoleFromSession(newSession)
            const defaultPath = getDefaultPathForRole(role)
            const dest = resolveDest(from, defaultPath)
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
          notify.success('Tạo tài khoản thành công')
          const role = getRoleFromSession(newSession)
          const defaultPath = getDefaultPathForRole(role)
          const dest = resolveDest(from, defaultPath)
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
    setFormError(null)
    googleSignIn.mutate(undefined, {
      onError: function (err) {
        setFormError(friendlyAuthError(err))
      },
    })
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pt-24 pb-16">
      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">
        <aside className="relative hidden overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-blue-700 to-sky-400 p-8 text-white lg:flex lg:flex-col">
          <div className="hero-blob top-[-80px] right-[-80px] h-64 w-64 bg-white/20" />
          <div className="hero-blob bottom-[-100px] left-[-60px] h-72 w-72 bg-indigo-950/40" />
          <p className="relative flex items-center gap-1 text-2xl font-extrabold tracking-tighter">
            <span>DHMQ</span>
            <span className="h-2.5 w-2.5 rounded-full bg-white" />
          </p>
          <h2 className="relative mt-6 text-3xl leading-tight font-extrabold tracking-tighter">
            Một tài khoản,
            <br />
            cả tủ đồ DHMQ
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
          <div className="relative mt-auto pt-8">
            <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-[11px] font-extrabold tracking-[0.16em] text-white/80 uppercase">
                Cam kết nền tảng DHMQ
              </p>
              <div className="mt-3 space-y-2.5">
                {TRUST_HIGHLIGHTS.map(function (item) {
                  return (
                    <div key={item.label} className="flex items-start gap-2.5 text-xs">
                      <item.icon size={16} weight="bold" className="mt-0.5 shrink-0 text-sky-200" />
                      <div>
                        <p className="font-bold text-white">{item.label}</p>
                        <p className="text-white/75">{item.detail}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </aside>

        <div className="glass rounded-3xl p-6 md:p-8">
          {mode !== 'forgot' && (
            <div
              role="tablist"
              aria-label="Chọn chế độ tài khoản"
              className={cn(segmentedTrackClass(), 'w-full')}
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'login'}
                onClick={function () {
                  handleMode('login')
                }}
                className={cn(
                  segmentedItemClass(mode === 'login'),
                  'flex-1 cursor-pointer justify-center py-2 text-sm',
                )}
              >
                Đăng nhập
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'signup'}
                onClick={function () {
                  handleMode('signup')
                }}
                className={cn(
                  segmentedItemClass(mode === 'signup'),
                  'flex-1 cursor-pointer justify-center py-2 text-sm',
                )}
              >
                Đăng ký
              </button>
            </div>
          )}

          <h1 className="mt-5 text-2xl font-extrabold tracking-tighter">
            {mode === 'login' && <span>Chào mừng quay trở lại</span>}
            {mode === 'signup' && <span>Tạo tài khoản DHMQ</span>}
            {mode === 'forgot' && <span>Quên mật khẩu</span>}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {mode !== 'forgot' && <span>Dùng chung một tài khoản cho mọi đơn hàng.</span>}
            {mode === 'forgot' && (
              <span>Nhập email của bạn để nhận liên kết đặt lại mật khẩu.</span>
            )}
          </p>

          {mode !== 'forgot' && (
            <>
              {/* Google Sign-In */}
              <button
                type="button"
                id="btn-google-signin"
                onClick={handleGoogleSignIn}
                disabled={busy}
                className="mt-5 flex w-full cursor-pointer items-center justify-center gap-3 rounded-full border border-zinc-300 bg-white/80 py-3 text-sm font-bold text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/15 dark:bg-white/10 dark:text-zinc-200 dark:hover:bg-white/15"
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

              {oauthError !== null && oauthError !== '' && (
                <p
                  role="alert"
                  className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300"
                >
                  Đăng nhập Google thất bại. Vui lòng thử lại hoặc dùng email và mật khẩu.
                </p>
              )}
            </>
          )}

          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <label htmlFor="login-email" className="block text-sm font-bold">
              Email
              <input
                id="login-email"
                name="email"
                type="email"
                value={email}
                onChange={function (e) {
                  setEmail(e.target.value)
                }}
                placeholder="ban@dhmq.vn"
                autoComplete="email"
                className={cn(INPUT_CLASS, 'mt-1 font-normal')}
              />
            </label>

            {mode !== 'forgot' && (
              <label htmlFor="login-password" className="block text-sm font-bold">
                Mật khẩu
                <span className="relative mt-1 block">
                  <input
                    id="login-password"
                    name="password"
                    type={inputType}
                    value={password}
                    onChange={function (e) {
                      setPassword(e.target.value)
                    }}
                    placeholder="Tối thiểu 6 ký tự"
                    autoComplete={autoComplete}
                    className={cn(INPUT_CLASS, 'pr-11 font-normal')}
                  />
                  <button
                    type="button"
                    aria-label={passwordToggleLabel}
                    onClick={function () {
                      setShowPassword(function (prev) {
                        return !prev
                      })
                    }}
                    className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer rounded-full p-1 text-zinc-500 transition hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                  >
                    {showPassword && <EyeSlash size={18} />}
                    {showPassword === false && <Eye size={18} />}
                  </button>
                </span>
              </label>
            )}

            {mode === 'signup' && (
              <label htmlFor="login-confirm-password" className="block text-sm font-bold">
                Xác nhận mật khẩu
                <span className="relative mt-1 block">
                  <input
                    id="login-confirm-password"
                    name="confirmPassword"
                    type={confirmInputType}
                    value={confirmPassword}
                    onChange={function (e) {
                      setConfirmPassword(e.target.value)
                    }}
                    placeholder="Nhập lại mật khẩu"
                    autoComplete="new-password"
                    className={cn(INPUT_CLASS, 'pr-11 font-normal')}
                  />
                  <button
                    type="button"
                    aria-label={confirmToggleLabel}
                    onClick={function () {
                      setShowConfirmPassword(function (prev) {
                        return !prev
                      })
                    }}
                    className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer rounded-full p-1 text-zinc-500 transition hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                  >
                    {showConfirmPassword && <EyeSlash size={18} />}
                    {showConfirmPassword === false && <Eye size={18} />}
                  </button>
                </span>
              </label>
            )}

            {formError !== null && (
              <p
                role="alert"
                className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300"
              >
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
              className="btn-primary w-full cursor-pointer rounded-full py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60"
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
              className="mt-3 w-full cursor-pointer text-center text-sm font-medium text-blue-700 hover:underline dark:text-sky-300"
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
              className="mt-3 w-full cursor-pointer text-center text-sm font-medium text-blue-700 hover:underline dark:text-sky-300"
            >
              Quay lại đăng nhập
            </button>
          )}
        </div>
      </div>
    </main>
  )
}
