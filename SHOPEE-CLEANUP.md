# Kế hoạch dọn "ADN Shopee" — fashionstore-ui

> Tổng hợp audit UI nhái Shopee đối chiếu với `docs/openapi.json` (commit của hiepnet, 13/10 – 21/10/2026).
> Cơ sở: mã nguồn tại `master` @ `b7d666c`, ngày lập 21/10/2026.

## Bối cảnh

- Mọi API call đều đi qua orval mutator (`src/lib/apiFetch.ts`) → hooks sinh từ spec
  (`generated/endpoints/`, 26 tag). Quét toàn bộ `src/`: **không có** call API tự viết tay
  nào ngoài spec → phạm vi dọn là data bịa / UI chết / copy hứa lông.
- Ngoại lệ có chủ đích: **auth là service riêng (GoTrue)** qua `VITE_GOTRUE_URL`
  (`Login`, `ResetPassword`, `ChangePasswordForm`, `AuthCallback`, `useAuthMutations`).
  openapi không chứa auth endpoints — không phải lỗi, không xoá.
- Đã xử lý trước đó:
  - `783b659` — restore glass pill header (bỏ topbar Shopee, trending keywords, mini-cart, MALL badge)
  - `b7d666c` — xoá file chết `QuickServices.tsx` (101 dòng, `386fe48` thêm nhưng `dacc120` quên xoá)
- 41 file còn lại của hiepnet sạch: bấm đúng endpoint spec (wishlist, cart, chat, follow,
  decoration, revenue/settlements, returns, staff/roles, eKYC presign, addresses, orders, reviews, admin).

## Phát hiện nền tảng (căn cứ phân loại)

1. Model `productResponse` / `productSummaryResponse` **không có** field `rating` / `soldCount`
   → mọi con sao + chữ "đã bán X" trên product card là **data bịa**.
2. `FilterPanel.tsx` có 3 checkbox **không nối gì cả** (không state, không onChange, không param).
3. Spec **không có** endpoint voucher/coupon/shipping-fee → claim "Voucher 50K", "Freeship 500K" vô căn cứ.

---

## Tier 1 — ✅ ĐÃ DUYỚT: giả Shopee, không có API

| #   | Vị trí                                                                                                                                                                                                                             | Việc                                                                                                                                                  | Lý do                                      |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| 1   | `src/components/Sections.tsx` ~229, 235, 279                                                                                                                                                                                       | Xoá badge "Yêu Thích", badge "Giảm Giá", hàng sao + "đã bán" + vị trí trên ProductCard                                                                | Data bịa — model API không có field        |
| 2   | `src/components/Sections.tsx` 376–402 + `Home.tsx`                                                                                                                                                                                 | Xoá nguyên section DealMarquee + import                                                                                                               | Claim freeship/voucher không có backend    |
| 3   | `src/components/Sections.tsx` ~445–464                                                                                                                                                                                             | Xoá panel "Voucher 50K" ở Editorial, giữ brand story                                                                                                  | Hứa voucher không có endpoint              |
| 4   | `src/components/search/FilterPanel.tsx` 271–305                                                                                                                                                                                    | Xoá AccordionGroup "Dịch vụ & Khuyến mãi" (Freeship Xtra, Chính hãng Nét Mall, Giảm giá sâu) + icon import thừa (giữ `Money` — còn dùng ở Khoảng giá) | 3 checkbox chết                            |
| 5   | `src/components/FlashSale.tsx` ~128                                                                                                                                                                                                | Xoá thanh tiến độ "đã bán X%" — **giữ section** (load sản phẩm thật)                                                                                  | Số liệu bịa                                |
| 6   | `src/components/pdp/ProductInfo.tsx` ~374                                                                                                                                                                                          | Xoá dải "Cam kết dịch vụ" + import thừa                                                                                                               | Copy tĩnh Shopee-signature                 |
| 7   | `src/components/ShopKycRegistrationModal.tsx` 343, 490, 881                                                                                                                                                                        | "chính sách Shopee" → "chính sách sàn nét", "Chuẩn người bán Shopee" → "Chuẩn người bán nét"                                                          | Sàn tên **nét**, modal KYC nuốt tên Shopee |
| 8   | ~10 file: `Hero.tsx:123`, `Account.tsx:139,273,293`, `OrderHistoryTab.tsx:175`, `ShopInfoCard.tsx:94`, `SellerLayout.tsx:158`, `SellerOrdersTab.tsx:235`, `FilterPanel.tsx:271`, `ProductInfo.tsx:224,374`, `FlashSale.tsx:54,128` | Đổi comment `/* Shopee-style ... */` → trung tính. **Không đụng logic/API**                                                                           | Comment hại mắt                            |

