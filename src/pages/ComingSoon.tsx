import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'

export default function ComingSoon({ title }: { title: string }) {
  return (
    <section className="mx-auto max-w-xl py-16 text-center">
      <h1 className="font-display text-3xl">{title}</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        Tính năng này sẽ ra mắt trong iteration sau.
      </p>
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
