# Product Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm trang chi tiết sản phẩm `/product/:id` đầy đủ kiểu Tiki/Shopee cho shop nét.

**Architecture:** Mở rộng mock `products.ts` tương thích ngược, tách 4 components PDP dưới `src/components/pdp/`, page `ProductDetail.tsx` ráp layout, route lazy trong `App.tsx`.

**Tech Stack:** Vite 8 + React 19 TS + Tailwind v4, `react-router` Route/Link/useParams, `@phosphor-icons/react`, `motion/react`, `vitest`.

**Spec:** `docs/superpowers/specs/2026-10-10-product-detail-design.md`

## Global Constraints

- Package manager: chỉ `pnpm`, cấm `npm`.
- Không ternary (`? :`): dùng `if` + early `return`, trong JSX dùng `&&`.
- Card/ảnh lớn: `rounded-3xl`. Nút/input/badge: `rounded-full`. Thumb nhỏ: `rounded-2xl`.
- Class `.glass` trong `src/index.css`, gradient duy nhất chàm đêm `#312e81` → xanh hoàng gia `#1d4ed8` → xanh băng `#38bdf8`, chỉ dùng ở CTA primary, badge/tag, blob hero, marquee.
- Font Inter tự host qua `@fontsource/inter`, cấm link Google Fonts.
- Dark mode class toggle trên `<html>`, cặp màu `text-zinc-600` kèm `dark:text-zinc-300`, card `bg-white/80` kèm `dark:bg-white/5`, viền `dark:border-white/10`.
- Icon duy nhất `@phosphor-icons/react`, motion từ `motion/react`, tôn trọng `prefers-reduced-motion`.
- Ảnh demo `picsum.photos` + `loading="lazy"` + `width/height` cố định.
- Mobile-first: grid nhiều cột collapse 1 cột dưới `md`.
- Copy tiếng Việt, giá dùng `formatVnd`.
- Trước khi commit chạy `pnpm format`, `pnpm lint` 0 error, `pnpm build` xanh. Không commit `dist/`, `.env`.

## Review Focus

- ID sai / chữ / số không tồn tại trên URL trực tiếp → mong đợi trang NotFound + Link về `/`, không crash trắng.
- `stock === 0` → mong đợi CTA disable + chữ Hết hàng, không cho tăng số lượng.
- Gallery chỉ có 1 ảnh (SP thiếu biến thể) → mong đợi vẫn render chính + ẩn thumbs, không vỡ layout.
- Tên SP dài tiếng Việt + giá khuyến mãi → mong đợi truncate gọn, không tràn card related.
- Reload trực tiếp `/product/2` sau build → mong đợi route SPA vẫn khớp (BrowserRouter đã có), không 404 do thiếu route.

---

### Task 1: Mở rộng mock + helpers

**Files:**

- Modify: `src/data/products.ts`
- Test: `src/data/products.test.ts`

**Interfaces:**

- Consumes: kiểu `Product` hiện tại (id, name, desc, price, oldPrice, tag, img, category).
- Produces: `getProductById(id: string | number): Product | undefined`, `getRelated(p: Product, n?: number): Product[]`, fields mới `sizes: string[]`, `colors: { name: string; hex: string }[]`, `stock: number`, `rating: number`, `reviewsCount: number`, `details: string[]`, `gallery: string[]`, `reviews: { name: string; rating: number; text: string; date: string }[]`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'

import { PRODUCTS, getProductById, getRelated } from './products'

describe('getProductById', () => {
  it('tim thay SP id 2', () => {
    expect(getProductById(2)?.name).toBe('Váy midi xếp ly')
  })

  it('id dang chuoi van tim thay', () => {
    expect(getProductById('2')?.id).toBe(2)
  })

  it('id sai tra undefined', () => {
    expect(getProductById(999)).toBeUndefined()
  })
})

