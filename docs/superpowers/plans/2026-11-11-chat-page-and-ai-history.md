# Hệ Thống Nhắn Tin & Lưu Lịch Sử Chat AI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng hệ sinh thái nhắn tin toàn diện bao gồm: lưu lịch sử chat AI vào Database Backend qua Flyway, trang nhắn tin 2 cột `/messages` tích hợp cả Shop Chat và AI Assistant, gửi ảnh (upload S3/MinIO) và hiển thị thẻ sản phẩm trong tin nhắn, kèm nút chat nhanh góc phải và điều hướng trên Header.

**Architecture:** Tách biệt rõ ràng mô-đun dữ liệu AI (`ai_conversation`, `ai_message`) với luồng chat Shop-Buyer hiện tại (`chat_conversation`, `chat_message`) để đảm bảo hiệu năng và độc lập nghiệp vụ. Phía client sử dụng `@ai-sdk/react` với cơ chế lazy creation và serialization mảng `parts` vào `metadata` JSONB; các component hiển thị ảnh (`ChatImageBubble`) và xem trước sản phẩm (`ChatProductCard`) được thiết kế dạng dùng chung cho cả Khách hàng (`/messages`, `ChatDock`) và Người bán (`SellerChatTab`).

**Tech Stack:**

- Backend: Java 21, Spring Boot 3, Spring Data JDBC, PostgreSQL, Flyway, S3/MinIO presigned upload.
- Frontend: React 19, Vite+ (`vp`), Tailwind CSS v4, `@ai-sdk/react`, `@phosphor-icons/react`, React Router 8, TanStack React Query 5.

**Spec:** `docs/superpowers/specs/2026-11-11-chat-page-and-ai-history-design.md`

## Global Constraints

- Backend exceptions phải viết bằng tiếng Anh, DTO record có OpenAPI annotation `@Schema`.
- Backend giới hạn độ dài dòng code tối đa 120 ký tự.
- Frontend tuyệt đối cấm toán tử ba ngôi `? :` trong JSX (sử dụng `if/return` sớm hoặc toán tử `&&`).
- Frontend icon duy nhất từ `@phosphor-icons/react`, tiền tệ qua `formatVnd`, ngày giờ qua `formatDateTime`.
- Mọi kiểm thử phải chạy xanh (`./gradlew test` và `npm test -- --run`) trước khi kết thúc task.

## Review Focus

1. **Hydration thẻ sản phẩm AI cũ:** Khi tải lại tin nhắn AI từ DB, mảng `parts` trong `metadata` phải được phục hồi đúng cấu trúc của `AgentUIMessage` để các card sản phẩm (`ShowProductsBlock`) hiển thị lại bình thường thay vì text trơn.
2. **Tin nhắn chỉ gửi ảnh:** Gửi ảnh khi `content` rỗng không được bắn lỗi 400 Bad Request từ backend validation.
3. **Trải nghiệm khách chưa đăng nhập (Guest):** Vào `/messages` không bị crash hoặc loop redirect; tab AI hoạt động mượt mà không gọi API lưu DB.
4. **Phát hiện link sản phẩm:** Tin nhắn chứa URL `/product/:id` phải nhận diện chính xác ID sản phẩm hợp lệ, không gây crash nếu URL lỗi format hoặc sản phẩm không còn tồn tại.
5. **Realtime WebSocket:** Tin nhắn kèm ảnh và read receipt vẫn cập nhật cache React Query ngay lập tức mà không cần reload trang.

---

### Task 1: Backend Database Migration & DTOs cho Lịch Sử Chat AI

**Files:**

