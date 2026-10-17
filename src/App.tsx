import { lazy, Suspense, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router'

import Header from './components/Header'
import RequireAuth from './components/RequireAuth'
import RequireRole from './components/RequireRole'
import { Footer } from './components/Sections'

const Home = lazy(() => import('./pages/Home'))
const Login = lazy(() => import('./pages/Login'))
const Account = lazy(() => import('./pages/Account'))
const ProductDetail = lazy(() => import('./pages/ProductDetail'))
const Search = lazy(() => import('./pages/Search'))
const AuthCallback = lazy(() => import('./pages/AuthCallback'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const AdminShops = lazy(() => import('./pages/AdminShops'))
const AdminShopDetail = lazy(() => import('./pages/AdminShopDetail'))
const AdminUsers = lazy(() => import('./pages/AdminUsers'))
const AdminUserDetail = lazy(() => import('./pages/AdminUserDetail'))
const ShopDashboard = lazy(() => import('./pages/ShopDashboard'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))

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
  const isShopRoute = location.pathname.startsWith('/shop')

  return (
    <div className="grain min-h-[100dvh]">
      {!isShopRoute && <Header />}
      <ScrollToHash />
      <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/search" element={<Search />} />
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
            path="/shop"
            element={
              <RequireRole requiredRole="shop">
                <ShopDashboard />
              </RequireRole>
            }
          />
        </Routes>
      </Suspense>
      {!isShopRoute && <Footer />}
    </div>
  )
}

export default App
