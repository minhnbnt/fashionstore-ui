# fashionstore-ui

Frontend Vite + React TS + Tailwind v4 + shadcn/ui. Dùng **pnpm**.

## Lint

- Plugin `@shadcn/lint` đã đăng ký trong `oxlint.config.ts` qua `jsPlugins` — **chưa bật rule nào**.
- Sau khi sửa code, chạy `pnpm lint` và fix hết lỗi.
- Bật rule design system trong `oxlint.config.ts` (mục `rules`, prefix `shadcn/…`).
  Danh sách rule: https://github.com/shadcn-ui/lint/blob/main/docs/rules.md
  Ví dụ cấu hình: https://github.com/shadcn-ui/lint/blob/main/docs/design-systems.md
- Token màu/font nằm trong `src/index.css` (CSS variables Tailwind v4).

## conventions

- Không dùng ternary (`? :`) — viết `if` + early `return` (theo AGENTS.md gốc).
- Một statement một dòng. Ưu tiên rõ ràng hơn ngắn gọn.
