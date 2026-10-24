# Tier 2 — Thêm tính năng API thật theo phong cách nét

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bổ sung các tính năng đang chạy thật bằng API (chat, sort tabs, đơn mua/địa chỉ/wishlist, khung giá PDP, de-Shopee seller topbar) vào `master` @ `16c64bc`, UI viết **mới** theo design language nét — tuyệt đối không port UI Shopee.

**Architecture:** Mọi API call đi qua hooks orval sinh từ `docs/openapi.json` (`src/generated/endpoints/`, gitignored, sinh lại khi build). Spec openapi **giống hệt** giữa `16c64bc` và `b7d666c` → tên hook/queryKey sinh ra giống nhau; lấy **logic** (hook names, mutate shapes, refetchInterval) tham khảo từ nhánh `master-shopee` @ `b7d666c`, nhưng **UI viết mới** theo glass/nét.

**Tech Stack:** React + react-router + @tanstack/react-query + orval hooks + Tailwind + @phosphor-icons/react.

**Spec:** `SHOPEE-CLEANUP.md` (mục Tier 2) + chỉ đạo của chủ repo: _"nếu là thay UI thành Shopee thì thôi, tuyệt đối cấm, có feature thì thêm"_.

## Global Constraints

- 🚫 **CẤM port/copy UI Shopee từ `master-shopee`.** Chỉ được tham khảo logic gọi API (tên hook, mutate shape, queryKey, refetchInterval) từ nhánh đó.
- UI mới theo design language hiện tại @ `16c64bc`: class `.glass`, card `rounded-3xl`, pill `rounded-full`, accent `indigo-900` (light) / `sky-300`–`sky-400` (dark); brand tokens `--color-grape-500: #312e81`, `--color-skytint-500: #38bdf8`; nút chính dùng `.btn-primary`; icon `@phosphor-icons/react`; **dark mode bắt buộc** hỗ trợ song song.
- Cấm màu Shopee `#ee4d2d` trong code mới/sửa.
- Cấm data bịa: không rating/soldCount/voucher/freeship. % giảm giá chỉ tính từ `compareAtPrice` thật (variant).
- Chỉ dùng `pnpm`. **Cấm ternary (`? :`)** — dùng `if` + early return. Không commit `dist/`, `.env`.
- Pipeline mỗi task: `pnpm format` → `pnpm lint` (0 error) → `pnpm build` (orval + tsc + vite) → commit.
- Giữ nguyên element ID được tham chiếu chỗ khác: `id="seller-channel"` (Header link `/account#seller-channel`), `id="btn-account-logout"`.
- Auth GoTrue là service riêng — không đụng.

## Review Focus

1. **Chưa đăng nhập:** chat bubble ẩn, queries Account disabled theo `session` — không crash, không call API thừa.
2. **State rỗng:** 0 đơn / 0 địa chỉ / 0 wishlist / 0 hội thoại → empty state có text rõ ràng, không màn hình trắng.
3. **RELEVANCE không có `q`:** tab "Phổ biến nhất" chỉ render khi `filters.q !== null`.
4. **So sánh giá vô nghĩa:** `compareAtPrice <= price` → không render badge giảm giá (`calculateDiscountPercent` trả 0).
5. **Seller dashboard `/shop*`:** chat widget không mount; anchor `#seller-channel` trong Account vẫn scroll đúng tab seller.

---

### Task 1: Seller Center topbar — bỏ branding Shopee

**Files:**

- Modify: `src/components/seller-dashboard-tab/SellerLayout.tsx`

**Interfaces:**

- Consumes: không (naming/restyle thuần)
- Produces: topbar hiển thị thương hiệu "Kênh Người Bán nét", badge shop "nét Mall"

- [ ] **Step 1: Thay khối branding (dòng ~170–182)**

```tsx
{
  /* Seller branding nét */
}
;<div className="flex items-center gap-2">
  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-900 to-sky-400 text-sm font-black text-white shadow-sm">
    n
  </div>
  <div className="flex flex-col">
    <span className="text-sm leading-tight font-bold tracking-tight text-gray-900">
      Kênh Người Bán nét
    </span>
    <span className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
      net.vn/seller
    </span>
  </div>
</div>
```

- [ ] **Step 2: Đổi badge shop (dòng ~238)**

```tsx
<span className="text-[10px] text-gray-400">nét Mall</span>
```

