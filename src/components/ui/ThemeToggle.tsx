import { Moon, Sun } from '@phosphor-icons/react'

import { useTheme } from '@/hooks/useTheme'

// Nút đổi giao diện sáng/tối dùng chung (Header storefront + topbar Kênh Người Bán).
// Truyền className để từng nơi tự chỉnh kích thước/hình dạng theo bar của mình.
export default function ThemeToggle(props: { className?: string }) {
  const { theme, toggle } = useTheme()
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Đổi giao diện sáng tối"
      className={props.className}
    >
      {theme === 'dark' && <Sun size={20} />}
      {theme !== 'dark' && <Moon size={20} />}
    </button>
  )
}
