import { Sparkle } from '@phosphor-icons/react'

interface SearchAgentLauncherProps {
  label: string
  onClick: () => void
}

/**
 * Nút nổi góc trái mở/đóng trợ lý tìm kiếm. Dùng chung để style không lệch:
 * trang Search render tĩnh nút này trước, còn widget tự giữ nút sau khi chunk được tải.
 */
export default function SearchAgentLauncher(props: SearchAgentLauncherProps) {
  return (
    <button
      type="button"
      id="search-agent-toggle"
      aria-label={props.label}
      onClick={props.onClick}
      className="btn-primary fixed bottom-5 left-5 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-xl"
    >
      <Sparkle size={24} weight="bold" />
    </button>
  )
}
