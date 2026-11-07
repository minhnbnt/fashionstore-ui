# Cấu trúc thư mục — fashionstore-ui

Chuẩn React + Vite hiện tại của repo (giữ nguyên, đừng chế kiểu mới). Nhóm theo domain: `lib/`, `pages/`, `components/` đều có thư mục con theo domain (`api`, `admin`, `seller`, `shop`, `checkout`, `account`...):

```text
fashionstore-ui/
├── AGENTS.md
├── docs/                  # design-system, code-guide, pre-commit, structure
│   └── openapi.json       # spec backend, input của pnpm codegen
├── orval.config.ts        # sinh generated/ từ openapi.json; mutator trỏ src/lib/api/apiFetch.ts
├── generated/             # code sinh ra, gitignore, cấm sửa tay
├── public/                # favicon.svg, icons.svg — file tĩnh, không import qua bundler
├── src/
│   ├── assets/            # ảnh/svg nội bộ (hero.png, react.svg...)
│   ├── components/        # dùng chung thật sự: Header, Modal, Markdown, UserAvatar,
│   │   │                  #   NotificationBell, RequireAuth/Role, SitePopup, WishlistButton
│   │   ├── home/          # Hero, HomeBanners, Sections.tsx (section trang chủ)
│   │   ├── admin/         # shell admin; con: dialogs/ dashboard/ tabs/ fields/
│   │   ├── seller-dashboard-tab/ # tab dashboard shop; con: products/ orders/ stats/; barrel index.ts
│   │   ├── account/       # tab hồ sơ: AddressBookTab, MyShopsTab, ChangePasswordForm
│   │   ├── chat/          # khung chat
│   │   ├── pdp/           # ProductGallery/Info/Tabs/RelatedProducts (nhận type API)
│   │   ├── search/        # FilterPanel + Pagination của trang /search
│   │   ├── seller/        # component riêng seller (BankSearchSelector...)
│   │   ├── shop/          # ShopKycRegistrationModal (+ ShopRegistrationModal alias)
│   │   ├── shop-storefront/ # khối storefront trang shop công khai
│   │   ├── common/        # LocationAddressSelector
│   │   ├── ui/            # nút/badge/editor dùng chung; con: charts/ (barrel index.ts)
│   │   └── UserAvatar.tsx # avatar marble sinh từ tên
│   ├── hooks/             # useSession (queryOptions), useAuthMutations, useTheme
│   ├── lib/               # dùng chung: auth, format, pagination, searchFilters (+test cạnh file)
│   │   ├── api/           # apiFetch (mutator orval — không dời bừa), apiAdapters, websocket, uploadImage
│   │   ├── admin/         # admin, adminStats, productModeration
│   │   ├── seller/        # sellerAdapters, sellerNavigation, sellerPermissions, sellerStatsAdapters, sellerStatus, decoration
│   │   ├── order/         # orderMonitoring, orderStatus, holidays
│   │   ├── shop/          # cartView, variants, ratingSummary, bankSearch, addressParser
│   │   ├── content/       # siteContent, notificationLinks
│   │   └── ai/            # agent, chatTransport
│   ├── pages/             # barrel index.ts export lazy mọi trang; root: Home, Search, ProductDetail, Faq, StaticPage
│   │   ├── admin/         # 10 trang admin (Dashboard/Shops/ShopDetail/Users/UserDetail/Orders/Products/BannedKeywords/Content/Holidays)
│   │   ├── shop/          # ShopDashboard, ShopStorefront, InvitationAccept
│   │   ├── checkout/      # Cart, Checkout, Orders, OrderDetail, Wishlist
│   │   └── account/       # Account, Addresses, Login, ResetPassword, AuthCallback
│   ├── types/             # type dùng chung theo domain (seller/ con, admin.ts, auth.ts, product.ts, search.ts, ui.ts; index.ts re-export)
│   ├── App.tsx            # ráp Header/Routes/Footer + ScrollToHash; lazy import './pages/<domain>/X'
│   ├── main.tsx           # providers (React Query) + import font + index.css
│   └── index.css          # Tailwind v4 + @theme + .glass/.btn-primary/marquee
├── index.html
├── package.json
└── vite.config.ts         # alias @/@generated + tách chunk vendor
```

## Thêm mới để ở đâu

- Component dùng chung (nút, badge): `src/components/ui/`.
- Section trang chủ: thêm vào `src/components/home/Sections.tsx` nếu nhỏ, tách file riêng nếu trên ~150 dòng.
- Trang mới: thuộc domain nào thì vào `src/pages/<domain>/` (admin, shop, checkout, account); public chung thì để `src/pages/`. Thêm dòng `export const X = lazy(...)` vào `src/pages/index.ts`, route ráp ở `src/App.tsx`.
- Logic dùng chung: `src/hooks/`; module `src/lib/` — thuộc domain thì vào `src/lib/<domain>/`, dùng chung nhiều domain thì để root lib. Đặt cạnh file test `X.test.ts`.
- `src/lib/api/apiFetch.ts` là mutator mà `orval.config.ts` trỏ vào — không dời nếu không sửa kèm config + `pnpm codegen`.
- Type dùng chung (domain): `src/types/` — seller đặt trong `src/types/seller/`, domain khác là file `.ts` cùng cấp; `index.ts` re-export tất cả.
- Test cạnh file: `TenFile.test.tsx`.

Không tạo `src/views/`, `src/containers/` hay lồng `components/components/`.
