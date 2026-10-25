# Kế Hoạch Khắc Phục Toàn Diện Các Điểm Vi Phạm Chuẩn Mã Nguồn

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chuẩn hóa toàn bộ các điểm vi phạm Design System (dark mode zinc đục, bo góc), bổ sung `onError` fallback cho tất cả thẻ `<img>` còn lại, và xác minh 100% pre-commit gates theo `AGENTS.md`.

**Architecture:**

- Thay thế triệt để các token tối xám đục `dark:bg-zinc-*` và `dark:border-zinc-*` sang chuẩn Design System phân tầng (`dark:bg-[#11182a]` cho modal/panel, `dark:bg-[#0a0f1e]` cho popover/dropdown, `dark:bg-white/10` / `dark:border-white/15` cho controls/inputs).
- Bổ sung `handleImageError` với `PLACEHOLDER_IMAGE` cho toàn bộ thẻ `<img>` trong các component Admin, Landing, Seller.
- Chuẩn hóa bo góc theo shape lock (`rounded-full` cho badge/chip).
- Tuân thủ nghiêm ngặt quy tắc cấm ternary (`? :`), early return, và multitasking khi chạy test.

**Tech Stack:** React 19, Tailwind CSS v4, TypeScript, Vitest, oxlint, oxfmt.

**Spec:** `AGENTS.md`, `docs/code-guide.md`, `docs/design-system.md`, `docs/structure.md`, `docs/pre-commit.md`.

## Global Constraints

- Package manager: chỉ `pnpm`, cấm `npm`.
- Tuyệt đối KHÔNG sử dụng Ternary Operator (`? :`); dùng `if` + early `return`, JSX dùng `&&`.
- Màu nền tối: modal/panel dùng `dark:bg-[#11182a]`, dropdown dùng `dark:bg-[#0a0f1e]`, control/input dùng `dark:bg-white/10 dark:border-white/15`. Cấm `dark:bg-zinc-800`/`dark:border-zinc-700` làm control.
- Form controls: Viền sáng `border-zinc-300`, nền tối `dark:border-white/15 dark:bg-white/10 dark:text-white`.
- Mọi thẻ `<img>` đều phải có `onError` fallback về placeholder ảnh chuẩn.
- Bo góc: badge/pill bắt buộc `rounded-full`.
- Luôn chạy multitask: trong thời gian chạy test background của 1 task -> implement tiếp task khác.

---

### Task 1: Chuẩn hóa Dark Mode Surface & Controls trong `SellerEditProductTab.tsx`

**Files:**

- Modify: `src/components/seller-dashboard-tab/SellerEditProductTab.tsx`

**Interfaces:**

- Consumes: Design system dark tokens (`dark:bg-[#11182a]`, `dark:border-white/10`, `dark:border-white/15`, `dark:bg-white/10`).
- Produces: Giao diện chỉnh sửa sản phẩm đồng nhất với `SellerAddProductTab.tsx`, không còn màu zinc xám đục.

- [ ] **Step 1: Thay thế các container và section header**
  - Đổi `dark:border-zinc-800 dark:bg-zinc-900` -> `dark:border-white/10 dark:bg-[#11182a]`.
  - Đổi `dark:border-zinc-800` trên các đường kẻ divider -> `dark:border-white/10`.

- [ ] **Step 2: Thay thế toàn bộ input, textarea và select controls**
  - Đổi `border-zinc-200 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white` -> `border-zinc-300 dark:border-white/15 dark:bg-white/10 dark:text-white`.
  - Đổi các input variant bulk (dòng 904, 937, 961, 981) từ `dark:border-zinc-700 dark:bg-zinc-900` -> `dark:border-white/15 dark:bg-white/10`.

