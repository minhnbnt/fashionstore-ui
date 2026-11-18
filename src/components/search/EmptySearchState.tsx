import { Lightbulb, MagnifyingGlass, Sparkle } from '@phosphor-icons/react'

import { ProductCard } from '@/components/ui/ProductCard'
import { cn, FOCUS_RING_CLASS, secondaryButtonClass } from '@/lib/ui/styles'

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
      <div className="rounded-3xl border border-dashed border-sky-200 bg-white/80 p-8 text-center dark:border-white/15 dark:bg-[#11182a]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-100 text-blue-700 shadow-inner dark:bg-sky-500/20 dark:text-sky-300">
          <MagnifyingGlass size={32} weight="bold" />
        </div>

        <h2 className="mt-4 text-xl font-black text-[#17203a] dark:text-white">
          Rất tiếc, không tìm thấy sản phẩm phù hợp
        </h2>
        <p className="mx-auto mt-2 max-w-md text-xs text-zinc-600 dark:text-zinc-400">
          Không có sản phẩm nào khớp với từ khóa hoặc tổ hợp bộ lọc bạn đã chọn.
        </p>

        {/* Mẹo tìm kiếm */}
        <div className="mt-6 inline-flex flex-col items-start gap-1.5 rounded-2xl border border-sky-100 bg-white/85 p-4 text-left text-xs text-zinc-600 shadow-xs dark:border-white/10 dark:bg-white/5 dark:text-zinc-300">
          <p className="flex items-center gap-1.5 font-bold text-[#17203a] dark:text-zinc-100">
            <Lightbulb size={15} weight="bold" className="text-amber-500" />
            <span>Mẹo tìm kiếm hiệu quả:</span>
          </p>
          <ul className="list-disc space-y-0.5 pl-4 text-[11px] text-zinc-500 dark:text-zinc-400">
            <li>Kiểm tra lại chính tả của từ khóa đã nhập</li>
            <li>
              Sử dụng các từ khóa ngắn gọn, chung hơn (ví dụ: &ldquo;áo&rdquo;, &ldquo;váy&rdquo;,
              &ldquo;quần&rdquo;)
            </li>
            <li>Nới lỏng khoảng giá hoặc bỏ bớt các bộ lọc màu sắc, kích cỡ</li>
          </ul>
        </div>

        {/* Hành động */}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={props.onResetAll}
            className={cn(
              'btn-primary cursor-pointer rounded-full px-6 py-2.5 text-xs font-bold shadow-md shadow-sky-500/20',
              FOCUS_RING_CLASS,
            )}
          >
            Xem tất cả sản phẩm
          </button>
          {props.filterCount > 0 && (
            <button
              type="button"
              onClick={props.onClearFilters}
              className={cn(secondaryButtonClass(), 'px-5 py-2.5 text-xs')}
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
              <h3 className="text-lg font-black tracking-tight text-[#17203a] dark:text-white">
                Có thể bạn sẽ thích
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Những mẫu thời trang bán chạy và nổi bật nhất trên sàn DHMQ
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
