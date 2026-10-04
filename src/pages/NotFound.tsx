import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'

export default function NotFound() {
  return (
    <section className="mx-auto max-w-xl py-16 text-center">
      <p className="font-display text-7xl">404</p>
      <p className="mt-4 text-sm text-muted-foreground">Trang bạn tìm không tồn tại.</p>
      <Link
        to="/"
        className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-foreground underline-offset-4 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Về trang chủ
      </Link>
    </section>
  )
}
