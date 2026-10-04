import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router'

import Layout from '@/components/Layout'
import RequireAuth from '@/components/RequireAuth'

// Lazy loading theo route (code-split): mỗi page một chunk riêng
const Login = lazy(() => import('@/pages/Login'))
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

        <Route
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route path="/" element={<ProductList />} />
          <Route path="/products/new" element={<ProductForm />} />
          <Route path="/products/:id/edit" element={<ProductForm />} />
          <Route path="/products/:id" element={<ComingSoon title="Chi tiết sản phẩm" />} />
          <Route path="/cart" element={<ComingSoon title="Giỏ hàng" />} />
          <Route path="/orders" element={<ComingSoon title="Đơn hàng" />} />
          <Route path="/account" element={<ComingSoon title="Tài khoản" />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}
