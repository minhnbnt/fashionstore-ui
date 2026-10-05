# Code guide — fashionstore-ui

## Stack

- Vite 8 + React 19 TS + Tailwind v4 (`@import 'tailwindcss'`, token trong `@theme` ở `src/index.css`).
- `motion/react` cho reveal/entry. `@phosphor-icons/react` cho icon (một bộ duy nhất).
- Ảnh demo: `picsum.photos` + `loading="lazy"` + `width/height` cố định. Ảnh thật thay vào thì giữ cùng tỉ lệ.

## Pattern

- Component theo section: `Header`, `Hero`, `Sections.tsx` (LogoStrip/CategoryBento/ProductGrid/DealMarquee/Editorial/Testimonials/Footer), data mock ở `src/data/products.ts`.
- State liên tục (scroll/chuột) cấm `useState`, dùng `useMotionValue`. Cấm `window.addEventListener('scroll')`.
- Tôn trọng `prefers-reduced-motion`: tắt marquee + reveal.
- Mobile-first: mọi grid nhiều cột phải collapse 1 cột dưới `md`. List dài dùng `flex-wrap`.

## Copy

- Tiếng Việt, headline ≤ 8 từ, subtext hero ≤ 20 từ. Giá dùng `formatVnd`.
