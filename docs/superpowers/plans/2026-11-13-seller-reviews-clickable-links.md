# Seller Reviews — Clickable Product Link & Message Buyer (v2 — CORRECT REQUIREMENTS)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:**

1. Tên sản phẩm trên group header → `<Link to="/product/:id">` (cùng tab, KHÔNG mở tab mới)
2. Review **không ẩn danh** (`anonymous: false`) → hiển thị nút "Nhắn tin" → gọi API seller open conversation với buyer cụ thể → navigate `/messages?tab=shop&id=:convId`
3. Review **ẩn danh** (`anonymous: true`) → KHÔNG hiển thị nút nhắn tin (tuyệt đối không)

**Tech Stack:** React 19, TypeScript, react-router v8, Spring Boot 3, Phosphor Icons, Tailwind CSS v4

> [!IMPORTANT]
> **User requirements đã xác nhận:**
>
> - Product link: cùng tab (NO `target="_blank"`)
> - Anonymous review: NO message button at all
> - Non-anonymous: button phải mở conversation với buyer cụ thể (không chỉ link chung đến messages list)

## Global Constraints

- Giữ nguyên toàn bộ test cũ PASS.
- TDD: viết failing test trước, implement sau.
- Anonymous: không có nút nhắn tin.
- Product link: same-tab navigation.

---

## Task 1 (Backend): Thêm `buyerId` vào `SellerReviewResponse`

**Files:**

- Modify: `fashionstore/src/main/java/com/minhnbnt/fashionstore/dto/review/SellerReviewResponse.java`
- Modify: `fashionstore/src/main/java/com/minhnbnt/fashionstore/features/review/ReviewService.java`

**Lý do:** `SellerReviewResponse` hiện không expose `buyerId`. Seller cần `buyerId` để gọi open-conversation endpoint. `buyerId` KHÔNG phải thông tin bí mật đối với seller (seller đã thấy được trong mọi conversation).

- [x] **Step 1: Thêm `buyerId` vào `SellerReviewResponse` record**

  ```java
  @Schema(description = "ID người mua (null nếu ẩn danh với frontend, nhưng seller được phép biết)") UUID buyerId,
  ```

  Thêm vào sau `orderId` (vị trí thứ 5 trong record).

- [x] **Step 2: Cập nhật `toSellerResponse()` trong `ReviewService.java`**

  ```java
  review.getBuyerId(),  // buyerId — seller authorized to see
  ```

  Truyền `review.getBuyerId()` vào constructor của `SellerReviewResponse`.

- [x] **Step 3: Chạy backend tests**

  ```bash
  cd fashionstore && .\gradlew.bat test
  ```

---

## Task 2 (Backend): Thêm endpoint seller open conversation với buyer

**Files:**

- Modify: `fashionstore/src/main/java/com/minhnbnt/fashionstore/features/chat/ChatService.java`
- Modify: `fashionstore/src/main/java/com/minhnbnt/fashionstore/features/chat/controller/ChatController.java`

**Endpoint:** `POST /api/seller/conversations/open-with-buyer`
**Body:** `{ "buyerId": "uuid", "shopId": "uuid" }`
**Response:** `ChatConversationResponse` (existing or new)
**Auth:** Seller JWT, must have CHAT_ACCESS permission on shopId.

- [x] **Step 1: Thêm method `openConversationForSeller()` vào `ChatService.java`**

  ```java
  @Transactional
  public ChatConversationResponse openConversationForSeller(
      @NonNull UUID sellerId,
      @NonNull UUID shopId,
      @NonNull UUID buyerId
  ) {
      access.requireShopPermission(sellerId, shopId, ShopPermission.CHAT_ACCESS);
      var existing = conversations.findByShopIdAndBuyerId(shopId, buyerId).orElse(null);
      if (existing != null) {
          return toConversationResponse(existing, true);
      }
      var created = conversations.save(ChatConversation.create(shopId, buyerId));
      return toConversationResponse(created, true);
  }
  ```

- [x] **Step 2: Tạo request DTO `OpenConversationWithBuyerRequest`**

  ```java
  // fashionstore/src/main/java/com/minhnbnt/fashionstore/dto/chat/OpenConversationWithBuyerRequest.java
  public record OpenConversationWithBuyerRequest(
      @NotNull UUID shopId,
      @NotNull UUID buyerId
  ) {}
  ```

- [x] **Step 3: Thêm endpoint vào `ChatController.java`**

  ```java
  @PostMapping("/api/seller/conversations/open-with-buyer")
  @ResponseStatus(HttpStatus.OK)
  @Operation(summary = "Seller mở hội thoại với buyer cụ thể")
  @SecurityRequirement(name = "bearerAuth")
  public ChatConversationResponse openConversationWithBuyer(
      @AuthenticationPrincipal Jwt jwt,
      @Valid @RequestBody OpenConversationWithBuyerRequest request
  ) {
      var sellerId = UUID.fromString(Objects.requireNonNull(jwt.getSubject()));
      return chat.openConversationForSeller(sellerId, request.shopId(), request.buyerId());
  }
  ```

- [x] **Step 4: Chạy backend tests**

---

## Task 3 (Frontend): Regenerate OpenAPI types

- [x] **Step 1: Chạy codegen**

  ```bash
  cd fashionstore-ui && pnpm codegen
  ```

  Expects: `generated/model/sellerReviewResponse.ts` updated with `buyerId?: string`
  Expects: `generated/endpoints/chat/chat.ts` updated with `useOpenConversationWithBuyer` or new hook

---

## Task 4 (Frontend): Cập nhật `ReviewItem` type và adapter

**Files:**

- Modify: `src/types/seller/reviews.ts`
- Modify: `src/lib/seller/sellerAdapters.ts`

- [x] **Step 1: Thêm `buyerId?: string` vào `ReviewItem`**

- [x] **Step 2: Cập nhật `reviewItem()` adapter để map `buyerId`**

---

## Task 5 (Frontend): UI — Product link + Message button

**Files:**

- Modify: `src/components/seller-dashboard-tab/stats/SellerReviewsTab.tsx`
- Modify: `src/components/seller-dashboard-tab/stats/SellerReviewsTab.test.tsx`

### Step 1: Viết failing tests (TDD)

```ts
// Product link — same tab
it('tên sản phẩm trên header là link cùng tab đến trang sản phẩm', () => {
  // find link, check href contains /product/p1, NO target="_blank"
})

// Message button — non-anonymous
it('review không ẩn danh hiển thị nút nhắn tin', () => {
  // find button/link "Nhắn tin"
})

// Message button — anonymous — NO button
it('review ẩn danh KHÔNG có nút nhắn tin', () => {
  // queryByRole → null
})
```

### Step 2: Implement

**Product link:** Import `Link` từ `react-router`, wrap product name trong `<Link to={/product/${group.productId}} onClick={e.stopPropagation()}>`.

**Message button (non-anonymous):**

- Import `useNavigate` từ `react-router`
- Import generated hook `useOpenWithBuyer` (tên thực tế sau codegen)
- Render button chỉ khi `!rev.anonymous && rev.buyerId !== undefined`
- `onClick`: call API → on success navigate to `/messages?tab=shop&id=:convId`

**Anonymous:** render nothing.

---

## Task 6: Commit và run full suite

```bash
# Backend
cd fashionstore && .\gradlew.bat test

# Frontend
pnpm -C fashionstore-ui test run src/components/seller-dashboard-tab/stats/SellerReviewsTab.test.tsx
pnpm -C fashionstore-ui test  # full suite
```
