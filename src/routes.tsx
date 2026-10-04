import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router'

import AdminLayout from '@/components/AdminLayout'
import RequireAuth from '@/components/RequireAuth'
import StorefrontLayout from '@/components/storefront/StorefrontLayout'

// Lazy loading theo route (code-split): mỗi page một chunk riêng
const Login = lazy(() => import('@/pages/Login'))
const StorefrontHome = lazy(() => import('@/pages/StorefrontHome'))
const ProductDetail = lazy(() => import('@/pages/ProductDetail'))
const CartPage = lazy(() => import('@/pages/CartPage'))
const ProductList = lazy(() => import('@/pages/ProductList'))
const ProductForm = lazy(() => import('@/pages/ProductForm'))
const ComingSoon = lazy(() => import('@/pages/ComingSoon'))
const NotFound = lazy(() => import('@/pages/NotFound'))

function PageLoading() {
  return (
    <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
      Đang tải…
    </div>
  )
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<StorefrontLayout />}>
          <Route path="/" element={<StorefrontHome />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/orders" element={<ComingSoon title="Đơn hàng" />} />
          <Route path="/account" element={<ComingSoon title="Tài khoản" />} />
        </Route>

        <Route
          element={
            <RequireAuth>
              <AdminLayout />
            </RequireAuth>
          }
        >
          <Route path="/admin" element={<ProductList />} />
          <Route path="/admin/products/new" element={<ProductForm />} />
          <Route path="/admin/products/:id/edit" element={<ProductForm />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}
