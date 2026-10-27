import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'

import { useGetPublishedLayout } from '@generated/endpoints/shops-decoration/shops-decoration'
import { useBySlug, useFollow, useUnfollow } from '@generated/endpoints/shops/shops'
import { ArrowLeft, Storefront } from '@phosphor-icons/react'

import ShopAboutTab from '@/components/shop-storefront/ShopAboutTab'
import ShopDecorationRenderer from '@/components/shop-storefront/ShopDecorationRenderer'
import ShopProductsTab from '@/components/shop-storefront/ShopProductsTab'
import ShopStorefrontHeader, {
  type StorefrontTab,
} from '@/components/shop-storefront/ShopStorefrontHeader'
import { useSessionQuery } from '@/hooks/useSession'
import { takeData } from '@/lib/apiAdapters'
import { decorationBlocks } from '@/lib/sellerAdapters'

import type { DecorationBlock } from '@/types/seller'
import type { ShopResponse } from '@generated/model/shopResponse'

export default function ShopStorefront() {
  const { slug } = useParams<{ slug: string }>()
  const safeSlug = slug ?? ''

  const sessionQuery = useSessionQuery()
  const navigate = useNavigate()
  const location = useLocation()

  const [activeTab, setActiveTab] = useState<StorefrontTab>('HOME')
  const [isFollowing, setIsFollowing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(undefined)

  const shopQuery = useBySlug(safeSlug, {
    query: {
      enabled: safeSlug !== '',
    },
  })

  let shop: ShopResponse | null = null
  if (shopQuery.data !== undefined && shopQuery.data.status === 200) {
    shop = takeData(shopQuery.data)
  }

  const shopId = shop?.id ?? ''

  const decorationQuery = useGetPublishedLayout(shopId, {
    query: {
      enabled: shopId !== '',
    },
  })

  const followMutation = useFollow({
    mutation: {
      onSuccess: () => {
        setIsFollowing(true)
      },
    },
  })

  const unfollowMutation = useUnfollow({
    mutation: {
      onSuccess: () => {
        setIsFollowing(false)
      },
    },
  })

  const handleToggleFollow = () => {
    if (!shopId) return
    if (isFollowing) {
      unfollowMutation.mutate({ id: shopId })
    } else {
      followMutation.mutate({ id: shopId })
    }
  }

  const handleOpenChat = () => {
    const session = sessionQuery.data
    if (session === null || session === undefined) {
      void navigate('/login', { state: { from: location.pathname } })
      return
    }
    if (!shopId) return
    window.dispatchEvent(
      new CustomEvent('fashionstore:open-chat', {
        detail: { shopId, shopName: shop?.name },
      }),
    )
  }

  const handleSearch = (keyword: string) => {
    setSearchQuery(keyword)
    setActiveTab('PRODUCTS')
  }

  const handleSelectCategory = (categoryId: string | undefined) => {
    setSelectedCategoryId(categoryId)
    setActiveTab('PRODUCTS')
  }

  if (shopQuery.isPending) {
    return (
      <main className="mx-auto max-w-[1400px] px-4 py-24 text-center">
        <div className="inline-flex items-center gap-2 text-sm text-zinc-500">
          <Storefront size={20} className="animate-spin text-indigo-600" />
          <span>Đang tải thông tin gian hàng...</span>
        </div>
      </main>
    )
  }

  if (shopQuery.isError || !shop) {
    return (
      <main className="mx-auto max-w-[1400px] px-4 py-24 text-center">
        <Storefront size={48} className="mx-auto text-zinc-300 dark:text-zinc-600" />
        <h1 className="mt-4 text-2xl font-extrabold text-zinc-800 dark:text-zinc-100">
          Không tìm thấy gian hàng
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Gian hàng &ldquo;{safeSlug}&rdquo; không tồn tại hoặc đã tạm dừng hoạt động.
        </p>
        <Link
          to="/"
          className="btn-primary mt-6 inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-xs font-bold"
        >
          <ArrowLeft size={16} />
          Về trang chủ nét
        </Link>
      </main>
    )
  }

  let blocks: DecorationBlock[] = []
  if (decorationQuery.data !== undefined) {
    blocks = decorationBlocks(takeData(decorationQuery.data))
  }

  return (
    <main className="mx-auto max-w-[1400px] space-y-8 px-4 py-6">
      {/* Shop Storefront Hero Header */}
      <ShopStorefrontHeader
        shop={shop}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isFollowing={isFollowing}
        onToggleFollow={handleToggleFollow}
        onOpenChat={handleOpenChat}
        searchQuery={searchQuery}
        onSearch={handleSearch}
      />

      {/* Tab 1: Home (Decoration Layout) */}
      {activeTab === 'HOME' && (
        <ShopDecorationRenderer
          blocks={blocks}
          shopId={shopId}
          onSelectCategory={handleSelectCategory}
          onViewAllProducts={() => setActiveTab('PRODUCTS')}
        />
      )}

      {/* Tab 2: All Products */}
      {activeTab === 'PRODUCTS' && (
        <ShopProductsTab
          shopId={shopId}
          searchQuery={searchQuery}
          onClearSearch={() => setSearchQuery('')}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={handleSelectCategory}
        />
      )}

      {/* Tab 3: About & Return Policy */}
      {activeTab === 'ABOUT' && <ShopAboutTab shop={shop} />}
    </main>
  )
}
