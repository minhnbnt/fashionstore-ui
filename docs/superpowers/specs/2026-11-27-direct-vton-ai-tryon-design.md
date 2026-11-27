# Spec & Thiết Kế: Kết Nối Trực Tiếp Trang Phòng Thử Đồ Ảo (`/try-on/:id`) Tới `vton-ai` Kèm Xác Thực JWT

**Ngày:** 2026-11-27  
**Phạm vi:** `fashionstore-ui` (`d:\fashionstore\fashionstore-ui`), `vton-ai` (`d:\vton-ai`), và `ai-backend` (`d:\fashionstore-node\apps\ai-backend`)

---

## 1. Mục Đích & Bối Cảnh (Intent & Why)

Hiện tại, trang Phòng Thử Đồ Ảo (`/try-on/:id` — `src/pages/VirtualTryOn.tsx`) đang phải upload ảnh cá nhân của khách lên S3 rồi gửi một câu lệnh ẩn qua `useChat` tới `ai-backend` (cổng `3002`). Tại cổng `3002`, LLM (Gemini) phải suy luận để gọi tool `tryOn`, rồi `tryOn` mới kết nối tới `d:\vton-ai` (`http://localhost:8001`) qua `@gradio/client`.

Việc đi vòng qua cổng `3002` trên trang `/try-on/:id` gây trễ (chờ upload S3 + chờ LLM suy luận), tốn token/quota LLM và có nguy cơ lỗi nếu LLM không gọi đúng tool. Mục tiêu của thiết kế này là cho phép trang `/try-on/:id` gọi trực tiếp sang `d:\vton-ai` (cổng `8001`) có bảo vệ bằng xác thực JWT ngay trên `d:\vton-ai`, đồng thời giữ nguyên tính năng thử đồ trong khung chat AI (`AgentTab.tsx` qua cổng `3002`).

---

## 2. Mục Tiêu (Goals), Ngoài Phạm Vi (Non-Goals) & Chống Mục Tiêu (Anti-Goals)

### Mục tiêu (Goals)

1. **Xác thực JWT trên `d:\vton-ai\main.py` (cổng `8001`):**
   - Bổ sung `CORSMiddleware` và middleware xác thực HTTP cho FastAPI trong `d:\vton-ai\main.py` (thông qua module `d:\vton-ai\auth.py`).
   - Kiểm tra header `Authorization: Bearer <token>` trên các request gọi Gradio API (`/gradio_api/*`, `/config`, `/info`, `/call/*`, `/queue/*`, `/upload`, `/file=*`).
   - Xác thực chữ ký JWT ES256 bằng public key (JWKS) từ GoTrue (`GOTRUE_URL`, mặc định `http://localhost:9999/.well-known/jwks.json`, có cache trên RAM) hoặc trả về `401 Unauthorized` nếu thiếu/sai token.
2. **Kết nối trực tiếp từ `VirtualTryOn.tsx` sang `vton-ai` (`8001`) qua `@gradio/client`:**
   - Thêm `VITE_VTON_API_URL=http://localhost:8001` vào `fashionstore-ui/.env`.
   - Tạo module `src/lib/ai/vtonClient.ts` dùng `@gradio/client` kết nối tới `VITE_VTON_API_URL` với `headers: { Authorization: 'Bearer ' + accessToken }` lấy từ `getAuthClient().getSession()`.
   - Tải ảnh Garment đã chọn thành `File`, kết hợp với `File` ảnh cá nhân người dùng vừa chọn/kéo-thả trên trình duyệt (bỏ bước upload ảnh cá nhân lên S3 trên trang `/try-on/:id`) và `mode` (`top` | `bottom` | `full`), gọi `/process_images`, sau đó tải ảnh kết quả về dạng `Blob` (kèm header `Authorization`) để tạo `objectUrl` hiển thị, so sánh Trước/Sau, phóng to và tải về máy.
