# Code guide — fashionstore-ui

## Stack

- Vite 8 + React 19 TS + Tailwind v4 (`@import 'tailwindcss'`, token trong `@theme` ở `src/index.css`).
- `motion/react` cho reveal/entry. `@phosphor-icons/react` cho icon (một bộ duy nhất).
- `boring-avatars` cho avatar sinh từ tên (style `marble` qua `UserAvatar`), không gọi mạng.
- API qua **orval codegen**: spec ở `docs/openapi.json` → `pnpm codegen` sinh hooks vào `generated/` (gitignore, cấm sửa tay).
- Ảnh demo: `picsum.photos` + `loading="lazy"` + `width/height` cố định. Ảnh thật thay vào thì giữ cùng tỉ lệ.

## Pattern

- Component theo section: `Header`, `Hero`, `Sections.tsx` (LogoStrip/CategoryBento/ProductGrid/DealMarquee/Editorial/Testimonials/Footer), trang ở `src/pages/`.
- Data thật qua adapter `src/lib/apiAdapters.ts` (`takeData` mở envelope `{data,status}`, `imageUrl` ghép S3 key, `priceInfo`, `apiErrorMessage` map lỗi theo endpoint × status). JSX không narrow union sinh ra.
- Ảnh lỗi tải thì `onError` rớt về placeholder, không để ô gãy.
- Mock còn lại đánh dấu `// TODO(mock)` (review demo, ảnh danh mục) — grep là ra hết.
- State liên tục (scroll/chuột) cấm `useState`, dùng `useMotionValue`. Cấm `window.addEventListener('scroll')`.
- Tôn trọng `prefers-reduced-motion`: tắt marquee + reveal.
- Mobile-first: mọi grid nhiều cột phải collapse 1 cột dưới `md`. List dài dùng `flex-wrap`.

## Copy

- Tiếng Việt, headline ≤ 8 từ, subtext hero ≤ 20 từ. Giá dùng `formatVnd`.
