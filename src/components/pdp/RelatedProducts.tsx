import { useSearch } from '@generated/endpoints/search/search'

import { ProductCard } from '@/components/ui/ProductCard'
import { takeData } from '@/lib/api/apiAdapters'

import type { CategoryResponse } from '@generated/model/categoryResponse'

// Cùng danh mục với sản phẩm đang xem; sản phẩm chưa gán danh mục thì lấy hàng mới về.
export default function RelatedProducts(props: {
  category: CategoryResponse | undefined
  currentId: string
}) {
  const searchQuery = useSearch({ category: props.category?.slug, limit: 5 })
  const payload = searchQuery.data
  if (payload === undefined) {
    return null
  }
  const items = (takeData(payload).items ?? [])
    .filter(function (p) {
      return p.id !== props.currentId
    })
    .slice(0, 4)
  if (items.length === 0) {
    return null
  }
  return (
    <section className="pb-4">
      <h2 className="text-2xl font-extrabold tracking-tight text-[#17203a] dark:text-white">
        Có thể bạn thích
      </h2>
      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {items.map(function (p) {
          return <ProductCard key={p.id} item={p} />
        })}
      </div>
    </section>
  )
}
