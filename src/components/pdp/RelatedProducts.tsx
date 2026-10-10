import { Link } from 'react-router'

import { formatVnd, getRelated, type Product } from '../../data/products'

export default function RelatedProducts(props: { product: Product }) {
  const items = getRelated(props.product, 4)
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
                src={p.img}
                alt={p.name}
                loading="lazy"
                width={600}
                height={750}
                className="aspect-[4/5] w-full object-cover"
              />
              <div className="p-4">
                <h3 className="truncate text-sm font-bold">{p.name}</h3>
                <p className="mt-1 font-extrabold text-blue-700 dark:text-sky-300">
                  {formatVnd(p.price)}
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
