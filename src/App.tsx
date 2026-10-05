import { Route, Routes } from 'react-router'

import Header from './components/Header'
import RequireAuth from './components/RequireAuth'
import { Footer } from './components/Sections'
import Account from './pages/Account'
import Home from './pages/Home'
import Login from './pages/Login'

function App() {
  return (
    <div className="grain min-h-[100dvh]">
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
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
      <Footer />
    </div>
  )
}

export default App
