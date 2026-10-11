# Spec: Trang Product Detail (PDP) — nét

Ngày: 2026-10-10. Branch: `ui/net-glassy-purple`.

## 1. Mục tiêu + phạm vi

Hiểu chung đã chốt: PDP đầy đủ kiểu Tiki/Shopee cho shop nét (Vite + React 19 + Tailwind v4), giữ design-system hiện tại. Thành công khi mở `/product/:id` thấy gallery + info + tabs + related, mobile 1 cột, dark mode đủ, `pnpm format/lint/build` xanh.

Ngoài phạm vi: giỏ hàng thật, checkout, API/Supabase, CMS.

## 2. Kiến trúc + Route

- Route mới `/product/:id` trong `src/App.tsx`, lazy như Home/Login/Account, bọc trong `<Suspense fallback={<PageLoading />}>`, dùng chung Header/Footer.
- `src/pages/ProductDetail.tsx`: đọc `useParams`, tìm SP qua `getProductById`. Nếu không thấy thì early return trang NotFound + Link về `/`. Nếu thấy thì ráp Breadcrumb + Gallery + Info + Tabs + Related.
- `ProductGrid` trong `src/components/Sections.tsx`: bọc ảnh + tên bằng `<Link to={/product/${id}}>`.

## 3. Data (`src/data/products.ts`, mở rộng tương thích ngược)

Giữ mọi field cũ. Thêm:

```ts
interface ProductColor { name: string; hex: string }
interface Review { name: string; rating: number; text: string; date: string }
interface Product {
  ...cũ,
  sizes: string[]
  colors: ProductColor[]
  stock: number
  rating: number
  reviewsCount: number
  details: string[]
  gallery: string[]
  reviews: Review[]
}
```

- `gallery`: suy ra từ `img` + 2-3 biến thể `picsum seed net-p{id}-a/b/c`, giữ tỉ lệ 4/5.
- Helpers: `getProductById(id: string | number): Product | undefined`, `getRelated(p: Product, n=4): Product[]` (cùng category, trừ chính nó).
- Test cạnh file: `products.test.ts` cho 2 helpers.

## 4. Components (`src/components/pdp/`)

Tách theo lựa chọn user, mỗi file < 150 dòng:

- `ProductGallery.tsx`: ảnh chính `rounded-3xl aspect-[4/5]`, thumbs `rounded-2xl`, state ảnh active, badge tag gradient, nút tim `glass`. Props: `product`.
- `ProductInfo.tsx`: tên, sao + reviewsCount, giá `formatVnd` + `oldPrice` gạch, chọn màu/size (state trong PDP hoặc trong Info, callback ra ngoài), số lượng +/- kẹp theo `stock`, CTA Thêm giỏ (`.btn-primary rounded-full`) + Mua ngay (outline). Bấm CTA hiện toast tạm (state nội bộ, tự tắt 2.5s). Props: `product, color, setColor, size, setSize, qty, setQty, onAdd`.
- `ProductTabs.tsx`: 3 tab Mô tả / Thông số / Đánh giá, tab active state, list reviews mock + sao Phosphor `Star`.
- `RelatedProducts.tsx`: lưới 2/4 cột reuse style card `ProductGrid`, Link sang PDP khác.

## 5. Quy tắc bắt buộc (repo)

- Chỉ `pnpm`, cấm `npm`.
- Cấm ternary `? :`: dùng `if` + early return, trong JSX dùng `&&`.
- Icon duy nhất `@phosphor-icons/react`, motion từ `motion/react` cho reveal, tôn trọng `prefers-reduced-motion`.
- Ảnh `picsum.photos` + `loading="lazy"` + `width/height`.
- Màu/bo góc/glass theo `docs/design-system.md`: card `rounded-3xl`, nút `rounded-full`, gradient chỉ ở CTA/badge, dark mode đủ cặp (`text-zinc-600/dark:text-zinc-300`, `bg-white/80/dark:bg-white/5`, `dark:border-white/10`).
- Copy tiếng Việt, giá `formatVnd`. Mobile-first: grid collapse 1 cột dưới `md`.

## 6. Luồng lỗi + trạng thái

- `id` sai / parse lỗi → NotFound: "Không tìm thấy sản phẩm" + nút về Trang chủ / `#shop`.
- Hết hàng (`stock === 0`): disable CTA, hiện "Hết hàng" bằng `&&`.
- Toast thêm giỏ: fixed bottom, `glass rounded-full`, không dùng lib ngoài.

## 7. Nghiệm thu

- Mở `/product/2` đúng data, đổi màu/size/SL được, toast hiện, related click chuyển SP + scroll top.
- Mobile 390px 1 cột, desktop 2 cột gallery/info.
- `pnpm format`, `pnpm lint` 0 error, `pnpm build` xanh, `vitest` pass.

## Self-review

- Không còn TBD/TODO, không mâu thuẫn nội bộ, scope vừa 1 plan (5 files + data + route + test).
- Không phát sinh interface ngoài: PDP chỉ đọc mock, không đụng auth/cart.
