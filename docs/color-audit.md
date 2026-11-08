# Audit màu giao diện Admin — đối chiếu `design-system.md`

- Ngày audit: 24/10/2026 · Ngày sửa xong: 24/10/2026
- Phạm vi: `src/pages/Admin*.tsx`, `src/components/admin/*`, `src/components/UserAvatar.tsx`
- Đối chiếu: `docs/design-system.md` (màu lock 1 accent, input recipe, dark mode surface, modal/dialog)
- Kết quả: **đã sửa toàn bộ** — `pnpm lint` 0 error/0 warning, `pnpm build` xanh, kiểm chứng lại bằng đo rect + screenshot trong trình duyệt (mục "Kiểm chứng").

## Tổng kết

| Nhóm | Nội dung                                                 | Số chỗ                            | Trạng thái                          |
| ---- | -------------------------------------------------------- | --------------------------------- | ----------------------------------- |
| A    | Surface tối sai token (`dark:bg-zinc-900/950`)           | 8                                 | ✅                                  |
| B    | CTA primary bypass `.btn-primary` (solid indigo)         | 14 (9 mục gốc + 5 phát hiện thêm) | ✅ (B9 giữ nguyên — đúng ngữ nghĩa) |
| C    | Active pill 3 pattern khác nhau                          | 9 (5 mục gốc + 4 phát hiện thêm)  | ✅                                  |
| D    | Màu ngoài palette (orange, red, avatar cầu vồng)         | 3                                 | ✅                                  |
| E    | Input recipe sai spec (viền/focus/shape/dark)            | 3 recipe                          | ✅                                  |
| F    | `text-zinc-500` thiếu pair `dark:text-*`                 | 33                                | ✅                                  |
| G    | Dialog thiếu `static` / thiếu portal (spec Modal/Dialog) | 2                                 | ✅                                  |

## A. Surface tối sai token (spec dòng 53)

Spec: modal/panel = `dark:bg-[#11182a]`, lớp nổi phía trên = `dark:bg-[#0a0f1e]`, control = `dark:bg-white/5`/`white/10`, cấm zinc đục.

| #   | File:line                                      | Hiện trạng                                                 | Sửa thành           | Trạng thái |
| --- | ---------------------------------------------- | ---------------------------------------------------------- | ------------------- | ---------- |
| A1  | `components/admin/ContentDialog.tsx:48`        | panel `dark:bg-zinc-900`                                   | `dark:bg-[#11182a]` | ✅         |
| A2  | `components/admin/BanProductDialog.tsx:66`     | panel `dark:bg-zinc-900`                                   | `dark:bg-[#11182a]` | ✅         |
| A3  | `components/admin/CancelOrderDialog.tsx:52`    | panel `dark:bg-zinc-900`                                   | `dark:bg-[#11182a]` | ✅         |
| A4  | `components/admin/DismissReportsDialog.tsx:46` | panel `dark:bg-zinc-900`                                   | `dark:bg-[#11182a]` | ✅         |
| A5  | `components/admin/RestoreProductDialog.tsx:32` | panel `dark:bg-zinc-900`                                   | `dark:bg-[#11182a]` | ✅         |
| A6  | `pages/AdminShopDetail.tsx:773`                | lightbox ảnh `dark:bg-zinc-900`                            | `dark:bg-[#11182a]` | ✅         |
| A7  | `components/admin/PageEditor.tsx:180`          | preview `dark:bg-zinc-950`                                 | `dark:bg-[#0a0f1e]` | ✅         |
| A8  | `pages/AdminBannedKeywords.tsx:211`            | control select `dark:bg-zinc-900` (cấm thẳng theo dòng 36) | `dark:bg-white/10`  | ✅         |

## B. CTA primary không dùng gradient `.btn-primary` (spec dòng 6-8)

Spec: CTA primary = gradient chàm đêm → xanh hoàng gia, chữ trắng. `.btn-primary` đã có sẵn nhưng bị bypass bằng `bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500`. Đã thay tất cả bằng `btn-primary` (giữ nguyên `rounded-full px-… py-… text-sm font-bold disabled:opacity-50`).

