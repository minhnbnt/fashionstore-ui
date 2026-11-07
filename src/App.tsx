import { lazy, Suspense, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router'

import ChatDockGate from './components/chat/ChatDockGate'
import Header from './components/Header'
import RequireAuth from './components/RequireAuth'
import RequireRole from './components/RequireRole'
import { Footer } from './components/Sections'
import AmbientBackground from './components/ui/AmbientBackground'

const Home = lazy(() => import('./pages/Home'))
const Login = lazy(() => import('./pages/account/Login'))
const Account = lazy(() => import('./pages/account/Account'))
const ProductDetail = lazy(() => import('./pages/ProductDetail'))
const Search = lazy(() => import('./pages/Search'))
const AuthCallback = lazy(() => import('./pages/account/AuthCallback'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminShops = lazy(() => import('./pages/admin/AdminShops'))
const AdminShopDetail = lazy(() => import('./pages/admin/AdminShopDetail'))
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'))
const AdminUserDetail = lazy(() => import('./pages/admin/AdminUserDetail'))
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts'))
const AdminContent = lazy(() => import('./pages/admin/AdminContent'))
const StaticPage = lazy(() => import('./pages/StaticPage'))
const Faq = lazy(() => import('./pages/Faq'))
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'))
const AdminHolidays = lazy(() => import('./pages/admin/AdminHolidays'))
const AdminBannedKeywords = lazy(() => import('./pages/admin/AdminBannedKeywords'))
const ShopDashboard = lazy(() => import('./pages/shop/ShopDashboard'))
const ShopStorefront = lazy(() => import('./pages/shop/ShopStorefront'))
const ResetPassword = lazy(() => import('./pages/account/ResetPassword'))
const Cart = lazy(() => import('./pages/checkout/Cart'))
const Checkout = lazy(() => import('./pages/checkout/Checkout'))
const Addresses = lazy(() => import('./pages/account/Addresses'))
const Orders = lazy(() => import('./pages/checkout/Orders'))
const OrderDetail = lazy(() => import('./pages/checkout/OrderDetail'))
const Wishlist = lazy(() => import('./pages/checkout/Wishlist'))
const InvitationAccept = lazy(() => import('./pages/shop/InvitationAccept'))

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

function App() {
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

export default App
