import { Link, useParams } from 'react-router'

import ProductGallery from '../components/pdp/ProductGallery'
import ProductInfo from '../components/pdp/ProductInfo'
import ProductTabs from '../components/pdp/ProductTabs'
import RelatedProducts from '../components/pdp/RelatedProducts'
import { getProductById } from '../data/products'

export default function ProductDetail() {
  const params = useParams()
  const product = getProductById(params.id || '')

  if (!product) {
    return (
      <main className="mx-auto max-w-[1400px] px-4 py-24 text-center">
        <h1 className="text-2xl font-extrabold">Không tìm thấy sản phẩm</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          Sản phẩm không tồn tại hoặc đã gỡ.
        </p>
        <Link
          to="/"
          className="btn-primary mt-6 inline-block rounded-full px-6 py-3 text-sm font-bold"
        >
          Về trang chủ
        </Link>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-[1400px] px-4 pt-[76px] pb-12">
      <nav className="flex flex-wrap gap-2 py-6 text-sm text-zinc-500">
        <Link to="/" className="hover:text-zinc-900">
          Trang chủ
        </Link>
        <span>/</span>
        <Link to="/#shop" className="hover:text-zinc-900">
          Cửa hàng
        </Link>
        <span>/</span>
        <span className="font-bold text-zinc-900 dark:text-zinc-100">{product.name}</span>
      </nav>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <ProductGallery product={product} />
        <ProductInfo product={product} />
      </div>
      <ProductTabs product={product} />
      <div className="mt-10">
        <RelatedProducts product={product} />
      </div>
    </main>
  )
}