| #   | File:line                                          | Control                          | Trạng thái                                                                         |
| --- | -------------------------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------- |
| B1  | `components/admin/ContentDialog.tsx:78`            | nút Lưu (submit dialog chung)    | ✅                                                                                 |
| B2  | `components/admin/BannersTab.tsx:217`              | "Thêm banner"                    | ✅                                                                                 |
| B3  | `components/admin/FaqsTab.tsx:155`                 | "Thêm câu hỏi"                   | ✅                                                                                 |
| B4  | `components/admin/PagesTab.tsx:164`                | "Thêm trang"                     | ✅                                                                                 |
| B5  | `components/admin/PopupsTab.tsx:182`               | "Thêm popup"                     | ✅                                                                                 |
| B6  | `components/admin/PageEditor.tsx:241`              | nút Lưu trang                    | ✅                                                                                 |
| B7  | `components/admin/AdminProductDetailPanel.tsx:134` | "Khôi phục" trong panel sản phẩm | ✅                                                                                 |
| B8  | `components/admin/RestoreProductDialog.tsx:74`     | nút xác nhận khôi phục           | ✅                                                                                 |
| B9  | `components/admin/BanProductDialog.tsx`            | nút "Gỡ sản phẩm"                | ➖ giữ nguyên — nút **đỏ destructive** `bg-red-600`, đúng ngữ nghĩa (xem Ngoại lệ) |
| B10 | `pages/AdminBannedKeywords.tsx:225`                | nút submit "Thêm và quét"        | ✅ (phát hiện thêm khi quét tổng)                                                  |
| B11 | `pages/AdminHolidays.tsx:351`                      | nút đồng bộ lịch nghỉ            | ✅ (phát hiện thêm)                                                                |
| B12 | `pages/AdminHolidays.tsx:408`                      | nút Lưu lịch nghỉ                | ✅ (phát hiện thêm)                                                                |
| B13 | `pages/AdminOrders.tsx:474`                        | nút "Tìm"                        | ✅ (phát hiện thêm)                                                                |
| B14 | `pages/AdminProducts.tsx:330`                      | nút "Tìm"                        | ✅ (phát hiện thêm)                                                                |

## C. Active pill — 3 pattern khác nhau cho 1 control (spec lock accent)

Thống nhất 1 pattern: `bg-indigo-900 text-white dark:bg-indigo-300 dark:text-indigo-950` (pattern `AdminShell` đang dùng, đúng đầu gradient).

| #   | File:line                             | Hiện trạng                                       | Trạng thái          |
| --- | ------------------------------------- | ------------------------------------------------ | ------------------- |
| C1  | `components/admin/AdminNav.tsx:16`    | `bg-indigo-600 dark:bg-indigo-500`               | ✅                  |
| C2  | `pages/AdminDashboard.tsx:177`        | `bg-indigo-600 dark:bg-indigo-500` (tab biểu đồ) | ✅                  |
| C3  | `components/admin/BannersTab.tsx:198` | inverted `bg-zinc-900 text-white`                | ✅                  |
| C4  | `components/admin/PageEditor.tsx:157` | inverted `bg-zinc-900 text-white`                | ✅                  |
| C5  | `components/admin/PageEditor.tsx:160` | inverted `bg-zinc-900 text-white`                | ✅                  |
| C6  | `pages/AdminContent.tsx:84`           | tab `bg-indigo-600`                              | ✅ (phát hiện thêm) |
| C7  | `pages/AdminHolidays.tsx:433`         | tab `bg-indigo-600`                              | ✅ (phát hiện thêm) |
| C8  | `pages/AdminOrders.tsx:437`           | tab `bg-indigo-600`                              | ✅ (phát hiện thêm) |
| C9  | `pages/AdminProducts.tsx:299`         | tab `bg-indigo-600`                              | ✅ (phát hiện thêm) |

## D. Màu ngoài palette (spec: lock accent chàm-xanh băng, "không chế thêm màu mới")