- [ ] **Step 3: Thay thế badge và buttons**
  - Đổi neutral status badge (dòng 83) -> `dark:bg-white/10 dark:text-zinc-300 dark:border-white/15`.
  - Đổi slug badge (dòng 653) -> `dark:border-white/15 dark:bg-white/10 dark:text-zinc-300`.
  - Đổi buttons hành động (dòng 635, 679, 690, 1331) -> `dark:border-white/15 dark:bg-white/10 dark:hover:bg-white/15`.
  - Đổi sticky bottom bar (dòng 1327) -> `dark:border-white/10 dark:bg-[#11182a]/95`.

- [ ] **Step 4: Chạy kiểm tra lint & build**
  - Run: `pnpm oxlint -D no-ternary src/components/seller-dashboard-tab/SellerEditProductTab.tsx`
  - Expected: 0 warning, 0 error.

---

### Task 2: Chuẩn hóa Dark Mode Tokens trong `AddressBookTab`, `AddressFormModal`, `RichTextEditor`, `InvitationAccept`

**Files:**

- Modify: `src/components/account/AddressBookTab.tsx`
- Modify: `src/components/account/AddressFormModal.tsx`
- Modify: `src/components/ui/RichTextEditor.tsx`
- Modify: `src/pages/InvitationAccept.tsx`
- Modify: `src/components/admin/RejectProductDialog.tsx`

**Interfaces:**

- Consumes: Design system dark tokens.
- Produces: Loại bỏ hoàn toàn các lớp `dark:bg-zinc-800`, `dark:border-zinc-700`, `dark:bg-zinc-900` còn lại.

- [ ] **Step 1: Sửa nút trong `AddressBookTab.tsx` và `AddressFormModal.tsx`**
  - Trong `AddressBookTab.tsx`: Thay `dark:border-zinc-700 dark:bg-zinc-800` ở các nút hành động thành `dark:border-white/15 dark:bg-white/10 dark:hover:bg-white/15`.
  - Trong `AddressFormModal.tsx`: Dòng 622 nút đóng thay `dark:border-zinc-700 dark:hover:bg-zinc-800` thành `dark:border-white/15 dark:hover:bg-white/10`.

- [ ] **Step 2: Sửa `RichTextEditor.tsx`**
  - Thanh toolbar active tab (dòng 65, 74): `dark:bg-zinc-800` -> `dark:bg-white/10`.
  - Viền và nền editor (dòng 81, 83): `dark:border-zinc-800 dark:bg-zinc-950` -> `dark:border-white/15 dark:bg-white/5`.
  - Divider và selector heading (dòng 105, 126, 168): `dark:bg-zinc-800` -> `dark:bg-white/10`.

- [ ] **Step 3: Sửa `InvitationAccept.tsx` và `RejectProductDialog.tsx`**
  - `InvitationAccept.tsx` dòng 132: `dark:bg-zinc-900/90` -> `dark:bg-[#11182a]`.
  - `RejectProductDialog.tsx` dòng 54: `dark:bg-zinc-900` -> `dark:border-white/10 dark:bg-[#11182a]`.

- [ ] **Step 4: Chạy kiểm tra**
  - Run: `pnpm oxlint -D no-ternary src/components/account/AddressBookTab.tsx src/components/ui/RichTextEditor.tsx src/pages/InvitationAccept.tsx`
  - Expected: 0 warning, 0 error.

---

### Task 3: Bổ sung `onError={handleImageError}` Cho 25 Thẻ `<img>` Còn Lại

**Files:**

- Modify: `src/components/admin/AdminProductDetailPanel.tsx`
- Modify: `src/components/admin/ImageUploadField.tsx`
- Modify: `src/components/admin/PendingShopsQueue.tsx`
- Modify: `src/components/admin/PopupsTab.tsx`
- Modify: `src/components/SitePopup.tsx`
- Modify: `src/components/HomeBanners.tsx`
- Modify: `src/components/Hero.tsx`
- Modify: `src/components/Sections.tsx`
- Modify: `src/components/seller/ProductMediaUploader.tsx`
- Modify: `src/components/seller-dashboard-tab/SellerProductsTab.tsx`
- Modify: `src/components/seller-dashboard-tab/SellerInventoryTab.tsx`
- Modify: `src/components/seller-dashboard-tab/SellerAddProductTab.tsx`