3. **Giữ tương thích 100% cho khung chat AI (cổng `3002`):**
   - Trong `d:\fashionstore-node\apps\ai-backend\src\lib\ai\agent.ts` và `tools/tryOn.ts`, truyền `authorization` (header `Bearer <token>` của khách) vào `createTryOnTool({ authorization })` để `ai-backend` đính kèm `Authorization` khi gọi `vton-ai` (`8001`).

### Ngoài phạm vi (Non-Goals)

- Không thay đổi giao diện, lịch sử chat hay cách hoạt động của khung chat AI (`AgentTab.tsx`).
- Không lưu ảnh cá nhân tạm thời hay ảnh kết quả của trang `/try-on/:id` lên S3 (chỉ khung chat AI mới cần lưu S3 để phục vụ lịch sử tin nhắn chat).

### Chống mục tiêu (Anti-Goals)

- **Cấm dùng static API key trong `VITE_*`** ở frontend vì mọi biến `VITE_*` đều lộ công khai trên trình duyệt; bắt buộc dùng GoTrue JWT của phiên đăng nhập hiện tại.
- **Cấm dùng toán tử 3 ngôi (`? :`)** trong mọi file `.ts` / `.tsx` (tuân thủ quy ước `if / else` hoặc `&&` của repo).

---

## 3. Các Phương Án Đã Cân Nhắc & Lựa Chọn (Approaches)

- **Phương án 1 (Đã chọn): Frontend gọi trực tiếp Gradio API `/process_images` của `vton-ai` qua `@gradio/client` kèm GoTrue Bearer JWT xác thực tại `vton-ai`.**
  - _Ưu điểm:_ Tái sử dụng đúng hợp đồng `/process_images` của Gradio trên `d:\vton-ai\main.py`, bỏ hoàn toàn bước upload S3 ảnh cá nhân và bước chờ LLM ở cổng `3002`, đồng thời bảo vệ trực tiếp cổng `8001` bằng chuẩn xác thực GoTrue JWT chung với toàn hệ thống (`8080` và `3002`).
  - _Đánh đổi:_ Cài thêm `@gradio/client` vào `fashionstore-ui` và thêm middleware kiểm tra JWT trong `d:\vton-ai`.
- **Phương án 2 (Loại): Mở thêm REST endpoint `POST /api/try-on` riêng trong `d:\vton-ai\main.py`.**
  - _Nhược điểm:_ Tạo ra 2 giao thức thử đồ song song trên cùng một server Python (Gradio cho cổng `3002` và REST riêng cho frontend).
- **Phương án 3 (Loại): Đi vòng qua Spring Boot (`localhost:8080`) làm proxy.**
  - _Nhược điểm:_ Không phải kết nối trực tiếp, phải viết Gradio client bằng Java và tốn thêm hop mạng.

---

## 4. Thiết Kế Chi Tiết

### 4.1. Xác thực JWT & CORS trên `d:\vton-ai` (Cổng `8001`)

- **Cấu hình biến môi trường (có giá trị mặc định cho dev):**
  - `GOTRUE_URL`: mặc định `http://localhost:9999`
  - `GOTRUE_JWT_AUD`: mặc định `authenticated`
  - `VTON_AUTH_ENABLED`: mặc định `true` (có thể đặt `false` khi debug độc lập trên giao diện Gradio nếu cần)
- **CORS:** Thêm `CORSMiddleware` cho `FastAPI` với `allow_origins=["*"]`, `allow_methods=["*"]`, `allow_headers=["*"]` (bao gồm `Authorization`).
- **Middleware xác thực JWT (`verify_gotrue_jwt` trong `d:\vton-ai\auth.py`):**
  - Bỏ qua request `OPTIONS` (CORS preflight).
  - Với các request tới API/file của Gradio: đọc header `Authorization: Bearer <token>`.
  - Lấy public key ES256 từ `${GOTRUE_URL}/.well-known/jwks.json` (cache trong bộ nhớ), dùng thư viện `cryptography` (đã có sẵn trong Python 3.12 của máy) xác thực chữ ký ES256, kiểm tra hạn `exp` và `aud` (`authenticated` hoặc `role == 'service_role'`).
  - Nếu thiếu hoặc token không hợp lệ/hết hạn → trả `401 Unauthorized` với JSON `{"detail": "Unauthorized"}`.

