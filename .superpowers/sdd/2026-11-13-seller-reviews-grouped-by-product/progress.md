# SDD ledger — plan: docs/superpowers/plans/2026-11-13-seller-reviews-grouped-by-product.md

BASE commit: 6fb9539

## Pre-flight interface scan

- Task 1 produces: `ReviewItem.productId: string`, `ReviewGroup`, `groupReviewsByProduct()`
- Task 2 consumes: same — consistent.
- Pre-flight: interfaces align, no conflict.

## Tasks

Task 1: complete (commits 6fb9539..bb70ac6, tests: pnpm test run src/lib/seller/sellerAdapters.test.ts → 31/31 PASS)

Task 2: Ruling: test cũ click "Trả lời đánh giá này" trực tiếp nhưng với accordion collapsed by default, cần expand group trước. Quyết định: cập nhật test cũ thêm bước expand. Cost nếu sai: thấp — logic reply không thay đổi.
Task 2: complete (commits bb70ac6..a9fe9cd, tests: pnpm test run SellerReviewsTab.test.tsx → 8/8 PASS)

Plan 2 (clickable links + message buyer): complete (commit 44f6a85)

- Product name → Link cùng tab /product/:id ✓
- Non-anonymous review → nút Nhắn tin (gọi POST /api/seller/conversations/open-with-buyer) ✓
- Anonymous review → không có nút ✓
- Tests: 11/11 PASS, full suite 492/492 PASS ✓
- Root cause issue fixed: encoding UTF-8 bị double-encode do PowerShell Set-Content → checkout git + edit_file thay thế ✓

Full suite: 492/492 pass (2026-11-13 20:30 ICT)
