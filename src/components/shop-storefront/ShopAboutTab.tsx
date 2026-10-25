import {
  Clock,
  MapPin,
  ShieldCheck,
  Storefront,
  ArrowCounterClockwise,
  CheckCircle,
} from '@phosphor-icons/react'

import Markdown from '@/components/Markdown'

import type { ShopResponse } from '@generated/model/shopResponse'

interface ShopAboutTabProps {
  shop: ShopResponse
}

export default function ShopAboutTab({ shop }: ShopAboutTabProps) {
  const returnPolicyText =
    shop.returnPolicy && shop.returnPolicy.trim() !== ''
      ? shop.returnPolicy
      : 'Gian hàng tuân thủ chính sách tiêu chuẩn của sàn nét: Hỗ trợ khách hàng đổi trả miễn phí trong vòng 7 ngày kể từ ngày nhận hàng với bất kỳ lý do lỗi kỹ thuật từ nhà sản xuất, lỗi đường chỉ, rách hoặc giao sai mẫu / kích cỡ.'

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Left Column: Description & Return Policy (8 cols) */}
      <div className="space-y-6 lg:col-span-8">
        {/* About Shop Description */}
        <div className="rounded-3xl border border-zinc-200/80 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-[#11182a]">
          <div className="mb-4 flex items-center gap-2 border-b border-zinc-100 pb-3 dark:border-white/10">
            <Storefront size={20} className="text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Giới thiệu gian hàng {shop.name}
            </h2>
          </div>

          <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
            {shop.description && <Markdown source={shop.description} />}
            {!shop.description && (
              <p className="text-zinc-400 italic">Gian hàng chưa cập nhật mô tả chi tiết.</p>
            )}
          </div>
        </div>

        {/* Return Policy */}
        <div className="rounded-3xl border border-zinc-200/80 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-[#11182a]">
          <div className="mb-4 flex items-center gap-2 border-b border-zinc-100 pb-3 dark:border-white/10">
            <ArrowCounterClockwise size={20} className="text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Chính sách đổi trả & Bảo hành của gian hàng
            </h2>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs leading-relaxed text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300">
            <div className="mb-1 flex items-center gap-2 font-bold">
              <CheckCircle size={16} className="text-emerald-600" />
              Cam kết bảo vệ quyền lợi người mua hàng
            </div>
            {returnPolicyText}
          </div>

          <div className="mt-4 space-y-2 text-xs text-zinc-500 dark:text-zinc-400">
            <h4 className="font-semibold text-zinc-700 dark:text-zinc-300">
              Quy trình đổi trả sản phẩm:
            </h4>
            <ol className="list-decimal space-y-1 pl-4">
              <li>Yêu cầu trả hàng qua mục &ldquo;Đơn mua&rdquo; trong vòng thời hạn quy định.</li>
              <li>Đóng gói kiện hàng nguyên vẹn tem mác, phụ kiện đi kèm.</li>
              <li>Đơn vị vận chuyển liên kết của nét sẽ đến lấy hàng tận nơi miễn phí.</li>
              <li>Tiền hoàn về ví hoặc tài khoản ngân hàng ngay khi shop xác nhận nhận kiện.</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Right Column: Operations Info & Guarantees (4 cols) */}
      <div className="space-y-6 lg:col-span-4">
        {/* Logistics & Schedule */}
        <div className="space-y-4 rounded-3xl border border-zinc-200/80 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-[#11182a]">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Thông tin vận hành</h3>

          <div className="space-y-3 text-xs">
            <div className="flex items-start gap-2.5">
              <Clock size={16} className="mt-0.5 shrink-0 text-indigo-600 dark:text-indigo-400" />
              <div>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  Thời gian chuẩn bị hàng:
                </span>
                <p className="text-zinc-500 dark:text-zinc-400">
                  {shop.processingDays} ngày làm việc
                </p>
              </div>
            </div>

            {shop.address && (
              <div className="flex items-start gap-2.5">
                <MapPin
                  size={16}
                  className="mt-0.5 shrink-0 text-indigo-600 dark:text-indigo-400"
                />
                <div>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                    Kho gửi hàng:
                  </span>
                  <p className="text-zinc-500 dark:text-zinc-400">{shop.address}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Nét Platform Guarantee */}
        <div className="space-y-3 rounded-3xl border border-zinc-200/80 bg-gradient-to-br from-indigo-50/50 to-sky-50/50 p-6 shadow-sm dark:border-white/10 dark:from-indigo-950/20 dark:to-sky-950/20">
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              An tâm mua sắm tại nét
            </h3>
          </div>

          <ul className="space-y-2 text-xs text-zinc-600 dark:text-zinc-300">
            <li className="flex items-center gap-2">
              <CheckCircle size={14} className="text-emerald-600" />
              100% Sản phẩm chính hãng, xuất xứ rõ ràng
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle size={14} className="text-emerald-600" />
              Đồng kiểm hàng trước khi thanh toán
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle size={14} className="text-emerald-600" />
              Hoàn tiền 100% nếu phát hiện hàng giả
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
