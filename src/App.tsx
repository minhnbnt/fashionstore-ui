import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router'

import Header from './components/Header'
import RequireAuth from './components/RequireAuth'
import RequireRole from './components/RequireRole'
import { Footer } from './components/Sections'

const Home = lazy(() => import('./pages/Home'))
const Login = lazy(() => import('./pages/Login'))
const Account = lazy(() => import('./pages/Account'))
const ProductDetail = lazy(() => import('./pages/ProductDetail'))
const Search = lazy(() => import('./pages/Search'))
const Cart = lazy(() => import('./pages/Cart'))
const Checkout = lazy(() => import('./pages/Checkout'))
const AuthCallback = lazy(() => import('./pages/AuthCallback'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const AdminShops = lazy(() => import('./pages/AdminShops'))
const AdminShopDetail = lazy(() => import('./pages/AdminShopDetail'))
const AdminUsers = lazy(() => import('./pages/AdminUsers'))
const AdminUserDetail = lazy(() => import('./pages/AdminUserDetail'))
const AdminProducts = lazy(() => import('./pages/AdminProducts'))
const AdminBannedKeywords = lazy(() => import('./pages/AdminBannedKeywords'))
const ShopDashboard = lazy(() => import('./pages/ShopDashboard'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const ShopView = lazy(() => import('./pages/ShopView'))
const FloatingChatWidget = lazy(() => import('./components/chat/FloatingChatWidget'))

function PageLoading() {
  return <p className="mx-auto max-w-[1400px] px-4 py-24 text-center">Đang tải…</p>
}

function ScrollToHash() {
  const location = useLocation()
  useEffect(
    function () {
      // Do not auto-scroll on /account, where hashes represent tab states
      if (location.pathname === '/account') {
        return
      }
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
  const isSellerDashboard = location.pathname === '/shop' || location.pathname.startsWith('/shop/')

  return (
    <div className="grain flex min-h-[100dvh] flex-col justify-between">
      {!isSellerDashboard && <Header />}
      <ScrollToHash />
      <div className="flex-1">
        <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/products/:id" element={<ProductDetail />} />
            <Route path="/search" element={<Search />} />
            <Route path="/cart" element={<Cart />} />
          <Route
            path="/checkout"
            element={
              <RequireAuth>
                <Checkout />
              </RequireAuth>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route
            path="/account"
            element={
              <RequireAuth>
                <Account />
              </RequireAuth>
            }
          />
          <Route
            path="/seller-channel"
            element={<Navigate to="/account#seller-channel" replace />}
          />
          <Route path="/seller" element={<Navigate to="/account#seller-channel" replace />} />
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
          <Route path="/shops/:slug" element={<ShopView />} />
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
      </div>
      {!isSellerDashboard && <Footer />}
      {!isSellerDashboard && (
        <Suspense fallback={null}>
          <FloatingChatWidget />
        </Suspense>
      )}
    </div>
  )
}

export default App
