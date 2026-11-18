# Design system — DHMQ

## UI kit (code dùng được)

Kit nằm ở `src/lib/ui/styles.ts` — mỗi hàm trả về chuỗi class Tailwind cho một pattern
đã chốt, dùng lại nhiều nơi. `cn()` (clsx + tailwind-merge) để ghép/ghi đè class.

```ts
import { cn, iconChipClass, segmentedItemClass } from '@/lib/ui/styles'

className={cn(iconChipClass(), 'h-9 w-9')} // class ghi đè sau thắng
```

| Helper                                                   | Dùng cho                                                         |
| -------------------------------------------------------- | ---------------------------------------------------------------- |
| `primaryButtonClass()`                                   | Nút CTA gradient brand (`.btn-primary`)                          |
| `segmentedTrackClass()` / `segmentedItemClass(active)`   | Nhóm nút pill (tab, chọn sắp xếp, chuyển view)                   |
| `iconChipClass()`                                        | Ô icon bo góc nền gradient nhạt (menu, accordion, panel header)  |
| `cardClass()`                                            | Card lồng trong panel glass (viền `zinc-300/70` đủ thấy ở light) |
| `filterRowClass(selected)` / `optionPillClass(selected)` | Hàng chọn + pill nhỏ trong sidebar bộ lọc                        |
| `filterChipClass()`                                      | Chip bộ lọc đang bật (họ sky)                                    |
| `chipClass(active)`                                      | Chip gợi ý nhỏ (xu hướng)                                        |
| `switchTrackClass(on)` / `switchKnobClass()`             | Switch gạt (giao diện sáng/tối)                                  |
| `sectionLabelClass()`                                    | Nhãn nhóm nhỏ uppercase ("Sắp xếp theo:")                        |
| `menuItemClass()`                                        | Hàng trong menu tài khoản                                        |

Luật: trạng thái active của nút nhóm dùng `btn-primary` (gradient), **không** dùng
`bg-indigo-900` đặc — gradient là chuẩn nhận diện của trạng thái đang chọn.

## Màu (lock 1 accent + semantic status)

- Nền: `#f6f9ff`. Chữ: `#17203a`.
- Gradient duy nhất: chàm đêm `#312e81` → xanh hoàng gia `#1d4ed8` → xanh băng `#38bdf8`.
- Chỉ dùng gradient ở: CTA primary, badge/tag, blob hero, marquee. Còn lại neutrals (zinc/white/sky-100).
- CTA chữ trắng trên gradient đậm để đạt contrast AA. Không chế thêm màu mới khi chưa bàn.
- **Semantic Status Tokens** (chuẩn hóa cho badge, cảnh báo, toast, biểu đồ):
  - Success: `emerald` (`emerald-700`/`emerald-50`/`emerald-200` light; `emerald-300`/`emerald-500/15`/`emerald-500/30` dark).
  - Warning: `amber` (`amber-800`/`amber-50`/`amber-200` light; `amber-300`/`amber-500/15`/`amber-500/30` dark). Sao đánh giá thống nhất `text-amber-400`.
  - Error / Danger: `rose` (`rose-700`/`rose-50`/`rose-200`, CTA `rose-600` light; `rose-300`/`rose-500/15`/`rose-500/30`, CTA `rose-500` dark). Không trộn `red-*` hay `orange-*`.
  - Info: `sky` (`sky-800`/`sky-50`/`sky-200` light; `sky-300`/`sky-500/15`/`sky-500/30` dark).
- **Toast Notification Semantic (`src/components/ui/sonner.tsx`)**:
  - Success: xanh lá `emerald` (`bg-emerald-50/95` light / `bg-[#0c231c]/95` dark).
  - Error: đỏ `rose` (`bg-rose-50/95` light / `bg-[#241019]/95` dark).
  - Warning: vàng `amber` (`bg-amber-50/95` light / `bg-[#241b0d]/95` dark).
  - Info: xanh dương `sky` (`bg-sky-50/95` light / `bg-[#0d1d2f]/95` dark).
  - Z-index `z-[90]` luôn nổi trên Drawer (`z-[70]`) và Modal (`z-[80]`).

## Workspace Surface (Shop & Admin)

