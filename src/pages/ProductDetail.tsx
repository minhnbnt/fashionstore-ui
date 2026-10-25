import { Link, useParams } from 'react-router'

import { useListCategories } from '@generated/endpoints/categories/categories'
import { useDetail1 } from '@generated/endpoints/products/products'

import { apiErrorMessage, takeData } from '@/lib/apiAdapters'
import { ApiError } from '@/lib/apiFetch'

import ProductGallery from '../components/pdp/ProductGallery'
import ProductInfo from '../components/pdp/ProductInfo'
import ProductTabs from '../components/pdp/ProductTabs'
import RelatedProducts from '../components/pdp/RelatedProducts'
import ReportProductButton from '../components/pdp/ReportProductButton'

import type { CategoryResponse } from '@generated/model/categoryResponse'

function NotFound() {
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

export default function ProductDetail() {
  const params = useParams()
  const id = params.id ?? ''
  const detailQuery = useDetail1(id, {
    query: { enabled: id !== '' },
  })
  const categoriesQuery = useListCategories()
  let categories: CategoryResponse[] = []
  if (categoriesQuery.data !== undefined) {
    categories = takeData(categoriesQuery.data)
  }

  if (detailQuery.isPending) {
    return (
      <main className="mx-auto max-w-[1400px] px-4 py-24 text-center">
        <p className="text-sm text-zinc-500">Đang tải sản phẩm…</p>
      </main>
    )
  }

  if (detailQuery.isError) {
    const error = detailQuery.error
    if (error instanceof ApiError && error.status === 404) {
      return <NotFound />
    }
    let status = 0
    if (error instanceof ApiError) {
      status = error.status
    }
    return (
      <main className="mx-auto max-w-[1400px] px-4 py-24 text-center">
        <p className="text-sm text-red-600">{apiErrorMessage('productDetail', status)}</p>
      </main>
    )
  }

  const payload = detailQuery.data
  if (payload === undefined) {
    return <NotFound />
  }
  const product = takeData(payload)
  const productId = product.id ?? id
  const category = categories.find(function (c) {
    return c.id === product.categoryId
  })

  return (
    <main className="mx-auto max-w-[1400px] px-4 pt-[76px] pb-12">
      <nav aria-label="Breadcrumb" className="flex flex-wrap gap-2 py-6 text-sm text-zinc-500">
        <Link to="/" className="hover:text-zinc-900 dark:hover:text-white">
          Trang chủ
        </Link>
        <span>/</span>
        <Link to="/search" className="hover:text-zinc-900 dark:hover:text-white">
          Cửa hàng
        </Link>
        {category !== undefined && (
          <>
            <span>/</span>
            <Link
              to={'/search?category=' + encodeURIComponent(category.slug ?? '')}
              className="hover:text-zinc-900 dark:hover:text-white"
            >
              {category.name}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="font-bold text-zinc-900 dark:text-zinc-100">{product.name}</span>
      </nav>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <ProductGallery images={product.images ?? []} name={product.name ?? ''} />
        <ProductInfo product={product} />
      </div>
      <div className="mt-4 flex justify-end">
        <ReportProductButton productId={productId} />
      </div>
      <ProductTabs product={product} />
      <div className="mt-10">
        <RelatedProducts category={category} currentId={productId} />
      </div>
    </main>
  )
}
