# Direct `vton-ai` Virtual Try-On Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kết nối trực tiếp trang Phòng Thử Đồ Ảo (`/try-on/:id`) trên `fashionstore-ui` tới server `d:\vton-ai` (`http://localhost:8001`) qua `@gradio/client` có xác thực GoTrue Bearer JWT ngay trên `d:\vton-ai`, bỏ qua hoàn toàn bước trung gian qua `ai-backend` (cổng `3002`) và bước upload ảnh cá nhân lên S3, đồng thời giữ nguyên tính năng thử đồ trong khung chat AI.

**Architecture:** Tách logic xác thực ES256 JWT (theo JWKS của GoTrue `http://localhost:9999/.well-known/jwks.json`) và `CORSMiddleware` thành module `d:\vton-ai\auth.py` gắn vào `FastAPI` trong `d:\vton-ai\main.py`. Trên `fashionstore-ui`, xây dựng `src/lib/ai/vtonClient.ts` lấy `access_token` từ phiên GoTrue hiện tại, đính kèm `Authorization: Bearer <token>` khi gọi `Client.connect(vtonUrl, { headers })` tới `/process_images` và khi tải ảnh kết quả về dạng `Blob` (`URL.createObjectURL`). Trên `ai-backend` (cổng `3002`), chuyển tiếp header `Authorization` của người dùng vào `createTryOnTool` để khung chat AI tiếp tục gọi được `vton-ai` khi bật xác thực.

**Tech Stack:** FastAPI, Gradio 6, Python `cryptography` + `httpx`, React 19, TypeScript, `@gradio/client` ^2.8.0, Vitest + Testing Library (`happy-dom`).

**Spec:** `d:\fashionstore\fashionstore-ui\docs\superpowers\specs\2026-11-27-direct-vton-ai-tryon-design.md`

## Global Constraints

- **Tuyệt đối không dùng toán tử 3 ngôi (`? :`)** trong mọi file `.ts` / `.tsx` tại `fashionstore-ui` và `fashionstore-node`. Luôn dùng `if / else` hoặc toán tử `&&`.
- Không nhúng static secret/API key vào biến môi trường `VITE_*`; bắt buộc xác thực bằng GoTrue Bearer JWT (`Authorization: Bearer <access_token>`).
- Sử dụng `pnpm` cho mọi lệnh quản lý package, format (`pnpm format`), lint (`pnpm lint`), build (`pnpm build`) và test (`pnpm test`).
- Mọi thông báo lỗi trả về giao diện người dùng trên `fashionstore-ui` và `ai-backend` đều bằng tiếng Việt rõ ràng.

## Review Focus

1. **Request không có JWT hoặc JWT sai chữ ký / hết hạn gọi vào `vton-ai` (`8001`):** Middleware `d:\vton-ai\auth.py` phải chặn bằng mã `401 Unauthorized` trước khi chạm tới hàng đợi GPU của Gradio, nhưng vẫn cho phép request `OPTIONS` (CORS preflight) đi qua với mã `200`/`204`. Được kiểm tra bằng unit test ở Task 1.
2. **Thẻ `<img>` trên trình duyệt không tự gửi header `Authorization`:** Khi Gradio trả về URL ảnh kết quả (`http://localhost:8001/gradio_api/file=...`), `vtonClient.ts` bắt buộc phải `fetch(resultUrl, { headers: { Authorization: 'Bearer ' + token } })` để lấy `Blob` và tạo `URL.createObjectURL(blob)` cho thẻ `<img>` hiển thị. Được kiểm tra bằng unit test ở Task 3.
3. **Phiên đăng nhập trên trình duyệt bị mất hoặc hết hạn khi bấm thử đồ:** `runDirectTryOn` trong `vtonClient.ts` phải kiểm tra `session?.access_token` trước khi tải ảnh hay gọi Gradio, và ném lỗi `"Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại."` nếu thiếu token. Được kiểm tra bằng unit test ở Task 3.
4. **Suy luận chế độ thử đồ (`top` / `bottom` / `full`) cho sản phẩm dạng set/bộ có chữ "quần":** Ví dụ `"Bộ pijama áo quần lụa"` hoặc `"Set vest nữ kèm quần âu"` chứa cả chữ `"bộ"`/`"set"` lẫn `"quần"` — `inferTryOnMode` phải ưu tiên kiểm tra `'full'` (`đầm`, `váy liền`, `jumpsuit`, `set`, `bộ`) trước `'bottom'` (`quần`, `chân váy`). Được kiểm tra bằng unit test ở Task 3.
5. **Khung chat AI (cổng `3002`) gọi `vton-ai` sau khi bật JWT auth:** `createTryOnTool` trong `ai-backend` phải chuyển tiếp header `Authorization` của khách vào cả `Client.connect(vtonUrl, { headers })` lẫn lệnh `fetch` tải ảnh kết quả từ `vton-ai`. Được kiểm tra bằng unit test ở Task 2.

