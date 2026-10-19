import { Link, useNavigate } from 'react-router'

import { ChatDots, CheckCircle, Clock, ShieldCheck, Star, Storefront } from '@phosphor-icons/react'

import UserAvatar from '../UserAvatar'

export default function ShopInfoCard(props: { shopId?: string; shopName?: string }) {
  const navigate = useNavigate()
  const name = props.shopName ?? 'Gian Hàng nét Official'
  const shopSlug = props.shopId ?? 'net-official'

  function handleChatClick() {
    void navigate('/account#chat')
  }

  return (
    <div className="glass mt-8 rounded-3xl border border-sky-100 p-6 dark:border-white/10">
      <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-12">
        {/* Shop Info & Avatar */}
        <div className="flex items-center gap-4 lg:col-span-5">
          <div className="relative shrink-0">
            <UserAvatar name={name} size={64} />
            <span className="absolute -right-1 -bottom-1 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white shadow">
              <ShieldCheck size={14} weight="bold" />
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="truncate text-base font-extrabold text-zinc-900 dark:text-white">
                {name}
              </h3>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold text-blue-700 dark:bg-blue-500/20 dark:text-sky-300">
                Chính Hãng
              </span>
            </div>
            <p className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Online 10 phút trước
            </p>

            {/* Action buttons */}
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={handleChatClick}
                className="btn-primary flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold"
              >
                <ChatDots size={14} weight="bold" />
                <span>Chat Ngay</span>
              </button>
              <Link
                to={'/shops/' + shopSlug}
                className="flex items-center gap-1.5 rounded-full border border-sky-200 bg-white/80 px-4 py-1.5 text-xs font-bold text-zinc-700 transition hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-zinc-200"
              >
                <Storefront size={14} weight="bold" />
                <span>Xem Shop</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Shop Stats Grid (Shopee signature) */}
        <div className="grid grid-cols-2 gap-4 border-t border-sky-100 pt-4 sm:grid-cols-4 lg:col-span-7 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6 dark:border-white/10">
          <div>
            <span className="text-xs text-zinc-400">Đánh giá</span>
            <p className="mt-0.5 flex items-center gap-1 text-sm font-extrabold text-blue-700 dark:text-sky-300">
              <Star size={14} weight="fill" className="text-amber-400" />
              4.9 (1.8k)
            </p>
          </div>
          <div>
            <span className="text-xs text-zinc-400">Sản phẩm</span>
            <p className="mt-0.5 text-sm font-extrabold text-blue-700 dark:text-sky-300">
              36 sản phẩm
            </p>
          </div>
          <div>
            <span className="text-xs text-zinc-400">Tỉ lệ phản hồi</span>
            <p className="mt-0.5 flex items-center gap-1 text-sm font-extrabold text-blue-700 dark:text-sky-300">
              <CheckCircle size={14} className="text-emerald-500" />
              98%
            </p>
          </div>
          <div>
            <span className="text-xs text-zinc-400">Thời gian phản hồi</span>
            <p className="mt-0.5 flex items-center gap-1 text-sm font-extrabold text-blue-700 dark:text-sky-300">
              <Clock size={14} className="text-indigo-500" />
              Trong vài phút
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