- Storefront giữ `.glass` cho Header, Hero và overlay; Admin & Shop ưu tiên **Crisp Surface** (`bg-white/95 dark:bg-[#11182a]`, viền `border-zinc-200/90 dark:border-white/10`) để bảng dữ liệu và form dễ đọc.
- Container chuẩn hóa: Storefront `max-w-[1400px]`, trang tập trung `max-w-6xl`, Workspace `max-w-[1600px]`, trang con top offset `pt-24`.
- Footer dùng tông Navy `#070b16` đồng bộ bản sắc DHMQ trên cả 2 chế độ sáng/tối.

## Font

- Inter Variable tự host qua `@fontsource-variable/inter` (import 1 dòng trong `src/main.tsx`, family `'Inter Variable'`, trục `wght` 100–900 — mọi weight đều dùng được).
- Cấm link Google Fonts. `--font-sans: 'Inter Variable', system-ui, sans-serif`.

## Bo góc (shape lock)

- Card/ảnh lớn: `rounded-3xl`. Nút/input/badge: `rounded-full`. Thumb nhỏ: `rounded-2xl`.
- Không trộn góc nhọn vào layout.

## Glass

- Class `.glass` trong `src/index.css`: `backdrop-filter: blur(20px) saturate(1.4)`, viền tối mờ + inset đen nhẹ.
- Có fallback `prefers-reduced-transparency` về nền trắng đặc.

## Modal / Dialog

- Dùng component dùng chung `src/components/Modal.tsx` (backdrop + focus trap + Escape + khoá scroll). Không tự dựng shell modal riêng.
- Backdrop: `fixed inset-0 z-[80] flex items-center justify-center bg-zinc-950/55 p-4 backdrop-blur-sm`.
- Panel: `<dialog>` bo `rounded-3xl`, viền `border-white/30`, nền trắng, dark `dark:border-white/10 dark:bg-[#11182a]`, `p-6 shadow-2xl`, cuộn toàn khối (`overflow-y-auto`).
- Bắt buộc class `static` trên `<dialog>`: style UA mặc định là `position: absolute` khiến dialog trôi khỏi luồng flex → mất căn giữa viewport (div thì được, dialog thì không).
- Header: tiêu đề căn trái `text-xl font-extrabold`, nút ✕ bên phải qua `justify-between`.

## Input (form controls)

- Recipe chuẩn (theo search bar topbar `Header.tsx`): pill `rounded-full border border-zinc-300 bg-white/80`, `placeholder:text-zinc-400`, focus `outline-none focus:border-blue-600`.
- Dark: `dark:border-white/15 dark:bg-white/10 dark:text-white` — nền trắng mờ hòa với panel navy. Cấm `dark:bg-zinc-800`/`dark:border-zinc-700` làm control trên nền tối (xám đục, lệch tông).
- Light bắt buộc viền `border-zinc-300`: `border-white` hay `border-zinc-200` tàng hình trên nền trắng.
- Dropdown/overlay nổi trên panel tối: `dark:border-white/15 dark:bg-[#0a0f1e]` + `shadow-xl`; option hover/chọn dùng `dark:bg-white/10`.

## Spacing đã chốt (đừng phá)

- Header fixed `h-16` + `mt-3`. Hero `pt-[76px]`, inner `pt-6/lg:pt-10`, `pb-12`.
- Anchor `#categories`/`#shop`: `scroll-mt-24`.
- Section nhịp `py-12`, grid `pb-10/pb-12`. Footer `px-6 pt-10 pb-8`, desktop `md:px-10 md:pt-12`.
- Hero top padding tổng không vượt `pt-24`.

## Dark mode

- Class toggle trên `<html>` (`.dark`), qua `useTheme()`: nhớ `localStorage`, mặc định theo `prefers-color-scheme`.
- Khai báo `@custom-variant dark (&:where(.dark, .dark *));` trong `src/index.css`, không dùng media query.
- Nền `#0a0f1e`, chữ `#e2e8f0`. `.glass` tối: `rgba(20,28,50,0.6)`. Gradient chữ sáng hơn (`#a5b4fc → #38bdf8`).
- Quy tắc: `text-zinc-600` kèm `dark:text-zinc-300`, card `bg-white/80` kèm `dark:bg-white/5`, viền `dark:border-white/10`.
- Surface tối phân tầng: modal/panel `dark:bg-[#11182a]`, lớp nổi phía trên (dropdown, dialog con) `dark:bg-[#0a0f1e]`; control bên trong dùng nền trắng mờ `dark:bg-white/5`/`white/10`, không dùng gray zinc đục.
- Footer giữ nguyên (đã tối sẵn, dùng chung 2 mode).