---

### Task 1: Module Xác Thực GoTrue JWT (`auth.py`) & Tích Hợp CORS + Auth Vào `d:\vton-ai\main.py`

**Files:**

- Create: `d:\vton-ai\auth.py`
- Modify: `d:\vton-ai\main.py:15-18,228-233`
- Test: `d:\vton-ai\test_auth.py`

**Interfaces:**

- Produces:
  - `verify_gotrue_jwt(token: str, jwks_keys: list[dict], expected_aud: str = "authenticated") -> dict` trong `d:\vton-ai\auth.py`:
    - Giải mã JWT header & payload (Base64URL), tìm JWK khớp `kid` và `kty == "EC"`, `crv == "P-256"`, dựng `EllipticCurvePublicNumbers` (`SECP256R1`) từ `x`, `y` bằng `cryptography.hazmat.primitives.asymmetric.ec`, chuyển chữ ký raw `(r || s)` 64 bytes của JWS ES256 sang ASN.1 DER bằng `encode_dss_signature` rồi gọi `public_key.verify(der_sig, signing_input, ec.ECDSA(hashes.SHA256()))`.
    - Kiểm tra `exp > time.time()` và `aud == expected_aud` (hoặc `payload.get("role") == "service_role"`). Nếu sai hoặc hết hạn thì ném `ValueError`.
  - `configure_vton_security(app: FastAPI, jwks_fetcher: Callable[[], list[dict]] | None = None) -> FastAPI` trong `d:\vton-ai\auth.py`:
    - Gắn `CORSMiddleware` (`allow_origins=["*"]`, `allow_methods=["*"]`, `allow_headers=["*"]`).
    - Gắn HTTP middleware kiểm tra `Authorization: Bearer <token>` cho mọi request trừ `request.method == "OPTIONS"` (hoặc khi `os.environ.get("VTON_AUTH_ENABLED", "true").lower() == "false"`). Nếu thiếu hoặc `verify_gotrue_jwt` ném lỗi thì trả `JSONResponse({"detail": "Unauthorized"}, status_code=401)`.

- [ ] **Step 1: Viết bài test thất bại trong `d:\vton-ai\test_auth.py`**

```python
import base64
import json
import time
import unittest
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.utils import decode_dss_signature
from fastapi import FastAPI
from fastapi.testclient import TestClient

from auth import configure_vton_security, verify_gotrue_jwt
```

Viết 4 test case trong `TestVtonAuth(unittest.TestCase)`:

1. `test_valid_es256_jwt_passes`: Sinh cặp khóa P-256, xuất JWK `{kty: "EC", crv: "P-256", x, y, kid: "k1", alg: "ES256"}`, ký token có `aud="authenticated"`, `exp=time.time() + 300`; gọi `verify_gotrue_jwt` trả về đúng payload và gọi `GET /gradio_api/info` với header `Authorization: Bearer <token>` trả về `200`.
2. `test_missing_or_invalid_signature_returns_401`: Gọi `GET /gradio_api/info` không có header `Authorization` hoặc token bị sửa chữ ký → nhận `401` với `{"detail": "Unauthorized"}`.
3. `test_expired_or_wrong_audience_returns_401`: Token có `exp = time.time() - 10` hoặc `aud = "other"` (không phải `service_role`) → nhận `401`.
4. `test_options_preflight_bypasses_auth_with_cors_headers`: Gọi `OPTIONS /gradio_api/call/process_images` với `Origin: http://localhost:5173` và `Access-Control-Request-Headers: authorization,content-type` (không gửi `Authorization`) → nhận `200` kèm header `access-control-allow-origin`.

