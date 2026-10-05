# fashionstore-ui — AGENTS.md

Shop "nét": landing thời trang, Vite + React 19 + Tailwind v4. Branch làm việc: `ui/net-glassy-purple`.

## Đọc thêm (chi tiết chia file để khỏi phình)

- `docs/design-system.md` — màu chàm-xanh băng, font Inter tự host, glass + bo góc, spacing đã chốt.
- `docs/code-guide.md` — stack, pattern code, ảnh, motion, icon.
- `docs/structure.md` — cây thư mục chuẩn React của repo, thêm mới để ở đâu.
- `docs/pre-commit.md` — trước khi commit chạy gì, commit message ra sao.

## Quy tắc nhanh

- Package manager: chỉ `pnpm`, cấm `npm`.
- Không ternary (`? :`): dùng `if` + early `return`, trong JSX dùng `&&`.
- Chạy `pnpm format`, `pnpm lint` (0 error), `pnpm build` xanh rồi mới commit.
- Không commit `dist/`, `.env` (đã gitignore / untracked thì kệ).