- Create: `fashionstore/src/main/resources/db/migration/V33__ai_chat_history.sql`
- Create: `fashionstore/src/main/java/com/minhnbnt/fashionstore/model/AiConversation.java`
- Create: `fashionstore/src/main/java/com/minhnbnt/fashionstore/model/AiMessage.java`
- Create: `fashionstore/src/main/java/com/minhnbnt/fashionstore/dto/ai/AiConversationResponse.java`
- Create: `fashionstore/src/main/java/com/minhnbnt/fashionstore/dto/ai/AiMessageResponse.java`
- Create: `fashionstore/src/main/java/com/minhnbnt/fashionstore/dto/ai/CreateAiConversationRequest.java`
- Create: `fashionstore/src/main/java/com/minhnbnt/fashionstore/dto/ai/SaveAiMessageRequest.java`
- Create: `fashionstore/src/main/java/com/minhnbnt/fashionstore/features/ai/repository/AiConversationRepository.java`
- Create: `fashionstore/src/main/java/com/minhnbnt/fashionstore/features/ai/repository/AiMessageRepository.java`
- Test: `fashionstore/src/test/java/com/minhnbnt/fashionstore/features/ai/AiChatRepositoryTest.java`

**Interfaces:**

- Consumes: `user_profile` table.
- Produces: `AiConversation`, `AiMessage`, `AiConversationRepository`, `AiMessageRepository`.

- [ ] **Step 1: Viết test failing cho Repository**
      Viết `AiChatRepositoryTest.java` kiểm tra `AiConversationRepository.findByUserIdOrderByUpdatedAtDesc` và `AiMessageRepository.findByConversationIdOrderBySentAtAsc`.

- [ ] **Step 2: Chạy test để xác nhận test fail**
      Chạy: `cd fashionstore; ./gradlew test --tests *AiChatRepositoryTest`
      Kỳ vọng: FAIL vì chưa có file model và migration.

- [ ] **Step 3: Tạo migration V33 và các Entity / Repository**
      Tạo bảng `ai_conversation` và `ai_message` trong `V33__ai_chat_history.sql`, tạo các record DTO và Spring Data JDBC `@Table`.

- [ ] **Step 4: Chạy test để xác nhận test pass**
      Chạy: `cd fashionstore; ./gradlew test --tests *AiChatRepositoryTest`
      Kỳ vọng: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add fashionstore/src/main/resources/db/migration/V33__ai_chat_history.sql fashionstore/src/main/java/com/minhnbnt/fashionstore/model/Ai*.java fashionstore/src/main/java/com/minhnbnt/fashionstore/dto/ai/ fashionstore/src/main/java/com/minhnbnt/fashionstore/features/ai/repository/ fashionstore/src/test/java/com/minhnbnt/fashionstore/features/ai/
  git commit -m "feat(ai): add database migration, models, and repositories for ai chat history"
  ```

---

### Task 2: Backend Service & REST Controller cho Lịch Sử Chat AI

**Files:**

- Create: `fashionstore/src/main/java/com/minhnbnt/fashionstore/features/ai/AiChatService.java`
- Create: `fashionstore/src/main/java/com/minhnbnt/fashionstore/features/ai/controller/AiChatController.java`
- Test: `fashionstore/src/test/java/com/minhnbnt/fashionstore/features/ai/AiChatServiceUnitTest.java`

**Interfaces:**

- Consumes: `AiConversationRepository`, `AiMessageRepository`, `Jwt`.
- Produces: Endpoints `GET /api/ai/conversations`, `POST /api/ai/conversations`, `DELETE /api/ai/conversations/{id}`, `GET /api/ai/conversations/{id}/messages`, `POST /api/ai/conversations/{id}/messages`.

- [ ] **Step 1: Viết test failing cho AiChatService**
      Viết `AiChatServiceUnitTest.java` test các trường hợp: tạo conversation, lưu message, truy vấn hội thoại của chính mình (chặn truy cập hội thoại của user khác ném `ForbiddenException` / 403).

- [ ] **Step 2: Chạy test xác nhận fail**
      Chạy: `cd fashionstore; ./gradlew test --tests *AiChatServiceUnitTest`
      Kỳ vọng: FAIL vì chưa có `AiChatService`.

- [ ] **Step 3: Cài đặt AiChatService và AiChatController**
      Triển khai logic nghiệp vụ: lazy conversation creation, kiểm tra quyền sở hữu `userId == conversation.getUserId()`, xóa cascade tin nhắn khi xóa hội thoại.

- [ ] **Step 4: Chạy test xác nhận pass**
      Chạy: `cd fashionstore; ./gradlew test --tests *AiChatServiceUnitTest`
      Kỳ vọng: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add fashionstore/src/main/java/com/minhnbnt/fashionstore/features/ai/AiChatService.java fashionstore/src/main/java/com/minhnbnt/fashionstore/features/ai/controller/AiChatController.java fashionstore/src/test/java/com/minhnbnt/fashionstore/features/ai/AiChatServiceUnitTest.java
  git commit -m "feat(ai): implement service and rest controller for ai chat history"
  ```

