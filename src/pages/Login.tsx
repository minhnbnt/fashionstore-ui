import { useEffect, useRef, useState } from 'react'
import type { SubmitEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Eye, EyeOff } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/auth'

type Mode = 'signin' | 'signup'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateEmail(value: string) {
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return 'Email không được để trống'
  }
  if (!EMAIL_PATTERN.test(trimmed)) {
    return 'Email không hợp lệ'
  }
  return null
}

function validatePassword(value: string, mode: Mode) {
  if (value.length === 0) {
    return 'Mật khẩu không được để trống'
  }
  if (mode === 'signup' && value.length < 6) {
    return 'Mật khẩu tối thiểu 6 ký tự'
  }
  return null
}

async function authenticateSignIn(email: string, password: string) {
  const result = await supabase.signInWithPassword({ email, password })
  if (result.error != null) {
    throw result.error
  }
  return result.data
}

async function authenticateSignUp(email: string, password: string) {
  const result = await supabase.signUp({ email, password })
  if (result.error != null) {
    throw result.error
  }
  return result.data
}

function toggleMode(current: Mode) {
  if (current === 'signin') {
    return 'signup'
  }
  return 'signin'
}

function titleFor(mode: Mode) {
  if (mode === 'signin') {
    return 'Đăng nhập'
  }
  return 'Tạo tài khoản'
}

function descriptionFor(mode: Mode) {
  if (mode === 'signin') {
    return 'Đăng nhập để quản lý sản phẩm.'
  }
  return 'Đăng ký xong bạn vào thẳng trang quản lý.'
}

function autoCompleteFor(mode: Mode) {
  if (mode === 'signin') {
    return 'current-password'
  }
  return 'new-password'
}

function switchLabelFor(mode: Mode) {
  if (mode === 'signin') {
    return 'Chưa có tài khoản? Tạo tài khoản'
  }
  return 'Đã có tài khoản? Đăng nhập'
}

function visibilityToggleLabel(show: boolean) {
  if (show) {
    return 'Ẩn mật khẩu'
  }
  return 'Hiện mật khẩu'
}

function passwordInputType(show: boolean) {
  if (show) {
    return 'text'
  }
  return 'password'
}

function errorId(error: string | null, id: string) {
  if (error !== null) {
    return id
  }
  return undefined
}

function submitLabel(pending: boolean, mode: Mode) {
  if (pending) {
    return 'Đang xử lý…'
  }
  if (mode === 'signin') {
    return 'Đăng nhập'
  }
  return 'Đăng ký'
}

function VisibilityIcon({ show }: { show: boolean }) {
  if (show) {
    return <EyeOff className="size-4" aria-hidden="true" />
  }
  return <Eye className="size-4" aria-hidden="true" />
}

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const summaryRef = useRef<HTMLDivElement>(null)

  const authMutation = useMutation({
    mutationFn: async (variables: { mode: Mode; email: string; password: string }) => {
      if (variables.mode === 'signin') {
        return authenticateSignIn(variables.email, variables.password)
      }
      return authenticateSignUp(variables.email, variables.password)
    },
    onSuccess: () => {
      void navigate(from, { replace: true })
    },
  })
  const authError = authMutation.error

  // Focus error summary sau khi nó được render (ref chưa tồn tại ngay trong event handler)
  useEffect(() => {
    if (authError !== null) {
      summaryRef.current?.focus()
    }
  }, [authError])

  function handleEmailBlur() {
    setEmailError(validateEmail(email))
  }

  function handlePasswordBlur() {
    setPasswordError(validatePassword(password, mode))
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextEmailError = validateEmail(email)
    const nextPasswordError = validatePassword(password, mode)
    setEmailError(nextEmailError)
    setPasswordError(nextPasswordError)
    if (nextEmailError !== null || nextPasswordError !== null) {
      return
    }

    authMutation.reset()
    authMutation.mutate({ mode, email: email.trim(), password })
  }

  function switchMode() {
    setMode(toggleMode)
    authMutation.reset()
    setEmailError(null)
    setPasswordError(null)
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <p className="font-display text-lg font-semibold tracking-wide">FashionStore</p>
          <CardTitle className="text-2xl">{titleFor(mode)}</CardTitle>
          <CardDescription>{descriptionFor(mode)}</CardDescription>
        </CardHeader>

        <CardContent>
          {authError !== null && (
            <div
              ref={summaryRef}
              role="alert"
              tabIndex={-1}
              className="mb-4 rounded-sm border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive focus:outline-2 focus:outline-destructive"
            >
              {authError.message}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(changeEvent) => setEmail(changeEvent.target.value)}
                onBlur={handleEmailBlur}
                aria-invalid={emailError !== null}
                aria-describedby={errorId(emailError, 'email-error')}
              />
              {emailError !== null && (
                <p id="email-error" className="text-xs text-destructive">
                  {emailError}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={passwordInputType(showPassword)}
                  autoComplete={autoCompleteFor(mode)}
                  value={password}
                  onChange={(changeEvent) => setPassword(changeEvent.target.value)}
                  onBlur={handlePasswordBlur}
                  aria-invalid={passwordError !== null}
                  aria-describedby={errorId(passwordError, 'password-error')}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={visibilityToggleLabel(showPassword)}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  <VisibilityIcon show={showPassword} />
                </button>
              </div>
              {passwordError !== null && (
                <p id="password-error" className="text-xs text-destructive">
                  {passwordError}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={authMutation.isPending}>
              {submitLabel(authMutation.isPending, mode)}
            </Button>
          </form>

          <button
            type="button"
            onClick={switchMode}
            className="mt-4 w-full text-center text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {switchLabelFor(mode)}
          </button>
        </CardContent>
      </Card>
    </main>
  )
}