(bỏ "Shopee Mall • 4.9 ⭐" — 4.9 là số bịa, spec không có API rating shop.)

- [ ] **Step 3: Đổi tiêu đề tab (dòng ~370, 372)**

- `'Doanh thu & Ví Shopee'` → `'Doanh thu & Ví'`
- `'Tin nhắn khách hàng (Shopee Chat)'` → `'Tin nhắn khách hàng'`

- [ ] **Step 4: Quét màu + comment Shopee trong file**

- Comment dòng 158 `{/* Shopee-style Topbar */}` → `{/* Seller topbar */}`; comment "Shopee Seller Branding" đã thay ở Step 1.
- Thay toàn bộ `#ee4d2d` còn lại trong file (badge unread chat, hover, active item…) bằng accent nét: `bg-[#ee4d2d]` → `bg-indigo-900`, `hover:bg-orange-50 hover:text-[#ee4d2d]` → `hover:bg-indigo-50 hover:text-indigo-900` (dark mode: giữ pattern `dark:…` của khối lân cận).

- [ ] **Step 5: Kiểm chứng**

```bash
grep -n "Shopee\|ee4d2d" src/components/seller-dashboard-tab/SellerLayout.tsx   # kỳ vọng: 0 match
pnpm format && pnpm lint && pnpm build
```

- [ ] **Step 6: Commit**

```bash
git add src/components/seller-dashboard-tab/SellerLayout.tsx
git commit -m "refactor(seller): replace Shopee branding with net in seller topbar"
```

---

### Task 2: Search — sort tabs nét thay dropdown

**Files:**

- Modify: `src/pages/Search.tsx` (~203–212 logic giữ nguyên; khối select ~277–293 thay bằng tab; dòng 16 import `SORT_LABELS` xoá)

**Interfaces:**

- Consumes: `SearchSort` enum từ `@generated/model/searchSort`, `change({ sort })` có sẵn
- Produces: hàng tab pill "Phổ biến nhất / Mới nhất / Giá: Thấp → Cao / Giá: Cao → Thấp"

- [ ] **Step 1: Xoá select + thêm helper**

Xoá khối `<label>…<select>…</select></label>` (dòng ~277–293). Xoá biến `sortOptions` (dòng ~210–212, chỉ phục vụ select) và `SORT_LABELS` khỏi import (dòng 16). Thêm helper cuối file:

```ts
function sortTabClass(selected: boolean): string {
  if (selected) {
    return 'rounded-xl bg-indigo-900 px-3.5 py-1.5 text-xs font-extrabold text-white shadow-xs'
  }
  return 'rounded-xl border border-sky-100 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-sky-300 hover:text-zinc-900 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
}
```

- [ ] **Step 2: Render hàng tab** (nằm cùng dòng với số lượng kết quả)

```tsx
<div className="flex flex-wrap items-center gap-2">
  {filters.q !== null && (
    <button
      type="button"
      onClick={function () {
        change({ sort: SearchSort.RELEVANCE })
      }}
      className={sortTabClass(sortValue === SearchSort.RELEVANCE)}
    >
      Phổ biến nhất
    </button>
  )}
  <button
    type="button"
    onClick={function () {
      change({ sort: SearchSort.NEWEST })
    }}
    className={sortTabClass(sortValue === SearchSort.NEWEST)}
  >
    Mới nhất
  </button>
  <button
    type="button"
    onClick={function () {
      change({ sort: SearchSort.PRICE_ASC })
    }}
    className={sortTabClass(sortValue === SearchSort.PRICE_ASC)}
  >
    Giá: Thấp → Cao
  </button>
  <button
    type="button"
    onClick={function () {
      change({ sort: SearchSort.PRICE_DESC })
    }}
    className={sortTabClass(sortValue === SearchSort.PRICE_DESC)}
  >
    Giá: Cao → Thấp
  </button>
</div>
```

- [ ] **Step 3: Kiểm chứng**

```bash
grep -n "SORT_LABELS\|sortOptions" src/pages/Search.tsx   # kỳ vọng: 0 match
pnpm format && pnpm lint && pnpm build
```