- [ ] **Step 2: Chạy test để xác nhận thất bại (RED)**

Run:

```powershell
C:\Users\minhd\AppData\Local\Programs\Python\Python312\python.exe -m unittest d:\vton-ai\test_auth.py -v
```

Expected: FAIL với `ModuleNotFoundError: No module named 'auth'`.

- [ ] **Step 3: Triển khai `d:\vton-ai\auth.py` và gắn vào `d:\vton-ai\main.py`**

- Trong `d:\vton-ai\auth.py`:
  - Cài đặt `verify_gotrue_jwt(token, jwks_keys, expected_aud="authenticated")`, hàm lấy & cache JWKS từ `${GOTRUE_URL}/.well-known/jwks.json` (mặc định `http://localhost:9999`) qua `httpx.get`, và `configure_vton_security(app, jwks_fetcher=None)`.
  - Lưu ý thứ tự middleware trong FastAPI/Starlette: đăng ký HTTP auth middleware trước rồi gọi `app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])` sau để `CORSMiddleware` bọc ngoài cùng (luôn đính kèm CORS headers kể cả khi auth middleware trả về `401`).
- Trong `d:\vton-ai\main.py`:
  - Import `configure_vton_security` từ `auth` và đổi dòng `app = gr.mount_gradio_app(FastAPI(), demo, path="/")` thành:
    ```python
    fastapi_app = configure_vton_security(FastAPI())
    app = gr.mount_gradio_app(fastapi_app, demo, path="/")
    ```

- [ ] **Step 4: Chạy lại unit test xác nhận PASS (GREEN)**

Run:

```powershell
C:\Users\minhd\AppData\Local\Programs\Python\Python312\python.exe -m unittest d:\vton-ai\test_auth.py -v
```

Expected: 4 tests PASS (`OK`).

---

### Task 2: Chuyển Tiếp Header `Authorization` Từ `ai-backend` (Cổng `3002`) Sang `vton-ai` (`8001`)

**Files:**

- Modify: `d:\fashionstore-node\apps\ai-backend\src\lib\ai\tools\tryOn.ts:102-157`
- Modify: `d:\fashionstore-node\apps\ai-backend\src\lib\ai\agent.ts:39-50`
- Test: `d:\fashionstore-node\apps\ai-backend\src\lib\ai\tools\tryOn.test.ts`

**Interfaces:**

- Consumes: `config.authorization: string` từ `createAgentTools(config: { authorization: string; context: AgentRequestContext })`.
- Produces:
  - `createTryOnTool(config?: { authorization?: string })` trong `d:\fashionstore-node\apps\ai-backend\src\lib\ai\tools\tryOn.ts`:
    - Nếu `config?.authorization` khác `undefined` và khác `""`:
      - Truyền `{ headers: { Authorization: config.authorization } }` vào tham số thứ 2 của `Client.connect(resolveVtonApiUrl(), { headers: { Authorization: config.authorization } })`.
      - Truyền `{ Authorization: config.authorization }` vào `fetchBlob(resultUrl, "Không tải được ảnh kết quả thử đồ, vui lòng thử lại sau.", { Authorization: config.authorization })`.

- [ ] **Step 1: Viết bài test thất bại trong `d:\fashionstore-node\apps\ai-backend\src\lib\ai\tools\tryOn.test.ts`**

Thêm test case vào `describe("createTryOnTool", ...)`:

