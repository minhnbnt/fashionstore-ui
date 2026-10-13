import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { fetchSession, getDefaultPathForRole, getRoleFromSession } from '../lib/auth'

type Status = 'loading' | 'error'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<Status>('loading')

  useEffect(
    function () {
      let cancelled = false

      async function handleCallback() {
        const session = await fetchSession()

        if (cancelled) {
          return
        }

        if (session === null) {
          setStatus('error')
          return
        }

        const role = getRoleFromSession(session)
        const path = getDefaultPathForRole(role)
        void navigate(path, { replace: true })
      }

      handleCallback().catch(function () {
        if (cancelled === false) {
          setStatus('error')
        }
      })

      return function () {
        cancelled = true
      }
    },
    [navigate],
  )

  if (status === 'error') {
    return (
      <main className="mx-auto max-w-[1400px] px-4 pt-[100px] pb-12 text-center">
        <div className="glass mx-auto w-full max-w-sm rounded-3xl p-8">
          <p className="text-2xl font-extrabold tracking-tighter text-red-600 dark:text-red-400">
            Đăng nhập thất bại
          </p>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Không thể xác thực với Google. Vui lòng thử lại.
          </p>
          <a
            href="/login"
            className="btn-primary mt-5 inline-block rounded-full px-6 py-2.5 text-sm font-bold"
          >
            Quay lại đăng nhập
          </a>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto flex max-w-[1400px] flex-col items-center justify-center px-4 pt-[100px] pb-12">
      <div className="glass mx-auto w-full max-w-sm rounded-3xl p-8 text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        <p className="mt-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Đang xác thực…
        </p>
      </div>
    </main>
  )
}
