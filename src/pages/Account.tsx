import { useNavigate } from 'react-router'

import { SignOut } from '@phosphor-icons/react'

import ChangePasswordForm from '../components/ChangePasswordForm'
import UserAvatar from '../components/UserAvatar'
import { useSignOut } from '../hooks/useAuthMutations'
import { useSessionQuery } from '../hooks/useSession'

export default function Account() {
  const { data: session } = useSessionQuery()
  const signOut = useSignOut()
  const navigate = useNavigate()

  function handleSignOut() {
    signOut.mutate(undefined, {
      onSuccess: function () {
        void navigate('/', { replace: true })
      },
    })
  }

  return (
    <main className="mx-auto max-w-[1400px] px-4 pt-[100px] pb-12">
      <div className="glass mx-auto w-full max-w-md rounded-3xl p-6 md:p-8">
        <p className="text-xs font-bold tracking-[0.18em] text-indigo-900 uppercase dark:text-indigo-200">
          Tài khoản
        </p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tighter">Xin chào</h1>
        {session !== undefined && session !== null && (
          <div className="mt-3 flex items-center gap-3">
            <UserAvatar name={session.user.email ?? 'guest'} size={44} />
            <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
              {session.user.email}
            </p>
          </div>
        )}
        <div className="mt-5 space-y-3 text-sm">
          <div className="flex items-center justify-between rounded-2xl bg-white/70 px-4 py-3 dark:bg-white/10">
            <span className="font-medium">Đơn hàng của tôi</span>
            <span className="text-xs text-zinc-400 dark:text-zinc-500">Sắp ra mắt</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-white/70 px-4 py-3 dark:bg-white/10">
            <span className="font-medium">Mã giảm giá</span>
            <span className="text-xs text-zinc-400 dark:text-zinc-500">Sắp ra mắt</span>
          </div>
          <ChangePasswordForm />
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signOut.isPending}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full border border-red-200 py-3 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-500/30 dark:hover:bg-red-500/10"
        >
          <SignOut size={16} weight="bold" />
          {signOut.isPending && <span>Đang đăng xuất…</span>}
          {signOut.isPending === false && <span>Đăng xuất</span>}
        </button>
        {signOut.isError && (
          <p className="mt-3 rounded-2xl bg-red-50 px-4 py-2.5 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-300">
            Đăng xuất không thành công. Vui lòng thử lại.
          </p>
        )}
      </div>
    </main>
  )
}
