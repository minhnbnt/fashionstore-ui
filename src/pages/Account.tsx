import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { getMineQueryKey, useMine, useResubmitShop } from '@generated/endpoints/shops/shops'
import { useMe } from '@generated/endpoints/users/users'
import {
  ArrowRight,
  ClockCountdown,
  LockKey,
  PaperPlaneTilt,
  ShieldWarning,
  SignOut,
  Storefront,
} from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import StatusBadge from '@/components/admin/StatusBadge'
import ChangePasswordForm from '@/components/ChangePasswordForm'
import UserAvatar from '@/components/UserAvatar'
import { useSignOut } from '@/hooks/useAuthMutations'
import { useSessionQuery } from '@/hooks/useSession'
import { adminErrorMessage, formatDateTime, roleLabel } from '@/lib/admin'
import { takeData } from '@/lib/apiAdapters'
import { getRoleFromSession, refreshAuthSession } from '@/lib/auth'

import type { ShopResponse } from '@generated/model/shopResponse'
import type { UserResponse } from '@generated/model/userResponse'

export default function Account() {
  const { data: session } = useSessionQuery()
  const signOut = useSignOut()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [resubmitId, setResubmitId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const roleRefreshAttempted = useRef(false)

  const profileQuery = useMe()
  let profile: UserResponse | undefined
  if (profileQuery.data !== undefined) {
    profile = takeData(profileQuery.data)
  }

  useEffect(() => {
    if (profile?.role !== 'SHOP' || session === undefined || session === null) {
      return
    }
    if (getRoleFromSession(session) !== 'customer' || roleRefreshAttempted.current) {
      return
    }
    roleRefreshAttempted.current = true
    void refreshAuthSession().catch(function () {
      roleRefreshAttempted.current = false
    })
  }, [profile?.role, session])

  const canLoadShops = profile?.status === 'ACTIVE'
  const shopsQuery = useMine({ query: { enabled: canLoadShops } })
  let shops: ShopResponse[] = []
  if (shopsQuery.data !== undefined) {
    shops = takeData(shopsQuery.data)
  }

  const resubmit = useResubmitShop({
    mutation: {
      onSuccess: function () {
        setNotice('Hồ sơ đã được gửi duyệt lại và xếp cuối hàng đợi.')
        setResubmitId(null)
        void queryClient.invalidateQueries({ queryKey: getMineQueryKey() })
      },
    },
  })

  function handleSignOut() {
    signOut.mutate(undefined, {
      onSuccess: function () {
        void navigate('/', { replace: true })
      },
    })
  }

  return (
    <main className="mx-auto max-w-[1100px] px-4 pt-[100px] pb-12">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-indigo-700 uppercase dark:text-indigo-200">
            Tài khoản
          </p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tighter">Hồ sơ của tôi</h1>
        </div>
        {session !== undefined && session !== null && (
          <div className="flex items-center gap-3 rounded-full border border-zinc-200 bg-white/70 py-2 pr-4 pl-2 dark:border-white/10 dark:bg-white/5">
            <UserAvatar name={session.user.email ?? 'guest'} size={36} />
            <p className="max-w-[240px] truncate text-sm font-semibold">{session.user.email}</p>
          </div>
        )}
      </div>

      {profileQuery.isError && (
        <p className="mb-5 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-200">
          Không tải được hồ sơ tài khoản. Vui lòng thử lại sau.
        </p>
      )}

      {profile?.status === 'LOCKED' && (
        <section className="mb-5 rounded-3xl border border-red-200 bg-red-50 p-5 dark:border-red-400/20 dark:bg-red-500/10">
          <div className="flex items-start gap-3">
            <ShieldWarning
              size={24}
              weight="bold"
              className="shrink-0 text-red-700 dark:text-red-200"
            />
            <div>
              <h2 className="font-extrabold text-red-800 dark:text-red-100">
                Tài khoản đang bị khóa
              </h2>
              <p className="mt-1 text-sm leading-6 text-red-700 dark:text-red-200">
                {profile.statusReason ?? 'Hãy liên hệ bộ phận hỗ trợ để được kiểm tra.'}
              </p>
              <p className="mt-2 text-xs text-red-600 dark:text-red-300">
                Bạn chỉ có thể xem trang này cho đến khi quản trị viên mở khóa.
              </p>
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <div className="space-y-5">
          <section className="glass rounded-3xl p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold tracking-tight">Thông tin tài khoản</h2>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  Hồ sơ được đồng bộ an toàn từ hệ thống đăng nhập.
                </p>
              </div>
              <StatusBadge status={profile?.status} />
            </div>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-bold text-zinc-500 uppercase">Tên hiển thị</dt>
                <dd className="mt-1 text-sm font-semibold">
                  {profile?.displayName ?? 'Đang tải…'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-zinc-500 uppercase">Email</dt>
                <dd className="mt-1 text-sm font-semibold break-all">
                  {profile?.email ?? 'Đang tải…'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-zinc-500 uppercase">Vai trò</dt>
                <dd className="mt-1 text-sm font-semibold">{roleLabel(profile?.role)}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-zinc-500 uppercase">Ngày tham gia</dt>
                <dd className="mt-1 text-sm font-semibold">{formatDateTime(profile?.createdAt)}</dd>
              </div>
            </dl>
          </section>

          {profile !== undefined && profile.status !== 'LOCKED' && (
            <section className="glass rounded-3xl p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-extrabold tracking-tight">Shop của tôi</h2>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    Theo dõi kết quả duyệt và gửi lại hồ sơ sau khi chỉnh sửa.
                  </p>
                </div>
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-800 dark:bg-indigo-400/10 dark:text-indigo-200">
                  {shops.length} shop
                </span>
              </div>

              {notice !== null && (
                <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-200">
                  {notice}
                </p>
              )}

              {shopsQuery.isPending && (
                <p className="mt-5 text-sm text-zinc-500 dark:text-zinc-400">
                  Đang tải danh sách shop…
                </p>
              )}
              {shopsQuery.isError && (
                <p className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-200">
                  Không tải được danh sách shop. Vui lòng thử lại.
                </p>
              )}
              {shopsQuery.isPending === false &&
                shopsQuery.isError === false &&
                shops.length === 0 && (
                  <div className="mt-5 rounded-3xl border border-dashed border-zinc-300 p-6 text-center dark:border-white/15">
                    <Storefront
                      className="mx-auto text-indigo-700 dark:text-indigo-200"
                      size={28}
                    />
                    <p className="mt-2 font-bold">Bạn chưa có shop</p>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                      Luồng đăng ký shop sẽ xuất hiện tại đây khi được mở.
                    </p>
                  </div>
                )}

              <div className="mt-5 space-y-4">
                {shops.map(function (shop) {
                  if (shop.id === undefined) {
                    return null
                  }
                  const isSubmitting = resubmit.isPending && resubmitId === shop.id
                  const showError = resubmit.isError && resubmitId === shop.id
                  return (
                    <article
                      key={shop.id}
                      className="rounded-3xl border border-zinc-200 bg-white/65 p-5 dark:border-white/10 dark:bg-white/5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="font-extrabold tracking-tight">{shop.name}</h3>
                          <p className="mt-0.5 text-xs text-zinc-500">/{shop.slug}</p>
                        </div>
                        <StatusBadge status={shop.status} />
                      </div>

                      {shop.statusReason !== undefined && shop.statusReason !== null && (
                        <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-500/10 dark:text-red-100">
                          <p className="text-xs font-bold tracking-wide uppercase">
                            Phản hồi từ quản trị viên
                          </p>
                          <p className="mt-1 leading-6">{shop.statusReason}</p>
                        </div>
                      )}

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <p className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                          <ClockCountdown size={15} />
                          Tạo lúc {formatDateTime(shop.createdAt)}
                        </p>
                        {shop.status === 'REJECTED' && (
                          <button
                            type="button"
                            disabled={resubmit.isPending}
                            onClick={function () {
                              setNotice(null)
                              setResubmitId(shop.id ?? null)
                              resubmit.mutate({ id: shop.id ?? '' })
                            }}
                            className="btn-primary inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold disabled:opacity-50"
                          >
                            <PaperPlaneTilt size={15} weight="bold" />
                            {isSubmitting && <span>Đang gửi…</span>}
                            {isSubmitting === false && <span>Gửi duyệt lại</span>}
                          </button>
                        )}
                        {shop.status === 'APPROVED' && (
                          <Link
                            to="/shop"
                            className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-800 hover:bg-indigo-100 dark:bg-indigo-400/10 dark:text-indigo-200"
                          >
                            Mở kênh người bán
                            <ArrowRight size={14} weight="bold" />
                          </Link>
                        )}
                      </div>
                      {showError && (
                        <p className="mt-3 text-sm text-red-700 dark:text-red-200">
                          {adminErrorMessage(resubmit.error)}
                        </p>
                      )}
                    </article>
                  )
                })}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-5">
          <section className="glass rounded-3xl p-5">
            <div className="mb-4 flex items-center gap-2">
              <LockKey size={19} className="text-indigo-700 dark:text-indigo-200" />
              <h2 className="font-extrabold tracking-tight">Bảo mật</h2>
            </div>
            <ChangePasswordForm />
          </section>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={signOut.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-red-200 py-3 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-500/30 dark:hover:bg-red-500/10"
          >
            <SignOut size={16} weight="bold" />
            {signOut.isPending && <span>Đang đăng xuất…</span>}
            {signOut.isPending === false && <span>Đăng xuất</span>}
          </button>
          {signOut.isError && (
            <p className="rounded-2xl bg-red-50 px-4 py-2.5 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-300">
              Đăng xuất không thành công. Vui lòng thử lại.
            </p>
          )}
        </aside>
      </div>
    </main>
  )
}