| #   | File:line                      | Hiện trạng                                                                                           | Sửa thành                                                                        | Trạng thái |
| --- | ------------------------------ | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ---------- |
| D1  | `pages/AdminDashboard.tsx:243` | chip **orange** quick-link "Quản lý shop"                                                            | indigo (đồng bộ StatTile)                                                        | ✅         |
| D2  | `pages/AdminDashboard.tsx:281` | chip **red** quick-link "Kiểm duyệt sản phẩm" (red để dành destructive; badge đỏ báo cáo giữ nguyên) | indigo                                                                           | ✅         |
| D3  | `components/UserAvatar.tsx`    | boring-avatars `marble` random cầu vồng đỏ/hồng/cam                                                  | truyền `colors={['#312e81', '#1d4ed8', '#38bdf8', '#a5b4fc']}` lock palette chàm | ✅         |

## E. Input recipe sai spec (spec dòng 35-38) — ảnh hưởng mọi form dialog

Recipe dùng chung `ContentDialog.INPUT_CLASS` (banner/popup/FAQ/page/schedule) + trang từ khóa cấm + `ReasonDialog`.

| #   | Token                               | Spec                                    | Hiện trạng                                                                 | Trạng thái                |
| --- | ----------------------------------- | --------------------------------------- | -------------------------------------------------------------------------- | ------------------------- |
| E1  | Viền light                          | `border-zinc-300`                       | `border-zinc-200` (tàng hình)                                              | ✅ (INPUT/TEXTAREA_CLASS) |
| E2  | Focus                               | `focus:border-blue-600`                 | `focus:border-indigo-400`                                                  | ✅                        |
| E3  | Shape input/select                  | `rounded-full`                          | `rounded-2xl`                                                              | ✅ (INPUT_CLASS)          |
| E4  | Shape textarea                      | ngoại lệ hợp lý `rounded-2xl`           | trùng INPUT_CLASS                                                          | ✅ (tách TEXTAREA_CLASS)  |
| E5  | Dark control                        | `dark:bg-white/10 dark:border-white/15` | `dark:bg-white/5 dark:border-white/10`                                     | ✅                        |
| E6  | `pages/AdminBannedKeywords.tsx:195` | —                                       | `border-zinc-200` + `focus:border-indigo-400` + `dark:bg-white/5`          | ✅                        |
| E7  | `pages/AdminBannedKeywords.tsx:211` | —                                       | `border-zinc-200` + `dark:bg-zinc-900`                                     | ✅                        |
| E8  | `components/admin/ReasonDialog.tsx` | —                                       | textarea `border-zinc-200` + `focus:border-indigo-500` + `dark:bg-white/5` | ✅ (phát hiện thêm)       |

Textarea đã tách `TEXTAREA_CLASS` (giữ `rounded-2xl`): `FaqFormDialog.tsx:131` ✅, `PopupFormDialog.tsx:175` ✅, `PageEditor.tsx:353` ✅.

## F. `text-zinc-500` thiếu pair dark (spec dòng 52) — fail AA trên nền tối

Sửa: thêm `dark:text-zinc-400`. Tổng 33 chỗ (20 chỗ gốc + 13 phát hiện thêm khi quét tổng).

| #   | File                                            | Chỗ bị                                                                                                                        | Trạng thái          |
| --- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| F1  | `pages/AdminShopDetail.tsx`                     | 21 chỗ: label `<dt>` uppercase, slug, icon MapPin/Phone/User/Envelope/LockKey                                                 | ✅                  |
| F2  | Nút ✕ close trong admin dialogs                 | `AdminOrderDetailPanel:334`, `AdminProductDetailPanel:327`, `BanProductDialog:85`, `CancelOrderDialog:71`, `ContentDialog:56` | ✅                  |
| F3  | `components/admin/ImageUploadField.tsx:73`      | "(không bắt buộc)"                                                                                                            | ✅                  |
| F4  | `components/admin/DismissReportsDialog.tsx:61`  | "(không bắt buộc)"                                                                                                            | ✅                  |
| F5  | `pages/AdminBannedKeywords.tsx:124`             | nút ✕ xóa keyword                                                                                                             | ✅                  |
| F6  | `pages/AdminShops.tsx:146,203,212`              | icon search, slug, email chủ shop                                                                                             | ✅ (phát hiện thêm) |
| F7  | `pages/AdminUserDetail.tsx:169,188,195,199,230` | email user, 3 label `<dt>`, slug                                                                                              | ✅ (phát hiện thêm) |
| F8  | `pages/AdminUsers.tsx:116,211`                  | icon search, email user                                                                                                       | ✅ (phát hiện thêm) |