---

### Task 3: Backend Chat Validation: Hỗ Trợ Tin Nhắn Chỉ Có Ảnh

**Files:**

- Modify: `fashionstore/src/main/java/com/minhnbnt/fashionstore/dto/chat/SendMessageRequest.java`
- Modify: `fashionstore/src/main/java/com/minhnbnt/fashionstore/features/chat/ChatService.java`
- Test: `fashionstore/src/test/java/com/minhnbnt/fashionstore/features/chat/ChatServiceUnitTest.java`

**Interfaces:**

- Consumes: `SendMessageRequest(content, imageKey)`.
- Produces: Cho phép `content` để trống nếu `imageKey` có giá trị.

- [ ] **Step 1: Viết test failing cho gửi tin nhắn chỉ có ảnh**
      Trong `ChatServiceUnitTest.java`, thêm test gửi tin nhắn với `content = ""` hoặc `null` và `imageKey = "uploads/test.jpg"`, kỳ vọng tin nhắn được tạo thành công với `content = ""`.

- [ ] **Step 2: Chạy test xác nhận fail**
      Chạy: `cd fashionstore; ./gradlew test --tests *ChatServiceUnitTest`
      Kỳ vọng: FAIL với validation error hoặc NPE.

- [ ] **Step 3: Cập nhật validation trong SendMessageRequest & ChatService**
      Bỏ `@NotBlank` trên `content`, thêm `@AssertTrue` kiểm tra ít nhất một trong hai trường có nội dung, đảm bảo `content != null ? content : ""` khi lưu.

- [ ] **Step 4: Chạy test xác nhận pass**
      Chạy: `cd fashionstore; ./gradlew test --tests *ChatServiceUnitTest`
      Kỳ vọng: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add fashionstore/src/main/java/com/minhnbnt/fashionstore/dto/chat/SendMessageRequest.java fashionstore/src/main/java/com/minhnbnt/fashionstore/features/chat/ChatService.java fashionstore/src/test/java/com/minhnbnt/fashionstore/features/chat/ChatServiceUnitTest.java
  git commit -m "fix(chat): allow image-only messages without requiring text content"
  ```

---

### Task 4: Frontend Component Hiển Thị Ảnh Trong Chat & Modal Phóng To

**Files:**

- Create: `fashionstore-ui/src/components/chat/ChatImageBubble.tsx`
- Create: `fashionstore-ui/src/components/chat/ChatImageBubble.test.tsx`

**Interfaces:**

- Consumes: `imageKey: string`, `alt?: string`.
- Produces: `<ChatImageBubble imageKey={...} />` render thumbnail ảnh bo tròn, click mở modal ảnh lớn.

- [ ] **Step 1: Viết test failing cho ChatImageBubble**
      Test render ảnh từ `imageUrl(imageKey)`, kiểm tra ban đầu không hiện modal, click vào ảnh mở dialog hiển thị ảnh kích thước đầy đủ và nút đóng.

- [ ] **Step 2: Chạy test xác nhận fail**
      Chạy: `cd fashionstore-ui; npm test -- --run src/components/chat/ChatImageBubble.test.tsx`
      Kỳ vọng: FAIL vì chưa có file component.

- [ ] **Step 3: Cài đặt ChatImageBubble**
      Sử dụng Tailwind v4, bo góc `rounded-2xl`, nút đóng modal `X`, không dùng ternary trong JSX.

- [ ] **Step 4: Chạy test xác nhận pass**
      Chạy: `cd fashionstore-ui; npm test -- --run src/components/chat/ChatImageBubble.test.tsx`
      Kỳ vọng: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add fashionstore-ui/src/components/chat/ChatImageBubble.tsx fashionstore-ui/src/components/chat/ChatImageBubble.test.tsx
  git commit -m "feat(chat): add ChatImageBubble component with image modal preview"
  ```

