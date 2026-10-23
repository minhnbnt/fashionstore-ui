# UI-FEATURES.md — Danh sách tính năng UI "nét" (bản code lại từ đầu)

> Nguồn chân lý API: `docs/openapi.json` (backend sinh ra). Mọi tính năng dưới đây đều có endpoint thật.
> Nếu một ý tưởng UI cần API mà spec không có → **không làm**, hoặc thêm backend trước rồi hẹn UI sau.

## Nguyên tắc bất di bất dịch

1. **Chỉ tính năng có endpoint thật.** Không bịa: voucher, freeship, "đã bán X", sao trên product card, rating shop, thông báo, ví tiền…
2. **Không nhái Shopee**: không màu `#ee4d2d`, không copy "Yêu Thích / MALL / Giảm Giá" badge, không topbar Shopee.
3. Data chỉ đến từ API — client không chế số liệu. % giảm giá được phép tính client-side từ `price` vs `compareAtPrice` (field thật của variant).
4. Quy ước repo: chỉ `pnpm`, cấm ternary (`? :`) — dùng `if` + early return, exception/message tiếng Anh, cấm commit `dist/`/`.env`.
5. Pipeline: `pnpm format` (oxfmt) → `pnpm lint` (oxlint, 0 error) → `pnpm build` (orval && tsc -b && vite build).

## Nền tảng kỹ thuật (tái sử dụng được từ base `16c64bc`)

- Hooks API sinh tự động bằng **orval** từ `docs/openapi.json` → `src/generated/endpoints/<tag>/` (gitignored, sinh lại lúc build). Không gọi `fetch` tay.
- **Auth là service riêng GoTrue** qua `VITE_GOTRUE_URL`: login, register (`POST /api/users`), reset password, callback, đổi mật khẩu. Không nằm trong openapi — không phải lỗi.
- Hook sẵn dùng: `useCart`, `useWishlist` (`src/hooks/`).
- Helper sẵn dùng (`src/lib/`): `formatVnd`, `formatDateTime`, `formatFullAddress`, `calculateDiscountPercent`, `takeData`, `imageUrl`, `priceInfo`, `hookErrorMessage`.
- Ảnh: DB chỉ lưu **S3 key**, hiển thị qua `imageUrl(key)`; upload qua `POST /api/uploads/presign`.

## Design language "nét" (tham khảo base `16c64bc`)

- Class `.glass` (card nền mờ), bo tròn: card `rounded-3xl`, nút/pill `rounded-full`, nút chính `.btn-primary`.
- Màu: brand `--color-grape-500 #312e81` (indigo-900), `--color-skytint-500 #38bdf8`; accent sáng `indigo-900`, accent tối `sky-300…400`. Hỗ trợ **dark mode** song song với light.
- Icon: `@phosphor-icons/react`. Font: sans mặc định.

---

## A. Storefront người mua

### A1. Header / App shell

- [ ] Logo "nét" + chấm gradient indigo→sky; search box dẫn tới `/search`
- [ ] Icon giỏ hàng với **số lượng thật** — `GET /api/cart`
- [ ] Icon yêu thích → trang wishlist — `GET /api/wishlist`
- [ ] Menu tài khoản: hồ sơ, đơn mua, kênh người bán, đăng xuất (session GoTrue; ẩn khi chưa login)
- [ ] Toggle dark mode
- [ ] Footer tĩnh (không claim gì hết)

### A2. Trang chủ `/`

- [ ] Hero intro sàn (text thuần, **không** số liệu bịa kiểu "12k+ khách / 4.9★")
- [ ] Danh mục ngành hàng — `GET /api/categories`
- [ ] Lưới sản phẩm mới/nổi bật — `GET /api/search/products` (`sort=NEWEST`, `limit`)
- [ ] ProductCard chỉ hiển thị field thật: ảnh (`defaultImageKey`), tên, `minPrice`. Không sao, không "đã bán"
- [ ] _(Tuỳ chọn)_ Section "Đang giảm giá": chỉ khi lấy giá chi tiết `productResponse` để so `compareAtPrice` — không bịa %

### A3. Tìm kiếm `/search`

- [ ] Từ khoá `q` + kết quả đếm được — `GET /api/search/products`
- [ ] Bộ lọc: danh mục, khoảng giá, size, màu — `GET /api/search/facets`
- [ ] **Sort tabs** (thay dropdown): Phổ biến nhất (`RELEVANCE` — chỉ hiện khi có `q`) / Mới nhất / Giá: Thấp→Cao / Giá: Cao→Thấp — enum `SearchSort` từ spec
- [ ] Phân trang (`page`, `limit`)
- [ ] State rỗng: "Không tìm thấy sản phẩm phù hợp"

### A4. Chi tiết sản phẩm `/product/:id`

