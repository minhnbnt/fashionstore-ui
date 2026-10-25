# Plan Sửa Lỗi Tuân Thủ Chuẩn Mã Nguồn (AGENTS.md & docs/*)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Khắc phục toàn bộ 7 vi phạm chuẩn mã nguồn nghiêm trọng (Ternary, Mock không đánh dấu, Unsplash demo, Thiếu onError, Zinc tối, Reduced motion, Formatter giá tự chế) và 2 điểm lưu ý nhẹ (as any trong test, vị trí thư mục test) trên branch `feature/seller-staff-2.8.1` theo đúng quy định tại `AGENTS.md`, `docs/code-guide.md`, `docs/design-system.md`, `docs/structure.md`, và `docs/pre-commit.md`.

**Architecture:**

- Xử lý triệt để ternary operators bằng `if` + early return hoặc `let + if` trong logic và `&&` trong JSX.
- Chuẩn hóa tài nguyên ảnh demo theo `picsum.photos`, bổ sung fallback `onError` về `PLACEHOLDER_IMAGE` trên toàn bộ thẻ `<img>`.
- Căn chỉnh dark mode surface theo quy chuẩn design system (#11182a panel, #0a0f1e dropdown/overlay, white/10 control/border), loại bỏ hoàn toàn các lớp xám zinc đục.
- Đảm bảo tuân thủ tính tiếp cận (a11y) với `prefers-reduced-motion` cho banner slider và thống nhất hàm định dạng tiền tệ `formatVnd`.
- Di chuyển file test về cạnh file thực thi theo `structure.md` và loại bỏ ép kiểu lỏng lẻo `as any`.

**Tech Stack:** React 19, TypeScript 5+, Tailwind CSS v4, Vitest, Oxlint, Oxfmt.

**Spec:** Review báo cáo lỗi tại commit `bd159bc` trên branch `feature/seller-staff-2.8.1`.

## Global Constraints

- Package manager: chỉ dùng `pnpm`, tuyệt đối không dùng `npm`.
- Cấm toàn bộ ternary operator (`? :`): dùng `if` + early `return`, trong JSX dùng `&&`.
- Ảnh demo bắt buộc dùng `picsum.photos` thay cho `images.unsplash.com`. Mọi ảnh lỗi phải có `onError` rớt về `PLACEHOLDER_IMAGE`.
- Mọi dữ liệu giả lập phải được đánh dấu rõ ràng với marker `// TODO(mock)`.
- Nền dark mode tuân thủ design system: panel `dark:bg-[#11182a]`, dropdown `dark:bg-[#0a0f1e]`, controls/borders `dark:bg-white/10` & `dark:border-white/10` / `dark:border-white/15`, cấm dùng `dark:bg-zinc-800` / `dark:border-zinc-700`.
- Chuyển động animation/slider tự động phải tôn trọng `prefers-reduced-motion`.
- Giá tiền tệ bắt buộc dùng `formatVnd` từ `@/lib/format`.
- Test phải đặt cùng thư mục cạnh file tương ứng (`TenFile.test.tsx`), không tạo `__tests__/`.

## Review Focus

1. Biến thể dữ liệu `draft` và `layout` trong `decorationBlocks`: xử lý an toàn khi chuỗi rỗng hoặc undefined mà không dùng ternary lồng nhau.
2. Thẻ `<img>` gặp lỗi mạng (404/kết nối hỏng): kích hoạt sự kiện `onError` và gán lại `src = PLACEHOLDER_IMAGE` mà không gây vòng lặp vô hạn (`currentTarget.onerror = null`).
3. Khả năng tương thích thiết bị khi người dùng bật `prefers-reduced-motion`: banner slider không được tự động nhảy slide sau 4.5s.
4. Trạng thái toggle nút theo dõi shop (`isFollowing`): hiển thị đúng giao diện icon Heart fill/regular và class CSS mà không còn toán tử ternary trong thuộc tính JSX.
5. Đường dẫn import trong các file test sau khi di chuyển ra khỏi `src/pages/__tests__/`: đảm bảo đường dẫn `@/...` và đường dẫn tương đối vẫn trỏ chính xác và toàn bộ 222+ tests pass.

---

### Task 1: Dọn dẹp toàn bộ Ternary Operators trong `src/lib/sellerAdapters.ts`

**Files:**

- Modify: `src/lib/sellerAdapters.ts`
- Test: `src/lib/sellerAdapters.test.ts`

**Interfaces:**

- Consumes: `DecorationResponse`, `SettlementResponse`, `ChatMessageResponse`, `ShopResponse` từ `@generated/model/*`.
- Produces: `decorationBlocks(decoration: DecorationResponse | undefined): DecorationBlock[]`, `settlementItem(...)`, `chatMessageItem(...)`, `shopProfile(...)`.

- [ ] **Step 1: Viết test bổ sung kiểm tra các nhánh logic không dùng ternary trong `sellerAdapters.test.ts`**

Kiểm tra `decorationBlocks` khi draft rỗng nhưng layout có giá trị, khi banner thiếu id/title/linkUrl, và `shopProfile` khi taxCode rỗng thì lấy idNumber.

```typescript
it('decorationBlocks uu tien draft neu co, roi moi den layout ma khong dung ternary', () => {
  const dec = {
    draft: '',
    layout: '[{"id":"b1","type":"BANNER_SLIDER","title":"Slide","enabled":true}]',
  }
  const blocks = decorationBlocks(dec as any)
  expect(blocks).toHaveLength(1)
  expect(blocks[0].id).toBe('b1')
})
```

- [ ] **Step 2: Chạy test để xác nhận test chạy được**

Run: `pnpm test src/lib/sellerAdapters.test.ts`
Expected: PASS

- [ ] **Step 3: Refactor toàn bộ ternary trong `src/lib/sellerAdapters.ts` sang `if/else` và early return**

- Thay thế `decoration?.draft !== null ... ? decoration.draft : decoration?.layout` bằng:

```typescript
let jsonStr = decoration?.layout
if (decoration?.draft !== null && decoration?.draft !== undefined && decoration?.draft !== '') {
  jsonStr = decoration.draft
}
```

- Thay thế các ternary trong mapper banners và blocks (`id`, `imageKey`, `title`, `linkUrl`).
- Thay thế `settlement.status === 'RELEASED' ? 'RELEASED' : 'HOLDING'` bằng `let status: SettlementItem['status'] = 'HOLDING'; if (settlement.status === 'RELEASED') { status = 'RELEASED' }`.
- Thay thế `message.senderType === 'BUYER' ? 'BUYER' : 'SELLER'`.
- Thay thế `safeText(shop.taxCode) === '' ? safeText(shop.idNumber) : safeText(shop.taxCode)`.
- Thay thế bất kỳ `order === undefined ? '' : safeText(order.code)`.

- [ ] **Step 4: Chạy test kiểm tra lại**

Run: `pnpm test src/lib/sellerAdapters.test.ts`
Expected: PASS

- [ ] **Step 5: Kiểm tra format và lint**

Run: `pnpm format:check && pnpm lint`
Expected: 0 error, 0 warning

---

### Task 2: Dọn dẹp Ternary Operators trong các Storefront & Profile UI Components

**Files:**

- Modify: `src/components/shop-storefront/ShopStorefrontHeader.tsx`
- Modify: `src/components/seller-dashboard-tab/SellerProfileTab.tsx`
- Modify: `src/components/shop-storefront/ShopDecorationRenderer.tsx`
- Modify: `src/components/seller-dashboard-tab/SellerDecorationTab.tsx`
- Modify: `src/components/seller-dashboard-tab/decoration/BannerSliderConfigModal.tsx`
- Modify: `src/components/shop-storefront/ShopAboutTab.tsx`
- Test: `src/components/seller-dashboard-tab/SellerProfileTab.test.tsx`, `src/components/seller-dashboard-tab/SellerDecorationTab.test.tsx`

- [ ] **Step 1: Refactor ternary trong `ShopStorefrontHeader.tsx`**

- `logoSrc`: khai báo `let logoSrc = PLACEHOLDER_IMAGE; if (shop.logoKey !== null && shop.logoKey !== undefined && shop.logoKey !== '') { logoSrc = imageUrl(shop.logoKey) }`.
- `bannerSrc`: khai báo `let bannerSrc = 'https://picsum.photos/seed/netbanner/1600/500'; if (shop.bannerKey !== null && shop.bannerKey !== undefined && shop.bannerKey !== '') { bannerSrc = imageUrl(shop.bannerKey) }`.
- `ratingDisplay`: khai báo `let ratingDisplay = '5.0'; if (shop.rating !== null && shop.rating !== undefined) { ratingDisplay = shop.rating.toFixed(1) }`.
- Nút Follow: tách biến `let heartWeight: 'fill' | 'regular' = 'regular'; let heartClass = ''; if (isFollowing) { heartWeight = 'fill'; heartClass = 'text-rose-500' }`.

- [ ] **Step 2: Refactor ternary trong `SellerProfileTab.tsx`**

- Trong `handleSaveProfile`: gán `logoKey`, `bannerKey`, `returnPolicy` bằng `let ... = null; if (...) { ... }`.
- Trong textarea `returnPolicyField`: dùng `let returnPolicyValue = ''; if (formData.returnPolicy !== undefined && formData.returnPolicy !== null) { returnPolicyValue = formData.returnPolicy }`.

- [ ] **Step 3: Refactor ternary trong `ShopDecorationRenderer.tsx`**

- Trong `BannerSliderBlock`:

```typescript
let imageSrc = PLACEHOLDER_IMAGE
if (activeBanner.imageKey !== '') {
  if (activeBanner.imageKey.startsWith('http')) {
    imageSrc = activeBanner.imageKey
  } else {
    imageSrc = imageUrl(activeBanner.imageKey)
  }
}
```

- Nút chuyển slide:

```typescript
setCurrentIdx((prev) => {
  if (prev === 0) {
    return banners.length - 1
  }
  return prev - 1
})
```

- Dot pagination class:

```typescript
let dotClass = 'w-2 bg-white/50 hover:bg-white/80'
if (idx === currentIdx) {
  dotClass = 'w-6 bg-white shadow'
}
```

- [ ] **Step 4: Refactor ternary trong `SellerDecorationTab.tsx`, `BannerSliderConfigModal.tsx`, `ShopAboutTab.tsx`**

- Trong `SellerDecorationTab.tsx`:
  - `handleSaveConfig`: dùng `blocks.map((b) => { if (b.id === updated.id) return updated; return b })`.
  - `slideCount`: `let slideCount = 0; if (b.banners !== undefined) { slideCount = b.banners.length }`.
  - Preview dot: `let dotClass = 'w-1.5 bg-white/40'; if (dotIdx === 0) { dotClass = 'w-3.5 bg-white' }`.
- Trong `BannerSliderConfigModal.tsx`:
  - `handleUpdateSlide`: dùng `if (b.id === id) return { ...b, ...patch }; return b`.
  - `targetIndex`: `let targetIndex = index + 1; if (direction === 'UP') { targetIndex = index - 1 }`.
- Trong `ShopAboutTab.tsx`:
  - `returnPolicyText`: dùng `let` khởi tạo mặc định, `if (shop.returnPolicy && shop.returnPolicy.trim() !== '') returnPolicyText = shop.returnPolicy`.

- [ ] **Step 5: Chạy test và lint kiểm tra**

Run: `pnpm test && pnpm lint`
Expected: PASS, 0 error, 0 warning

---

### Task 3: Chuẩn hóa Demo Images (`picsum.photos`) và Đánh dấu Mock Data

**Files:**

- Modify: `src/components/shop-storefront/ShopProductsTab.tsx`
- Modify: `src/components/shop-storefront/ShopStorefrontHeader.tsx`
- Modify: `src/components/shop-storefront/ShopDecorationRenderer.tsx`
- Modify: `src/components/seller-dashboard-tab/SellerDecorationTab.tsx`

**Interfaces:**

- Consumes: Ảnh demo theo định dạng `https://picsum.photos/seed/<name>/<w>/<h>`.
- Produces: Component hiển thị ảnh đúng chuẩn `docs/code-guide.md`.

- [ ] **Step 1: Cập nhật `ShopProductsTab.tsx`**

- Sửa prop `shopId: _shopId` thành `shopId: string` (giữ tên `shopId`, thêm comment định hướng API tương lai).
- Thêm chú thích `// TODO(mock): Danh mục sản phẩm mẫu hiển thị trên storefront khi chưa có API catalog public theo shopId`.
- Thay thế toàn bộ 6 URL `images.unsplash.com` thành URL `https://picsum.photos/seed/netprod.../500/500`.

- [ ] **Step 2: Cập nhật fallback banner trong `ShopStorefrontHeader.tsx`**

- Thay thế URL `https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&q=80` thành `https://picsum.photos/seed/netshopbanner/1600/500`.

- [ ] **Step 3: Cập nhật ảnh demo trong `ShopDecorationRenderer.tsx` và `SellerDecorationTab.tsx`**

- Thay thế toàn bộ ảnh mẫu `images.unsplash.com` trong `sampleProducts`, `FlashSaleBlock` của `ShopDecorationRenderer.tsx` thành `https://picsum.photos/seed/...`.
- Thêm `// TODO(mock): Dữ liệu sản phẩm mẫu cho các khối trang trí preview`.
- Trong `SellerDecorationTab.tsx:541`: thay thế banner preview URL từ unsplash sang picsum.

- [ ] **Step 4: Chạy kiểm tra lint và format**

Run: `pnpm format:check && pnpm lint`
Expected: 0 error, 0 warning

---

### Task 4: Bổ sung `onError` Fallback cho tất cả thẻ `<img>`

**Files:**

- Modify: `src/components/shop-storefront/ShopStorefrontHeader.tsx`
- Modify: `src/components/shop-storefront/ShopProductsTab.tsx`
- Modify: `src/components/shop-storefront/ShopDecorationRenderer.tsx`
- Modify: `src/components/seller-dashboard-tab/SellerDecorationTab.tsx`

**Interfaces:**

- Consumes: `PLACEHOLDER_IMAGE` từ `@/lib/apiAdapters`.
- Produces: Thẻ `<img>` luôn hiển thị placeholder khi ảnh bị lỗi mạng/gãy link.

- [ ] **Step 1: Khai báo hàm xử lý lỗi ảnh chuẩn `onImageError`**

Thêm hàm chuẩn trong từng file (hoặc import helper nếu cần):

```typescript
function handleImageError(e: React.SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.onerror = null
  e.currentTarget.src = PLACEHOLDER_IMAGE
}
```

- [ ] **Step 2: Thêm `onError={handleImageError}` vào `ShopStorefrontHeader.tsx`**

- Banner image: `<img src={bannerSrc} alt={shop.name} onError={handleImageError} ... />`
- Logo avatar: `<img src={logoSrc} alt={shop.name} onError={handleImageError} ... />`

- [ ] **Step 3: Thêm `onError={handleImageError}` vào `ShopProductsTab.tsx`**

- Product card image: `<img src={p.image} alt={p.name} onError={handleImageError} ... />`

- [ ] **Step 4: Thêm `onError={handleImageError}` vào `ShopDecorationRenderer.tsx` và `SellerDecorationTab.tsx`**

- `BannerSliderBlock` banner images (cả 2 thẻ img có link và không link).
- `ProductCollectionBlock` product images.
- `FlashSaleBlock` product images.
- `SellerDecorationTab.tsx` preview banner image.

- [ ] **Step 5: Kiểm tra test suite**

Run: `pnpm test`
Expected: PASS

---

### Task 5: Sửa lỗi màu Zinc đục trên nền tối (Dark Mode Design System Compliance)

**Files:**

- Modify: `src/components/account/MyShopsTab.tsx`
- Modify: `src/components/shop-storefront/ShopStorefrontHeader.tsx`
- Modify: `src/components/ui/charts/BarChart.tsx`
- Modify: `src/components/ui/charts/LineChart.tsx`
- Modify: `src/lib/sellerPermissions.ts`
- Modify: `src/components/seller/ShopSwitcher.tsx`
- Modify: `src/components/NotificationBell.tsx`
- Test: `src/components/account/MyShopsTab.test.tsx`, `src/lib/sellerPermissions.test.ts`

**Interfaces:**

- Consumes: Token màu dark mode từ `docs/design-system.md` (`dark:bg-[#11182a]`, `dark:bg-[#0a0f1e]`, `dark:bg-white/10`, `dark:border-white/10`, `dark:border-white/15`).
- Produces: Giao diện dark mode đồng nhất tông navy đậm, loại bỏ hoàn toàn viền xám đục.

- [ ] **Step 1: Cập nhật `MyShopsTab.tsx`**

- Sửa empty state: `dark:border-zinc-800` -> `dark:border-white/10`.
- Sửa shop card: `dark:bg-zinc-900/60` -> `dark:bg-white/5`.
- Sửa divider: `dark:border-zinc-800` -> `dark:border-white/10`.

- [ ] **Step 2: Cập nhật `ShopStorefrontHeader.tsx`**

- Sửa logo avatar wrapper: `dark:border-[#11182a] dark:bg-zinc-800` -> `dark:border-[#11182a] dark:bg-white/10`.

- [ ] **Step 3: Cập nhật tooltips trong `BarChart.tsx` và `LineChart.tsx`**

- Trong `BarChart.tsx:143`: sửa tooltip `dark:bg-zinc-800` -> `dark:bg-[#0a0f1e] dark:border dark:border-white/15`.
- Trong `LineChart.tsx:304`: sửa tooltip `dark:border-white/10 dark:bg-zinc-800/95` -> `dark:border-white/15 dark:bg-[#0a0f1e]/95`.

- [ ] **Step 4: Cập nhật `sellerPermissions.ts`**

- Trong `getAuditActionBadgeMeta`: sửa variant `neutral` từ `dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700` thành `dark:bg-white/10 dark:text-zinc-300 dark:border-white/15`.

- [ ] **Step 5: Cập nhật dropdowns trong `ShopSwitcher.tsx` và `NotificationBell.tsx`**

- Trong `ShopSwitcher.tsx:133`: sửa dropdown container từ `dark:bg-zinc-900/95` thành `dark:border-white/15 dark:bg-[#0a0f1e]`.
- Trong `NotificationBell.tsx:148`: sửa dropdown container từ `dark:bg-zinc-900` thành `dark:border-white/15 dark:bg-[#0a0f1e]`.

- [ ] **Step 6: Kiểm tra test và lint**

Run: `pnpm test && pnpm lint`
Expected: PASS

---

### Task 6: Tôn trọng `prefers-reduced-motion` và Dùng `formatVnd` cho Biểu đồ

**Files:**

- Modify: `src/components/shop-storefront/ShopDecorationRenderer.tsx`
- Modify: `src/components/ui/charts/LineChart.tsx`
- Modify: `src/components/ui/charts/BarChart.tsx`
- Modify: `src/components/ui/charts/DonutChart.tsx`
- Modify: `src/components/ui/charts/CircularProgress.tsx`
- Test: `src/components/ui/charts/LineChart.test.tsx`

**Interfaces:**

- Consumes: `formatVnd` từ `@/lib/format`.
- Produces: Auto-slider dừng khi bật reduced-motion, định dạng tiền tệ nhất quán.

- [ ] **Step 1: Bổ sung kiểm tra `prefers-reduced-motion` trong `BannerSliderBlock` (`ShopDecorationRenderer.tsx`)**

```typescript
useEffect(() => {
  if (banners.length <= 1) return
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  if (mediaQuery.matches) return

  const timer = setInterval(() => {
    setCurrentIdx((prev) => {
      if (prev + 1 >= banners.length) return 0
      return prev + 1
    })
  }, 4500)
  return () => clearInterval(timer)
}, [banners.length])
```

- [ ] **Step 2: Cập nhật `LineChart.tsx` dùng `formatVnd`**

- Import `formatVnd` từ `@/lib/format`.
- Trong `displayValue`:

```typescript
function displayValue(val: number): string {
  if (formatValue !== undefined) {
    return formatValue(val)
  }
  return formatVnd(val)
}
```

- [ ] **Step 3: Đồng bộ format tiền tệ trong `BarChart.tsx`, `DonutChart.tsx`**

- Đảm bảo các biểu đồ dùng chung logic hiển thị giá trị, ưu tiên `formatValue` nếu truyền vào, hoặc `formatVnd` đối với số tiền.

- [ ] **Step 4: Chạy test cho biểu đồ**

Run: `pnpm test src/components/ui/charts/LineChart.test.tsx`
Expected: PASS

---

### Task 7: Khắc phục điểm nhẹ — Xóa `as any` và Di chuyển Test cạnh file (File Colocation)

**Files:**

- Modify: `src/components/account/MyShopsTab.test.tsx`
- Move: `src/pages/__tests__/ShopDashboardNavigation.test.tsx` -> `src/pages/ShopDashboardNavigation.test.tsx`
- Move: `src/pages/__tests__/ShopStorefront.test.tsx` -> `src/pages/ShopStorefront.test.tsx`
- Delete: `src/pages/__tests__/`

**Interfaces:**

- Consumes: Tuân thủ quy tắc file colocation từ `docs/structure.md`: "Test cạnh file: TenFile.test.tsx".

- [ ] **Step 1: Loại bỏ `as any` trong `MyShopsTab.test.tsx`**

- Thay `} as any)` tại line 55 và line 80 thành `} as unknown as ReturnType<typeof useGetMyShops>)`.

- [ ] **Step 2: Di chuyển file test từ `src/pages/__tests__/` về `src/pages/`**

- Chuyển `src/pages/__tests__/ShopDashboardNavigation.test.tsx` sang `src/pages/ShopDashboardNavigation.test.tsx`.
- Chuyển `src/pages/__tests__/ShopStorefront.test.tsx` sang `src/pages/ShopStorefront.test.tsx`.
- Cập nhật import tương đối nếu cần (ví dụ `import ShopStorefront from './ShopStorefront'`).
- Xóa thư mục rỗng `src/pages/__tests__/`.

- [ ] **Step 3: Chạy toàn bộ test suites**

Run: `pnpm test`
Expected: 27/27 test files passed, 222/222 tests passed

- [ ] **Step 4: Kiểm tra lint và format**

Run: `pnpm format:check && pnpm lint`
Expected: 0 error, 0 warning

---

### Task 8: Kiểm thử toàn diện và Xác minh tất cả các Gates Pre-commit

**Files:** Toàn bộ repo `fashionstore-ui`.

- [ ] **Step 1: Chạy `pnpm format:check`**

Run: `pnpm format:check`
Expected: Tất cả file đều match format chuẩn.

- [ ] **Step 2: Chạy `pnpm lint`**

Run: `pnpm lint`
Expected: 0 error, 0 warning.

- [ ] **Step 3: Chạy `pnpm test`**

Run: `pnpm test`
Expected: 222/222 tests passed.

- [ ] **Step 4: Chạy `pnpm build`**

Run: `pnpm build`
Expected: Codegen + tsc -b + vite build thành công.

- [ ] **Step 5: Quét lại toàn bộ codebase kiểm tra vi phạm ternary hoặc unsplash**

Chạy script kiểm tra để đảm bảo 0 ternary trong code mới và 0 link unsplash còn sót lại.
