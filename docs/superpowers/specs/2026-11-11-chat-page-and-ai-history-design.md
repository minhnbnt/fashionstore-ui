# Spec & Thiết Kế: Hệ Thống Nhắn Tin & Lưu Lịch Sử Chat AI (Trang /messages, Chat Nhanh, Gửi Ảnh & Sản Phẩm)

**Ngày:** 2026-11-11  
**Nhánh:** `feature/chat-enhancements` (cả `fashionstore-ui` và `fashionstore`)

---

## 1. Mục Đích & Bối Cảnh (Intent & Why)

Người dùng mua sắm và chủ cửa hàng thời trang nét cần một hệ sinh thái giao tiếp hoàn chỉnh:

- **Lưu lịch sử chat AI vào Database Backend:** Hiện tại toàn bộ tin nhắn với Trợ lý AI bị mất khi reload trình duyệt do chỉ giữ trong state React in-memory (`useChat`). Cần lưu trữ các phiên hội thoại và tin nhắn vào cơ sở dữ liệu để đồng bộ, cho phép xem lại các gợi ý sản phẩm và tiếp tục hội thoại bất kỳ lúc nào.
- **Trang nhắn tin tập trung (`/messages`):** Khung chat nổi mini ở góc dưới bên phải (`ChatDock`) chỉ phù hợp để nhắn tin nhanh ngắn hạn. Người dùng cần một không gian làm việc rộng rãi, chuyên nghiệp 2 cột toàn màn hình (desktop/mobile) để quản lý toàn bộ các cuộc trò chuyện với các Shop và Trợ lý AI.
- **Nhắn tin nhanh (Quick Chat Dock):** Nút tròn góc phải màn hình tiếp tục giữ vai trò mini dock, bổ sung nút phóng to "Mở toàn trang" để chuyển sang `/messages`.
- **Gửi ảnh & đính kèm sản phẩm:** Cho phép người mua và người bán gửi hình ảnh thực tế (qua S3/MinIO) và chia sẻ sản phẩm (link `/product/:id` hoặc bấm gửi sản phẩm đang xem) kèm thẻ tóm tắt trực quan (ảnh, tên, giá, nút mở sản phẩm).

---

## 2. Mục Tiêu (Goals), Ngoài Phạm Vi (Non-Goals) & Chống Mục Tiêu (Anti-Goals)

### Mục tiêu (Goals)

1. **Lịch sử AI trên Backend DB:**
   - Tạo 2 bảng `ai_conversation` và `ai_message` qua Flyway `V33__ai_chat_history.sql`.
   - REST API cho người dùng đã đăng nhập: lấy danh sách cuộc trò chuyện, tạo cuộc trò chuyện mới, lấy chi tiết tin nhắn của một cuộc trò chuyện, lưu tin nhắn user và AI (kèm metadata bộ lọc/sản phẩm).
   - Trên UI: Hiển thị danh sách các đoạn chat cũ, nút "Cuộc trò chuyện mới", đồng bộ trạng thái khi reload.
2. **Trang nhắn tin `/messages`:**
   - Tuyến đường `/messages` (yêu cầu đăng nhập hoặc hỗ trợ tab AI cho khách).
   - Layout 2 cột: Cột trái chuyển đổi giữa "Tin nhắn Shop" và "Trợ lý nét AI"; Cột phải là không gian trò chuyện lớn, responsive mobile 1 cột mượt mà.
   - Thêm icon Tin nhắn trên Header với badge số tin chưa đọc.
3. **Nút chat nhanh góc phải (`ChatDock`):**
   - Giữ nguyên trải nghiệm tiện lợi, thêm icon `ArrowsOut` / `ArrowSquareOut` dẫn sang `/messages`.
4. **Gửi ảnh & link sản phẩm:**
   - Nút chọn ảnh $\rightarrow$ upload qua presigned URL S3/MinIO (`uploadImage`) $\rightarrow$ gửi `imageKey` $\rightarrow$ render ảnh trong bubble chat (click để xem full ảnh).
   - Tự động nhận diện link sản phẩm nội bộ để render thẻ xem trước sản phẩm (Product Card).
   - Nút "Gửi sản phẩm đang xem cho shop" khi mở chat từ trang chi tiết sản phẩm (`/product/:id`).

### Ngoài phạm vi (Non-Goals)

- Gọi thoại hoặc video call giữa khách hàng và người bán.
- Chat nhóm nhiều người (group chat).

