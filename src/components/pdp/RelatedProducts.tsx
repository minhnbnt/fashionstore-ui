import { Link } from 'react-router'

import { useSearch } from '@generated/endpoints/search/search'

import { imageUrl, PLACEHOLDER_IMAGE, takeData } from '@/lib/apiAdapters'
import { formatVnd } from '@/lib/format'

export default function RelatedProducts(props: { name: string; currentId: string }) {
  const keyword = props.name?.split(' ')[0] ?? ''
  const searchQuery = useSearch({ q: keyword, limit: 5 })
  const payload = searchQuery.data
  if (payload === undefined) {
    return null
  }
  const items = takeData(payload)
    .filter(function (p) {
      return p.id !== props.currentId
    })
    .slice(0, 4)
  if (items.length === 0) {
    return null
  }
  return (
    <section className="mx-auto max-w-[1400px] px-4 pb-12">
      <h2 className="text-2xl font-extrabold tracking-tight">Có thể bạn thích</h2>
      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {items.map(function (p) {
          return (
            <Link
              key={p.id}
              to={'/product/' + p.id}
              className="group overflow-hidden rounded-3xl border border-sky-100 bg-white/80 dark:border-white/10 dark:bg-white/5"
            >
              <img
                src={imageUrl(p.defaultImageKey)}
                alt={p.name}
                loading="lazy"
                width={600}
                height={750}
                onError={function (e) {
                  if (e.currentTarget.src !== PLACEHOLDER_IMAGE) {
                    e.currentTarget.src = PLACEHOLDER_IMAGE
                  }
                }}
                className="aspect-[4/5] w-full object-cover"
              />
              <div className="p-4">
                <h3 className="truncate text-sm font-bold">{p.name}</h3>
                <p className="mt-1 font-extrabold text-blue-700 dark:text-sky-300">
                  {p.minPrice !== undefined && p.minPrice !== null
                    ? formatVnd(p.minPrice)
                    : 'Liên hệ'}
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
