# Seller Reviews — Grouped by Product Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thay thế danh sách đánh giá phẳng (flat list) trong tab "Xem & Phản hồi Đánh giá" của shop thành giao diện gom nhóm theo sản phẩm — mỗi sản phẩm là một accordion có ảnh thumbnail + tên + bộ đếm đánh giá, bên trong chứa toàn bộ đánh giá của sản phẩm đó cùng chức năng phản hồi/báo cáo đầy đủ.

**Architecture:** Toàn bộ thay đổi nằm ở frontend (`fashionstore-ui`). API backend giữ nguyên — dữ liệu trả về đã có `productId` và `productName` trên từng review. Frontend nhóm reviews theo `productId` ngay trong component, hiển thị theo thứ tự số lượng đánh giá giảm dần. Bộ lọc sao/unreplied/sản phẩm vẫn hoạt động như cũ; khi lọc theo 1 sản phẩm cụ thể, chỉ còn 1 nhóm. Logic phản hồi/báo cáo/lightbox/toast không đổi.

**Tech Stack:** React 19, TypeScript 7, Tanstack Query v5, Phosphor Icons, Tailwind CSS v4, Vitest + Testing Library

**Spec:** (yêu cầu từ user, không có file spec riêng)

## Global Constraints

- Không thay đổi API backend, không thay đổi kiểu dữ liệu `ReviewItem` hay `SellerReviewResponse`.
- Giữ nguyên toàn bộ state và logic: `replyTargetId`, `replyContent`, `replyError`, `reportTargetId`, `lightboxMedia`, `notification`, filters.
- Không dùng thư viện accordion bên ngoài — dùng `useState` toggle thuần.
- Giữ nguyên tên file và export: `SellerReviewsTab.tsx`.
- Tên class Tailwind phải nhất quán với design system hiện tại (rounded-2xl/3xl, indigo-_, zinc-_, dark mode).
- Test file: `SellerReviewsTab.test.tsx` — tất cả test cũ phải vẫn pass, thêm test mới cho hành vi grouping.

## Review Focus

- **Lọc "Chưa phản hồi" + group:** khi tất cả review trong 1 nhóm đều đã được phản hồi nhưng filter unreplied=false, nhóm vẫn hiện đúng; khi unreplied=true và nhóm không còn review nào thỏa, nhóm biến mất.
- **Accordion đóng/mở độc lập:** mở group A không đóng group B; click lại header đóng group.
- **Phản hồi xuyên nhóm:** form reply mở ở review thuộc group A, người dùng mở group B, form reply group A không bị clear.
- **Nhóm theo sản phẩm bị xóa (productName undefined):** productName fallback sang `"Sản phẩm không xác định"` thay vì crash.
- **Thứ tự nhóm ổn định:** sau khi gửi reply thành công (query invalidate + refetch), thứ tự các nhóm không bị xáo trộn bất ngờ — sắp xếp theo `reviewCount` giảm dần, tie-break bằng `productId` alphabetical.

---

## Task 1: Thêm helper `groupReviewsByProduct` vào `sellerAdapters.ts`

**Files:**

- Modify: `src/lib/seller/sellerAdapters.ts`
- Test: `src/lib/seller/sellerAdapters.test.ts`

**Interfaces:**

- Consumes: `ReviewItem` từ `@/types/seller/reviews.ts` (trường `productId` cần thêm — xem Task 2)
- Produces:

  ```ts
  export interface ReviewGroup {
    productId: string
    productName: string
    reviews: ReviewItem[]
  }
  export function groupReviewsByProduct(reviews: ReviewItem[]): ReviewGroup[]
  ```

  Trả mảng `ReviewGroup[]` sắp xếp theo `reviews.length` giảm dần, tie-break `productId` alphabetical.

- [ ] **Step 1: Thêm `productId: string` vào `ReviewItem` trong `src/types/seller/reviews.ts`**

  Thêm field `productId: string` sau `id: string`. Field này map từ `SellerReviewResponse.productId` (đã có trên backend).

- [ ] **Step 2: Cập nhật adapter `reviewItem()` trong `sellerAdapters.ts` để map `productId`**

  Trong hàm `reviewItem(review, productName)` hiện tại, thêm `productId: safeId(review.productId)` vào object trả về.