## G. Dialog sai spec Modal/Dialog (spec dòng 27-31)

Spec: "Bắt buộc class `static` trên `<dialog>`" (UA mặc định `position: absolute` làm mất căn giữa); "Không tự dựng shell modal riêng".

| #   | File                                 | Lỗi                           | Hậu quả đo được                                                                                                                                                             | Trạng thái                                       |
| --- | ------------------------------------ | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| G1  | `components/admin/ConfirmDialog.tsx` | thiếu `static`                | dialog dính mép trái viewport (đo được `x=0` thay vì `x≈281`)                                                                                                               | ✅ thêm `static`                                 |
| G2  | `components/admin/ReasonDialog.tsx`  | thiếu `static` + KHÔNG portal | overlay `fixed` bị `backdrop-filter` của `section.glass` (AdminShell) bẫy containing block → overlay chỉ phủ card, dialog tràn 83px dưới viewport, phải scroll mới thấy nút | ✅ thêm `createPortal(document.body)` + `static` |

## Ngoại lệ có chủ ý (không sửa)

- `.btn-primary` giữ gradient 2 stop `#312e81 → #1d4ed8` (phần đậm của brand gradient) — đủ AA cho chữ trắng; thêm stop `#38bdf8` sẽ kéo contrast xuống dưới AA ở mép phải nút.
- Nút hành động destructive/positive giữ màu ngữ nghĩa: "Gỡ sản phẩm" đỏ (`bg-red-600`), "Hủy đơn" đỏ, "Không vi phạm" emerald (`bg-emerald-600`) — không phải accent trang trí.
- Tooltip `TrendChart` đảo màu `bg-zinc-900 / dark:bg-white` — pattern tooltip chuẩn, không phải surface panel.
- Badge trạng thái (emerald/sky/amber/red trong `StatusBadge`, `siteContent.ts`) — màu ngữ nghĩa trạng thái, không phải accent trang trí.
- Textarea giữ `rounded-2xl` — pill hóa textarea đa dòng là vô lý; spec dòng 17 hiểu là input single-line.

## Kiểm chứng sau khi sửa (đã thực hiện 24/10/2026)

1. `pnpm format` chạy sạch · `pnpm lint` exit 0 (0 error, 0 warning) · `pnpm build` xanh (built in 3.37s)
2. Quét tổng lại bằng grep: không còn `dark:bg-zinc-9*`, không còn `bg-indigo-600` nào trong `pages/Admin*.tsx` + `components/admin`, không còn pill inverted zinc, không còn `text-zinc-500` thiếu pair dark, không còn orange trong AdminDashboard
3. Đo rect dialog trong Chromium (viewport 1010×772):
   - **ReasonDialog** ("Khóa tài khoản"): portal về `body` ✓, overlay `0,0,1010,772` phủ kín ✓ (trước: `17,101,976,985`), dialog `x=249, y=125, w=512` — căn giữa X chính xác ((1010−512)/2 = 249) ✓, `position: static` ✓, nằm trọn viewport (trước tràn 83px) ✓
   - **ConfirmDialog** ("Duyệt shop"): overlay `0,0,1010,772` ✓, dialog `x=281, y=287` — khớp giá trị tham chiếu chuẩn (x≈281, y≈287) ✓, căn giữa 2 trục ✓
