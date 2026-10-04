import { useState } from 'react'
import { Outlet } from 'react-router'

import PromoBar from '@/components/storefront/PromoBar'
import CartDrawer from '@/components/storefront/CartDrawer'
import StorefrontFooter from '@/components/storefront/StorefrontFooter'
import StorefrontHeader from '@/components/storefront/StorefrontHeader'

export default function StorefrontLayout() {
  const [cartOpen, setCartOpen] = useState(false)

  function openCart() {
    setCartOpen(true)
  }

  return (
    <div className="flex min-h-svh flex-col">
      <PromoBar />
      <StorefrontHeader onOpenCart={openCart} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <Outlet context={{ cartOpen, setCartOpen }} />
      </main>
      <StorefrontFooter />
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
    </div>
  )
}
