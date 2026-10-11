import { Link, useSearchParams } from 'react-router'

import { useList1 } from '@generated/endpoints/categories/categories'
import { useSearch } from '@generated/endpoints/search/search'

import { hookErrorMessage, takeData } from '@/lib/apiAdapters'

import { ProductCard } from '../components/Sections'

export default function Search() {
  const [params] = useSearchParams()
  const q = params.get('q') ?? ''
  const searchQuery = useSearch({ q, limit: 20 }, { query: { enabled: q !== '' } })
  const categoriesQuery = useList1()
  const categoriesPayload = categoriesQuery.data
  const categories = categoriesPayload === undefined ? [] : takeData(categoriesPayload)
  const searchPayload = searchQuery.data
  const items = searchPayload === undefined ? [] : takeData(searchPayload)

  return (
    <main className="mx-auto max-w-[1400px] px-4 pt-[100px] pb-12">
      <p className="text-xs font-bold tracking-[0.18em] text-indigo-900 uppercase dark:text-indigo-200">
        Tìm kiếm
      </p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tighter md:text-4xl">
        {q !== '' ? `Kết quả cho “${q}”` : 'Tìm sản phẩm'}
      </h1>
      {searchQuery.isSuccess && (
        <p className="mt-2 text-sm text-zinc-500">{items.length} sản phẩm</p>
      )}
      {categories.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map(function (c) {
            const selected = c.name === q
            return (
              <Link
                key={c.id}
                to={'/search?q=' + encodeURIComponent(c.name ?? '')}
                className={
                  selected
                    ? 'rounded-full bg-indigo-900 px-4 py-2 text-xs font-bold text-white'
                    : 'rounded-full border border-sky-100 bg-white/70 px-4 py-2 text-xs font-bold dark:border-white/10 dark:bg-white/5'
                }
              >
                {c.name}
              </Link>
            )
          })}
        </div>
      )}
      <div className="mt-6">
        {searchQuery.isPending && <p className="text-sm text-zinc-500">Đang tải sản phẩm…</p>}
        {searchQuery.isError && (
          <p className="text-sm text-red-600">{hookErrorMessage('search', searchQuery.error)}</p>
        )}
        {searchQuery.isSuccess && items.length === 0 && (
          <p className="text-sm text-zinc-500">Không tìm thấy sản phẩm. Thử danh mục khác.</p>
        )}
        {searchQuery.isSuccess && items.length > 0 && (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
            {items.map(function (p) {
              return <ProductCard key={p.id} item={p} />
            })}
          </div>
        )}
      </div>
    </main>
  )
}