- [ ] Gallery ảnh — `GET /api/products/{id}` (`images` là S3 key)
- [ ] Chọn biến thể màu/cỡ, chặn lựa chọn hết hàng — `variants[]` (có `stockQuantity`)
- [ ] **Khung giá glass**: giá + giá gốc gạch + badge `-%` (tính từ `compareAtPrice`, ẩn khi ≤ giá bán)
- [ ] Đánh giá thật: điểm `averageRating` + `reviewCount` (có trong `productResponse` — chỉ ở đây, không nhét lên card)
- [ ] Số lượng + tồn kho, "Thêm giỏ" — `POST /api/cart/items` (variantId), sửa `PUT /api/cart/items/{variantId}`, xoá `DELETE`
- [ ] "Mua ngay" → đẩy vào cart rồi sang checkout
- [ ] Yêu thích — `POST /api/wishlist/items`, bỏ — `DELETE /api/wishlist/items/{productId}`
- [ ] Review: xem `GET /api/products/{productId}/reviews`; tạo/sửa/xoá review của mình `POST/PUT/DELETE`
- [ ] Sản phẩm liên quan (cùng danh mục) — `GET /api/search/products`
- [ ] Card thông tin shop thật — `GET /api/shops/{slug}` + nút **Theo dõi shop** — `POST/DELETE /api/shops/{id}/follow` + nút **Chat với người bán**
- [ ] Tab mô tả / thông tin / đánh giá (một trang, không tab rời)

### A5. Giỏ hàng & thanh toán

- [ ] Trang giỏ: danh sách, đổi số lượng, xoá — `GET /api/cart`, `PUT/DELETE /api/cart/items/{variantId}`
- [ ] Tổng tiền thật từ API (không tự chế phí)
- [ ] Checkout: chọn địa chỉ — `GET /api/users/me/addresses`; đặt đơn — `POST /api/cart/checkout`; kết quả trả về có `shippingFee`/`total` — hiển thị đúng response, không tự tính thêm
- [ ] Chưa có địa chỉ → điều hướng sang tab Địa chỉ

### A6. Đơn mua (trong Account)

- [ ] Danh sách đơn + **tab lọc trạng thái**: Tất cả / Chờ xác nhận (`PENDING`) / Đang giao (`SHIPPED`) / Hoàn thành (`DELIVERED`) / Đã hủy (`CANCELLED`) — `GET /api/orders/mine` (lọc client-side)
- [ ] Tìm theo mã đơn (`code`) — client-side
- [ ] Hủy đơn (`PENDING`) — `PATCH /api/orders/{id}/cancel`
- [ ] Đã nhận hàng (`SHIPPED`) — `PATCH /api/orders/{id}/received`
- [ ] Chi tiết đơn — `GET /api/orders/{id}`
- [ ] Yêu cầu trả hàng — `POST /api/orders/{id}/returns`; xem các yêu cầu của mình — `GET /api/orders/returns/mine`

### A7. Account `/account` (sidebar + tabs, sync `?tab=` và hash)

- [ ] Tab **Đơn mua** — xem A6
- [ ] Tab **Địa chỉ**: CRUD — `GET/POST /api/users/me/addresses`, `PUT/DELETE /api/users/me/addresses/{id}`; đặt mặc định — `PUT …/{id}/default`; field thật: `houseNumber, street, ward, district, city, defaultAddress`
- [ ] Tab **Yêu thích**: lưới sản phẩm — `GET /api/wishlist`, bỏ thích — `DELETE /api/wishlist/items/{productId}`
- [ ] Tab **Hồ sơ**: thông tin — `GET /api/users/me`; đổi mật khẩu (GoTrue); đăng xuất
- [ ] Tab **Kênh người bán**: đăng ký mở shop eKYC — `POST /api/shops`; upload CCCD qua presign — `POST /api/uploads/presign`; xem trạng thái — `GET /api/shops/mine` (`PENDING/APPROVED/REJECTED`); gửi lại — `POST /api/shops/{id}/resubmit`; vào Seller Center
- [ ] Counters sidebar = số thật (số đơn, số địa chỉ, số wishlist) từ chính các endpoint trên
- [ ] Cảnh báo tài khoản `LOCKED` + lý do

### A8. Chat nổi (floating widget)

- [ ] Bubble toàn trang, **ẩn khi chưa login**, không hiện ở Seller Center `/shop*`
- [ ] Danh sách hội thoại — `GET /api/conversations/mine` (refetch 15s, mở thì 5s)
- [ ] Tạo hội thoại từ PDP — `POST /api/conversations` (body `{ shopId }`)
- [ ] Thread + gửi — `GET/POST /api/conversations/{id}/messages` (body `{ content, imageKey? }`)
- [ ] Đánh dấu đã đọc — `PATCH /api/conversations/{id}/read`; badge `unreadCount` thật
- [ ] Hiển thị tên shop theo `shopId` — **chưa có shopName trong response, không bịa** (hiển thị ID/placeholder trung tính cho đến khi backend bổ sung)

---

## B. Seller Center `/shop` (kênh người bán)

> Toàn bộ có backend thật; dựng layout riêng (topbar + sidebar), **không** dùng branding Shopee — dùng "Kênh Người Bán nét".