Commit message đề xuất: `chore(ui): remove fake Shopee badges, dead promo filters, and false claims`

---

## Tier 2 — ⏳ CHƯA duyệt: chất Shopee cao NHƯNG API thật

> Xoá = mất tính năng đang chạy. Cần restyle/naming thay vì xoá trừ khi user chốt ngược lại.

| Vị trí                                                          | API backing                       | Ghi chú                                                    |
| --------------------------------------------------------------- | --------------------------------- | ---------------------------------------------------------- |
| `FloatingChatWidget.tsx` (449 dòng) — bong bóng chat nổi        | `/api/conversations/*` thật       | Shopee-signature nhất; chat API vẫn còn backend nếu xoá UI |
| Sort tabs "Phổ biến/Mới nhất/Giá↑↓" (`Search.tsx` 366–397)      | enum `SearchSort` sinh từ spec    | Xoá = mất sort thật                                        |
| Tabs trạng thái đơn hàng (`OrderHistoryTab.tsx:175`)            | `GET /api/orders/mine`            | Xoá = mất lọc trạng thái thật                              |
| Sidebar Account kiểu Shopee (`Account.tsx` 273–293)             | orders/addresses/wishlist/profile | Bên trong toàn tính năng thật                              |
| "Khung Giá" PDP (`ProductInfo.tsx:224`)                         | giá thật                          | Nên restyle, không xoá                                     |
| Topbar Seller Center + "nét Mall" (`SellerLayout.tsx` 158, 238) | seller API                        | Naming/restyle                                             |

---

## Tier 3 — 🔥 CHƯA duyệt: đốt sạch Seller Center

- Toàn bộ `src/components/seller-dashboard-tab/` (~14 tab, **~6.200 dòng**) + trang liên quan.
- Mất parity hoàn toàn với backend: spec có **~30 endpoint seller** (revenue, settlements,
  returns, staff/roles/invitations, decoration, inventory, bulk-import, withdrawals…).
- **KHÔNG khuyến nghị.** Nếu thật sự cần thì phải trình lại plan chi tiết từng tab trước khi chém.

---

## Ranh giới đã chốt

- FloatingChatWidget, sort tabs, tabs đơn hàng, sidebar Account, khung giá PDP,
  toàn bộ Seller Center — **giữ nguyên** trừ khi duyệt Tier 2/3.
- 5 lint warnings pre-existing (`FloatingChatWidget.tsx` ×4, `Account.tsx:109`) —
  lỗi của commit hiepnet, đã chứng minh bằng stash trên HEAD sạch; tách task riêng, không gộp.

## Quy trình thực thi (mỗi tier)

```bash
pnpm format   # oxfmt
pnpm lint     # oxlint — 0 error (5 warning cũ đã được ghi nhận ở trên)
pnpm build    # orval && tsc -b && vite build
git add -A && git commit
```

Quy ước repo: chỉ `pnpm`, không ternary (`? :`), không commit `dist/`/`.env`.
Chi tiết: `docs/pre-commit.md`, `docs/code-guide.md`.
