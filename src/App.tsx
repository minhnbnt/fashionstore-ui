import { Suspense, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router'

import ChatDockGate from './components/chat/ChatDockGate'
import Header from './components/Header'
import { Footer } from './components/home/Sections'
import RequireAuth from './components/RequireAuth'
import RequireRole from './components/RequireRole'
import AmbientBackground from './components/ui/AmbientBackground'
import {
  Account,
  Addresses,
  AdminBannedKeywords,
  AdminContent,
  AdminDashboard,
  AdminHolidays,
  AdminOrders,
  AdminProducts,
  AdminShopDetail,
  AdminShops,
  AdminUserDetail,
  AdminUsers,
  AuthCallback,
  Cart,
  Checkout,
  Faq,
  Home,
  InvitationAccept,
  Login,
  Messages,
  OrderDetail,
  Orders,
  ProductDetail,
  ResetPassword,
  Search,
  ShopDashboard,
  ShopStorefront,
  StaticPage,
  Wishlist,
} from './pages'

function PageLoading() {
  return <p className="mx-auto max-w-[1400px] px-4 py-24 text-center">Đang tải…</p>
}

function ScrollToHash() {
  const location = useLocation()
  useEffect(
    function () {
      if (location.hash !== '' && location.hash !== '#') {
        const id = location.hash.replace(/^#/, '')
        if (id !== '') {
          try {
            const decodedId = decodeURIComponent(id)
            const element = document.getElementById(decodedId)
            if (element !== null) {
              element.scrollIntoView()
            }
          } catch {
            // Ignore malformed URI or non-existent element
          }
        }
      }
    },
    [location],
  )
  return null
}

export default function App() {
  const location = useLocation()
  const isSellerDashboard = location.pathname === '/shop'

  return (
    <div className="grain min-h-[100dvh]">
      <AmbientBackground />
      {!isSellerDashboard && <Header />}
      <ScrollToHash />
      <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/shops/:slug" element={<ShopStorefront />} />
          <Route path="/search" element={<Search />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/pages/:slug" element={<StaticPage />} />
          <Route path="/faq" element={<Faq />} />
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route
            path="/invitations/:token"
            element={
              <RequireAuth>
                <InvitationAccept />
              </RequireAuth>
            }
          />
          <Route
            path="/account"
            element={
              <RequireAuth>
                <Account />
              </RequireAuth>
            }
          />
          <Route
            path="/account/addresses"
            element={
              <RequireAuth>
                <Addresses />
              </RequireAuth>
            }
          />
          <Route
            path="/account/orders"
            element={
              <RequireAuth>
                <Orders />
              </RequireAuth>
            }
          />
          <Route
            path="/account/orders/:id"
            element={
              <RequireAuth>
                <OrderDetail />
              </RequireAuth>
            }
          />
          <Route
            path="/wishlist"
            element={
              <RequireAuth>
                <Wishlist />
              </RequireAuth>
            }
          />
          <Route
            path="/cart"
            element={
              <RequireAuth>
                <Cart />
              </RequireAuth>
            }
          />
          <Route
            path="/checkout"
            element={
              <RequireAuth>
                <Checkout />
              </RequireAuth>
            }
          />
          <Route
            path="/admin"
            element={
              <RequireRole requiredRole="admin">
                <AdminDashboard />
              </RequireRole>
            }
          />
          <Route
            path="/admin/shops"
            element={
              <RequireRole requiredRole="admin">
                <AdminShops />
              </RequireRole>
            }
          />
          <Route
            path="/admin/shops/:id"
            element={
              <RequireRole requiredRole="admin">
                <AdminShopDetail />
              </RequireRole>
            }
          />
          <Route
            path="/admin/users"
            element={
              <RequireRole requiredRole="admin">
                <AdminUsers />
              </RequireRole>
            }
          />
          <Route
            path="/admin/users/:id"
            element={
              <RequireRole requiredRole="admin">
                <AdminUserDetail />
              </RequireRole>
            }
          />
          <Route
            path="/admin/products"
            element={
              <RequireRole requiredRole="admin">
                <AdminProducts />
              </RequireRole>
            }
          />
          <Route
            path="/admin/content"
            element={
              <RequireRole requiredRole="admin">
                <AdminContent />
              </RequireRole>
            }
          />
          <Route
            path="/admin/orders"
            element={
              <RequireRole requiredRole="admin">
                <AdminOrders />
              </RequireRole>
            }
          />
          <Route
            path="/admin/holidays"
            element={
              <RequireRole requiredRole="admin">
                <AdminHolidays />
              </RequireRole>
            }
          />
          <Route
            path="/admin/products/keywords"
            element={
              <RequireRole requiredRole="admin">
                <AdminBannedKeywords />
              </RequireRole>
            }
          />
          <Route
            path="/shop"
            element={
              <RequireRole requiredRole="shop">
                <ShopDashboard />
              </RequireRole>
            }
          />
        </Routes>
      </Suspense>
      {!isSellerDashboard && <Footer />}
      {!isSellerDashboard && <ChatDockGate />}
    </div>
  )
}