```ts
it('đính kèm header Authorization vào Client.connect và khi tải ảnh kết quả từ vton-ai nếu được cấu hình', async function () {
  const mockFetch = stubFetch()
  vtonApp({
    data: [[{ image: { url: 'http://localhost:8001/file=out.png' }, caption: null }]],
  })
  mockUpload.mockResolvedValue({
    key: 'tryon/abc.png',
    url: 'https://assets.test/tryon/abc.png',
  })
  const tool = createTryOnTool({ authorization: 'Bearer user-jwt-token' })

  await tool.execute(validInput(), executeOptions())

  expect(mockConnect).toHaveBeenCalledWith('http://localhost:8001', {
    headers: { Authorization: 'Bearer user-jwt-token' },
  })
  expect(mockFetch).toHaveBeenLastCalledWith('http://localhost:8001/file=out.png', {
    headers: { Authorization: 'Bearer user-jwt-token' },
  })
})
```

- [ ] **Step 2: Chạy test để xác nhận thất bại (RED)**

Run (in `d:\fashionstore-node`):

```powershell
pnpm --filter ai-backend test -- src/lib/ai/tools/tryOn.test.ts
```

Expected: FAIL vì `createTryOnTool` chưa nhận `{ authorization }` và chưa truyền `headers`.

- [ ] **Step 3: Cập nhật `tryOn.ts` và `agent.ts` trong `d:\fashionstore-node\apps\ai-backend`**

- Trong `tryOn.ts`:
  - Mở rộng `fetchBlob(url: string, failureMessage: string, headers?: Record<string, string>): Promise<Blob>` để gọi `fetch(url, { headers })` khi `headers !== undefined`.
  - Mở rộng `createTryOnTool(config?: { authorization?: string })` để tạo `authHeaders` khi `config?.authorization` có giá trị, truyền `{ headers: authHeaders }` vào `Client.connect(resolveVtonApiUrl(), ...)` (khi không có `authHeaders` thì gọi `Client.connect(resolveVtonApiUrl())` như cũ) và truyền `authHeaders` vào `fetchBlob(resultUrl, ..., authHeaders)`.
- Trong `agent.ts`:
  - Đổi `tryOn: createTryOnTool()` thành `tryOn: createTryOnTool({ authorization: config.authorization })`.

- [ ] **Step 4: Chạy gate kiểm tra của `ai-backend` (GREEN)**

Run (in `d:\fashionstore-node`):

```powershell
pnpm --filter ai-backend check; pnpm --filter ai-backend test; pnpm --filter ai-backend build
```

Expected: Toàn bộ test và build PASS, 0 lỗi lint/typecheck.

- [ ] **Step 5: Commit thay đổi tại `d:\fashionstore-node`**

```powershell
cd d:\fashionstore-node
git add apps/ai-backend/src/lib/ai/tools/tryOn.ts apps/ai-backend/src/lib/ai/tools/tryOn.test.ts apps/ai-backend/src/lib/ai/agent.ts
git commit -m "feat(ai-backend): forward user Authorization JWT to vton-ai"
```

---

### Task 3: Module `vtonClient.ts` Trên `fashionstore-ui` Kết Nối Trực Tiếp `vton-ai` Kèm Bearer JWT

**Files:**

- Modify: `d:\fashionstore\fashionstore-ui\package.json`
- Modify: `d:\fashionstore\fashionstore-ui\.env`
- Create: `d:\fashionstore\fashionstore-ui\src\lib\ai\vtonClient.ts`
- Test: `d:\fashionstore\fashionstore-ui\src\lib\ai\vtonClient.test.ts`

**Interfaces:**