4. Computed style dark mode:
   - Panel dialog = `rgb(17, 24, 42)` = `#11182a` đúng spec (ReasonDialog, ConfirmDialog, ContentDialog, BanProductDialog…)
   - Input/select keyword = `rounded-full` + viền `white/15` + nền `white/10` (dark)
   - CTA = `linear-gradient(100deg, rgb(49,46,129), rgb(29,78,216))` = `#312e81 → #1d4ed8`
   - Chip quick-link Dashboard: 3/3 đồng nhất indigo-500/20 (hết cam/đỏ); tab biểu đồ = indigo-300 (dark)
   - Avatar: fill `#a5b4fc`, `#312e81`, `#1d4ed8` — palette chàm, hết cầu vồng
5. Screenshots: `/tmp/opencode/audit/reason-dialog-dark-fixed.png`, `confirm-dialog-dark-fixed.png`, `keywords-dark-fixed.png`, `dashboard-dark-fixed.png`, `content-dialog-dark-fixed.png`

# Phụ lục: Đồng bộ Seller Center với design system (24/10/2026)

Phạm vi: 14 tab seller (`components/seller-dashboard-tab`), shell `SellerLayout`, `components/seller/ProductMediaUploader`.
Nhánh `feature/seller-center-design-system`, 9 commit `799b73a…0d69e79` (chưa push, chưa merge).

## Đã đồng bộ

- 12 overlay ad-hoc → `components/Modal` (title + focus trap + Escape + scroll lock); bỏ icon/h3 tự dựng trong tiêu đề.
- 3 `renderStatusBadge` thủ công (Returns/Orders/Products) → `ui/StatusBadge` + `lib/sellerStatus.ts` (`sellerStatusMeta`, label seller giữ nguyên — không đụng `admin.statusMeta`).
- `ui/formStyles.ts` (LABEL/INPUT/TEXTAREA/CARD/PANEL) dùng chung; ContentDialog re-export giữ nguyên API admin.
- Token: surface tối `#11182a` / well `#0a0f1e` / control `white/5·10·15`; gray→zinc; `focus:border-blue-600`; input single-line `rounded-full` (textarea giữ `rounded-2xl`); CTA cam → `.btn-primary` giữ size/shape; active pill `bg-indigo-900 … dark:bg-indigo-300`; tím→indigo; count badge `bg-indigo-700`; avatar gradient `#312e81 → #1d4ed8`; "Sắp hết" cam → `text-amber-600`; ternary → helper `if` + early return.
- Fix nền dark mode shell (`64b1860`): hết `dark:bg-zinc-950` toàn trang.

## Ngoại lệ có chủ ý (seller — không sửa)

- Màu ngữ nghĩa giữ nguyên: emerald (thành công/"Trực tuyến"), amber (cảnh báo), đỏ (destructive), xanh dương (info) — không phải accent trang trí.
- Dot indicator của statusMeta bỏ khi swap badge Products (chỉ còn label màu ngữ nghĩa) — chọn nhẹ hơn thêm prop mới.
- Icon tiêu đề modal (Robot/FileCsv…) bỏ khi swap Modal — Modal chỉ nhận `title` text, đúng spec dòng 27-31.
- `Account.tsx` đổi import `@/components/ui/*` — hệ quả bắt buộc của việc tách component dùng chung, render không đổi.
- Hàng hội thoại active (Chat) = tint `bg-indigo-50/70 dark:bg-indigo-900/30` thay vì pill `indigo-900`: hàng có timestamp/message màu zinc phụ, nền đậm sẽ fail AA; tint giữ mọi chữ đọc được cả 2 mode.
- Toast giữ `bg-zinc-900 / dark:bg-white` — pattern tooltip đảo màu, thống nhất cả 7 tab.

## Kiểm chứng seller (24/10/2026)

1. `pnpm format` sạch · `pnpm lint` exit 0 (0 error, 0 warning) · `pnpm build` xanh (tsc -b + vite, 2.91s) · `pnpm test` 16 files / 144 tests pass.
2. Grep 7 pattern trên `seller-dashboard-tab` + `seller`: `orange-`, `#ee4d2d`, `dark:bg-zinc-9`, `dark:bg-zinc-8`, `dark:border-zinc-7`, `bg-gray-`, `text-gray-` — **0 file**.
3. Còn lại (orchestrator): chụp Chromium các tab seller dark/light + chạy lại luồng kiểm thử 2.2.1.
