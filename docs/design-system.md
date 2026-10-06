# Design system — nét

## Màu (lock 1 accent)

- Nền: `#f6f9ff`. Chữ: `#17203a`.
- Gradient duy nhất: chàm đêm `#312e81` → xanh hoàng gia `#1d4ed8` → xanh băng `#38bdf8`.
- Chỉ dùng gradient ở: CTA primary, badge/tag, blob hero, marquee. Còn lại neutrals (zinc/white/sky-100).
- CTA chữ trắng trên gradient đậm để đạt contrast AA. Không chế thêm màu mới khi chưa bàn.

## Font

- Inter tự host qua `@fontsource/inter` (400/500/600/700/800 import trong `src/main.tsx`).
- Cấm link Google Fonts. `--font-sans: 'Inter', system-ui, sans-serif`.

## Bo góc (shape lock)

- Card/ảnh lớn: `rounded-3xl`. Nút/input/badge: `rounded-full`. Thumb nhỏ: `rounded-2xl`.
- Không trộn góc nhọn vào layout.

## Glass

- Class `.glass` trong `src/index.css`: `backdrop-filter: blur(20px) saturate(1.4)`, viền tối mờ + inset đen nhẹ.
- Có fallback `prefers-reduced-transparency` về nền trắng đặc.

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
- Footer giữ nguyên (đã tối sẵn, dùng chung 2 mode).
