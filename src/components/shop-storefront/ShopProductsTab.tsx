import { useState } from 'react'
import { Link } from 'react-router'

import { Funnel, Package } from '@phosphor-icons/react'

import { formatVnd } from '@/lib/format'

interface ShopProductsTabProps {
  shopId: string
}

export default function ShopProductsTab({ shopId: _shopId }: ShopProductsTabProps) {
  const [sort, setSort] = useState<'NEWEST' | 'PRICE_ASC' | 'PRICE_DESC'>('NEWEST')

  // Sample storefront shop catalog products
  const products = [
    {
      id: 'p-1',
      name: 'Áo Thun Cotton Nét Oversize Form Rộng',
      price: 249000,
      image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&q=80',
      sold: 142,
      rating: 4.9,
    },
    {
      id: 'p-2',
      name: 'Sơ Mi Lụa Hàn Quốc Thiết Kế Tối Giản',
      price: 389000,
      image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500&q=80',
      sold: 89,
      rating: 5.0,
    },
    {
      id: 'p-3',
      name: 'Quần Khaki Slim-fit Co Giãn 4 Chiều Cao Cấp',
      price: 450000,
      image: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=500&q=80',
      sold: 215,
      rating: 4.8,
    },
    {
      id: 'p-4',
      name: 'Áo Khoác Blazer Nam Nữ Phong Cách Hàn',
      price: 690000,
      image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=500&q=80',
      sold: 64,
      rating: 4.9,
    },
    {
      id: 'p-5',
      name: 'Váy Đầm Maxi Dáng Xòe Dự Tiệc Thanh Lịch',
      price: 520000,
      image: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=500&q=80',
      sold: 98,
      rating: 4.9,
    },
    {
      id: 'p-6',
      name: 'Áo Polo Thể Thao Co Giãn Thoáng Khí',
      price: 299000,
      image: 'https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=500&q=80',
      sold: 310,
      rating: 5.0,
    },
  ]

  const sortedProducts = [...products].sort((a, b) => {
    if (sort === 'PRICE_ASC') return a.price - b.price
    if (sort === 'PRICE_DESC') return b.price - a.price
    return 0
  })

  return (
    <div className="space-y-6">
      {/* Top Filter and Sort Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-zinc-200/80 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-[#11182a]">
        <div className="flex items-center gap-2">
          <Package size={20} className="text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            Tất cả sản phẩm ({sortedProducts.length})
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
            <Funnel size={14} />
            Sắp xếp:
          </span>
          <div className="flex rounded-full bg-zinc-100 p-1 dark:bg-white/10">
            <button
              type="button"
              onClick={() => setSort('NEWEST')}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                sort === 'NEWEST' &&
                'bg-white text-indigo-600 shadow-sm dark:bg-[#11182a] dark:text-indigo-400'
              } ${
                sort !== 'NEWEST' &&
                'text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white'
              }`}
            >
              Mới nhất
            </button>
            <button
              type="button"
              onClick={() => setSort('PRICE_ASC')}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                sort === 'PRICE_ASC' &&
                'bg-white text-indigo-600 shadow-sm dark:bg-[#11182a] dark:text-indigo-400'
              } ${
                sort !== 'PRICE_ASC' &&
                'text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white'
              }`}
            >
              Giá tăng dần
            </button>
            <button
              type="button"
              onClick={() => setSort('PRICE_DESC')}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                sort === 'PRICE_DESC' &&
                'bg-white text-indigo-600 shadow-sm dark:bg-[#11182a] dark:text-indigo-400'
              } ${
                sort !== 'PRICE_DESC' &&
                'text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white'
              }`}
            >
              Giá giảm dần
            </button>
          </div>
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {sortedProducts.map((p) => (
          <Link
            key={p.id}
            to={`/product/${p.id}`}
            className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white transition-all hover:-translate-y-1 hover:border-indigo-300 hover:shadow-lg dark:border-white/10 dark:bg-[#11182a]"
          >
            <div className="aspect-square w-full overflow-hidden bg-zinc-100 dark:bg-white/10">
              <img
                src={p.image}
                alt={p.name}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            <div className="flex flex-1 flex-col justify-between p-3">
              <h3 className="line-clamp-2 text-xs font-semibold text-zinc-800 transition-colors group-hover:text-indigo-600 dark:text-zinc-200 dark:group-hover:text-indigo-400">
                {p.name}
              </h3>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">
                  {formatVnd(p.price)}
                </span>
                <span className="text-[10px] text-zinc-400">Đã bán {p.sold}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