Manual: `/search?q=áo` → 4 tab, bấm đổi sort → URL/query đổi, grid render lại. Không có `q` → 3 tab.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Search.tsx
git commit -m "feat(search): replace sort dropdown with net-styled quick sort tabs"
```

---

### Task 3: PDP — Khung giá nét

**Files:**

- Modify: `src/components/pdp/ProductInfo.tsx` (khối giá dòng 112–121)

**Interfaces:**

- Consumes: `calculateDiscountPercent(price, compareAtPrice)` từ `@/lib/format` (đã tồn tại, trả `number`, 0 nếu không giảm)
- Produces: panel giá glass có badge giảm giá thật

- [ ] **Step 1: Thêm import + const**

```tsx
import { calculateDiscountPercent, formatVnd } from '@/lib/format'
```

(hợp nhất với import `formatVnd` hiện có ở dòng 6). Trong component, sau `const compareAt = …`:

```ts
const discountPercent = calculateDiscountPercent(price, compareAt)
```

- [ ] **Step 2: Bọc khối giá vào panel glass** (thay dòng 112–121)

```tsx
<div className="glass mt-3 rounded-2xl px-5 py-4">
  <p className="text-[10px] font-bold tracking-[0.18em] text-zinc-400 uppercase">Khung giá</p>
  <div className="mt-1 flex flex-wrap items-center gap-3">
    <span className="text-3xl font-extrabold text-indigo-900 dark:text-sky-300">
      {price !== null && price !== undefined ? formatVnd(price) : 'Liên hệ'}
    </span>
    {compareAt !== null && compareAt !== undefined && (
      <span className="text-sm text-zinc-400 line-through dark:text-zinc-500">
        {formatVnd(compareAt)}
      </span>
    )}
    {discountPercent > 0 && (
      <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-extrabold text-red-600 dark:bg-red-500/10 dark:text-red-300">
        -{discountPercent}%
      </span>
    )}
  </div>
</div>
```

- [ ] **Step 3: Kiểm chứng**

```bash
pnpm format && pnpm lint && pnpm build
```

Manual: mở 1 sản phẩm có variant `compareAtPrice > price` → badge `-%`; sản phẩm không giảm → không badge.

- [ ] **Step 4: Commit**

```bash
git add src/components/pdp/ProductInfo.tsx
git commit -m "style(pdp): wrap price block into net glass price panel with real discount badge"
```

---

### Task 4: Account — sidebar + tabs Đơn mua / Địa chỉ / Wishlist

**Files:**

- Create: `src/components/account/OrderHistoryTab.tsx`, `src/components/account/AddressBookTab.tsx`, `src/components/account/WishlistTab.tsx`
- Modify: `src/pages/Account.tsx`

**Interfaces:**

- Consumes (orval — tên đúng như generated, build sẽ xác minh):
  - `@generated/endpoints/orders/orders`: `useMine2`, `useCancel1`, `useConfirmReceipt`, `getMine2QueryKey`
  - `@generated/endpoints/addresses/addresses`: `useList1`, `useAdd`, `useChangeDefault`, `useDelete`, `getList1QueryKey`
  - `@/hooks/useWishlist` → `useWishlist()` (đã có @ `16c64bc`)
- Models: `OrderResponse { id, code, status, total, createdAt, … }`, `AddressResponse { id, houseNumber, street, ward, district, city, defaultAddress }`
- Produces: `type AccountTab = 'orders' | 'addresses' | 'wishlist' | 'profile' | 'seller'`; tab sync URL (`?tab=` + hash); live counters; giữ `id="seller-channel"` ở tab seller.

**Tham khảo logic:** `git show b7d666c:src/components/account/OrderHistoryTab.tsx` (451 dòng) và `AddressBookTab.tsx` (467 dòng) — **chỉ xem cách gọi hook/mutate/handle lỗi, KHÔNG copy JSX/class.**

- [ ] **Step 1: Tạo `OrderHistoryTab.tsx`** — UI mới glass, logic: lọc theo tab trạng thái, tìm theo `code`, hủy đơn (PENDING), xác nhận nhận hàng (SHIPPED).

```tsx
import { useState } from 'react'

import {
  getMine2QueryKey,
  useCancel1,
  useConfirmReceipt,
  useMine2,
} from '@generated/endpoints/orders/orders'
import { ArrowClockwise, Package } from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import { takeData } from '@/lib/apiAdapters'
import { formatDateTime, formatVnd } from '@/lib/format'
import { hookErrorMessage } from '@/lib/apiAdapters'

import type { OrderResponse } from '@generated/model/orderResponse'

type OrderStatusFilter = 'ALL' | 'PENDING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'