- Consumes: `getAuthClient()` từ `@/lib/auth`, `Client` từ `@gradio/client`.
- Produces (trong `src/lib/ai/vtonClient.ts`):
  - `export const DEFAULT_VTON_API_URL = 'http://localhost:8001'`
  - `export type TryOnMode = 'top' | 'bottom' | 'full'`
  - `export interface VtonConfig { vtonUrl: string }`
  - `export function readVtonConfig(): VtonConfig` — đọc `import.meta.env.VITE_VTON_API_URL`, nếu trống hoặc chỉ có khoảng trắng thì trả về `{ vtonUrl: DEFAULT_VTON_API_URL }`.
  - `export function inferTryOnMode(name: string, description: string): TryOnMode`:
    - Gộp `(name + ' ' + description).toLowerCase()`.
    - Nếu chứa `'đầm'`, `'váy liền'`, `'jumpsuit'`, `'set'`, hoặc `'bộ'` → trả về `'full'`.
    - Nếu chứa `'quần'` hoặc `'chân váy'` → trả về `'bottom'`.
    - Còn lại → trả về `'top'`.
  - `export interface DirectTryOnInput { personFile: File; garmentImageUrl: string; mode: TryOnMode; vtonUrl?: string }`
  - `export interface DirectTryOnResult { objectUrl: string; blob: Blob }`
  - `export async function runDirectTryOn(input: DirectTryOnInput): Promise<DirectTryOnResult>`:
    1. Lấy token qua `const { data } = await getAuthClient().getSession()`. Nếu `!data.session?.access_token` → throw `new Error('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.')`.
    2. Tải ảnh Garment từ `input.garmentImageUrl` qua `fetch(input.garmentImageUrl)` và chuyển thành `File` (`garment.<ext>`). Nếu lỗi mạng hoặc `!response.ok` → throw `new Error('Không tải được ảnh sản phẩm, vui lòng thử lại sau.')`.
    3. Gọi `const app = await Client.connect(targetUrl, { headers: { Authorization: 'Bearer ' + token } })` và `const result = await app.predict('/process_images', { images: [input.personFile, garmentFile], mode: input.mode })`, trích xuất `resultUrl` từ `result.data`. Nếu lỗi hoặc dữ liệu không hợp lệ → throw `new Error('Tạo ảnh thử đồ thất bại, vui lòng thử lại sau.')`.
    4. Gọi `fetch(resultUrl, { headers: { Authorization: 'Bearer ' + token } })` lấy `resultBlob`. Nếu lỗi hoặc `!response.ok` → throw `new Error('Không tải được ảnh kết quả thử đồ, vui lòng thử lại sau.')`.
    5. Trả về `{ blob: resultBlob, objectUrl: window.URL.createObjectURL(resultBlob) }`.

- [ ] **Step 1: Cài `@gradio/client` vào `fashionstore-ui`, thêm `VITE_VTON_API_URL` vào `.env` và viết bài test thất bại `src/lib/ai/vtonClient.test.ts`**

1. Cài đặt `@gradio/client`:
   ```powershell
   cd d:\fashionstore\fashionstore-ui
   pnpm add @gradio/client
   ```
2. Thêm `VITE_VTON_API_URL=http://localhost:8001` vào `d:\fashionstore\fashionstore-ui\.env`.
3. Tạo `d:\fashionstore\fashionstore-ui\src\lib\ai\vtonClient.test.ts` kiểm tra:
   - `inferTryOnMode`: phân loại đúng `'top'` (`"Áo sơ mi lụa"`), `'bottom'` (`"Quần jean ống rộng"`, `"Chân váy xếp ly"`), và ưu tiên `'full'` cho `"Đầm maxi đi biển"`, `"Bộ pijama áo quần lụa"`, `"Set vest nữ kèm quần âu"`.
   - `runDirectTryOn` thành công: lấy token từ `getAuthClient().getSession()`, tải ảnh Garment thành `File`, gọi `Client.connect('http://localhost:8001', { headers: { Authorization: 'Bearer test-jwt' } })`, gọi `predict('/process_images', { images: [personFile, garmentFile], mode: 'top' })`, tải ảnh kết quả kèm header `Authorization: Bearer test-jwt`, và trả về `{ blob, objectUrl }`.
   - Khi chưa đăng nhập (`session: null`) → throw `"Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại."` trước khi gọi `fetch` hay `Client.connect`.
   - Khi tải ảnh Garment 404 → throw `"Không tải được ảnh sản phẩm, vui lòng thử lại sau."`.
   - Khi Gradio `predict` lỗi hoặc trả mảng rỗng → throw `"Tạo ảnh thử đồ thất bại, vui lòng thử lại sau."`.
   - Khi tải ảnh kết quả 401/404 → throw `"Không tải được ảnh kết quả thử đồ, vui lòng thử lại sau."`.