---

### Task 5: Frontend Component Thẻ Sản Phẩm & Nhận Diện Link Trong Tin Nhắn

**Files:**

- Create: `fashionstore-ui/src/components/chat/messageParser.ts`
- Create: `fashionstore-ui/src/components/chat/messageParser.test.ts`
- Create: `fashionstore-ui/src/components/chat/ChatProductCard.tsx`
- Create: `fashionstore-ui/src/components/chat/ChatProductCard.test.tsx`

**Interfaces:**

- Consumes: chuỗi `content: string`.
- Produces: `extractProductIds(text: string): string[]`, `<ChatProductCard productId={...} />`.

- [ ] **Step 1: Viết test failing cho messageParser và ChatProductCard**
  - `messageParser.test.ts`: test trích xuất chính xác ID từ các dạng link: `/product/123e4567-e89b-12d3-a456-426614174000`, `http://localhost:5173/product/123`, hoặc link trong câu văn.
  - `ChatProductCard.test.tsx`: test hiển thị ảnh thumbnail, tên sản phẩm, giá tiền `formatVnd`, nút Link sang trang PDP.

- [ ] **Step 2: Chạy test xác nhận fail**
      Chạy: `cd fashionstore-ui; npm test -- --run src/components/chat/messageParser.test.ts src/components/chat/ChatProductCard.test.tsx`
      Kỳ vọng: FAIL.

- [ ] **Step 3: Triển khai messageParser & ChatProductCard**
      Sử dụng regex chuẩn, hook `useDetail1(productId)`, xử lý skeleton loading khi đang fetch và ẩn an toàn nếu sản phẩm không tìm thấy.

- [ ] **Step 4: Chạy test xác nhận pass**
      Chạy: `cd fashionstore-ui; npm test -- --run src/components/chat/messageParser.test.ts src/components/chat/ChatProductCard.test.tsx`
      Kỳ vọng: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add fashionstore-ui/src/components/chat/messageParser.ts fashionstore-ui/src/components/chat/messageParser.test.ts fashionstore-ui/src/components/chat/ChatProductCard.tsx fashionstore-ui/src/components/chat/ChatProductCard.test.tsx
  git commit -m "feat(chat): add product link parser and ChatProductCard component"
  ```

---

### Task 6: Tích Hợp Gửi Ảnh & Sản Phẩm Vào Chat Dock và Seller Chat

**Files:**

- Modify: `fashionstore-ui/src/components/chat/ChatDock.tsx` (`ChatDockThread`)
- Modify: `fashionstore-ui/src/components/seller-dashboard-tab/SellerChatTab.tsx`
- Test: `fashionstore-ui/src/components/chat/ChatDock.realtime.test.tsx`
- Test: `fashionstore-ui/src/components/seller-dashboard-tab/SellerChatTab.test.tsx`

**Interfaces:**

- Consumes: `uploadImage(file)`, `ChatImageBubble`, `ChatProductCard`, `extractProductIds`.
- Produces: Khung chat có nút chọn ảnh (icon `ImageSquare`), thanh banner "Khách đang xem sản phẩm", tự động render ảnh và thẻ sản phẩm trong tin nhắn.

- [ ] **Step 1: Viết test failing cho luồng đính kèm ảnh và thẻ sản phẩm**
      Trong `ChatDock.realtime.test.tsx`, thêm test case: tin nhắn chứa `imageKey` render ảnh `ChatImageBubble`, tin nhắn chứa link `/product/:id` render `ChatProductCard`.

- [ ] **Step 2: Chạy test xác nhận fail**
      Chạy: `cd fashionstore-ui; npm test -- --run src/components/chat/ChatDock.realtime.test.tsx`
      Kỳ vọng: FAIL.

- [ ] **Step 3: Cập nhật ChatDockThread và SellerChatTab**
  - Thêm thẻ `<input type="file" accept="image/*" className="hidden" />` và nút bấm icon `ImageSquare`.
  - Khi người dùng chọn ảnh: gọi `uploadImage(file)` $\rightarrow$ gửi `sendMessage({ content: messageInput, imageKey })`.
  - Trong luồng render tin nhắn: render `ChatImageBubble` nếu có `msg.imageKey`; parse text qua `extractProductIds` để render `ChatProductCard`.
  - Nếu mở chat từ trang PDP (`shopIdFromProduct !== ''`): hiển thị thanh banner "Khách đang xem: [Tên SP]" kèm nút "Gửi sản phẩm".

- [ ] **Step 4: Chạy test xác nhận pass**
      Chạy: `cd fashionstore-ui; npm test -- --run src/components/chat/ChatDock.realtime.test.tsx src/components/seller-dashboard-tab/SellerChatTab.test.tsx`
      Kỳ vọng: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add fashionstore-ui/src/components/chat/ChatDock.tsx fashionstore-ui/src/components/seller-dashboard-tab/SellerChatTab.tsx fashionstore-ui/src/components/chat/ChatDock.realtime.test.tsx fashionstore-ui/src/components/seller-dashboard-tab/SellerChatTab.test.tsx
  git commit -m "feat(chat): integrate image upload and product cards into buyer and seller chat"
  ```