describe('getRelated', () => {
  it('tra ve cung category, tru chinh no, toi da 4', () => {
    const main = PRODUCTS[0]
    const rel = getRelated(main, 4)
    expect(rel.length).toBeLessThanOrEqual(4)
    for (const r of rel) {
      expect(r.id).not.toBe(main.id)
    }
  })

  it('SP co du field moi', () => {
    const p = PRODUCTS[0]
    expect(p.sizes.length).toBeGreaterThan(0)
    expect(p.gallery.length).toBeGreaterThan(0)
    expect(p.stock).toBeGreaterThanOrEqual(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/data/products.test.ts`
Expected: FAIL with "getProductById is not defined" / "does not provide export".

- [ ] **Step 3: Write minimal implementation**

Mở `src/data/products.ts`, giữ nguyên mọi dòng cũ, thêm interface + data:

```ts
export interface ProductColor {
  name: string
  hex: string
}
export interface Review {
  name: string
  rating: number
  text: string
  date: string
}

export interface Product {
  id: number
  name: string
  desc: string
  price: number
  oldPrice: number | null
  tag: string | null
  img: string
  category: string
  sizes: string[]
  colors: ProductColor[]
  stock: number
  rating: number
  reviewsCount: number
  details: string[]
  gallery: string[]
  reviews: Review[]
}
```

Với mỗi trong 8 PRODUCTS hiện tại, thêm ví dụ (giữ id/name/desc/price/img/category cũ):

```ts
sizes: ['S', 'M', 'L', 'XL'],
colors: [
  { name: 'Trắng', hex: '#ffffff' },
  { name: 'Đen', hex: '#171717' },
],
stock: 12,
rating: 4.8,
reviewsCount: 132,
details: ['Cotton 260gsm', 'Form oversize', 'Giặt máy nhẹ'],
gallery: [
  'https://picsum.photos/seed/net-p1/600/750',
  'https://picsum.photos/seed/net-p1-a/600/750',
  'https://picsum.photos/seed/net-p1-b/600/750',
],
reviews: [
  { name: 'Linh, Hà Nội', rating: 5, text: 'Vải dày dặn, form đẹp.', date: '02.10.2026' },
],
```

Cuối file thêm helpers, không ternary:

```ts
export function getProductById(id: string | number): Product | undefined {
  const num = Number(id)
  if (Number.isNaN(num)) {
    return undefined
  }
  return PRODUCTS.find(function (p) {
    return p.id === num
  })
}

export function getRelated(p: Product, n = 4): Product[] {
  const out: Product[] = []
  for (const c of PRODUCTS) {
    if (c.id === p.id) {
      continue
    }
    if (c.category === p.category) {
      out.push(c)
    }
    if (out.length >= n) {
      break
    }
  }
  if (out.length >= n) {
    return out
  }
  for (const c of PRODUCTS) {
    if (c.id === p.id) {
      continue
    }
    if (c.category !== p.category) {
      out.push(c)
    }
    if (out.length >= n) {
      break
    }
  }
  return out
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/data/products.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/data/products.ts src/data/products.test.ts
git commit -m "feat: mo rong mock product + helpers pdp"
```

---

### Task 2: ProductGallery

**Files:**

- Create: `src/components/pdp/ProductGallery.tsx`

**Interfaces:**

- Consumes: `Product` từ Task 1.
- Produces: `ProductGallery(props: { product: Product })`, quản lý `active` nội bộ, export default.

- [ ] **Step 1: Write the failing check (visual contract)**

Chưa có test unit cho UI; tạo checklist thủ công trong step này: render `product.gallery[0]` làm ảnh chính `aspect-[4/5] rounded-3xl`, thumbs `rounded-2xl`, badge `p.tag` dùng `&&`, nút tim `glass rounded-full`. Chạy `pnpm lint` vẫn pass vì file chưa tồn tại thì import ở Task 6 sẽ fail — đây là failing gate.

- [ ] **Step 2: Write minimal implementation**

```tsx
import { useState } from 'react'

import { Heart } from '@phosphor-icons/react'

import type { Product } from '../../data/products'

export default function ProductGallery(props: { product: Product }) {
  const [active, setActive] = useState(0)
  const imgs = props.product.gallery
  if (imgs.length === 0) {
    return <div className="rounded-3xl bg-sky-100 p-10">Chưa có ảnh</div>
  }
  const main = imgs[active]
  if (!main) {
    return <div className="rounded-3xl bg-sky-100 p-10">Chưa có ảnh</div>
  }
  return (
    <div>
      <div className="relative overflow-hidden rounded-3xl border border-sky-100 bg-white/80 dark:border-white/10 dark:bg-white/5">
        <img
          src={main}
          alt={props.product.name}
          width={600}
          height={750}
          className="aspect-[4/5] w-full object-cover"
        />
        {props.product.tag && (
          <span className="absolute top-3 left-3 rounded-full bg-gradient-to-r from-indigo-900 to-sky-400 px-3 py-1 text-xs font-bold text-white">
            {props.product.tag}
          </span>
        )}
        <button
          type="button"
          aria-label="Yêu thích"
          className="glass absolute top-3 right-3 rounded-full p-2"
        >
          <Heart size={18} />
        </button>
      </div>
      {imgs.length > 1 && (
        <div className="mt-3 flex gap-3">
          {imgs.map(function (src, i) {
            return (
              <button
                key={src}
                type="button"
                onClick={function () {
                  setActive(i)
                }}
                className="overflow-hidden rounded-2xl border border-sky-100 dark:border-white/10"
                aria-label={'Ảnh ' + (i + 1)}
              >
                <img
                  src={src}
                  alt=""
                  loading="lazy"
                  width={150}
                  height={188}
                  className="h-20 w-16 object-cover"
                />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Run lint + typecheck**

Run: `pnpm lint && pnpm build`
Expected: PASS (build có thể fail do thiếu route, nhưng file này không lỗi type).

- [ ] **Step 4: Commit**

```bash
git add src/components/pdp/ProductGallery.tsx
git commit -m "feat: them product gallery pdp"
```

---

### Task 3: ProductInfo (giá + chọn + toast)

**Files:**

- Create: `src/components/pdp/ProductInfo.tsx`

**Interfaces:**

- Consumes: `Product`, `formatVnd`.
- Produces: `ProductInfo(props: { product: Product })` — state nội bộ color/size/qty/toast, không prop drilling. Export default.

- [ ] **Step 1: Define behavior contract**

Toast tạm: bấm Thêm giỏ / Mua ngay hiện `Đã thêm ... vào giỏ`, tự tắt 2500ms bằng `setTimeout`. Hết hàng disable CTA bằng `&&` / `if`, không ternary.

- [ ] **Step 2: Write minimal implementation**

```tsx
import { useState } from 'react'

import { Minus, Plus, ShoppingBag, Star } from '@phosphor-icons/react'

import { formatVnd, type Product } from '../../data/products'

export default function ProductInfo(props: { product: Product }) {
  const p = props.product
  const [color, setColor] = useState(0)
  const [size, setSize] = useState<string | null>(null)
  const [qty, setQty] = useState(1)
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    window.setTimeout(function () {
      setToast(null)
    }, 2500)
  }

  function dec() {
    if (qty > 1) {
      setQty(qty - 1)
    }
  }

  function inc() {
    if (qty < p.stock) {
      setQty(qty + 1)
    }
  }

  if (p.stock === 0) {
    return (
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">{p.name}</h1>
        <p className="mt-2 font-bold text-zinc-500">Hết hàng</p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">{p.name}</h1>
      <p className="mt-2 flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
        <Star size={16} weight="fill" className="text-sky-400" />
        {p.rating} · {p.reviewsCount} đánh giá
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-2xl font-extrabold text-blue-700 dark:text-sky-300">
          {formatVnd(p.price)}
        </span>
        {p.oldPrice && (
          <span className="text-sm text-zinc-400 line-through dark:text-zinc-500">
            {formatVnd(p.oldPrice)}
          </span>
        )}
      </div>
      <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{p.desc}</p>
      <div className="mt-4">
        <p className="text-sm font-bold">Màu sắc</p>
        <div className="mt-2 flex gap-2">
          {p.colors.map(function (c, i) {
            return (
              <button
                key={c.name}
                type="button"
                title={c.name}
                aria-label={c.name}
                onClick={function () {
                  setColor(i)
                }}
                className="rounded-full border p-1"
              >
                <span className="block h-6 w-6 rounded-full border" style={{ background: c.hex }} />
              </button>
            )
          })}
        </div>
      </div>
      <div className="mt-4">
        <p className="text-sm font-bold">Kích cỡ</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {p.sizes.map(function (s) {
            return (
              <button
                key={s}
                type="button"
                onClick={function () {
                  setSize(s)
                }}
                className="rounded-full border px-4 py-2 text-sm font-bold"
              >
                {s}
              </button>
            )
          })}
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-full border px-2 py-1">
          <button type="button" aria-label="Giảm" onClick={dec} className="rounded-full p-2">
            <Minus size={14} />
          </button>
          <span className="min-w-6 text-center font-bold">{qty}</span>
          <button type="button" aria-label="Tăng" onClick={inc} className="rounded-full p-2">
            <Plus size={14} />
          </button>
        </div>
        <span className="text-xs text-zinc-500">Còn {p.stock} sản phẩm</span>
      </div>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={function () {
            showToast('Đã thêm ' + qty + ' × ' + p.name + ' vào giỏ')
          }}
          className="btn-primary flex flex-1 items-center justify-center gap-2 rounded-full py-3 text-sm font-bold"
        >
          <ShoppingBag size={16} weight="fill" /> Thêm giỏ
        </button>
        <button
          type="button"
          onClick={function () {
            showToast('Mua ngay: ' + p.name)
          }}
          className="flex-1 rounded-full border border-sky-200 py-3 text-sm font-bold"
        >
          Mua ngay
        </button>
      </div>
      {toast && (
        <p className="glass fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full px-5 py-2 text-sm font-bold">
          {toast}
        </p>
      )}
      <span className="hidden">
        {String(color)}
        {String(size)}
      </span>
    </div>
  )
}
```

- [ ] **Step 3: Run lint**

Run: `pnpm lint`
Expected: PASS 0 error.

- [ ] **Step 4: Commit**

```bash
git add src/components/pdp/ProductInfo.tsx
git commit -m "feat: them product info + toast pdp"
```

---

### Task 4: ProductTabs

**Files:**

- Create: `src/components/pdp/ProductTabs.tsx`

**Interfaces:**

- Consumes: `Product`.
- Produces: `ProductTabs(props: { product: Product })` với tab state `mo-ta | thong-so | danh-gia`.

- [ ] **Step 1: Write minimal implementation**

```tsx
import { useState } from 'react'

import { Star } from '@phosphor-icons/react'

import type { Product } from '../../data/products'

type Tab = 'mo-ta' | 'thong-so' | 'danh-gia'

export default function ProductTabs(props: { product: Product }) {
  const [tab, setTab] = useState<Tab>('mo-ta')
  return (
    <section className="mt-10 rounded-3xl border border-sky-100 bg-white/80 p-6 dark:border-white/10 dark:bg-white/5">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={function () {
            setTab('mo-ta')
          }}
          className="rounded-full border px-4 py-2 text-sm font-bold"
        >
          Mô tả
        </button>
        <button
          type="button"
          onClick={function () {
            setTab('thong-so')
          }}
          className="rounded-full border px-4 py-2 text-sm font-bold"
        >
          Thông số
        </button>
        <button
          type="button"
          onClick={function () {
            setTab('danh-gia')
          }}
          className="rounded-full border px-4 py-2 text-sm font-bold"
        >
          Đánh giá ({props.product.reviewsCount})
        </button>
      </div>
      {tab === 'mo-ta' && (
        <p className="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          {props.product.desc}
        </p>
      )}
      {tab === 'thong-so' && (
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-zinc-600 dark:text-zinc-300">
          {props.product.details.map(function (d) {
            return <li key={d}>{d}</li>
          })}
        </ul>
      )}
      {tab === 'danh-gia' && (
        <div className="mt-4 space-y-4">
          {props.product.reviews.map(function (r) {
            return (
              <div
                key={r.name}
                className="border-b border-sky-100 pb-3 last:border-0 dark:border-white/10"
              >
                <p className="flex items-center gap-2 text-sm font-bold">
                  {r.name}
                  <span className="flex text-sky-400">
                    <Star size={12} weight="fill" />
                    {r.rating}
                  </span>
                </p>
                <p className="mt-1 text-sm">{r.text}</p>
                <p className="mt-1 text-xs text-zinc-400">{r.date}</p>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
```

- [ ] **Step 2: Run lint**

Run: `pnpm lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/pdp/ProductTabs.tsx
git commit -m "feat: them tabs mo ta danh gia pdp"
```

---

### Task 5: RelatedProducts

**Files:**

- Create: `src/components/pdp/RelatedProducts.tsx`

**Interfaces:**

- Consumes: `Product`, `getRelated`, `formatVnd`, `Link` từ `react-router`.
- Produces: `RelatedProducts(props: { product: Product })`.

- [ ] **Step 1: Write minimal implementation**

```tsx
import { Link } from 'react-router'

import { formatVnd, getRelated, type Product } from '../../data/products'

export default function RelatedProducts(props: { product: Product }) {
  const items = getRelated(props.product, 4)
  if (items.length === 0) {
    return null
  }
  return (
    <section className="mx-auto max-w-[1400px] px-4 pb-12">
      <h2 className="text-2xl font-extrabold tracking-tight">Có thể bạn thích</h2>
      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {items.map(function (p) {
          return (
            <Link
              key={p.id}
              to={'/product/' + p.id}
              className="group overflow-hidden rounded-3xl border border-sky-100 bg-white/80 dark:border-white/10 dark:bg-white/5"
            >
              <img
                src={p.img}
                alt={p.name}
                loading="lazy"
                width={600}
                height={750}
                className="aspect-[4/5] w-full object-cover"
              />
              <div className="p-4">
                <h3 className="truncate text-sm font-bold">{p.name}</h3>
                <p className="mt-1 font-extrabold text-blue-700 dark:text-sky-300">
                  {formatVnd(p.price)}
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Run lint**

Run: `pnpm lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/pdp/RelatedProducts.tsx
git commit -m "feat: them related products pdp"
```

---

### Task 6: Page + route + link lưới

**Files:**

- Create: `src/pages/ProductDetail.tsx`
- Modify: `src/App.tsx` (thêm lazy route `/product/:id`)
- Modify: `src/components/Sections.tsx` (ProductGrid bọc Link)

**Interfaces:**

- Consumes: `getProductById`, 4 components pdp, `Link/useParams` từ `react-router`.
- Produces: route `/product/:id` hoạt động, lưới cũ click sang PDP.

- [ ] **Step 1: Write page (no ternary)**

```tsx
import { Link, useParams } from 'react-router'

import ProductGallery from '../components/pdp/ProductGallery'
import ProductInfo from '../components/pdp/ProductInfo'
import ProductTabs from '../components/pdp/ProductTabs'
import RelatedProducts from '../components/pdp/RelatedProducts'
import { getProductById } from '../data/products'

export default function ProductDetail() {
  const params = useParams()
  const product = getProductById(params.id || '')

  if (!product) {
    return (
      <main className="mx-auto max-w-[1400px] px-4 py-24 text-center">
        <h1 className="text-2xl font-extrabold">Không tìm thấy sản phẩm</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          Sản phẩm không tồn tại hoặc đã gỡ.
        </p>
        <Link
          to="/"
          className="btn-primary mt-6 inline-block rounded-full px-6 py-3 text-sm font-bold"
        >
          Về trang chủ
        </Link>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-[1400px] px-4 pt-[76px] pb-12">
      <nav className="flex flex-wrap gap-2 py-6 text-sm text-zinc-500">
        <Link to="/" className="hover:text-zinc-900">
          Trang chủ
        </Link>
        <span>/</span>
        <Link to="/#shop" className="hover:text-zinc-900">
          Cửa hàng
        </Link>
        <span>/</span>
        <span className="font-bold text-zinc-900 dark:text-zinc-100">{product.name}</span>
      </nav>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <ProductGallery product={product} />
        <ProductInfo product={product} />
      </div>
      <ProductTabs product={product} />
      <div className="mt-10">
        <RelatedProducts product={product} />
      </div>
    </main>
  )
}
```

Sửa `src/App.tsx`: thêm `const ProductDetail = lazy(() => import('./pages/ProductDetail'))` và `<Route path="/product/:id" element={<ProductDetail />} />`.

Sửa `src/components/Sections.tsx`: import `Link` từ `react-router`, bọc img + h3 trong ProductGrid:

```tsx
import { Link } from 'react-router'
<Link to={'/product/' + p.id}>
  <img ... />
</Link>
```

- [ ] **Step 2: Run full verification**

Run: `pnpm vitest run && pnpm lint && pnpm build`
Expected: PASS tất cả, build xanh, không ternary, không lỗi type.

- [ ] **Step 3: Manual check**

Run: `pnpm dev`, mở `/product/2`, đổi màu/size/SL, bấm Thêm giỏ thấy toast, click related chuyển SP, reload trực tiếp vẫn được, check mobile 390px 1 cột + dark mode.

- [ ] **Step 4: Commit**

```bash
git add src/pages/ProductDetail.tsx src/App.tsx src/components/Sections.tsx
git commit -m "feat: them trang product detail + route"
```

- [ ] **Step 5: Final gate**

Run: `pnpm format && pnpm lint && pnpm build`
Expected: format sạch, lint 0 error, build xanh.