- [ ] **Step 2: Chạy test để xác nhận thất bại (RED)**

Run (in `d:\fashionstore\fashionstore-ui`):

```powershell
pnpm test src/lib/ai/vtonClient.test.ts
```

Expected: FAIL với `Cannot find module './vtonClient'`.

- [ ] **Step 3: Triển khai `d:\fashionstore\fashionstore-ui\src\lib\ai\vtonClient.ts`**

Viết `vtonClient.ts` theo đúng chữ ký trong phần Interfaces (tuyệt đối không dùng toán tử 3 ngôi `? :`).

- [ ] **Step 4: Chạy test để xác nhận PASS (GREEN)**

Run (in `d:\fashionstore\fashionstore-ui`):

```powershell
pnpm test src/lib/ai/vtonClient.test.ts
```

Expected: Toàn bộ test trong `vtonClient.test.ts` PASS.

- [ ] **Step 5: Commit Task 3**

```powershell
cd d:\fashionstore\fashionstore-ui
git add package.json pnpm-lock.yaml src/lib/ai/vtonClient.ts src/lib/ai/vtonClient.test.ts
git commit -m "feat(tryon): add direct vtonClient with GoTrue Bearer JWT auth"
```

---

### Task 4: Cập Nhật `VirtualTryOn.tsx` Gọi Trực Tiếp `vtonClient` (Bỏ Cổng `3002` & Bỏ Upload Ảnh Cá Nhân Lên S3)

**Files:**

- Modify: `d:\fashionstore\fashionstore-ui\src\pages\VirtualTryOn.tsx`
- Modify: `d:\fashionstore\fashionstore-ui\src\pages\VirtualTryOn.test.tsx`

**Interfaces:**

- Consumes: `inferTryOnMode`, `runDirectTryOn`, `DirectTryOnInput`, `DirectTryOnResult` từ `@/lib/ai/vtonClient`, `MAX_IMAGE_BYTES` từ `@/lib/api/uploadImage`.
- Produces:
  - `export interface VirtualTryOnProps { vtonUrl?: string; runTryOn?: (input: DirectTryOnInput) => Promise<DirectTryOnResult> }` trong `src/pages/VirtualTryOn.tsx`.
  - Khi người dùng kéo-thả hoặc chọn ảnh cá nhân hợp lệ (`image/*`, `<= 5 MB`): lưu trực tiếp `file: File` và `previewUrl: URL.createObjectURL(file)` với `status: 'ready'` (không gọi `uploadImageWithUrl` lên S3).
  - Khi bấm **"Bắt đầu Thử Đồ Ảo AI"**: gọi `runTryOn` (mặc định là `runDirectTryOn`) với `{ personFile, garmentImageUrl: primaryTryOnImageUrl, mode: inferTryOnMode(product.name ?? '', product.description ?? ''), vtonUrl }`, hiển thị thanh tiến trình `TRYON_PROGRESS_STEPS` trong lúc đang chạy, thu hồi `objectUrl` cũ nếu có, và hiển thị ảnh kết quả khi hoàn tất (hoặc hiển thị thông báo lỗi từ `Error.message` / `"Có lỗi khi tạo ảnh thử đồ. Vui lòng thử lại với ảnh rõ nét hơn."`).

- [ ] **Step 1: Cập nhật `d:\fashionstore\fashionstore-ui\src\pages\VirtualTryOn.test.tsx` theo luồng gọi trực tiếp `runTryOn` (RED)**

Cập nhật các bài test trong `VirtualTryOn.test.tsx`:

