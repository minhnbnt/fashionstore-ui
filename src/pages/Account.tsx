import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

import { getGetMyShopsQueryKey } from '@generated/endpoints/seller-staff-roles/seller-staff-roles'
import { useMe } from '@generated/endpoints/users/users'
import { MapPin, ShieldWarning, SignOut, Storefront } from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import StatusBadge from '@/components/ui/StatusBadge'
import { takeData } from '@/lib/apiAdapters'
import { getRoleFromSession, refreshAuthSession } from '@/lib/auth'

import AddressBookTab from '../components/account/AddressBookTab'
import MyShopsTab from '../components/account/MyShopsTab'
import ChangePasswordForm from '../components/ChangePasswordForm'
import ShopKycRegistrationModal from '../components/ShopKycRegistrationModal'
import UserAvatar from '../components/UserAvatar'
import { useSignOut } from '../hooks/useAuthMutations'
import { useSessionQuery } from '../hooks/useSession'

import type { UserResponse } from '@generated/model/userResponse'

function getTabBtnClass(isActive: boolean): string {
  if (isActive) {
    return 'flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/20 transition-all dark:bg-indigo-500'
  }
  return 'flex items-center gap-2 rounded-2xl bg-zinc-100 px-5 py-2.5 text-xs font-bold text-zinc-600 transition-all hover:bg-zinc-200 dark:bg-white/5 dark:text-zinc-400 dark:hover:bg-white/10'
}

export default function Account() {
  const { data: session } = useSessionQuery()
  const signOut = useSignOut()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [modalOpen, setModalOpen] = useState(false)
  const [statusNotice, setStatusNotice] = useState<string | null>(null)
  const roleRefreshAttempted = useRef(false)

  const activeTab = searchParams.get('tab') || 'shops'

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
        void navigate('/', { replace: true })
      },
    })
  }

  function handleShopCreated() {
    setModalOpen(false)
    setStatusNotice(
      'Đăng ký mở shop thành công! Hồ sơ đang ở trạng thái chờ duyệt (dự kiến 1-3 ngày làm việc).',
    )
    void queryClient.invalidateQueries({ queryKey: getGetMyShopsQueryKey() })
  }

  function handleSelectTab(tab: string) {
    setSearchParams({ tab })
  }

  let userEmail = ''
  if (session !== null && session !== undefined && session.user.email) {
    userEmail = session.user.email
  }

  return (
    <main className="mx-auto max-w-[1400px] px-4 pt-[100px] pb-16">
      {profile?.status === 'LOCKED' && (
        <section className="mb-6 rounded-3xl border border-red-200 bg-red-50 p-5 dark:border-red-400/20 dark:bg-red-500/10">
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Account Profile & Preferences */}
        <div className="glass rounded-3xl p-6 md:p-8 lg:col-span-5">
          <p className="text-xs font-bold tracking-[0.18em] text-indigo-900 uppercase dark:text-indigo-200">
            Tài khoản cá nhân
          </p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tighter">Hồ sơ của tôi</h1>

          {session !== undefined && session !== null && (
            <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white/70 p-4 dark:bg-white/10">
              <UserAvatar name={userEmail || 'guest'} size={48} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-zinc-800 dark:text-zinc-100">
                  {userEmail}
                </p>
                <div className="mt-0.5 flex items-center gap-2">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Khách hàng thành viên</p>
                  <StatusBadge status={profile?.status} />
                </div>
              </div>
            </div>
          )}

          {/* Quick tab shortcuts on Left Column */}
          <div className="mt-5 space-y-2">
            <button
              type="button"
              onClick={function () {
                handleSelectTab('shops')
              }}
              className="flex w-full items-center justify-between rounded-2xl bg-white/70 p-3.5 text-left text-xs font-bold text-zinc-700 transition hover:bg-white dark:bg-white/10 dark:text-zinc-200 dark:hover:bg-white/15"
            >
              <div className="flex items-center gap-2.5">
                <Storefront size={18} className="text-indigo-600 dark:text-indigo-400" />
                <span>Gian hàng của tôi</span>
              </div>
              <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500">
                Xem tất cả
              </span>
            </button>

            <button
              type="button"
              onClick={function () {
                handleSelectTab('addresses')
              }}
              className="flex w-full items-center justify-between rounded-2xl bg-white/70 p-3.5 text-left text-xs font-bold text-zinc-700 transition hover:bg-white dark:bg-white/10 dark:text-zinc-200 dark:hover:bg-white/15"
            >
              <div className="flex items-center gap-2.5">
                <MapPin size={18} className="text-emerald-600 dark:text-emerald-400" />
                <span>Sổ địa chỉ nhận hàng</span>
              </div>
              <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500">
                Quản lý
              </span>
            </button>
          </div>

          <div className="mt-5 space-y-3 text-sm">
            <ChangePasswordForm />
          </div>

          <button
            type="button"
            id="btn-account-logout"
            onClick={handleSignOut}
            disabled={signOut.isPending}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border border-red-200 py-3 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-500/30 dark:hover:bg-red-500/10"
          >
            <SignOut size={16} weight="bold" />
            {signOut.isPending && <span>Đang đăng xuất…</span>}
            {signOut.isPending === false && <span>Đăng xuất</span>}
          </button>
        </div>

        {/* Right Column: Tabbed Content (My Shops or Address Book) */}
        <div className="glass rounded-3xl p-6 md:p-8 lg:col-span-7">
          {/* Tab buttons */}
          <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-zinc-200/80 pb-4 dark:border-white/10">
            <button
              type="button"
              id="tab-btn-shops"
              onClick={function () {
                handleSelectTab('shops')
              }}
              className={getTabBtnClass(activeTab === 'shops')}
            >
              <Storefront size={18} weight="bold" />
              <span>Gian hàng của tôi</span>
            </button>
            <button
              type="button"
              id="tab-btn-addresses"
              onClick={function () {
                handleSelectTab('addresses')
              }}
              className={getTabBtnClass(activeTab === 'addresses')}
            >
              <MapPin size={18} weight="bold" />
              <span>Sổ địa chỉ</span>
            </button>
          </div>

          {statusNotice !== null && (
            <div
              id="account-status-notice"
              className="mb-6 rounded-2xl bg-sky-50 px-4 py-3 text-xs font-semibold text-sky-800 dark:bg-sky-500/10 dark:text-sky-300"
            >
              {statusNotice}
            </div>
          )}

          {activeTab === 'shops' && (
            <section id="seller-channel">
              <MyShopsTab
                onOpenRegisterModal={function () {
                  setModalOpen(true)
                }}
              />
            </section>
          )}

          {activeTab === 'addresses' && (
            <section id="address-book">
              <AddressBookTab />
            </section>
          )}
        </div>
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
    </main>
  )
}
