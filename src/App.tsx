import { Suspense, useEffect, useRef } from 'react'
import { Route, Routes, useLocation } from 'react-router'

import ChatDockGate from './components/chat/ChatDockGate'
import Header from './components/Header'
import { Footer } from './components/home/Sections'
import RequireAuth from './components/RequireAuth'
import RequireRole from './components/RequireRole'
import AmbientBackground from './components/ui/AmbientBackground'
import ErrorBoundary from './components/ui/ErrorBoundary'
import { PageSkeleton } from './components/ui/Skeleton'
import { AppToaster } from './components/ui/sonner'
import {
  Account,
  Addresses,
  AdminBannedKeywords,
  AdminContent,
  AdminDashboard,
  AdminHolidays,
  AdminOrders,
  AdminProducts,
  AdminSettings,
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
  NotFound,
  OrderDetail,
  Orders,
  ProductDetail,
  ResetPassword,
  Search,
  ShopDashboard,
  ShopStorefront,
  StaticPage,
  VietQrPayment,
  Wishlist,
} from './pages'

function PageLoading() {
  return <PageSkeleton />
}

function ScrollToHash() {
  const location = useLocation()
  const prevPathnameRef = useRef(location.pathname)

  useEffect(
    function () {
      const pathnameChanged = prevPathnameRef.current !== location.pathname
      prevPathnameRef.current = location.pathname

      if (location.hash !== '' && location.hash !== '#') {
        const id = location.hash.replace(/^#/, '')
        if (id !== '') {
          try {
            const decodedId = decodeURIComponent(id)
            const element = document.getElementById(decodedId)
            if (element !== null) {
              element.scrollIntoView()
              return
            }
          } catch {
            // Ignore malformed URI or non-existent element
          }
        }
      }

      if (pathnameChanged) {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      }
    },
    [location],
  )
  return null
}

export default function App() {
  const location = useLocation()
  const isSellerDashboard = location.pathname === '/shop'
  const isAdminRoute = location.pathname === '/admin' || location.pathname.startsWith('/admin/')
  const isMessagesPage = location.pathname === '/messages'
  const showStorefrontChrome = !isSellerDashboard && !isAdminRoute

  return (
    <ErrorBoundary>
      <div className="grain min-h-[100dvh]">
        {showStorefrontChrome && <AmbientBackground />}
        {showStorefrontChrome && <Header />}
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
              path="/payment/qr/:txnRef"
              element={
                <RequireAuth>
                  <VietQrPayment />
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
              path="/admin/settings"
              element={
                <RequireRole requiredRole="admin">
                  <AdminSettings />
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
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        {showStorefrontChrome && !isMessagesPage && <Footer />}
        {showStorefrontChrome && <ChatDockGate />}
        <AppToaster />
      </div>
    </ErrorBoundary>
  )
}
