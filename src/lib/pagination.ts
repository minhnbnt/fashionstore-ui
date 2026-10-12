// Trang hiển thị: đầu, cuối, và 1 trang hai bên trang hiện tại; khoảng trống thành "…".
export function pageWindow(current: number, totalPages: number): (number | null)[] {
  const pages: (number | null)[] = []
  for (let i = 0; i < totalPages; i++) {
    const edge = i === 0 || i === totalPages - 1
    const near = Math.abs(i - current) <= 1
    if (edge || near) {
      pages.push(i)
      continue
    }
    if (pages[pages.length - 1] !== null) {
      pages.push(null)
    }
  }
  return pages
}
