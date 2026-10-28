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
import { apiErrorText, takeData } from '@/lib/apiAdapters'
import { ApiError } from '@/lib/apiFetch'
import { formatDateTime } from '@/lib/format'

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
      },
    },
  })

  if (!token) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <WarningCircle size={48} className="text-red-500" />
        <h2 className="mt-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">
          Thiếu mã lời mời
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Đường dẫn không hợp lệ. Vui lòng kiểm tra lại liên kết.
        </p>
        <Link
          to="/"
          className="btn-primary mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold"
        >
          <span>Về trang chủ</span>
        </Link>
      </div>
    )
  }

  if (invitationQuery.isPending) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">Đang kiểm tra lời mời…</p>
      </div>
    )
  }

  if (invitationQuery.isError) {
    let errText = 'Không tìm thấy lời mời hoặc liên kết đã hết hạn.'
    const errObj = invitationQuery.error as { status?: number }
    if (errObj.status === 410) {
      errText = 'Lời mời đã hết hạn hoặc bị thu hồi.'
    }
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <WarningCircle size={48} className="text-amber-500" />
        <h2 className="mt-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">
          Không thể tham gia shop
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{errText}</p>
        <Link
          to="/"
          className="btn-primary mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold"
        >
          <span>Về trang chủ</span>
        </Link>
      </div>
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

  function handleAccept() {
    setErrorMessage(null)
    acceptMutation.mutate({ token: token ?? '' })
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg items-center justify-center px-4 py-16">
      <div className="glass w-full rounded-3xl border border-zinc-200/80 p-6 shadow-xl sm:p-8 dark:border-white/10 dark:bg-[#11182a]/95">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 shadow-sm dark:bg-indigo-950 dark:text-indigo-300">
            <Buildings size={32} weight="duotone" />
          </div>
          <h1 className="mt-4 text-xl font-extrabold tracking-tight text-zinc-900 sm:text-2xl dark:text-zinc-100">
            Lời mời tham gia gian hàng
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Bạn được mời làm thành viên hỗ trợ vận hành shop
          </p>
        </div>

        <div className="mt-6 divide-y divide-zinc-100 rounded-2xl border border-zinc-100 bg-white/70 p-4 dark:divide-white/5 dark:border-white/5 dark:bg-white/5">
          <div className="flex items-center justify-between py-2 text-sm">
            <span className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
              <Buildings size={16} />
              <span>Tên gian hàng</span>
            </span>
            <span className="font-bold text-zinc-900 dark:text-zinc-100">
              {invitation.shopName}
            </span>
          </div>

          <div className="flex items-center justify-between py-2 text-sm">
            <span className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
              <ShieldCheck size={16} />
              <span>Vai trò</span>
            </span>
            <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
              {invitation.roleName}
            </span>
          </div>

          <div className="flex items-center justify-between py-2 text-sm">
            <span className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
              <EnvelopeSimple size={16} />
              <span>Tài khoản được mời</span>
            </span>
            <span className="font-medium text-zinc-800 dark:text-zinc-200">{invitation.email}</span>
          </div>

          <div className="flex items-center justify-between py-2 text-sm">
            <span className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
              <Clock size={16} />
              <span>Hạn chấp nhận</span>
            </span>
            <span className="text-zinc-600 dark:text-zinc-400">
              {formatDateTime(invitation.expiresAt)}
            </span>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/80 p-3 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
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
              className="btn-primary inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold"
            >
              <span>Vào Kênh Người Bán</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        )}

        {isExpiredOrRevoked && (
          <div className="mt-6 flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
              <WarningCircle size={18} weight="fill" />
              <span>Lời mời đã hết hạn hoặc bị thu hồi</span>
            </div>
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full border border-zinc-200 px-6 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/5"
            >
              <span>Về trang chủ</span>
            </Link>
          </div>
        )}

        {isPending && (
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={handleAccept}
              disabled={acceptMutation.isPending}
              className="btn-primary flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-bold shadow-lg transition disabled:opacity-50"
            >
              {acceptMutation.isPending && <span>Đang xử lý…</span>}
              {!acceptMutation.isPending && (
                <>
                  <span>Chấp nhận lời mời</span>
                  <ArrowRight size={16} weight="bold" />
                </>
              )}
            </button>
            <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
              Sau khi chấp nhận, bạn có thể truy cập gian hàng với vai trò{' '}
              <strong className="text-zinc-700 dark:text-zinc-200">{invitation.roleName}</strong>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