- [ ] **Step 3: Viết failing test cho `groupReviewsByProduct`**

  ```ts
  // src/lib/seller/sellerAdapters.test.ts — thêm describe block mới
  describe('groupReviewsByProduct', () => {
    it('gom đúng nhóm, sắp xếp theo reviewCount giảm dần, tie-break productId alpha', () => {
      const makeRev = (productId: string, productName: string, id: string): ReviewItem => ({
        id,
        productId,
        productName,
        buyerName: 'X',
        rating: 5,
        comment: '',
        images: [],
        tags: [],
        helpfulCount: 0,
        anonymous: false,
        isReported: false,
        createdAt: '2026-01-01',
      })
      const revs = [
        makeRev('p1', 'Áo Thun', 'r1'),
        makeRev('p2', 'Quần Jeans', 'r2'),
        makeRev('p1', 'Áo Thun', 'r3'),
        makeRev('p3', 'Giày', 'r4'),
        makeRev('p2', 'Quần Jeans', 'r5'),
        makeRev('p2', 'Quần Jeans', 'r6'),
      ]
      const result = groupReviewsByProduct(revs)
      expect(result).toHaveLength(3)
      expect(result[0]).toMatchObject({
        productId: 'p2',
        reviews: expect.arrayContaining([expect.objectContaining({ id: 'r2' })]),
      })
      expect(result[0].reviews).toHaveLength(3)
      expect(result[1].productId).toBe('p1')
      expect(result[2].productId).toBe('p3')
    })

    it('productName undefined → fallback "Sản phẩm không xác định"', () => {
      const rev: ReviewItem = {
        id: 'r1',
        productId: 'p1',
        productName: '',
        buyerName: 'X',
        rating: 5,
        comment: '',
        images: [],
        tags: [],
        helpfulCount: 0,
        anonymous: false,
        isReported: false,
        createdAt: '2026-01-01',
      }
      const result = groupReviewsByProduct([rev])
      expect(result[0].productName).toBe('Sản phẩm không xác định')
    })

    it('mảng rỗng → trả []', () => {
      expect(groupReviewsByProduct([])).toEqual([])
    })
  })
  ```

- [ ] **Step 4: Chạy test để xác nhận FAIL**

  Run: `pnpm -C fashionstore-ui test run src/lib/seller/sellerAdapters.test.ts`
  Expected: FAIL — `groupReviewsByProduct` chưa tồn tại.

- [ ] **Step 5: Implement `groupReviewsByProduct` trong `sellerAdapters.ts`**

  ```ts
  export function groupReviewsByProduct(reviews: ReviewItem[]): ReviewGroup[] {
    const map = new Map<string, ReviewGroup>()
    for (const rev of reviews) {
      const pid = rev.productId
      if (!map.has(pid)) {
        map.set(pid, {
          productId: pid,
          productName: rev.productName.trim() !== '' ? rev.productName : 'Sản phẩm không xác định',
          reviews: [],
        })
      }
      map.get(pid)!.reviews.push(rev)
    }
    return [...map.values()].sort((a, b) => {
      const diff = b.reviews.length - a.reviews.length
      if (diff !== 0) return diff
      return a.productId.localeCompare(b.productId)
    })
  }
  ```

- [ ] **Step 6: Chạy test để xác nhận PASS**

  Run: `pnpm -C fashionstore-ui test run src/lib/seller/sellerAdapters.test.ts`
  Expected: PASS tất cả.

- [ ] **Step 7: Commit**

  ```bash
  git add src/types/seller/reviews.ts src/lib/seller/sellerAdapters.ts src/lib/seller/sellerAdapters.test.ts
  git commit -m "feat(seller-reviews): add productId to ReviewItem + groupReviewsByProduct helper"
  ```

---

## Task 2: Refactor `SellerReviewsTab` — render grouped accordion

**Files:**

- Modify: `src/components/seller-dashboard-tab/stats/SellerReviewsTab.tsx`
- Test: `src/components/seller-dashboard-tab/stats/SellerReviewsTab.test.tsx`

**Interfaces:**

- Consumes: `groupReviewsByProduct(reviews: ReviewItem[]): ReviewGroup[]` từ Task 1
- Produces: component render `<div data-testid="review-group-{productId}">` cho mỗi nhóm (dùng để test)

> [!IMPORTANT]
> Toàn bộ state/logic (filters, reply, report, toast, lightbox) giữ nguyên — chỉ thay phần render danh sách reviews.

