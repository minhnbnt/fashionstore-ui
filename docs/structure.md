# Cấu trúc thư mục — fashionstore-ui

Chuẩn React + Vite hiện tại của repo (giữ nguyên, đừng chế kiểu mới):

```text
fashionstore-ui/
├── AGENTS.md
├── docs/                  # design-system, code-guide, pre-commit, structure
├── public/                # favicon.svg, icons.svg — file tĩnh, không import qua bundler
├── src/
│   ├── assets/            # ảnh/svg nội bộ (hero.png, react.svg...)
│   ├── components/        # Header.tsx, Hero.tsx, Sections.tsx — UI theo section
│   ├── data/              # products.ts — mock data + formatVnd
│   ├── App.tsx            # ráp Header/Hero/Sections/Footer
│   ├── main.tsx           # providers (React Query) + import font + index.css
│   └── index.css          # Tailwind v4 + @theme + .glass/.btn-primary/marquee
├── index.html
├── package.json
└── vite.config.ts
```

## Thêm mới để ở đâu

- Component dùng chung (nút, badge): `src/components/ui/`.
- Section trang chủ: thêm vào `src/components/Sections.tsx` nếu nhỏ, tách file riêng nếu trên ~150 dòng.
- Trang mới (cart, PDP): `src/pages/`, route ráp ở `src/App.tsx`.
- Logic dùng chung (giỏ hàng, format): `src/hooks/`, `src/lib/`.
- Test cạnh file: `TenFile.test.tsx`.

Không tạo `src/views/`, `src/containers/` hay lồng `components/components/`.
