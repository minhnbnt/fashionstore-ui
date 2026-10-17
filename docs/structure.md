# Cấu trúc thư mục — fashionstore-ui

Chuẩn React + Vite hiện tại của repo (giữ nguyên, đừng chế kiểu mới):

```text
fashionstore-ui/
├── AGENTS.md
├── docs/                  # design-system, code-guide, pre-commit, structure
│   └── openapi.json       # spec backend, input của pnpm codegen
├── orval.config.ts        # sinh generated/ từ openapi.json (client react-query + fetch)
├── generated/             # code sinh ra, gitignore, cấm sửa tay
├── public/                # favicon.svg, icons.svg — file tĩnh, không import qua bundler
├── src/
│   ├── assets/            # ảnh/svg nội bộ (hero.png, react.svg...)
│   ├── components/        # Header.tsx, Hero.tsx, Sections.tsx — UI theo section
│   │   ├── pdp/           # ProductGallery/Info/Tabs/RelatedProducts (nhận type API)
│   │   ├── search/        # FilterPanel + Pagination của trang /search
│   │   └── UserAvatar.tsx # avatar marble sinh từ tên
│   ├── data/              # demoReviews.ts (TODO(mock)) + products.ts (mock cũ, chưa xóa)
│   ├── hooks/             # useSession (queryOptions), useAuthMutations, useTheme
│   ├── lib/               # apiFetch, apiAdapters, format, searchFilters (URL ↔ bộ lọc), variants, pagination (+test)
│   ├── pages/             # Home/PDP/Search/Auth/Account + dashboard admin/shop
│   │   ├── AdminDashboard.tsx     # tổng quan + hàng đợi duyệt
│   │   ├── AdminShops.tsx         # tìm/lọc shop phân trang
│   │   ├── AdminShopDetail.tsx    # hồ sơ + kiểm duyệt + audit trail
│   │   ├── AdminUsers.tsx         # tìm/lọc tài khoản phân trang
│   │   └── AdminUserDetail.tsx    # hồ sơ + khóa/mở khóa + audit trail
│   ├── components/admin/  # shell, dialog kiểm duyệt, status, timeline dùng chung
│   ├── App.tsx            # ráp Header/Routes/Footer + ScrollToHash
│   ├── main.tsx           # providers (React Query) + import font + index.css
│   └── index.css          # Tailwind v4 + @theme + .glass/.btn-primary/marquee
├── index.html
├── package.json
└── vite.config.ts         # alias @/@generated + tách chunk vendor
```

## Thêm mới để ở đâu

- Component dùng chung (nút, badge): `src/components/ui/`.
- Section trang chủ: thêm vào `src/components/Sections.tsx` nếu nhỏ, tách file riêng nếu trên ~150 dòng.
- Trang mới (cart, PDP): `src/pages/`, route ráp ở `src/App.tsx`.
- Logic dùng chung (giỏ hàng, format): `src/hooks/`, `src/lib/`.
- Test cạnh file: `TenFile.test.tsx`.

Không tạo `src/views/`, `src/containers/` hay lồng `components/components/`.
