import { MagnifyingGlass, Sparkle } from '@phosphor-icons/react'

import { ProductCard } from '../Sections'

import type { ProductSummaryResponse } from '@generated/model/productSummaryResponse'

// Trạng thái rỗng: giải thích + mẹo + hành động, kèm gợi ý sản phẩm để giữ khách ở lại.
export default function EmptySearchState(props: {
  filterCount: number
  recommendedItems: ProductSummaryResponse[]
  onResetAll: () => void
  onClearFilters: () => void
}) {
  return (
    <div className="space-y-12">
      <div className="rounded-3xl border border-dashed border-sky-200 bg-white/70 p-8 text-center dark:border-white/15 dark:bg-white/5">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 shadow-inner dark:bg-sky-500/20 dark:text-sky-300">
          <MagnifyingGlass size={32} weight="bold" />
        </div>

        <h2 className="mt-4 text-xl font-black text-zinc-900 dark:text-white">
          Rất tiếc, không tìm thấy sản phẩm phù hợp
        </h2>
        <p className="mx-auto mt-2 max-w-md text-xs text-zinc-500 dark:text-zinc-400">
          Không có sản phẩm nào khớp với từ khóa hoặc tổ hợp bộ lọc bạn đã chọn.
        </p>

        {/* Mẹo tìm kiếm */}
        <div className="mt-6 inline-flex flex-col items-start gap-1.5 rounded-2xl border border-sky-100 bg-white/80 p-4 text-left text-xs text-zinc-600 shadow-xs dark:border-white/10 dark:bg-white/5 dark:text-zinc-300">
          <p className="font-bold text-zinc-800 dark:text-zinc-100">💡 Mẹo tìm kiếm hiệu quả:</p>
          <ul className="list-disc space-y-0.5 pl-4 text-[11px] text-zinc-500 dark:text-zinc-400">
            <li>Kiểm tra lại chính tả của từ khóa đã nhập</li>
            <li>Sử dụng các từ khóa ngắn gọn, chung hơn (ví dụ: "áo", "váy", "quần")</li>
            <li>Nới lỏng khoảng giá hoặc bỏ bớt các bộ lọc màu sắc, kích cỡ</li>
          </ul>
        </div>

        {/* Hành động */}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={props.onResetAll}
            className="btn-primary rounded-full px-6 py-2.5 text-xs font-bold shadow-md shadow-sky-500/20"
          >
            Xem tất cả sản phẩm
          </button>
          {props.filterCount > 0 && (
            <button
              type="button"
              onClick={props.onClearFilters}
              className="rounded-full border border-sky-100 bg-white/80 px-5 py-2.5 text-xs font-bold text-zinc-700 transition hover:border-sky-300 hover:bg-sky-50 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200 dark:hover:border-white/30 dark:hover:bg-white/10"
            >
              Chỉ xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* Gợi ý sản phẩm khi rỗng: giữ khách tiếp tục mua sắm */}
      {props.recommendedItems.length > 0 && (
        <div className="border-t border-sky-100 pt-8 dark:border-white/10">
          <div className="mb-5 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
              <Sparkle size={18} weight="fill" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight text-zinc-900 dark:text-white">
                Có thể bạn sẽ thích
              </h3>
              <p className="text-xs text-zinc-400">
                Những mẫu thời trang bán chạy và nổi bật nhất trên sàn nét
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 xl:gap-5">
            {props.recommendedItems.map(function (p) {
              return <ProductCard key={p.id} item={p} />
            })}
          </div>
        </div>
      )}
    </div>
  )
}