- [ ] **Step 1: Viết failing tests cho behaviour mới**

  Thêm các test sau vào `SellerReviewsTab.test.tsx`:

  ```ts
  describe('grouped-by-product view', () => {
    it('hiển thị header nhóm sản phẩm với tên sản phẩm và số lượng đánh giá', () => {
      setupDefaultMocks()
      // mock 2 sản phẩm, 3 reviews: p1×2, p2×1
      useList3Mock.mockReturnValue({
        isLoading: false,
        data: {
          status: 200,
          data: [
            { ...baseReview, id: 'r1', productId: 'p1', productName: 'Áo Thun Oversize' },
            { ...baseReview, id: 'r2', productId: 'p1', productName: 'Áo Thun Oversize' },
            { ...baseReview, id: 'r3', productId: 'p2', productName: 'Quần Jeans' },
          ],
        },
      })
      renderTab()
      expect(screen.getByText('Áo Thun Oversize')).toBeTruthy()
      expect(screen.getByText('2 đánh giá')).toBeTruthy()
      expect(screen.getByText('Quần Jeans')).toBeTruthy()
      expect(screen.getByText('1 đánh giá')).toBeTruthy()
    })

    it('accordion toggle: click header mở/đóng danh sách review bên trong', () => {
      setupDefaultMocks()
      useList3Mock.mockReturnValue({
        isLoading: false,
        data: {
          status: 200,
          data: [{ ...baseReview, id: 'r1', productId: 'p1', productName: 'Áo Thun Oversize' }],
        },
      })
      renderTab()
      // Mặc định collapsed (không thấy comment)
      expect(screen.queryByText('Áo mặc cực kỳ thoải mái và mát.')).toBeNull()
      // Click header để expand
      fireEvent.click(screen.getByRole('button', { name: /Áo Thun Oversize/i }))
      expect(screen.getByText('Áo mặc cực kỳ thoải mái và mát.')).toBeTruthy()
      // Click lại để collapse
      fireEvent.click(screen.getByRole('button', { name: /Áo Thun Oversize/i }))
      expect(screen.queryByText('Áo mặc cực kỳ thoải mái và mát.')).toBeNull()
    })

    it('mở nhiều nhóm độc lập nhau', () => {
      setupDefaultMocks()
      useList3Mock.mockReturnValue({
        isLoading: false,
        data: {
          status: 200,
          data: [
            { ...baseReview, id: 'r1', productId: 'p1', productName: 'Áo Thun', comment: 'cmt-p1' },
            {
              ...baseReview,
              id: 'r2',
              productId: 'p2',
              productName: 'Quần Jeans',
              comment: 'cmt-p2',
            },
          ],
        },
      })
      renderTab()
      fireEvent.click(screen.getByRole('button', { name: /Áo Thun/i }))
      fireEvent.click(screen.getByRole('button', { name: /Quần Jeans/i }))
      expect(screen.getByText('cmt-p1')).toBeTruthy()
      expect(screen.getByText('cmt-p2')).toBeTruthy()
    })
  })
  ```

  Định nghĩa `baseReview` ở đầu file test (trước `describe`) như là object tương tự `useList3Mock` data hiện tại:

  ```ts
  const baseReview = {
    productId: 'p1',
    productName: 'Áo Thun Oversize',
    buyerDisplayName: 'K***g',
    variantLabel: 'L · Trắng',
    stars: 5,
    comment: 'Áo mặc cực kỳ thoải mái và mát.',
    imageKeys: ['reviews/khang-1.jpg'],
    tags: ['Chất lượng tốt', 'Size đúng chuẩn'],
    anonymous: true,
    helpfulCount: 4,
    sellerReply: null,
    isReported: false,
    createdAt: '2026-10-20T10:00:00Z',
  }
  ```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

  Run: `pnpm -C fashionstore-ui test run src/components/seller-dashboard-tab/stats/SellerReviewsTab.test.tsx`
  Expected: 3 test grouped-by-product FAIL.

- [ ] **Step 3: Thêm state `openGroupIds` vào `SellerReviewsTab`**

  Thêm sau các useState hiện có:

  ```ts
  const [openGroupIds, setOpenGroupIds] = useState<Set<string>>(new Set())
  ```

  Và helper:

  ```ts
  function toggleGroup(productId: string) {
    setOpenGroupIds((prev) => {
      const next = new Set(prev)
      if (next.has(productId)) next.delete(productId)
      else next.add(productId)
      return next
    })
  }
  ```