**Interfaces:**

- Consumes: `PLACEHOLDER_IMAGE` từ `@/lib/apiAdapters`.
- Produces: 100% thẻ `<img>` có xử lý chống gãy ảnh/lỗi mạng.

- [ ] **Step 1: Bổ sung `onError` cho khối Landing page (`Hero.tsx`, `HomeBanners.tsx`, `Sections.tsx`, `SitePopup.tsx`)**
  - Thêm `handleImageError` gán `target.src = PLACEHOLDER_IMAGE` và truyền vào `onError`.

- [ ] **Step 2: Bổ sung `onError` cho khối Admin (`AdminProductDetailPanel.tsx`, `ImageUploadField.tsx`, `PendingShopsQueue.tsx`, `PopupsTab.tsx`)**
  - Đảm bảo `PLACEHOLDER_IMAGE` được import và áp dụng `onError={handleImageError}`.

- [ ] **Step 3: Bổ sung `onError` cho khối Seller (`ProductMediaUploader.tsx`, `SellerProductsTab.tsx`, `SellerInventoryTab.tsx`, `SellerAddProductTab.tsx`)**
  - Áp dụng trên thumbnail bảng sản phẩm, modal xem trước và danh sách biến thể kho.

- [ ] **Step 4: Chạy script kiểm tra quét ảnh**
  - Quét lại toàn bộ `src/` để đảm bảo 0 thẻ `<img>` nào thiếu `onError`.

---

### Task 4: Chuẩn hóa Bo Góc (Shape Lock) Cho Badge & Chip

**Files:**

- Modify: `src/components/seller-dashboard-tab/SellerStaffTab.tsx`
- Modify: `src/components/seller-dashboard-tab/SellerAddProductTab.tsx`
- Modify: `src/components/seller/ProductMediaUploader.tsx`
- Modify: `src/pages/Search.tsx`

**Interfaces:**

- Consumes: Quy tắc bo góc trong `docs/design-system.md` (`rounded-full` cho badge/pill/chip).

- [ ] **Step 1: Sửa badge vai trò & quyền hạn trong `SellerStaffTab.tsx`**
  - Dòng 819 & 934: Thay `rounded-md` thành `rounded-full`.

- [ ] **Step 2: Sửa chip trong `SellerAddProductTab.tsx` và `ProductMediaUploader.tsx`**
  - `SellerAddProductTab.tsx` dòng 1470: Thay `rounded-md` thành `rounded-full`.
  - `ProductMediaUploader.tsx` dòng 457: Thay `rounded-md` thành `rounded-full`.
  - `ProductMediaUploader.tsx` dòng 327, 338, 350, 568: Thay `rounded-md` thành `rounded-2xl` cho thumbnail action overlay buttons.

- [ ] **Step 3: Sửa skeleton trong `Search.tsx`**
  - Dòng 439, 440: Thay `rounded-md` thành `rounded-full`.

---

### Task 5: Kiểm Thử Toàn Diện và Xác Minh Pre-commit Gates

- [ ] **Step 1: Quét kiểm tra Ternary toàn dự án**
  - Run: `pnpm oxlint -D no-ternary src`
  - Expected: 0 warning, 0 error.

- [ ] **Step 2: Chạy Format Check**
  - Run: `pnpm format:check`
  - Expected: 100% matched files use correct format.

- [ ] **Step 3: Chạy Linting**
  - Run: `pnpm lint`
  - Expected: 0 error, 0 warning.

- [ ] **Step 4: Chạy Build Bundle**
  - Run: `pnpm build`
  - Expected: Build thành công sạch sẽ.

- [ ] **Step 5: Chạy Test Suite**
  - Run: `pnpm test`
  - Expected: Toàn bộ 222+ tests passed.