---

### Task 7: Frontend Hook Quản Lý Lịch Sử AI & Tích Hợp Lưu Trợ Lý AI

**Files:**

- Create: `fashionstore-ui/src/hooks/useAiHistory.ts`
- Create: `fashionstore-ui/src/hooks/useAiHistory.test.ts`
- Modify: `fashionstore-ui/src/lib/ai/agent.ts`
- Modify: `fashionstore-ui/src/components/chat/AgentTab.tsx`
- Test: `fashionstore-ui/src/components/chat/AgentTab.test.tsx`

**Interfaces:**

- Consumes: API `/api/ai/conversations`, `/api/ai/conversations/{id}/messages`.
- Produces: `useAiHistory()`, hàm `serializeMessageParts`, `hydrateMessageParts`.

- [ ] **Step 1: Viết test failing cho hook và helper serialization**
  - Test `serializeMessageParts(parts)` chuyển đổi chính xác mảng `AgentUIMessage.parts` thành JSON string và `hydrateMessageParts(json)` khôi phục nguyên vẹn.
  - Test `useAiHistory` gọi API backend khi user đã đăng nhập, và bỏ qua an toàn khi là khách (guest).

- [ ] **Step 2: Chạy test xác nhận fail**
      Chạy: `cd fashionstore-ui; npm test -- --run src/hooks/useAiHistory.test.ts`
      Kỳ vọng: FAIL.

- [ ] **Step 3: Cài đặt useAiHistory và cập nhật AgentTab**
  - Bổ sung helper trong `agent.ts`.
  - `AgentTab.tsx`: Khi `activeConversationId` thay đổi, tải lịch sử từ backend và nạp vào messages của `useChat`. Khi lượt chat hoàn tất (`onFinish`), gọi mutation lưu tin nhắn vào backend nếu người dùng đã đăng nhập. Nếu chưa đăng nhập, hiển thị banner nhắc đăng nhập nhẹ nhàng.

