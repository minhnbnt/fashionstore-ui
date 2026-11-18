import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { getGetMyShopsQueryKey } from '@generated/endpoints/seller-staff-roles/seller-staff-roles'
import { useMe } from '@generated/endpoints/users/users'
import { ArrowLeft, Heart, MapPin, Package, ShieldWarning, SignOut } from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import AccountLayout from '@/components/account/AccountLayout'
import AddressBookTab from '@/components/account/AddressBookTab'
import AvatarUploader from '@/components/account/AvatarUploader'
import ChangePasswordForm from '@/components/account/ChangePasswordForm'
import MyShopsTab from '@/components/account/MyShopsTab'
import ShopKycRegistrationModal from '@/components/shop/ShopKycRegistrationModal'
import StatusBadge from '@/components/ui/StatusBadge'
import { useSignOut } from '@/hooks/useAuthMutations'
import { useSessionQuery } from '@/hooks/useSession'
import { takeData } from '@/lib/api/apiAdapters'
import { getRoleFromSession, refreshAuthSession } from '@/lib/auth'
import { notify } from '@/lib/notifications'
import { cn, FOCUS_RING_CLASS, PANEL_CLASS } from '@/lib/ui/styles'

import type { UserResponse } from '@generated/model/userResponse'

export default function Account() {
  const { data: session } = useSessionQuery()
  const signOut = useSignOut()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [modalOpen, setModalOpen] = useState(false)
  const roleRefreshAttempted = useRef(false)

  const isAddressesDeepLink = searchParams.get('tab') === 'addresses'

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

  function handleSignOut() {
    signOut.mutate(undefined, {
      onSuccess: function () {
        notify.success('Đã đăng xuất')
        void navigate('/', { replace: true })
      },
      onError: function (err) {
        notify.fromError(err, 'signOut', 'Không thể đăng xuất. Vui lòng thử lại.')
      },
    })
  }

  function handleShopCreated() {
    setModalOpen(false)
    notify.success(
      'Đăng ký mở shop thành công',
      'Hồ sơ đang ở trạng thái chờ duyệt (1-3 ngày làm việc).',
    )
    void queryClient.invalidateQueries({ queryKey: getGetMyShopsQueryKey() })
  }

  let userEmail = ''
  if (session !== null && session !== undefined && session.user.email) {
    userEmail = session.user.email
  }

  let lockedBanner = null
  if (profile?.status === 'LOCKED') {
    lockedBanner = (
      <section className="mb-6 rounded-3xl border border-rose-200 bg-rose-50 p-5 dark:border-rose-500/30 dark:bg-rose-500/15">
        <div className="flex items-start gap-3">
          <ShieldWarning
            size={24}
            weight="bold"
            className="shrink-0 text-rose-700 dark:text-rose-300"
          />
          <div>
            <h2 className="font-extrabold text-rose-800 dark:text-rose-200">
              Tài khoản đang bị khóa
            </h2>
            <p className="mt-1 text-sm leading-6 text-rose-700 dark:text-rose-200">
              {profile.statusReason ?? 'Hãy liên hệ bộ phận hỗ trợ để được kiểm tra.'}
            </p>
            <p className="mt-2 text-xs text-rose-600 dark:text-rose-300">
              Bạn chỉ có thể xem trang này cho đến khi quản trị viên mở khóa.
            </p>
          </div>
        </div>
      </section>
    )
  }

  let breadcrumbs = [{ label: 'Trang chủ', to: '/' }, { label: 'Hồ sơ & Gian hàng' }]
  if (isAddressesDeepLink) {
    breadcrumbs = [
      { label: 'Trang chủ', to: '/' },
      { label: 'Hồ sơ & Gian hàng', to: '/account' },
      { label: 'Sổ địa chỉ' },
    ]
  }

  return (
    <AccountLayout breadcrumbs={breadcrumbs} topBanner={lockedBanner}>
      <div className="space-y-6">
        {/* Profile + Security Card */}
        <section className={cn(PANEL_CLASS, 'p-6')}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold tracking-widest text-blue-700 uppercase dark:text-sky-300">
                Tài khoản cá nhân
              </p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#17203a] dark:text-white">
                Hồ sơ của tôi
              </h1>
            </div>

            <button
              type="button"
              id="btn-account-logout"
              onClick={handleSignOut}
              disabled={signOut.isPending}
              className={cn(
                'inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border border-rose-200 bg-rose-50/80 px-4 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300 dark:hover:bg-rose-500/25',
                FOCUS_RING_CLASS,
              )}
            >
              <SignOut size={15} weight="bold" />
              {signOut.isPending && <span>Đang đăng xuất…</span>}
              {signOut.isPending === false && <span>Đăng xuất</span>}
            </button>
          </div>

          {session !== undefined && session !== null && (
            <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-zinc-200/80 bg-zinc-50/70 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-white/5">
              <div className="flex min-w-0 items-center gap-3.5">
                <AvatarUploader name={userEmail || 'guest'} avatarUrl={profile?.avatarUrl} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold text-[#17203a] dark:text-white">
                    {userEmail}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-zinc-600 dark:text-zinc-300">
                      Khách hàng thành viên
                    </span>
                    <StatusBadge status={profile?.status} />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to="/account/orders"
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 transition hover:border-blue-300 hover:text-blue-700 dark:border-white/15 dark:bg-white/10 dark:text-zinc-200 dark:hover:text-sky-300',
                    FOCUS_RING_CLASS,
                  )}
                >
                  <Package size={14} weight="bold" />
                  <span>Đơn hàng</span>
                </Link>
                <Link
                  to="/account/addresses"
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 transition hover:border-blue-300 hover:text-blue-700 dark:border-white/15 dark:bg-white/10 dark:text-zinc-200 dark:hover:text-sky-300',
                    FOCUS_RING_CLASS,
                  )}
                >
                  <MapPin size={14} weight="bold" />
                  <span>Địa chỉ</span>
                </Link>
                <Link
                  to="/wishlist"
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 transition hover:border-blue-300 hover:text-blue-700 dark:border-white/15 dark:bg-white/10 dark:text-zinc-200 dark:hover:text-sky-300',
                    FOCUS_RING_CLASS,
                  )}
                >
                  <Heart size={14} weight="bold" />
                  <span>Yêu thích</span>
                </Link>
              </div>
            </div>
          )}

          <div className="mt-4">
            <ChangePasswordForm />
          </div>
        </section>

        {/* Main Content Panel: MyShopsTab by default, or AddressBookTab if ?tab=addresses deep link */}
        {isAddressesDeepLink && (
          <section id="address-book" className={cn(PANEL_CLASS, 'space-y-4 p-6')}>
            <button
              type="button"
              onClick={function () {
                setSearchParams({})
              }}
              className={cn(
                'inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-blue-700 hover:underline dark:text-sky-300',
                FOCUS_RING_CLASS,
              )}
            >
              <ArrowLeft size={14} weight="bold" />
              <span>Quay lại Gian hàng của tôi</span>
            </button>
            <AddressBookTab />
          </section>
        )}

        {isAddressesDeepLink === false && (
          <section id="seller-channel" className={cn(PANEL_CLASS, 'p-6')}>
            <MyShopsTab
              onOpenRegisterModal={function () {
                setModalOpen(true)
              }}
            />
          </section>
        )}
      </div>

      {/* Shop eKYC Registration Modal */}
      <ShopKycRegistrationModal
        isOpen={modalOpen}
        userEmail={userEmail}
        onClose={function () {
          setModalOpen(false)
        }}
        onSuccess={handleShopCreated}
      />
    </AccountLayout>
  )
}