### Chống mục tiêu (Anti-Goals)

- Cấm gộp dữ liệu chat AI vào bảng tin nhắn thông thường `chat_conversation` và `chat_message` vì dữ liệu AI mang tool payload lớn, gây nhiễu và vỡ logic tính số tin chưa đọc/phân quyền của shop.
- Cấm làm chậm tốc độ stream của AI: việc lưu tin nhắn AI vào DB phải thực hiện bất đồng bộ hoặc ngay sau khi kết thúc lượt stream.

---

## 3. Các Phương Án Đã Cân Nhắc & Lựa Chọn (Approaches)

- **Phương án 1 (Đã chọn): Tách biệt mô-đun dữ liệu & Giao diện 2 cột chuyển đổi linh hoạt.**
  - _Dữ liệu:_ Tạo riêng bảng `ai_conversation` và `ai_message`. Dữ liệu chat Shop-Buyer giữ nguyên bảng `chat_conversation` và `chat_message`.
  - _UI:_ Trang `/messages` chia 2 cột, cột trái có switcher tab "Shop" và "AI", cột phải hiển thị khung chat tương ứng.
  - _Đánh giá:_ Sạch sẽ, bảo mật, độc lập dữ liệu, cho phép quản lý nhiều phiên chat AI giống ChatGPT/Claude mà không ảnh hưởng tới luồng kinh doanh của shop.
- **Phương án 2 (Bị loại): Gộp AI thành "Shop hệ thống đặc biệt" trong bảng chat hiện có.**
  - _Nhược điểm:_ Dữ liệu tin nhắn chat AI có cấu trúc phức tạp (chứa metadata tool calling, filters snapshot); nếu gộp vào `chat_message` sẽ làm bẩn schema, xung đột quyền hạn `CHAT_ACCESS` và không thể tạo nhiều đoạn chat AI độc lập.

---

## 4. Thiết Kế Chi Tiết

### 4.1. Backend (`fashionstore`)

#### A. Database Migration (`V33__ai_chat_history.sql`)

```sql
CREATE TABLE IF NOT EXISTS ai_conversation (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_conversation_user ON ai_conversation (user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS ai_message (
    id UUID PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES ai_conversation(id) ON DELETE CASCADE,
    role VARCHAR(32) NOT NULL, -- 'user', 'assistant', 'system'
    content TEXT NOT NULL,
    metadata JSONB, -- lưu filters, product context, tool results
    sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_message_conversation ON ai_message (conversation_id, sent_at ASC);
```

#### B. Java Domain Models & DTOs

- Model: `AiConversation.java`, `AiMessage.java` (Spring Data JDBC `@Table`).
- Repository: `AiConversationRepository.java`, `AiMessageRepository.java`.
- DTOs:
  - `AiConversationResponse(UUID id, String title, Instant createdAt, Instant updatedAt)`
  - `AiMessageResponse(UUID id, UUID conversationId, String role, String content, String metadata, Instant sentAt)`
  - `CreateAiConversationRequest(String title)`
  - `SaveAiMessageRequest(String role, String content, String metadata)`

#### C. Controller & Service (`AiChatController.java`, `AiChatService.java`)

- `GET /api/ai/conversations`: Danh sách các cuộc trò chuyện của user đăng nhập.
- `POST /api/ai/conversations`: Tạo cuộc trò chuyện AI mới.
- `DELETE /api/ai/conversations/{id}`: Xóa cuộc trò chuyện AI.
- `GET /api/ai/conversations/{id}/messages`: Lấy lịch sử tin nhắn của cuộc trò chuyện.
- `POST /api/ai/conversations/{id}/messages`: Lưu một tin nhắn mới vào cuộc trò chuyện.

---

### 4.2. Frontend (`fashionstore-ui`)

#### A. Trang Mới: `src/pages/Messages.tsx` & Router