const STATUS_TABS: { key: OrderStatusFilter; label: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'PENDING', label: 'Chờ xác nhận' },
  { key: 'SHIPPED', label: 'Đang giao' },
  { key: 'DELIVERED', label: 'Hoàn thành' },
  { key: 'CANCELLED', label: 'Đã hủy' },
]

function statusBadgeClass(status: string | null | undefined): string {
  if (status === 'PENDING') {
    return 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200'
  }
  if (status === 'SHIPPED') {
    return 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200'
  }
  if (status === 'DELIVERED') {
    return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200'
  }
  return 'bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-300'
}

export default function OrderHistoryTab() {
  const queryClient = useQueryClient()
  const [activeStatus, setActiveStatus] = useState<OrderStatusFilter>('ALL')
  const [searchCode, setSearchCode] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const ordersQuery = useMine2()
  let orders: OrderResponse[] = []
  if (ordersQuery.data !== undefined) {
    const raw = takeData(ordersQuery.data)
    if (Array.isArray(raw)) {
      orders = raw
    }
  }

  const cancelMutation = useCancel1({
    mutation: {
      onSuccess: function () {
        setNotice('Đã hủy đơn hàng.')
        setError(null)
        void queryClient.invalidateQueries({ queryKey: getMine2QueryKey() })
      },
      onError: function (err) {
        setError(hookErrorMessage('hủy đơn', err))
      },
    },
  })
  const confirmMutation = useConfirmReceipt({
    mutation: {
      onSuccess: function () {
        setNotice('Đã xác nhận nhận hàng.')
        setError(null)
        void queryClient.invalidateQueries({ queryKey: getMine2QueryKey() })
      },
      onError: function (err) {
        setError(hookErrorMessage('xác nhận nhận hàng', err))
      },
    },
  })

  let visible = orders
  if (activeStatus !== 'ALL') {
    visible = orders.filter(function (o) {
      return o.status === activeStatus
    })
  }
  const code = searchCode.trim().toLowerCase()
  if (code !== '') {
    visible = visible.filter(function (o) {
      return (o.code ?? o.id ?? '').toLowerCase().includes(code)
    })
  }

  return (
    <div className="glass rounded-3xl p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-extrabold tracking-tight">Đơn mua</h2>
        <label className="flex items-center gap-2 rounded-full border border-sky-100 bg-white/70 px-3 py-1.5 text-sm dark:border-white/10 dark:bg-white/5">
          <MagnifyingGlass size={14} className="text-zinc-400" />
          <input
            value={searchCode}
            onChange={function (e) {
              setSearchCode(e.target.value)
            }}
            placeholder="Tìm theo mã đơn"
            className="w-40 bg-transparent text-sm outline-none"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {STATUS_TABS.map(function (t) {
          const selected = activeStatus === t.key
          return (
            <button
              key={t.key}
              type="button"
              onClick={function () {
                setActiveStatus(t.key)
              }}
              className={
                selected
                  ? 'rounded-xl bg-indigo-900 px-3.5 py-1.5 text-xs font-extrabold text-white'
                  : 'rounded-xl border border-sky-100 bg-white/70 px-3.5 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-sky-300 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-300'
              }
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {notice !== null && (
        <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">
          {notice}
        </p>
      )}
      {error !== null && (
        <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-xs font-semibold text-red-700 dark:bg-red-500/10 dark:text-red-200">
          {error}
        </p>
      )}

      {ordersQuery.isLoading && (
        <p className="mt-8 flex items-center justify-center gap-2 text-sm text-zinc-500">
          <ArrowClockwise size={16} className="animate-spin" /> Đang tải đơn hàng…
        </p>
      )}

      {ordersQuery.isLoading === false && visible.length === 0 && (
        <div className="mt-8 flex flex-col items-center gap-2 py-10 text-center">
          <Package size={36} className="text-zinc-300 dark:text-zinc-600" />
          <p className="text-sm text-zinc-500">Chưa có đơn hàng nào ở mục này.</p>
        </div>
      )}

      <div className="mt-5 space-y-3">
        {visible.map(function (o) {
          const isPending = o.status === 'PENDING'
          const isShipped = o.status === 'SHIPPED'
          return (
            <div
              key={o.id}
              className="rounded-2xl border border-sky-100 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-zinc-500">{o.code ?? o.id}</span>
                  <span
                    className={
                      'rounded-full px-2.5 py-0.5 text-[11px] font-bold ' +
                      statusBadgeClass(o.status)
                    }
                  >
                    {o.status}
                  </span>
                </div>
                <span className="text-xs text-zinc-400">{formatDateTime(o.createdAt)}</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-extrabold">{formatVnd(o.total ?? 0)}</p>
                <div className="flex gap-2">
                  {isPending && (
                    <button
                      type="button"
                      disabled={cancelMutation.isPending}
                      onClick={function () {
                        cancelMutation.mutate({ id: o.id })
                      }}
                      className="rounded-full border border-red-200 px-4 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-500/30 dark:hover:bg-red-500/10"
                    >
                      Hủy đơn
                    </button>
                  )}
                  {isShipped && (
                    <button
                      type="button"
                      disabled={confirmMutation.isPending}
                      onClick={function () {
                        confirmMutation.mutate({ id: o.id })
                      }}
                      className="btn-primary rounded-full px-4 py-1.5 text-xs font-bold disabled:opacity-50"
                    >
                      Đã nhận hàng
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

_Lưu ý: nếu tsc báo sai tên hook/shape mutate (vd `useCancel1` cần body) → mở `src/generated/endpoints/orders/orders.ts` sau khi build để lấy signature đúng, sửa import/call theo đó; không đổi logic._

- [ ] **Step 2: Tạo `AddressBookTab.tsx`** — UI mới glass; CRUD địa chỉ qua modal glass; switch địa chỉ mặc định. Logic tham khảo `b7d666c:AddressBookTab.tsx` (form states, `useAdd`/`useDelete`/`useChangeDefault` mutate shapes — xem phần đầu file ở đó), fields theo `AddressResponse` (`defaultAddress`, không phải `isDefault`). Yêu cầu tối thiểu:

  - Danh sách card địa chỉ: `formatFullAddress(addr)`, badge "Mặc định" khi `defaultAddress === true`, nút xóa (confirm), nút "Đặt mặc định" khi chưa mặc định.
  - Nút "Thêm địa chỉ" mở modal glass (overlay `fixed inset-0 z-50`, panel `glass rounded-3xl`): các input `houseNumber, street, ward, district, city`, checkbox "Đặt làm mặc định", submit qua `useAdd` → `invalidateQueries(getList1QueryKey())`.
  - Empty state: "Chưa có địa chỉ nào."
  - Không ternary; toast/thông báo lỗi bằng `hookErrorMessage` như Tab 1.

- [ ] **Step 3: Tạo `WishlistTab.tsx`** — grid card sản phẩm yêu thích, dùng `useWishlist()` có sẵn:

```tsx
import { Link } from 'react-router'

import { ArrowRight, HeartBreak } from '@phosphor-icons/react'

import { useWishlist } from '@/hooks/useWishlist'
import { imageUrl } from '@/lib/apiAdapters'
import { formatVnd } from '@/lib/format'

export default function WishlistTab() {
  const wishlist = useWishlist()

  if (wishlist.items.length === 0) {
    return (
      <div className="glass flex flex-col items-center gap-3 rounded-3xl p-10 text-center">
        <p className="text-sm text-zinc-500">Danh sách yêu thích đang trống.</p>
        <Link
          to="/search"
          className="btn-primary inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold"
        >
          Khám phá sản phẩm <ArrowRight size={14} weight="bold" />
        </Link>
      </div>
    )
  }

  return (
    <div className="glass rounded-3xl p-6 md:p-8">
      <h2 className="text-xl font-extrabold tracking-tight">Sản phẩm yêu thích</h2>
      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {wishlist.items.map(function (item) {
          return (
            <div
              key={item.id}
              className="group overflow-hidden rounded-2xl border border-sky-100 bg-white/70 dark:border-white/10 dark:bg-white/5"
            >
              <Link to={'/product/' + item.id}>
                <img
                  src={imageUrl(item.defaultImageKey)}
                  alt={item.name ?? ''}
                  className="aspect-[3/4] w-full object-cover"
                />
              </Link>
              <div className="p-3">
                <Link
                  to={'/product/' + item.id}
                  className="line-clamp-2 text-sm font-bold hover:underline"
                >
                  {item.name}
                </Link>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm font-extrabold text-indigo-900 dark:text-sky-300">
                    {formatVnd(item.minPrice ?? 0)}
                  </span>
                  <button
                    type="button"
                    aria-label="Bỏ yêu thích"
                    disabled={wishlist.isToggling}
                    onClick={function () {
                      wishlist.toggle(item.id)
                    }}
                    className="rounded-full p-2 text-zinc-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-500/10"
                  >
                    <HeartBreak size={16} />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

_Verifying step cho Step 1–3: mở `src/hooks/useWishlist.ts` @ `16c64bc` để khớp tên return (`items`, `toggle`, `isToggling` — lấy đúng tên thật trong file; sửa code theo hook, không sửa hook)._

- [ ] **Step 4: Sửa `Account.tsx` — khung tab + sidebar**

  1. Thêm type + map + parse (đầu file, trên `maskId`):

```ts
type AccountTab = 'orders' | 'addresses' | 'wishlist' | 'profile' | 'seller'

const TAB_HASH_MAP: Record<string, AccountTab> = {
  orders: 'orders',
  addresses: 'addresses',
  wishlist: 'wishlist',
  profile: 'profile',
  seller: 'seller',
  'seller-channel': 'seller',
}

function parseTab(hash: string, queryTab: string | null): AccountTab {
  const cleanHash = hash.replace(/^#/, '').toLowerCase().trim()
  if (cleanHash in TAB_HASH_MAP) {
    return TAB_HASH_MAP[cleanHash]
  }
  if (queryTab !== null && queryTab.toLowerCase().trim() in TAB_HASH_MAP) {
    return TAB_HASH_MAP[queryTab.toLowerCase().trim()]
  }
  return 'orders'
}
```

2. Trong component: `useLocation` + `useSearchParams` từ `react-router`; state `const [activeTab, setActiveTab] = useState<AccountTab>(function () { return parseTab(window.location.hash, /* searchParams.get('tab') */) })` + effect sync khi `location.hash`/`searchParams` đổi (pattern: đọc `parseTab`, nếu khác state thì setState). Click tab → `setActiveTab(tab)` + `history.replaceState(null, '', '#' + tab)`.
3. Live counters: `useMine2()` (orders, enabled theo session như `mineQuery`) + `useList1()` (addresses) — đếm bằng `takeData` + `Array.isArray` như code hiện có; wishlist count từ `useWishlist().items.length`.
4. Bố cục mới cột trái: card user (avatar + email + StatusBadge) + nav glass:

```tsx
<nav className="glass mt-4 space-y-1 rounded-3xl p-3">
  {SIDEBAR_ITEMS.map(function (item) {
    /* Package/MapPin/Heart/User/Storefront + label + counter */
  })}
</nav>
```

với helper `getTabButtonClass(selected)` trảpill glass (`bg-white/70` active → `bg-indigo-900 text-white`). 5. Cột phải: render theo tab — `'orders'` → `<OrderHistoryTab />`, `'addresses'` → `<AddressBookTab />`, `'wishlist'` → `<WishlistTab />`, `'profile'` → card hồ sơ hiện tại + `<ChangePasswordForm />` (chuyển từ cột trái sang), `'seller'` → **toàn bộ khối "Kênh Người Bán" hiện có** (case loading/no-shop/PENDING/APPROVED/REJECTED + modal KYC) đặt trong `<section id="seller-channel">` — **giữ nguyên các id** `seller-channel`, `card-no-shop`, `card-shop-pending`, `card-shop-approved`, `card-shop-rejected`, `btn-account-logout` (logout chuyển sang tab profile). 6. Xoá 2 dòng stat bịa "0 đơn" / "2 voucher" (dòng 200–207 cũ) — thay bằng counters thật ở sidebar. 7. De-Shopee copy trong file: dòng 268 `'Theo chuẩn Shopee'` → `'Sàn thời trang nét'`; dòng 406 `'…theo chuẩn Shopee:'` → `'…theo chuẩn eKYC của sàn nét:'`; dòng 512 `'(Shopee Seller Center)'` → xoá cụm.

- [ ] **Step 5: Kiểm chứng**

```bash
grep -rn "Shopee" src/pages/Account.tsx src/components/account/   # kỳ vọng: 0 match
grep -n "seller-channel" src/components/Header.tsx src/pages/Account.tsx   # anchor còn nguyên
pnpm format && pnpm lint && pnpm build
```

Manual (đăng nhập account thường): `/account` mở tab orders mặc định; đổi tab → hash đổi; F5 giữ đúng tab; `/account#seller-channel` mở đúng tab seller; counters đúng số thật; đặt địa chỉ mặc định, thêm/xóa địa chỉ; hủy 1 đơn PENDING (nếu có).

- [ ] **Step 6: Commit**

```bash
git add src/pages/Account.tsx src/components/account/
git commit -m "feat(account): add order/address/wishlist tabs with net sidebar and live counters"
```

---

### Task 5: Floating chat widget (API thật, UI nét)

**Files:**

- Create: `src/components/chat/FloatingChatWidget.tsx`
- Modify: `src/App.tsx`, `src/components/pdp/ProductInfo.tsx`

**Interfaces:**

- Consumes (`@generated/endpoints/chat/chat`, tag `Chat`): `useMyConversations`, `useMessages(safeConvId, { query: { enabled, refetchInterval } })`, `useSendMessage`, `useStartConversation`, `useMarkRead`, `getMessagesQueryKey(safeConvId)`, `getMyConversationsQueryKey()`
  - Shapes tham khảo từ `b7d666c` widget: `startConvMutation.mutate({ data: { shopId } })`, `markReadMutation.mutate({ id })`, `sendMutation.mutate({ id, data: { content } })`, `takeData(res)` → `conv.id`
  - Models: `ChatConversationResponse { id, shopId, lastMessageText, lastMessageAt, unreadCount }`, `ChatMessageResponse { id, senderType, content, sentAt, isRead }`, send body `SendMessageRequest { content, imageKey? }`
- Event: lắng nghe `window` CustomEvent `open-shop-chat`, `detail: { shopId?: string }`
- Produces: bubble chat nổi toàn trang (ẩn khi chưa login; không mount trên `/shop*`)

**Tham khảo logic:** `git show b7d666c:src/components/chat/FloatingChatWidget.tsx` (449 dòng) — **chỉ xem hook wiring/interval/effect; KHÔNG copy JSX/class royal-blue.**

- [ ] **Step 1: Tạo widget — cấu trúc bắt buộc (UI tự viết theo glass):**

  - Guard: `const { data: session } = useSessionQuery()`; `const isLoggedIn = session !== null && session !== undefined`. Nếu `isLoggedIn === false` → `return null`.
  - State: `isOpen`, `selectedConversationId`, `inputMessage`, ref `messagesEndRef`.
  - `convQuery = useMyConversations({ query: { enabled: isLoggedIn, refetchInterval: isOpen ? 5000 : 15000 } })` — danh sách hội thoại (dùng `if`, không ternary khi gán interval).
  - `messagesQuery = useMessages(safeConvId, { query: { enabled: safeConvId !== '', refetchInterval: 5000 } })` với `let safeConvId = ''; if (selectedConversationId !== null) { safeConvId = selectedConversationId }`.
  - Effect: khi mở hội thoại → `markReadMutation.mutate({ id: safeConvId })` + `invalidateQueries(getMyConversationsQueryKey())` sau `onSuccess` của send/markRead.
  - Effect: listener `open-shop-chat` — nếu có `detail.shopId` → `setIsOpen(true)`; nếu chưa có hội thoại với shop đó trong list → `startConvMutation.mutate({ data: { shopId } })`, `onSuccess` lấy `conv.id` qua `takeData` rồi `setSelectedConversationId`.
  - Send: nếu `inputMessage.trim() === ''` → early return; `sendMutation.mutate({ id: safeConvId, data: { content: inputMessage.trim() } })`; `onSuccess` clear input + `invalidateQueries(getMessagesQueryKey(safeConvId))` + `getMyConversationsQueryKey()`.
  - Scroll vào đáy khi `messagesQuery.data` đổi.
  - UI nét (tự viết): bubble `fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-indigo-900 text-white shadow-lg` icon `ChatCircleDots` (đóng = `X`); panel `glass fixed bottom-24 right-6 z-50 flex h-[480px] w-[360px] flex-col rounded-3xl overflow-hidden`; header indigo-900 với tên "Chat với người bán" + nút thu nhỏ; cột trái danh sách hội thoại (badge `unreadCount`), cột phải thread + input pill `rounded-full border border-sky-100` + nút gửi `PaperPlaneRight`. Tên shop hiển thị `conv.shopId` (spec chưa có shopName — **không bịa**); dark mode đầy đủ.
  - Cấm ternary — mọi nhánh dùng `if`/`&&`.

- [ ] **Step 2: Mount trong `App.tsx`**

```tsx
import { lazy, Suspense } from 'react'
```

(merge với import react hiện có nếu đã có). Trên `function App()`:

```tsx
const FloatingChatWidget = lazy(function () {
  return import('./components/chat/FloatingChatWidget')
})
```

Trong layout, cạnh `{!isShopRoute && <Header />}`:

```tsx
{
  !isShopRoute && (
    <Suspense fallback={null}>
      <FloatingChatWidget />
    </Suspense>
  )
}
```

- [ ] **Step 3: CTA "Chat với người bán" ở PDP** — trong `ProductInfo.tsx`, thêm imports `useSessionQuery` (`@/hooks/useSession`), `useNavigate` (`react-router`), icon `ChatCircleDots`; trong component: `const { data: session } = useSessionQuery()` + `const navigate = useNavigate()`. Thêm nút dưới hàng CTA (sau nút "Mua ngay"):

```tsx
<button
  type="button"
  onClick={function () {
    if (session === null || session === undefined) {
      void navigate('/login')
      return
    }
    if (p.shopId === null || p.shopId === undefined) {
      return
    }
    window.dispatchEvent(new CustomEvent('open-shop-chat', { detail: { shopId: p.shopId } }))
  }}
  className="flex items-center justify-center gap-2 rounded-full border border-sky-100 px-4 py-2 text-sm font-bold text-zinc-700 transition hover:border-sky-300 dark:border-white/10 dark:text-zinc-200"
>
  <ChatCircleDots size={16} weight="bold" />
  Chat với người bán
</button>
```

- [ ] **Step 4: Kiểm chứng**

```bash
pnpm format && pnpm lint && pnpm build
```

Manual (2 tab trình duyệt: buyer + seller hoặc xem từ DB): bubble hiện khi login; PDP bấm "Chat với người bán" → panel mở, hội thoại tạo; gửi tin → hiện thread; tin chưa đọc badge; logout → bubble biến mất; `/shop` → không có bubble.

- [ ] **Step 5: Commit**

```bash
git add src/components/chat/FloatingChatWidget.tsx src/App.tsx src/components/pdp/ProductInfo.tsx
git commit -m "feat(chat): add floating buyer-seller chat widget on real conversations API"
```

---

### Task 6: Quét tổng + xác thực pipeline

- [ ] **Step 1: Quét residue**

```bash
grep -rn "Shopee\|shopee" src/ --include="*.tsx" --include="*.ts" | grep -v seller-dashboard-tab
grep -rn "ee4d2d" src/
```

Kỳ vọng: ngoài `seller-dashboard-tab/` (Decoration/Profile/Staff còn #ee4d2d — ngoài scope, ghi nhận làm việc tiếp theo) thì 0 match.

- [ ] **Step 2: Pipeline đầy đủ**

```bash
pnpm format && pnpm lint && pnpm build
```

Yêu cầu: lint 0 error (warning cũ nếu có phải pre-existing), build xanh.

- [ ] **Step 3: Tổng kết cho chủ repo** — liệt kê feature đã thêm + phần còn lại (seller tabs orange accents) để duyệt đợt sau.

---

## Self-review đã chạy

- **Spec coverage:** 6/6 dòng Tier 2 có task: chat (T5), sort tabs (T2), tabs đơn hàng (T4), sidebar Account (T4), Khung giá PDP (T3), topbar Seller (T1).
- **Placeholder scan:** các chỉ dẫn "tham khảo b7d666c" chỉ áp cho **logic gọi API** (hook/mutate shapes) và đều kèm code khung cụ thể; UI không có bước nào trỏ sang Shopee.
- **Type consistency:** hook names (`useMine2`, `useList1`, `useCancel1`, `useConfirmReceipt`, `useAdd`, `useChangeDefault`, `useDelete`, chat hooks) lấy nguyên từ import của `b7d666c` — spec openapi giống hệt 2 commit nên generated names khớp; Step verify cho phép đối chiếu `src/generated/` sau build.
- **Review Focus:** (1) guard session — T4/T5; (2) empty state — T4 cả 3 tab + T5 hội thoại; (3) RELEVANCE theo `q` — T2; (4) discount 0% — T3; (5) `/shop*` không mount widget + anchor `#seller-channel` — T4/T5.
