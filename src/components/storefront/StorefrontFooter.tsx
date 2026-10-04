import { Link } from 'react-router'

const COLUMNS: { title: string; links: { label: string; to: string }[] }[] = [
  {
    title: 'Mua sắm',
    links: [
      { label: 'Áo', to: '/?cat=ao' },
      { label: 'Váy & Đầm', to: '/?cat=vay-dam' },
      { label: 'Áo khoác', to: '/?cat=khoac' },
      { label: 'Phụ kiện', to: '/?cat=phu-kien' },
    ],
  },
  {
    title: 'Hỗ trợ',
    links: [
      { label: 'Giỏ hàng', to: '/cart' },
      { label: 'Tài khoản', to: '/account' },
      { label: 'Đơn hàng', to: '/orders' },
    ],
  },
  {
    title: 'Về FashionStore',
    links: [
      { label: 'Đăng nhập', to: '/login' },
      { label: 'Kênh quản trị', to: '/admin' },
    ],
  },
]

export default function StorefrontFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-display text-xl font-semibold tracking-wide">FashionStore</p>
          <p className="mt-3 text-sm text-muted-foreground">
            Thời trang tối giản, chất liệu tốt, giá minh bạch.
          </p>
        </div>
        {COLUMNS.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <p className="text-sm font-semibold">{column.title}</p>
            <ul className="mt-3 space-y-2">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className="text-sm text-muted-foreground hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-border">
        <p className="mx-auto max-w-6xl px-6 py-4 text-xs text-muted-foreground">
          © 2026 FashionStore
        </p>
      </div>
    </footer>
  )
}
