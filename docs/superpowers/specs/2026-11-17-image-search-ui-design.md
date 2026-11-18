# Spec & Thiết Kế: Tìm sản phẩm bằng ảnh trên trang `/search`

**Ngày:** 2026-11-17  
**Nhánh:** `feature/image-search-ui` (chỉ `fashionstore-ui`)  
**Backend liên quan:** `POST /api/search/products/by-image` — đã triển khai ở repo `backend`, commit `cf8b22e`.

---

## 1. Mục Đích & Bối Cảnh (Intent & Why)

Khách hàng thời trang thường có sẵn một ảnh thực tế (chụp ngoài đời, ảnh từ mạng) nhưng không biết tên sản phẩm để gõ từ khóa. Backend đã có endpoint nhận ảnh, trả về vector Fashion-CLIP rồi truy vấn ANN top-N. Frontend hiện **chưa có giao diện nào** để dùng endpoint đó.

Mục tiêu: thêm một chế độ "Tìm bằng ảnh" ngay trên trang `/search`, cho khách public (không cần đăng nhập) upload một ảnh và xem các sản phẩm giống nhất ngay tại chỗ.

---

## 2. Mục Tiêu (Goals), Ngoài Phạm Vi (Non-Goals) & Chống Mục Tiêu (Anti-Goals)

### Mục tiêu

1. Cập nhật spec OpenAPI từ backend rồi `pnpm codegen` để có hook gọi endpoint ảnh — **không viết tay HTTP client cho endpoint này**.
2. Thêm chế độ `image` trên `/search`, chuyển đổi với chế độ `text` hiện tại mà không làm mất filter/từ khóa đã nhập.
3. Giao diện upload: chọn file hoặc kéo thả, validate ảnh, preview, gửi ảnh, hiển thị trạng thái loading.
4. Hiện badge phần trăm giống trên mỗi kết quả, tái dùng `ProductCard`/`ProductRow`.
5. Map lỗi 400/413/415/503 sang thông điệp tiếng Việt; xử lý kết quả rỗng.
6. Test ở mức component + hàm map lỗi; các cổng `pnpm format`, `pnpm lint`, `pnpm build`, `pnpm test` xanh trước khi commit.

### Ngoài phạm vi (Non-Goals)

- Điểm vào thứ hai (nút "Tìm tương tự" trên trang chi tiết sản phẩm / trang shop) — đã cân nhắc và **loại** theo lựa chọn của người dùng.
- Lưu lịch sử các lần tìm ảnh, share link kết quả, pagination/filter trên kết quả ảnh (backend không hỗ trợ).
- Gọi presign/S3 rồi gửi `uploadId` — endpoint ảnh nhận trực tiếp multipart file.
- Thay đổi backend, worker, luồng BM25, routing, hoặc các file seller đang dở trên working tree.

### Chống mục tiêu (Anti-Goals)

- Cấm sửa tay bất cứ file nào trong `generated/` — mọi thay đổi phải đi qua `pnpm codegen`.
- Cấm tái dùng hằng `MAX_IMAGE_BYTES = 5MB` của `src/lib/api/uploadImage.ts` cho luồng tìm ảnh; luồng này giới hạn **8MB** theo backend. Đặt hằng riêng, đặt tên rõ để không nhầm.
- Cấm biến badge similarity thành cam kết độ chính xác: giá trị chỉ là `1 − cosine distance`, đã clamp để hiển thị.

---

## 3. Các Phương Án Đã Cân Nhắc & Lựa Chọn (Approaches)

- **Phương án 1 (Đã chọn): Component tách riêng + hook sinh bởi Orval.**
  - Copy `backend/docs/openapi.json` sang `frontend/docs/openapi.json`, chạy `pnpm codegen`.
  - `ImageSearchPanel.tsx` giữ state file + gọi hook `useByImage`; `Search.tsx` chỉ giữ `mode` và nhận kết quả.
  - _Đánh giá:_ đúng cấu trúc `components/search/`, tận dụng code sinh, mỗi thứ một việc, không sinh abstraction thừa.
- **Phương án 2 (Bị loại): Thêm custom hook `useImageSearch` riêng.**
  - _Nhược điểm:_ với một endpoint duy nhất thì tầng hook trung gian là thừa; hook sinh ra đã là React Query mutation.
- **Phương án 3 (Bị loại): Viết hết vào `Search.tsx`.**
  - _Nhược điểm:_ file đã ~540 dòng, tiếp tục phình và khó test.

---

## 4. Thiết Kế Chi Tiết

### 4.1. API contract & codegen

- Nguồn: `backend/docs/openapi.json` (đã chứa path `/api/search/products/by-image`, `operationId: byImage`, tag `Search`).
- Đích: `frontend/docs/openapi.json`. Copy đè rồi chạy `pnpm codegen`.
- Kết quả kỳ vọng (cần xác nhận bằng file sinh thực tế):
  - `generated/endpoints/search/search.ts`: hook mutation `useByImage`.
  - `generated/model/imageSearchResponse.ts`, `imageSearchHit.ts`.
