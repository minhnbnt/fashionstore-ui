# Design system — nét

## Màu (lock 1 accent)

- Nền: `#f6f9ff`. Chữ: `#17203a`.
- Gradient duy nhất: chàm đêm `#312e81` → xanh hoàng gia `#1d4ed8` → xanh băng `#38bdf8`.
- Chỉ dùng gradient ở: CTA primary, badge/tag, blob hero, marquee. Còn lại neutrals (zinc/white/sky-100).
- CTA chữ trắng trên gradient đậm để đạt contrast AA. Không chế thêm màu mới khi chưa bàn.

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
