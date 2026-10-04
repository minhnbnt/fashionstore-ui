import { LogOut } from 'lucide-react'
import { Outlet, useNavigate } from 'react-router'

import { Button } from '@/components/ui/button'
import { signOut, useSession } from '@/lib/auth'

export default function Layout() {
  const { session } = useSession()
  const navigate = useNavigate()

  async function handleLogout() {
    await signOut()
    void navigate('/login')
  }

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <a href="/" className="font-display text-xl font-semibold tracking-wide">
            FashionStore
          </a>
          {session !== null && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void handleLogout()}
              aria-label="Đăng xuất"
            >
              <LogOut className="size-4" aria-hidden="true" />
              Đăng xuất
            </Button>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <Outlet />
      </main>

      <footer className="border-t border-border py-6">
        <p className="mx-auto max-w-6xl px-6 text-xs text-muted-foreground">
          © 2026 FashionStore
        </p>
      </footer>
    </div>
  )
}
