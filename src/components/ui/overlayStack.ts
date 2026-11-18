// Quản lý ngăn xếp các lớp phủ (Drawer, Modal, MediaLightbox) để phím Escape
// luôn chỉ đóng đúng lớp trên cùng thay vì đóng đồng loạt cả Drawer lẫn Modal bên dưới.
const stack: symbol[] = []

export function pushOverlay(): symbol {
  const token = Symbol('overlay')
  stack.push(token)
  return token
}

export function popOverlay(token: symbol): void {
  const idx = stack.lastIndexOf(token)
  if (idx !== -1) {
    stack.splice(idx, 1)
  }
}

export function isTopOverlay(token: symbol): boolean {
  if (stack.length === 0) {
    return true
  }
  return stack[stack.length - 1] === token
}