- Nếu Orval sinh tên hook/kiểu khác, dùng tên thật và ghi rõ trong plan/ledger — không sửa generated.

**Hợp đồng endpoint:**

| Mục           | Giá trị                                                                  |
| ------------- | ------------------------------------------------------------------------ |
| Method / path | `POST /api/search/products/by-image`                                     |
| Auth          | Public (`permitAll`), nhưng mutator vẫn gắn token nếu có session         |
| Body          | `multipart/form-data`, field bắt buộc `file` (binary)                    |
| Query         | `limit` (mặc định 20, `1..100`)                                          |
| 200           | `{ items: [{ id, name, slug, minPrice, defaultImageUrl, similarity }] }` |
| 400           | File rỗng hoặc không decode được                                         |
| 413           | Ảnh lớn hơn 8MB                                                          |
| 415           | Content-type không phải `image/*`                                        |
| 503           | Worker embedding chưa sẵn sàng                                           |

### 4.2. Trạng thái & luồng dữ liệu trong `Search.tsx`

- Thêm `const [mode, setMode] = useState<'text' | 'image'>('text')`.
- Nút chuyển chế độ đặt cạnh khu vực tiêu đề/bộ lọc: "Tìm bằng ảnh" / "Tìm bằng từ khóa".
- Khi `mode === 'image'`:
  - Ẩn khối tìm kiếm text (hot tags, filter panel, sort tabs, pagination) bằng điều kiện render, **không unmount/đặt lại** `useSearchParams`.
  - Render `<ImageSearchPanel onResults={...} onClear={...} />`.
- `Search.tsx` giữ state `imageHits: ImageSearchHit[]`. Grid/list render chung: map `ImageSearchHit` sang shape `ProductSummaryResponse` rồi truyền vào `ProductCard`/`ProductRow` kèm `similarity`.
- Khi quay lại `mode === 'text'`: query params cũ còn nguyên; dọn `imageHits`.

### 4.3. Component `ImageSearchPanel.tsx`

Đặt tại `src/components/search/ImageSearchPanel.tsx`.

- Props: `onResults: (hits: ImageSearchHit[]) => void`, `onClear: () => void`.
- State nội bộ: `file: File | null`, `previewUrl: string | null`, `error: string | null`.
- Hằng riêng: `const MAX_QUERY_IMAGE_BYTES = 8 * 1024 * 1024`.
- Validate khi chọn/kéo file (trước khi gọi API):
  - `file.type.startsWith('image/') === false` → lỗi "Chỉ nhận file ảnh."
  - `file.type === 'image/svg+xml'` → lỗi "Không nhận file SVG."
  - `file.size > MAX_QUERY_IMAGE_BYTES` → lỗi "Ảnh tối đa 8 MB."
- Dropzone: `onClick` mở `<input type="file" accept="image/*" hidden>`, đồng thời hỗ trợ `onDragOver`/`onDrop` với viền nổi bật khi kéo vào.
- Preview: `<img src={previewUrl}>` + tên file + dung lượng (dùng `formatVnd` chỉ cho tiền; dung lượng hiện KB/MB bằng hàm nhỏ cục bộ); nút "Đổi ảnh"/"Xóa".
- `URL.revokeObjectURL(previewUrl)` khi xoá ảnh và khi unmount.
- Submit: nút "Tìm sản phẩm giống ảnh", `disabled` khi `file === null` hoặc mutation đang pending. Loading: spinner + "Đang tìm…".
- Gọi mutation hook do Orval sinh với `file` và `limit: 20`, theo đúng chữ ký thực tế (xác nhận ngay sau `pnpm codegen`; nếu khác `mutateAsync({ file, limit })` thì ghi ruling và dùng chữ ký thật). Khi thành công: `onResults(data.items ?? [])`. Khi lỗi: `setError(imageSearchErrorText(err))`.
- Kết quả rỗng: `onResults([])`, component cha hiện thông báo "Không tìm thấy sản phẩm giống ảnh này."

### 4.4. Badge similarity trên card

- Thêm prop tuỳ chọn `similarity?: number` vào `ProductCard` (`src/components/home/Sections.tsx`) và `ProductRow` (`src/components/search/ProductRow.tsx`).
- Khi có giá trị: render badge góc phải ảnh, nội dung `similarityPercent(similarity) + '% giống'`.
- Hàm thuần `similarityPercent(similarity: number): number` đặt tại `src/lib/format.ts` (test cạnh `src/lib/format.test.ts`): làm tròn `Math.round(clamp(similarity, 0, 1) * 100)`; similarity âm → `0`. Ghi chú trong code: backend trả `1 − cosine distance`, nên về mặt lý thuyết nằm trong `[-1, 1]`.
- Adapter `imageHitToSummary(hit: ImageSearchHit): ProductSummaryResponse` (đặt trong `src/lib/api/apiAdapters.ts`): copy `id`, `name`, `slug`, `minPrice`, `defaultImageUrl`. Các field này đều optional trong type sinh nên khớp; **không** bịa `rank` hay field BM25.

