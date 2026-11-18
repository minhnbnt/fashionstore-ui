import { Link, useParams } from 'react-router'

import { useListCategories } from '@generated/endpoints/categories/categories'
import { useDetail1 } from '@generated/endpoints/products/products'
import { ArrowClockwise } from '@phosphor-icons/react'

import { Breadcrumb, type BreadcrumbItem } from '@/components/ui/Breadcrumb'
import { DetailSkeleton } from '@/components/ui/Skeleton'
import { apiErrorMessage, takeData } from '@/lib/api/apiAdapters'
import { ApiError } from '@/lib/api/apiFetch'
import { CARD_CLASS, cn, FOCUS_RING_CLASS, secondaryButtonClass } from '@/lib/ui/styles'

import PdpShopCard from '../components/pdp/PdpShopCard'
import ProductGallery from '../components/pdp/ProductGallery'
import ProductInfo from '../components/pdp/ProductInfo'
import ProductTabs from '../components/pdp/ProductTabs'
import ProductQnaSection from '../components/pdp/qna/ProductQnaSection'
import RelatedProducts from '../components/pdp/RelatedProducts'

import type { CategoryResponse } from '@generated/model/categoryResponse'

function NotFound() {
  return (
    <main className="mx-auto max-w-[1400px] px-4 pt-24 pb-16 text-center">
      <div className={cn(CARD_CLASS, 'mx-auto max-w-lg p-8')}>
        <h1 className="text-2xl font-extrabold text-[#17203a] dark:text-white">
          Không tìm thấy sản phẩm
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          Sản phẩm không tồn tại hoặc đã gỡ khỏi gian hàng.
        </p>
        <Link
          to="/"
          className={cn(
            'btn-primary mt-6 inline-block rounded-full px-6 py-3 text-sm font-bold',
            FOCUS_RING_CLASS,
          )}
        >
          Về trang chủ
        </Link>
      </div>
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
      <main className="mx-auto max-w-[1400px] px-4 pt-24 pb-16">
        <DetailSkeleton />
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
      <main className="mx-auto max-w-[1400px] px-4 pt-24 pb-16 text-center">
        <div className={cn(CARD_CLASS, 'mx-auto max-w-lg space-y-4 p-8')}>
          <h1 className="text-xl font-extrabold text-[#17203a] dark:text-white">
            Không thể tải thông tin sản phẩm
          </h1>
          <p className="text-sm font-medium text-rose-600 dark:text-rose-400">
            {apiErrorMessage('productDetail', status)}
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={function () {
                void detailQuery.refetch()
              }}
              className={cn(
                'btn-primary inline-flex cursor-pointer items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold',
                FOCUS_RING_CLASS,
              )}
            >
              <ArrowClockwise size={16} weight="bold" />
              Thử lại
            </button>
            <Link to="/search" className={secondaryButtonClass()}>
              Về cửa hàng
            </Link>
          </div>
        </div>
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

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Trang chủ', to: '/' },
    { label: 'Cửa hàng', to: '/search' },
  ]
  if (category !== undefined && category.name !== undefined) {
    breadcrumbItems.push({
      label: category.name,
      to: '/search?category=' + encodeURIComponent(category.slug ?? ''),
    })
  }
  breadcrumbItems.push({ label: product.name ?? 'Sản phẩm' })

  return (
    <main className="mx-auto max-w-[1400px] px-4 pt-24 pb-24 md:pb-16">
      <Breadcrumb items={breadcrumbItems} showHomeIcon className="mb-6" />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <ProductGallery
          key={'gallery-' + productId}
          images={product.images ?? []}
          videoUrl={product.videoUrl ?? null}
          name={product.name ?? ''}
        />
        <ProductInfo key={'info-' + productId} product={product} />
      </div>
      {product.shopId !== undefined && product.shopId !== null && product.shopId !== '' && (
        <PdpShopCard shopId={product.shopId} />
      )}
      <ProductTabs product={product} />
      <ProductQnaSection productId={productId} />
      <div className="mt-10">
        <RelatedProducts category={category} currentId={productId} />
      </div>
    </main>
  )
}
