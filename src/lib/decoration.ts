/**
 * Di chuyển một phần tử từ vị trí `from` tới vị trí `to` (ngôn ngữ của drag & drop:
 * bỏ phần tử ra khỏi `from`, chèn vào `to` trong mảng còn lại). Trả về mảng mới,
 * không mutate mảng gốc. Index ngoài phạm vi hoặc from === to thì trả về bản sao nguyên thứ tự.
 */
export function reorderBlocks<T>(items: T[], from: number, to: number): T[] {
  const copy = [...items]
  if (from === to || from < 0 || to < 0 || from >= copy.length || to >= copy.length) {
    return copy
  }
  const [moved] = copy.splice(from, 1)
  if (moved === undefined) {
    return copy
  }
  copy.splice(to, 0, moved)
  return copy
}