### 4.5. Map lỗi

Thêm key `imageSearch` vào `ERROR_MESSAGES` trong `src/lib/api/apiAdapters.ts`. Hàm `imageSearchErrorText(err: unknown)` gọi `hookErrorMessage('imageSearch', err)` để lấy thông điệp theo status:

| Status | Thông điệp                                                |
| ------ | --------------------------------------------------------- |
| 400    | Ảnh không hợp lệ. Vui lòng chọn ảnh khác.                 |
| 413    | Ảnh quá lớn. Dung lượng tối đa là 8 MB.                   |
| 415    | Định dạng không được hỗ trợ. Hãy dùng JPG, PNG hoặc WebP. |
| 503    | Dịch vụ tìm kiếm đang bận. Vui lòng thử lại sau.          |

Fallback dùng `apiErrorText(err, 'Đã xảy ra lỗi. Vui lòng thử lại sau.')`. Lỗi validate ở client (trước khi gọi API) hiện trực tiếp bằng `error` state, không đi qua hàm map status.

### 4.6. Edge case

- Chọn file rồi đổi file trong lúc đang gọi: React Query mutation giữ lời gọi mới nhất; cũ bị huỷ bởi `mutateAsync` tiếp theo. Không cần logic huỷ tay.
- Kéo thả nhiều file cùng lúc: chỉ lấy `files[0]`, báo "Chỉ hỗ trợ một ảnh mỗi lần tìm" nếu `length > 1`.
- File ảnh có EXIF/alpha/palette: backend/Pillow lo convert RGB; frontend không xử lý.
- `previewUrl` là object URL: phải revoke, kể cả khi component unmount giữa chừng.
- Ảnh đúng 8MB: client chặn ở mức `> 8MB`, backend có thể trả 413 do overhead protobuf — map chung về thông điệp 8MB.

---

## 5. Testing

- `src/components/search/ImageSearchPanel.test.tsx` (Testing Library + user-event, mock hook sinh):
  - từ chối file không phải ảnh / SVG / quá 8MB và không gọi mutate;
  - chọn ảnh hợp lệ → preview + gọi mutate đúng `{ file, limit: 20 }`;
  - lỗi 413/503 → hiện thông điệp đúng;
  - thành công với `items: []` → `onResults([])`;
  - chọn >1 file khi kéo thả → báo lỗi, chỉ lấy file đầu.
- `src/lib/api/apiAdapters.test.ts`: bổ sung test hàm map lỗi ảnh cho 400/413/415/503 + fallback.
- Card/badge: test hàm `similarityPercent` (âm → 0, 0.5 → 50, 1 → 100) trong `src/lib/format.test.ts`.
- Cổng trước commit: `pnpm format`, `pnpm lint` (0 error, 0 warning), `pnpm build`, `pnpm test` — tất cả xanh. Không tự ý bỏ cổng nào.
- Không test tích hợp thật với backend/worker trong spec này (cần chạy cả 3 tiến trình); để e2e tay nếu cần.

---

## 6. Phạm Vi Commit & Nhánh

- Nhánh: `feature/image-search-ui`, tách từ `origin/master` tại `6757482` (merge PR #46 `feature/account-menu-redesign`). Không tách từ `feature/shop-route-visual-refresh` như bản đầu dự định.
- Các file seller từng ở working tree đã được commit riêng trên `feature/shop-route-visual-refresh` (`1151114`); chúng **không có** trong nhánh này. Working tree sạch — không cần dọn, không được kéo vào commit feature.
- Spec này là commit đầu tiên của nhánh. Sau đó là plan, rồi mới đến code.
- Không đặt upstream cho nhánh này (`git branch --unset-upstream`) để tránh `git push` nhầm vào `master`.

---

## 7. Rủi Ro & Quyết Định Đã Chốt

- **Tên hook do Orval sinh** có thể khác `useByImage`: sẽ xác nhận bằng file trong `generated/` sau khi codegen, ghi ruling nếu khác.
- **Badge % giống** có thể là `0%` dù item đứng đầu (similarity âm): chấp nhận, vì đã clamp; không hiện số âm cho khách.
- **OpenAPI của frontend đang cũ** (khác hash bản backend): bắt buộc copy + codegen trước khi viết component, nếu không type `ImageSearchHit` không tồn tại.
- **Endpoint public nhưng mutator vẫn gọi `getSession()`**: không sao, token gửi thêm vào endpoint public bị bỏ qua; không sửa `apiFetch.ts`.