1. Kéo-thả một file ảnh hợp lệ vào dropzone → hiển thị ngay ảnh preview `"Ảnh cá nhân của bạn"` và bật nút `"Bắt đầu Thử Đồ Ảo AI"` ngay lập tức mà **không** cần chờ upload S3.
2. Kéo-thả file không phải ảnh hoặc `> 5 MB` → hiển thị `"Chỉ nhận file ảnh."` / `"Ảnh tối đa 5 MB."` và nút bắt đầu vẫn `disabled`.
3. Bấm `"Bắt đầu Thử Đồ Ảo AI"` khi `runTryOn` đang pending → hiển thị trạng thái chờ `"Đang tạo ảnh thử đồ, chờ chút nhé…"` kèm thanh `progressbar` và các bước tiến trình.
4. Khi `runTryOn` hoàn tất trả về `{ objectUrl: 'blob:https://assets.test/tryon-res', blob: ... }` → truyền đúng `{ personFile, garmentImageUrl: 'https://assets.test/garment-p1.png', mode: 'top' }`, hiển thị `"Ảnh kết quả thử đồ"`, hỗ trợ `"So sánh Trước / Sau"`, `"Phóng to ảnh"` và `"Tải ảnh về máy"`.
5. Khi sản phẩm có nhiều ảnh Garment và người mua bấm chọn mẫu thứ 2 rồi bấm `"Bắt đầu Thử Đồ Ảo AI"` → `runTryOn` được gọi với đúng `garmentImageUrl` của mẫu thứ 2 (`'https://assets.test/garment-black.png'`).
6. Khi `runTryOn` reject lỗi → hiển thị `role="alert"` thông báo lỗi thử đồ và thoát trạng thái loading.

- [ ] **Step 2: Chạy test để xác nhận thất bại (RED)**

Run (in `d:\fashionstore\fashionstore-ui`):

```powershell
pnpm test src/pages/VirtualTryOn.test.tsx
```

Expected: FAIL vì `VirtualTryOn.tsx` vẫn đang dùng `useChat` và `uploadImageWithUrl`.

- [ ] **Step 3: Cập nhật `d:\fashionstore\fashionstore-ui\src\pages\VirtualTryOn.tsx`**

- Xóa các import `useChat`, `readAgentConfig`, `createChatTransport`, `uploadImageWithUrl`, `EMPTY_FILTERS`.
- Import `inferTryOnMode`, `runDirectTryOn` (và type `DirectTryOnInput`, `DirectTryOnResult`) từ `@/lib/ai/vtonClient`.
- Trong `UploadedPersonImage`, giữ `{ previewUrl: string | null; status: 'ready' | 'error'; filename?: string; file?: File; error?: string }`.
- Quản lý state `isGenerating: boolean`, `tryOnError: string | null`, `resultImageUrl: string | null` (nhớ `window.URL.revokeObjectURL(resultImageUrl)` khi tạo lượt mới hoặc khi component unmount).
- Trong `handleStartTryOn()`: gọi `runner({ personFile: readyFile, garmentImageUrl: primaryTryOnImageUrl, mode: inferTryOnMode(product.name ?? '', product.description ?? ''), vtonUrl: props.vtonUrl })`.

- [ ] **Step 4: Chạy toàn bộ cổng kiểm tra của `fashionstore-ui` (GREEN)**

Run (in `d:\fashionstore\fashionstore-ui`):

```powershell
pnpm format; pnpm lint; pnpm test; pnpm build
```

Expected: 0 lỗi format/lint/build, toàn bộ test suite PASS.

- [ ] **Step 5: Commit Task 4 và tài liệu Spec/Plan**

```powershell
cd d:\fashionstore\fashionstore-ui
git add docs/superpowers/specs/2026-11-27-direct-vton-ai-tryon-design.md docs/superpowers/plans/2026-11-27-direct-vton-ai-tryon.md src/pages/VirtualTryOn.tsx src/pages/VirtualTryOn.test.tsx
git commit -m "feat(tryon): connect VirtualTryOn page directly to vton-ai with JWT auth"
```