- [ ] **Step 4: Chạy test xác nhận pass**
      Chạy: `cd fashionstore-ui; npm test -- --run src/hooks/useAiHistory.test.ts src/components/chat/AgentTab.test.tsx`
      Kỳ vọng: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add fashionstore-ui/src/hooks/useAiHistory.ts fashionstore-ui/src/hooks/useAiHistory.test.ts fashionstore-ui/src/lib/ai/agent.ts fashionstore-ui/src/components/chat/AgentTab.tsx fashionstore-ui/src/components/chat/AgentTab.test.tsx
  git commit -m "feat(ai): integrate AI conversation persistence and history hydration"
  ```

---

### Task 8: Xây Dựng Trang Nhắn Tin Toàn Màn Hình `/messages` & Header Navigation

**Files:**

- Create: `fashionstore-ui/src/pages/Messages.tsx`
- Create: `fashionstore-ui/src/pages/Messages.test.tsx`
- Modify: `fashionstore-ui/src/pages/index.ts`
- Modify: `fashionstore-ui/src/App.tsx`
- Modify: `fashionstore-ui/src/components/Header.tsx`
- Modify: `fashionstore-ui/src/components/chat/ChatDock.tsx`

**Interfaces:**

- Consumes: `ChatDockThread`, `ChatDockList`, `AgentTab`, `useAiHistory`, `useMyConversations`.
- Produces: Tuyến đường `/messages` hoàn chỉnh với layout 2 cột chuyển đổi Shop/AI, nút phóng to từ ChatDock, icon điều hướng có badge trên Header.

- [ ] **Step 1: Viết test failing cho trang Messages và Header**
  - `Messages.test.tsx`: test render cột trái với 2 tab "Người bán (Shop)" và "Trợ lý nét AI". Test chuyển đổi tab, test chế độ khách (hiện banner nhắc đăng nhập cho AI và khóa tab Shop).
  - Test icon tin nhắn trong Header hiển thị badge số lượng tin nhắn chưa đọc.

- [ ] **Step 2: Chạy test xác nhận fail**
      Chạy: `cd fashionstore-ui; npm test -- --run src/pages/Messages.test.tsx`
      Kỳ vọng: FAIL.

- [ ] **Step 3: Cài đặt Messages.tsx, cập nhật App.tsx, Header.tsx và ChatDock.tsx**
  - Layout 2 cột responsive (cột trái ẩn trên mobile khi đang mở hội thoại cụ thể, có nút quay lại).
  - Cột trái: Tab bar switch giữa Shop và AI; danh sách shop / danh sách lịch sử AI; nút "+ Đoạn chat mới".
  - `Header.tsx`: Thêm `<Link to="/messages" id="header-messages-link">` cạnh chuông thông báo với badge `totalUnread`.
  - `ChatDock.tsx`: Thêm icon `ArrowsOut` ở top-bar của popup chat mini để navigate sang `/messages`.

- [ ] **Step 4: Chạy test xác nhận pass**
      Chạy: `cd fashionstore-ui; npm test -- --run src/pages/Messages.test.tsx`
      Kỳ vọng: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add fashionstore-ui/src/pages/Messages.tsx fashionstore-ui/src/pages/Messages.test.tsx fashionstore-ui/src/pages/index.ts fashionstore-ui/src/App.tsx fashionstore-ui/src/components/Header.tsx fashionstore-ui/src/components/chat/ChatDock.tsx
  git commit -m "feat(messages): implement full-page 2-column messages view, header link, and dock expansion"
  ```

---

### Task 9: Toàn Bộ Kiểm Thử Hệ Thống & Tích Hợp

**Files:**

- Toàn bộ codebase backend & frontend.

- [ ] **Step 1: Chạy toàn bộ test suite Backend**
      Chạy: `cd fashionstore; ./gradlew test`
      Kỳ vọng: 100% tests pass.

- [ ] **Step 2: Chạy toàn bộ test suite Frontend**
      Chạy: `cd fashionstore-ui; npm test -- --run`
      Kỳ vọng: 100% tests pass (50+ test files).

- [ ] **Step 3: Kiểm tra định dạng code và TypeScript**
      Chạy: `cd fashionstore-ui; vp check`
      Kỳ vọng: Không có lỗi type, lint hay format.

- [ ] **Step 4: Commit hoàn tất**
  ```bash
  git commit --allow-empty -m "chore: verify all test suites and code checks pass for chat enhancements"
  ```