- Đăng ký route `/messages` trong `src/App.tsx`, có bọc kiểm tra xác thực hoặc hỗ trợ chuyển đổi sang tab AI nếu chưa đăng nhập.
- Xuất khẩu qua barrel `src/pages/index.ts`.
- Giao diện 2 cột:
  - **Cột trái (`w-80` hoặc `w-96` desktop, full màn hình trên mobile):**
    - Thanh điều hướng chọn chế độ: **"Người bán (Shop)"** hoặc **"Trợ lý nét AI"**.
    - Khi ở chế độ Shop: Tìm kiếm hội thoại shop, danh sách shop kèm avatar, tin nhắn gần nhất, thời gian và badge tin chưa đọc.
    - Khi ở chế độ AI: Danh sách các phiên chat AI đã lưu, nút bấm "+ Đoạn chat mới", nút xóa đoạn chat.
  - **Cột phải:**
    - Nếu chọn Shop: Cửa sổ chat shop đầy đủ với header thông tin shop, luồng tin nhắn bong bóng hỗ trợ xem ảnh, gửi ảnh (icon máy ảnh/kẹp ghim) và thẻ sản phẩm.
    - Nếu chọn AI: Giao diện AI chat toàn màn hình tương tác với Gemini qua OpenAI-compatible endpoint, tự động lưu lịch sử vào backend khi người dùng gửi và nhận phản hồi.

#### B. Component Nâng Cấp: Gửi Ảnh & Thẻ Sản Phẩm

- **Component xem trước ảnh (`ChatImageBubble.tsx`):**
  - Render ảnh từ `imageUrl(msg.imageKey)` trong bong bóng tin nhắn.
  - Bấm vào ảnh mở modal phóng to ảnh toàn màn hình.
- **Component thẻ sản phẩm (`ChatProductCard.tsx`):**
  - Phân tích nội dung tin nhắn hoặc prop sản phẩm: nếu phát hiện link dạng `/product/:id` hoặc người dùng chọn gửi sản phẩm $\rightarrow$ hiển thị thẻ sản phẩm gồm: ảnh thumbnail 48x60, tên sản phẩm, giá bán theo `formatVnd`, nút bấm xem sản phẩm.
- **Nút "Gửi sản phẩm đang xem":**
  - Khi người dùng từ trang PDP bấm mở chat, hiển thị thanh banner nhỏ trên ô nhập: _"Khách đang xem: [Tên sản phẩm] - [Nút: Gửi cho Shop]"_. Bấm nút sẽ tự động gửi kèm link và thông tin sản phẩm vào tin nhắn.
- **Nút upload ảnh:**
  - Icon hình ảnh bên cạnh ô input chat. Khi chọn ảnh, gọi hàm `uploadImage(file)` có sẵn $\rightarrow$ nhận `imageKey` $\rightarrow$ gọi `sendMessage` kèm `imageKey`.

#### C. Cập Nhật Header & ChatDock

- `Header.tsx`: Thêm icon Chat cạnh icon chuông thông báo (`NotificationBell`), hiển thị badge tổng số tin chưa đọc từ `useMyConversations`, click điều hướng sang `/messages`.
- `ChatDock.tsx`: Bổ sung nút icon phóng to (`ArrowsOut`) ở góc trên của panel chat nhanh để chuyển hướng sang `/messages` kèm theo id cuộc trò chuyện đang chọn.

---

## 5. Quy Tắc Kỹ Thuật (Conventions)

- **Frontend:**
  - Tuyệt đối cấm toán tử ba ngôi `? :` trong JSX (sử dụng `if/return` sớm hoặc toán tử `&&`).
  - Sử dụng `@phosphor-icons/react` cho toàn bộ icon.
  - Sử dụng Tailwind v4, dark mode đầy đủ cặp màu, kính mờ glassy `backdrop-blur`.
  - Format tiền tệ qua `formatVnd`, ngày giờ qua `formatDateTime`.
- **Backend:**
  - Java 21, Spring Data JDBC, Flyway migration tuần tự.
  - Mô hình DTO dùng Java record, OpenAPI annotation `@Schema`, `@Operation`.
  - Giới hạn dòng code tối đa 120 ký tự, exception ném ra bằng tiếng Anh.

---

## 6. Kế Hoạch Kiểm Thử (Verification Plan)

1. **Backend Integration & Unit Tests:**
   - Viết test `AiChatServiceUnitTest.java` và `AiChatControllerIntegrationTest.java` kiểm tra luồng tạo conversation, lưu message, truy vấn danh sách theo user.
   - Chạy `./gradlew test` đảm bảo 100% test xanh.
2. **Frontend Unit & Component Tests:**
   - Viết test `Messages.test.tsx` kiểm tra render 2 cột, chuyển đổi tab Shop/AI, chọn hội thoại.
   - Viết test gửi ảnh, render ảnh trong bubble chat, và parse link sản phẩm.
   - Chạy `npm test -- --run` kiểm tra toàn bộ test suite frontend.
