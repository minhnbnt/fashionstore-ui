import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import {
  useAcceptInvitation,
  useGetInvitation,
} from '@generated/endpoints/seller-staff-roles/seller-staff-roles'
import {
  ArrowRight,
  Buildings,
  CheckCircle,
  Clock,
  EnvelopeSimple,
  ShieldCheck,
  WarningCircle,
} from '@phosphor-icons/react'

import { useSessionQuery } from '@/hooks/useSession'
import { apiErrorText, takeData } from '@/lib/api/apiAdapters'
import { ApiError } from '@/lib/api/apiFetch'
import { formatDateTime } from '@/lib/format'
import { notify } from '@/lib/notifications'
import { CARD_CLASS, cn, iconChipClass, secondaryButtonClass } from '@/lib/ui/styles'

import type { InvitationDetailResponse } from '@generated/model/invitationDetailResponse'

export default function InvitationAccept() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { data: session } = useSessionQuery()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const invitationQuery = useGetInvitation(token ?? '', {
    query: {
      enabled: Boolean(token),
    },
  })

  const acceptMutation = useAcceptInvitation({
    mutation: {
      onSuccess: () => {
        notify.success('Đã tham gia gian hàng thành công')
        void navigate('/shop')
      },
      onError: (err: unknown) => {
        let status = 0
        if (err instanceof ApiError) {
          status = err.status
        }
        let msg = 'Có lỗi xảy ra khi chấp nhận lời mời.'
        if (status === 403) {
          const targetEmail = invitation?.email ?? ''
          const currentEmail = session?.user?.email ?? ''
          msg = `Lời mời dành cho email ${targetEmail}, bạn đang đăng nhập bằng ${currentEmail}`
        } else if (status === 410) {
          msg = 'Lời mời đã hết hạn hoặc bị thu hồi.'
        } else {
          msg = apiErrorText(err, msg)
        }
        setErrorMessage(msg)
        notify.error(msg, undefined, { id: 'invitation-accept-error' })
      },
    },
  })

  if (!token) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center px-4 pt-24 pb-16">
        <div className={cn(CARD_CLASS, 'flex w-full flex-col items-center p-8 text-center')}>
          <WarningCircle size={48} className="text-rose-500" />
          <h1 className="mt-4 text-lg font-extrabold text-[#17203a] dark:text-[#e2e8f0]">
            Thiếu mã lời mời
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            Đường dẫn không hợp lệ. Vui lòng kiểm tra lại liên kết.
          </p>
          <Link
            to="/"
            className="btn-primary mt-6 inline-flex cursor-pointer items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold"
          >
            <span>Về trang chủ</span>
          </Link>
        </div>
      </main>
    )
  }

  if (invitationQuery.isPending) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center px-4 pt-24 pb-16">
        <div className={cn(CARD_CLASS, 'flex w-full flex-col items-center p-8 text-center')}>
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent dark:border-sky-400" />
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">Đang kiểm tra lời mời…</p>
        </div>
      </main>
    )
  }

  if (invitationQuery.isError) {
    let errText = 'Không tìm thấy lời mời hoặc liên kết đã hết hạn.'
    const errObj = invitationQuery.error as { status?: number }
    if (errObj.status === 410) {
      errText = 'Lời mời đã hết hạn hoặc bị thu hồi.'
    }
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center px-4 pt-24 pb-16">
        <div className={cn(CARD_CLASS, 'flex w-full flex-col items-center p-8 text-center')}>
          <WarningCircle size={48} className="text-amber-500" />
          <h1 className="mt-4 text-lg font-extrabold text-[#17203a] dark:text-[#e2e8f0]">
            Không thể tham gia shop
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{errText}</p>
          <Link
            to="/"
            className="btn-primary mt-6 inline-flex cursor-pointer items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold"
          >
            <span>Về trang chủ</span>
          </Link>
        </div>
      </main>
    )
  }

  let invitation: InvitationDetailResponse | undefined
  if (invitationQuery.data !== undefined) {
    invitation = takeData(invitationQuery.data)
  }

  if (!invitation) {
    return null
  }

  const isPending = invitation.status === 'PENDING'
  const isAccepted = invitation.status === 'ACCEPTED'
  const isExpiredOrRevoked = invitation.status === 'EXPIRED' || invitation.status === 'REVOKED'

  const loggedInEmail = (session?.user?.email ?? '').trim()
  const invitedEmail = (invitation.email ?? '').trim()
  const isLoggedIn = loggedInEmail !== ''
  const isEmailMismatch =
    isLoggedIn && invitedEmail !== '' && loggedInEmail.toLowerCase() !== invitedEmail.toLowerCase()

  function handleAccept() {
    setErrorMessage(null)
    acceptMutation.mutate({ token: token ?? '' })
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg items-center justify-center px-4 pt-24 pb-16">
      <div className={cn(CARD_CLASS, 'w-full p-6 shadow-xl sm:p-8')}>
        <div className="flex flex-col items-center text-center">
          <div className={cn(iconChipClass(), 'h-16 w-16 rounded-2xl shadow-sm')}>
            <Buildings size={32} weight="duotone" />
          </div>
          <h1 className="mt-4 text-xl font-extrabold tracking-tight text-[#17203a] sm:text-2xl dark:text-[#e2e8f0]">
            Lời mời tham gia gian hàng
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            Bạn được mời làm thành viên hỗ trợ vận hành shop
          </p>
        </div>

        <div className="mt-6 divide-y divide-zinc-200/70 rounded-2xl border border-zinc-200/80 bg-white/70 p-4 dark:divide-white/10 dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center justify-between py-2 text-sm">
            <span className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
              <Buildings size={16} />
              <span>Tên gian hàng</span>
            </span>
            <span className="font-bold text-[#17203a] dark:text-[#e2e8f0]">
              {invitation.shopName}
            </span>
          </div>

          <div className="flex items-center justify-between py-2 text-sm">
            <span className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
              <ShieldCheck size={16} />
              <span>Vai trò</span>
            </span>
            <span className="inline-flex items-center rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:bg-white/10 dark:text-sky-300">
              {invitation.roleName}
            </span>
          </div>

          <div className="flex items-center justify-between py-2 text-sm">
            <span className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
              <EnvelopeSimple size={16} />
              <span>Tài khoản được mời</span>
            </span>
            <span className="font-medium text-[#17203a] dark:text-[#e2e8f0]">
              {invitation.email}
            </span>
          </div>

          <div className="flex items-center justify-between py-2 text-sm">
            <span className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
              <Clock size={16} />
              <span>Hạn chấp nhận</span>
            </span>
            <span className="text-zinc-600 dark:text-zinc-300">
              {formatDateTime(invitation.expiresAt)}
            </span>
          </div>
        </div>

        {isPending && isEmailMismatch && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50/90 p-3.5 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-200"
          >
            <WarningCircle
              size={18}
              weight="fill"
              className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400"
            />
            <div className="space-y-1">
              <p className="font-bold">Email tài khoản không khớp với lời mời</p>
              <p className="leading-relaxed">
                Lời mời này dành cho email <strong>{invitedEmail}</strong>, nhưng bạn đang đăng nhập
                bằng <strong>{loggedInEmail}</strong>. Vui lòng đăng xuất và đăng nhập đúng tài
                khoản được mời để tiếp tục.
              </p>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
            <WarningCircle size={16} className="mt-0.5 shrink-0" />
            <p>{errorMessage}</p>
          </div>
        )}

        {isAccepted && (
          <div className="mt-6 flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle size={18} weight="fill" />
              <span>Lời mời này đã được chấp nhận</span>
            </div>
            <Link
              to="/shop"
              className="btn-primary inline-flex cursor-pointer items-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold"
            >
              <span>Vào Kênh Người Bán</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        )}

        {isExpiredOrRevoked && (
          <div className="mt-6 flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-600 dark:text-zinc-300">
              <WarningCircle size={18} weight="fill" />
              <span>Lời mời đã hết hạn hoặc bị thu hồi</span>
            </div>
            <Link to="/" className={cn(secondaryButtonClass(), 'cursor-pointer px-6 py-2.5')}>
              <span>Về trang chủ</span>
            </Link>
          </div>
        )}

        {isPending && !isLoggedIn && (
          <div className="mt-6 flex flex-col gap-3">
            <Link
              to="/login"
              state={{ from: `/invitations/${token}` }}
              className="btn-primary flex w-full cursor-pointer items-center justify-center gap-2 rounded-full py-3 text-sm font-bold shadow-lg"
            >
              <span>Đăng nhập để chấp nhận lời mời</span>
              <ArrowRight size={16} weight="bold" />
            </Link>
            <p className="text-center text-xs text-zinc-600 dark:text-zinc-300">
              Vui lòng đăng nhập bằng email{' '}
              <strong className="text-[#17203a] dark:text-[#e2e8f0]">{invitedEmail}</strong>
            </p>
          </div>
        )}

        {isPending && isLoggedIn && (
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={handleAccept}
              disabled={acceptMutation.isPending || isEmailMismatch}
              className="btn-primary flex w-full cursor-pointer items-center justify-center gap-2 rounded-full py-3 text-sm font-bold shadow-lg transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              {acceptMutation.isPending && <span>Đang xử lý…</span>}
              {!acceptMutation.isPending && (
                <>
                  <span>Chấp nhận lời mời</span>
                  <ArrowRight size={16} weight="bold" />
                </>
              )}
            </button>
            <p className="text-center text-xs text-zinc-600 dark:text-zinc-300">
              Sau khi chấp nhận, bạn có thể truy cập gian hàng với vai trò{' '}
              <strong className="text-[#17203a] dark:text-[#e2e8f0]">{invitation.roleName}</strong>
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
