import { useNavigate } from 'react-router'

import { SignOut, ShieldCheck, Users, Tag, ChartBar, Storefront } from '@phosphor-icons/react'

import UserAvatar from '../components/UserAvatar'
import { useSignOut } from '../hooks/useAuthMutations'
import { useSessionQuery } from '../hooks/useSession'

const STATS = [
  { icon: Users, label: 'Tổng người dùng', value: '–' },
  { icon: Storefront, label: 'Tổng shop', value: '–' },
  { icon: Tag, label: 'Tổng sản phẩm', value: '–' },
  { icon: ChartBar, label: 'Doanh thu', value: '–' },
]

export default function AdminDashboard() {
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
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 shadow-lg">
            <ShieldCheck size={22} weight="bold" className="text-white" />
          </div>
          <div>
            <p className="text-xs font-bold tracking-[0.18em] text-red-600 uppercase dark:text-red-400">
              Admin
            </p>
            <h1 className="text-xl font-extrabold tracking-tighter">Bảng điều khiển</h1>
          </div>
        </div>

        {session !== undefined && session !== null && (
          <div className="flex items-center gap-3">
            <UserAvatar name={session.user.email ?? 'admin'} size={36} />
            <p className="hidden text-sm font-medium text-zinc-500 sm:block dark:text-zinc-400">
              {session.user.email}
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STATS.map(function (stat) {
          return (
            <div
              key={stat.label}
              className="glass flex flex-col gap-2 rounded-2xl p-5"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/40">
                <stat.icon size={20} weight="bold" className="text-indigo-600 dark:text-indigo-400" />
              </div>
              <p className="text-2xl font-extrabold tracking-tighter">{stat.value}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{stat.label}</p>
            </div>
          )
        })}
      </div>

      <div className="glass mt-6 rounded-3xl p-6">
        <p className="font-extrabold tracking-tighter">Quản lý hệ thống</p>
        <div className="mt-4 space-y-2 text-sm">
          {['Quản lý người dùng', 'Quản lý shop', 'Duyệt sản phẩm', 'Cấu hình hệ thống'].map(
            function (item) {
              return (
                <div
                  key={item}
                  className="flex items-center justify-between rounded-2xl bg-white/70 px-4 py-3 dark:bg-white/10"
                >
                  <span className="font-medium">{item}</span>
                  <span className="text-xs text-zinc-400 dark:text-zinc-500">Sắp ra mắt</span>
                </div>
              )
            },
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={handleSignOut}
        disabled={signOut.isPending}
        className="mt-6 flex items-center gap-2 rounded-full border border-red-200 px-5 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-500/30 dark:hover:bg-red-500/10"
      >
        <SignOut size={16} weight="bold" />
        {signOut.isPending && <span>Đang đăng xuất…</span>}
        {signOut.isPending === false && <span>Đăng xuất</span>}
      </button>
    </main>
  )
}
