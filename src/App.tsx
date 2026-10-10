import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router'

import Header from './components/Header'
import RequireAuth from './components/RequireAuth'
import { Footer } from './components/Sections'

const Home = lazy(() => import('./pages/Home'))
const Login = lazy(() => import('./pages/Login'))
const Account = lazy(() => import('./pages/Account'))
const ProductDetail = lazy(() => import('./pages/ProductDetail'))

function PageLoading() {
  return <p className="mx-auto max-w-[1400px] px-4 py-24 text-center">Đang tải…</p>
}

function App() {
  return (
    <div className="grain min-h-[100dvh]">
      <Header />
      <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/account"
            element={
              <RequireAuth>
                <Account />
              </RequireAuth>
            }
          />
        </Routes>
      </Suspense>
      <Footer />
    </div>
  )
}

export default App