### 4.2. Module `src/lib/ai/vtonClient.ts` trên `fashionstore-ui`

- **Đọc cấu hình:**
  - `readVtonConfig(): VtonConfig` đọc `import.meta.env.VITE_VTON_API_URL` (mặc định fallback `http://localhost:8001` nếu không khai báo hoặc rỗng).
- **Suy luận chế độ thử đồ (`inferTryOnMode(name: string, description: string): TryOnMode`):**
  - `'full'` nếu tên/mô tả chứa `'đầm'`, `'váy liền'`, `'jumpsuit'`, `'set'`, `'bộ'`.
  - `'bottom'` nếu chứa `'quần'` hoặc `'chân váy'`.
  - `'top'` cho các trường hợp còn lại.
- **Hàm thực thi `runDirectTryOn(input: DirectTryOnInput): Promise<DirectTryOnResult>`:**
  1. Lấy `session` từ `getAuthClient().getSession()`. Nếu không có `access_token`, ném lỗi `"Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại."`.
  2. Tải ảnh Garment từ `input.garmentImageUrl` qua `fetch` và chuyển thành `File` (`garment.<ext>`). Nếu lỗi, ném `"Không tải được ảnh sản phẩm, vui lòng thử lại sau."`.
  3. Gọi `Client.connect(vtonUrl, { headers: { Authorization: 'Bearer ' + token } })` rồi gọi `app.predict('/process_images', { images: [input.personFile, garmentFile], mode: input.mode })`.
  4. Trích xuất URL ảnh kết quả từ `result.data` (hỗ trợ mọi định dạng Gallery của Gradio), sau đó `fetch(resultUrl, { headers: { Authorization: 'Bearer ' + token } })` để lấy `Blob` ảnh kết quả và trả về `{ blob: imageBlob, objectUrl: URL.createObjectURL(imageBlob) }`.

### 4.3. Cập nhật `src/pages/VirtualTryOn.tsx`

- **Loại bỏ phụ thuộc cổng `3002`:** Bỏ `useChat`, `createChatTransport`, `readAgentConfig`, và bỏ bước gọi `uploadImageWithUrl` khi chọn ảnh cá nhân.
- **Chọn/Kéo-thả ảnh cá nhân tức thì:**
  - Validate `file.type.startsWith('image/')` và `file.size <= MAX_IMAGE_BYTES` (5 MB).
  - Lưu trực tiếp `{ file, previewUrl: URL.createObjectURL(file), status: 'ready', filename: file.name }` vào state `personImage` — nút **"Bắt đầu Thử Đồ Ảo AI"** sẵn sàng ngay lập tức.
- **Khi bấm "Bắt đầu Thử Đồ Ảo AI":**
  - Gọi `runDirectTryOn({ personFile, garmentImageUrl: primaryTryOnImageUrl, mode, vtonUrl })` (hoặc hàm `runTryOn` được inject qua props để dễ test).
  - Giữ nguyên thanh tiến trình `TRYON_PROGRESS_STEPS`, chế độ **"So sánh Trước / Sau"**, `MediaLightbox` phóng to và nút **"Tải ảnh về máy"** (thu hồi `URL.revokeObjectURL` của `resultImageUrl` cũ khi tạo lại hoặc khi unmount).

### 4.4. Cập nhật `ai-backend` (Cổng `3002`) để tương thích với JWT của `vton-ai`

- Trong `d:\fashionstore-node\apps\ai-backend\src\lib\ai\tools\tryOn.ts`:
  - `createTryOnTool(config?: { authorization?: string })`: nếu có `config.authorization`, truyền `{ headers: { Authorization: config.authorization } }` vào `Client.connect(resolveVtonApiUrl(), ...)` và vào `fetchBlob(resultUrl, ...)`.
- Trong `d:\fashionstore-node\apps\ai-backend\src\lib\ai\agent.ts`:
  - Truyền `tryOn: createTryOnTool({ authorization: config.authorization })`.