- [ ] **Tổng quan**: doanh thu — `GET /api/seller/revenue/summary`, `…/by-day`, `…/top-products`; nhật ký — `GET /api/seller/shops/{shopId}/audit`
- [ ] **Sản phẩm & tồn kho**: danh sách — `GET /api/seller/shops/{shopId}/products`; thêm/sửa/xoá — `POST /api/shops/{shopId}/products`, `PUT/DELETE /api/shops/{shopId}/products/{id}`; ảnh sản phẩm — `POST …/products/{id}/images`, `DELETE …/images/{imageId}`; nhập hàng loạt — `POST …/products/bulk-import`; xuất — `GET …/products/export`; chỉnh tồn — `PATCH …/variants/{variantId}/stock`; lịch sử kho — `GET …/variants/{variantId}/movements`
- [ ] **Đơn hàng**: danh sách — `GET /api/seller/orders`; xác nhận/hủy/giao/xác nhận đã giao — `PATCH /api/seller/orders/{id}/confirm|cancel|ship|deliver`
- [ ] **Trả hàng**: danh sách — `GET /api/seller/returns`, chi tiết — `GET /api/seller/returns/{id}`; duyệt/từ chối/hoàn tất — `PATCH …/approve|reject|complete`
- [ ] **Doanh thu & đối soát**: summary/by-day/top-products; kỳ đối soát — `GET /api/seller/settlements`; rút tiền — `GET/POST /api/seller/withdrawals`
- [ ] **Đánh giá**: danh sách — `GET /api/seller/reviews`; trả lời — `PATCH /api/seller/reviews/{id}/reply`; báo cáo — `POST /api/seller/reviews/{id}/report`
- [ ] **Chat khách**: hội thoại phía bán — `GET /api/seller/conversations` + các endpoint chat như A8
- [ ] **Trang trí gian hàng**: xem — `GET /api/seller/shops/{shopId}/decoration`; lưu nháp — `PUT/DELETE …/decoration/draft`; xuất bản — `POST …/decoration/publish`; trang bán hiển thị — `GET /api/shops/{shopId}/decoration`
- [ ] **Nhân sự & phân quyền**: thành viên — `GET …/members`, đổi quyền — `PATCH …/members/{memberId}/role`, xoá — `DELETE …/members/{memberId}`; vai trò — `GET/POST …/roles`, `PUT/DELETE …/roles/{roleId}`; mời — `POST …/invitations` (người được mời nhận — `POST /api/invitations/{token}/accept`)
- [ ] **Hồ sơ shop & KYC**: sửa hồ sơ — `PATCH /api/shops/{id}/profile`, `PUT /api/shops/{id}`; trạng thái KYC — `GET /api/shops/mine`

## C. Quản trị `/admin`

- [ ] Thống kê — `GET /api/admin/stats`
- [ ] Shops: danh sách/chi tiết — `GET /api/admin/shops`, `GET /api/admin/shops/{id}`; duyệt/từ chối/tạm ngừng/khôi phục — `PATCH …/approve|reject|suspend|reinstate`
- [ ] Users: danh sách/chi tiết — `GET /api/admin/users`, `GET /api/admin/users/{id}`; khoá/mở — `PATCH …/lock|unlock`
- [ ] Sản phẩm: danh sách/chi tiết — `GET /api/admin/products`, `GET /api/admin/products/{id}`; cấm/khôi phục — `PATCH …/ban|restore`

---

## ❌ DANH SÁCH CẤM (không có backend — tuyệt đối không làm)

| Ý tưởng                                        | Lý do cấm                                                                                 |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Voucher / mã giảm giá / "Freeship đơn từ 500K" | Không có endpoint voucher/phí vận chuyển                                                  |
| Sao + "đã bán X" trên product card             | `productSummaryResponse` chỉ có `id, shopId, name, slug, minPrice, defaultImageKey, rank` |
| Rating shop ("4.9⭐", "Chính hãng Mall")       | Không có API rating shop                                                                  |
| Chuông thông báo                               | Không có endpoint notification                                                            |
| Tính phí ship / ví tiền nội bộ                 | Không có endpoint; chỉ hiển thị `shippingFee`/`paymentStatus` do backend trả trong đơn    |
| So sánh giá theo lịch sử giá                   | Không có endpoint                                                                         |
| Bất kỳ text/branding "Shopee"                  | Sàn tên **nét**                                                                           |

## Ghi chú cuối

- Nhánh đối chiếu code cũ (nếu cần xem cách bấm API): `master-shopee` @ `b7d666c` — **chỉ xem logic gọi hook**, không copy UI.
- Doc audit gốc: `SHOPEE-CLEANUP.md` (Tier 2 = phần "chất Shopee cao nhưng API thật" — đã liệt kê lại toàn bộ ở trên).
- Plan implement chi tiết từng task (nếu muốn tham khảo): `docs/superpowers/plans/2026-10-22-tier2-real-features-net.md`.