- [ ] **Step 4: Import và dùng `groupReviewsByProduct`**

  Thêm import:

  ```ts
  import { groupReviewsByProduct } from '@/lib/seller/sellerAdapters'

  import type { ReviewGroup } from '@/lib/seller/sellerAdapters'
  ```

  Thay dòng hiện tại render `reviews.map(...)` bằng:

  ```ts
  const groups = groupReviewsByProduct(reviews)
  ```

- [ ] **Step 5: Thay phần render danh sách reviews bằng accordion theo nhóm**

  Xóa toàn bộ block `{reviews.map(function (rev) { ... })}` (khoảng dòng 407–642 trong file hiện tại).
  Thay bằng:

  ```tsx
  {
    groups.map(function (group: ReviewGroup) {
      const isOpen = openGroupIds.has(group.productId)
      const unrepliedCount = group.reviews.filter((r) => r.sellerReply === undefined).length
      return (
        <div
          key={group.productId}
          className="rounded-2xl border border-zinc-100 dark:border-white/10"
        >
          {/* Group header — accordion toggle */}
          <button
            type="button"
            onClick={() => toggleGroup(group.productId)}
            aria-expanded={isOpen}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-zinc-900 dark:text-white">
                {group.productName}
              </span>
              <span className="text-xs text-zinc-400">{group.reviews.length} đánh giá</span>
              {unrepliedCount > 0 && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                  {unrepliedCount} chưa phản hồi
                </span>
              )}
            </div>
            <CaretDown
              size={14}
              weight="bold"
              className={`shrink-0 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Review list — chỉ render khi open */}
          {isOpen && (
            <div className="divide-y divide-zinc-100 border-t border-zinc-100 dark:divide-white/5 dark:border-white/10">
              {group.reviews.map(function (rev) {
                const isReplying = replyTargetId === rev.id
                return (
                  // ← Giữ nguyên toàn bộ JSX của 1 review card như cũ (dòng 410–641)
                  // Chỉ thay wrapper <div key={rev.id} className="..."> thành
                  // <div key={rev.id} className="p-4">
                  <div key={rev.id} className="p-4">
                    {/* ... toàn bộ nội dung review card không đổi ... */}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )
    })
  }
  ```

  > [!NOTE]
  > Thêm `CaretDown` vào import từ `@phosphor-icons/react`.
  > Nội dung bên trong `<div key={rev.id} className="p-4">` giữ **nguyên 100%** từ dòng 414 đến 639 của file gốc (phần header avatar, stars, productName tag, comment, images/video, sellerReply bubble, reply form, "Trả lời đánh giá này" button).

- [ ] **Step 6: Chạy test để xác nhận PASS (cũ + mới)**

  Run: `pnpm -C fashionstore-ui test run src/components/seller-dashboard-tab/stats/SellerReviewsTab.test.tsx`
  Expected: PASS tất cả (cũ + 3 mới).

- [ ] **Step 7: Commit**

  ```bash
  git add src/components/seller-dashboard-tab/stats/SellerReviewsTab.tsx \
          src/components/seller-dashboard-tab/stats/SellerReviewsTab.test.tsx
  git commit -m "feat(seller-reviews): group reviews by product with accordion UI"
  ```

---

## Task 3: Kiểm tra thủ công trên trình duyệt

**Files:** Không có file mới.

- [ ] **Step 1: Chạy dev server và mở tab Đánh giá trong dashboard shop**

  Mở: `http://localhost:5173` → đăng nhập seller → Dashboard → tab "Xem & Phản hồi Đánh giá".

- [ ] **Step 2: Xác nhận accordion**

  - Danh sách hiển thị theo nhóm sản phẩm, mỗi nhóm là 1 dòng có tên sản phẩm + số lượng + badge "X chưa phản hồi" nếu có.
  - Click header → expand thấy list review; click lại → collapse.
  - Mở 2 nhóm đồng thời → cả 2 đều hiển thị.

- [ ] **Step 3: Xác nhận reply flow trong nhóm**

  - Expand nhóm → click "Trả lời đánh giá này" → form hiện → gửi → toast hiện → review cập nhật.

- [ ] **Step 4: Xác nhận filters**

  - Lọc "Chưa phản hồi": chỉ còn nhóm chứa review chưa reply.
  - Lọc theo sản phẩm: chỉ còn 1 nhóm.
  - Lọc sao: nhóm chỉ chứa review đúng số sao.

- [ ] **Step 5: Commit nếu có fix nhỏ từ manual testing**

  ```bash
  git commit -am "fix(seller-reviews): manual testing adjustments"
  ```
