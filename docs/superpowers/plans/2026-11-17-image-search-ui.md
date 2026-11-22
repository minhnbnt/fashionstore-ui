# Tìm sản phẩm bằng ảnh trên /search — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm chế độ "Tìm bằng ảnh" public trên `/search`, upload một ảnh tối đa 8MB, gọi hook gRPC-backed `POST /api/search/products/by-image`, hiện top-N sản phẩm kèm badge phần trăm giống.

**Architecture:** Copy OpenAPI đã cập nhật từ backend rồi `pnpm codegen` để có `useByImage`. `ImageSearchPanel` giữ state file + gọi mutation; `Search.tsx` chỉ giữ chế độ `text`/`image` và render chung `ProductCard`/`ProductRow` qua adapter. Không sửa backend/worker, không upload S3.

**Tech Stack:** Vite + React 19 + TS 7, Tailwind v4, `@tanstack/react-query` v5, Orval 8.44 (`pnpm codegen`), `@phosphor-icons/react`, `vite-plus/test` + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-17-image-search-ui-design.md`

## Global Constraints

- Nhánh `feature/image-search-ui`, base `origin/master` @ `6757482`. **Không** đặt upstream (đã unset) — không `git push` nhầm vào `master`.
- Working tree sạch. Mọi `git add` phải đích danh file của feature; **không** kéo commit seller `1151114` từ nhánh cũ.
- Package manager: chỉ `pnpm`. Không ternary (`? :`) — dùng `if`/early `return`, JSX dùng `&&`. Import trước, dùng tên ngắn.
- Giới hạn ảnh query: **8MB** — hằng riêng `MAX_QUERY_IMAGE_BYTES`, không tái dùng `MAX_IMAGE_BYTES = 5MB` của `uploadImage.ts`.
- Không sửa tay file trong `generated/`; mọi thay đổi đi qua `pnpm codegen`.
- Badge similarity: clamp `0..1` rồi làm tròn phần trăm. Backend trả `1 − cosine distance` (có thể âm).
- Trước mỗi commit: `pnpm format:check`, `pnpm lint` (0 error/warning), `pnpm build`, `pnpm test`. Dùng `format:check` (không ghi) để khỏi đụng file ngoài feature.
- Chạy một file test: `pnpm exec vp test run <đường-dẫn>` (đã xác nhận lọc đúng; `pnpm test -- <file>` chạy toàn bộ).
- Chữ ký hook đã probe bằng Orval 8.44: `useByImage().mutateAsync({ data: { file }, params: { limit: 20 } })`; response thành công `res.data.items`; lỗi là `ApiError` có `.status`.

## Review Focus

1. File PNG alpha/palette, GIF, ảnh xám → frontend chỉ validate `image/*`, không decode; worker lo `convert("RGB")`. Test: Task 3 case "ảnh hợp lệ đi qua".
2. Ảnh đúng 8MB + protobuf overhead → 413, hiện đúng thông điệp 8MB, không vỡ. Test: Task 1 map 413 + Task 3 case lỗi 413.
3. Similarity âm (vector gần 0) → badge `0%`, không hiện số âm. Test: Task 1 `similarityPercent(-0.4) === 0` + Task 4 badge.
4. Kéo thả nhiều file → chỉ lấy file đầu, báo lỗi rõ. Test: Task 3 case drop 2 file.
5. Chuyển `text → image → text` → query params filter cũ còn nguyên. Test: Task 5 case toggle.
6. Object URL preview bị rò rỉ khi đổi ảnh/unmount → `URL.revokeObjectURL` được gọi. Test: Task 3 spy revoke.

---

## File Structure

- `docs/openapi.json` — modify (copy từ `../backend/docs/openapi.json`).
- `generated/` — regenerate bằng `pnpm codegen`, gitignore, không commit.
- `src/lib/format.ts` + `src/lib/format.test.ts` — modify: `similarityPercent`.
- `src/lib/api/apiAdapters.ts` + `src/lib/api/apiAdapters.test.ts` — modify: `imageSearch` error map, `imageSearchErrorText`, `imageHitToSummary`.
- `src/lib/api/imageSearchApi.test.ts` — create: test smoke cho code sinh.
- `src/components/search/ImageSearchPanel.tsx` + `.test.tsx` — create: dropzone, validate, preview, gọi mutation.
- `src/components/search/SimilarityBadge.tsx` + `.test.tsx` — create: badge `% giống`.
- `src/components/home/Sections.tsx` (`ProductCard`) + `src/components/search/ProductRow.tsx` — modify: prop `similarity?`.
- `src/pages/Search.tsx` + `src/pages/Search.imageMode.test.tsx` — modify/create: mode switch + render kết quả ảnh.

---

### Task 1: Helper thuần — similarityPercent + map lỗi ảnh

**Files:**

- Modify: `src/lib/format.ts`, `src/lib/format.test.ts`
- Modify: `src/lib/api/apiAdapters.ts`, `src/lib/api/apiAdapters.test.ts`

**Interfaces:**

- Consumes: không có.
- Produces: `similarityPercent(similarity: number): number` (từ `./format`); `imageSearchErrorText(err: unknown): string` (từ `./apiAdapters`). Dùng ở Task 3/4.

- [ ] **Step 1: Viết test trước (RED)**

Thêm vào `src/lib/format.test.ts`: thêm `similarityPercent` vào câu `import { ... } from './format'` rồi thêm:

```ts
describe('similarityPercent', () => {
  it('chuyen similarity thanh phan tram va clamp ve 0..100', () => {
    expect(similarityPercent(0.5)).toBe(50)
    expect(similarityPercent(0.937)).toBe(94)
    expect(similarityPercent(1)).toBe(100)
    expect(similarityPercent(-0.4)).toBe(0)
    expect(similarityPercent(1.4)).toBe(100)
    expect(similarityPercent(Number.NaN)).toBe(0)
  })
})
```

Thêm vào `src/lib/api/apiAdapters.test.ts`: thêm `imageSearchErrorText` vào import từ `'./apiAdapters'` rồi thêm:

```ts
describe('imageSearchErrorText', () => {
  it('map dung thong diep theo status cua endpoint anh', () => {
    expect(imageSearchErrorText(new ApiError(400, ''))).toBe(
      'Ảnh không hợp lệ. Vui lòng chọn ảnh khác.',
    )
    expect(imageSearchErrorText(new ApiError(413, ''))).toBe(
      'Ảnh quá lớn. Dung lượng tối đa là 8 MB.',
    )
    expect(imageSearchErrorText(new ApiError(415, ''))).toBe(
      'Định dạng không được hỗ trợ. Hãy dùng JPG, PNG hoặc WebP.',
    )
    expect(imageSearchErrorText(new ApiError(503, ''))).toBe(
      'Dịch vụ tìm kiếm đang bận. Vui lòng thử lại sau.',
    )
  })

  it('fallback khi loi khong co status', () => {
    expect(imageSearchErrorText(new Error('boom'))).toBe('Đã xảy ra lỗi. Vui lòng thử lại sau.')
  })
})
```

- [ ] **Step 2: Chạy test, xác nhận RED**

Run: `pnpm exec vp test run src/lib/format.test.ts src/lib/api/apiAdapters.test.ts`
Expected: FAIL — `similarityPercent is not a function` / `imageSearchErrorText is not a function` (import không tồn tại).

- [ ] **Step 3: Implement tối thiểu**

Thêm vào cuối `src/lib/format.ts`:

```ts
/** Backend trả 1 − cosine distance, về mặt lý thuyết nằm trong [-1, 1]; clamp để hiện cho khách. */
export function similarityPercent(similarity: number): number {
  if (Number.isNaN(similarity)) {
    return 0
  }
  const clamped = Math.min(1, Math.max(0, similarity))
  return Math.round(clamped * 100)
}
```

Trong `src/lib/api/apiAdapters.ts`, thêm key vào object `ERROR_MESSAGES` (ngay sau `search: {...}`):

```ts
  imageSearch: {
    400: 'Ảnh không hợp lệ. Vui lòng chọn ảnh khác.',
    413: 'Ảnh quá lớn. Dung lượng tối đa là 8 MB.',
    415: 'Định dạng không được hỗ trợ. Hãy dùng JPG, PNG hoặc WebP.',
    503: 'Dịch vụ tìm kiếm đang bận. Vui lòng thử lại sau.',
  },
```

Rồi thêm hàm sau `hookErrorMessage`:

```ts
export function imageSearchErrorText(err: unknown): string {
  return hookErrorMessage('imageSearch', err)
}
```

- [ ] **Step 4: Chạy test, xác nhận GREEN**

Run: `pnpm exec vp test run src/lib/format.test.ts src/lib/api/apiAdapters.test.ts`
Expected: PASS (format 22 test, apiAdapters tăng thêm 2 test).

- [ ] **Step 5: Cổng + commit**

```bash
pnpm format:check && pnpm lint && pnpm build && pnpm test
git add src/lib/format.ts src/lib/format.test.ts src/lib/api/apiAdapters.ts src/lib/api/apiAdapters.test.ts
git commit -m "feat(search): them helper clamp similarity va map loi anh"
```

---

### Task 2: OpenAPI + codegen + verify hook sinh ra

**Files:**

- Modify: `docs/openapi.json`
- Create: `src/lib/api/imageSearchApi.test.ts`
- Regenerate (không commit): `generated/`

**Interfaces:**

- Consumes: `backend/docs/openapi.json` (đã có path `/api/search/products/by-image`, commit backend `cf8b22e`).
- Produces: `useByImage`, `getByImageUrl` từ `@generated/endpoints/search/search`; types `ByImageBody`, `ByImageParams`, `ImageSearchHit`, `ImageSearchResponse`.

- [ ] **Step 1: Viết test smoke trước (RED)**

Create `src/lib/api/imageSearchApi.test.ts`:

```ts
import { getByImageUrl, useByImage } from '@generated/endpoints/search/search'
import { describe, expect, it } from 'vite-plus/test'

describe('API tim anh sinh boi orval', () => {
  it('co hook va tao URL co limit', () => {
    expect(typeof useByImage).toBe('function')
    expect(getByImageUrl({ limit: 20 })).toBe('/api/search/products/by-image?limit=20')
  })
})
```

- [ ] **Step 2: Chạy test, xác nhận RED**

Run: `pnpm exec vp test run src/lib/api/imageSearchApi.test.ts`
Expected: FAIL — module `@generated/endpoints/search/search` không export `useByImage` (openapi frontend còn cũ).

- [ ] **Step 3: Copy spec + codegen**

```bash
cp ../backend/docs/openapi.json docs/openapi.json
pnpm codegen
```

Sau đó kiểm tra nhanh (phải ra kết quả, không được rỗng):

```bash
grep -n "export const useByImage" generated/endpoints/search/search.ts
ls generated/model/imageSearchHit.ts generated/model/byImageBody.ts
```

Chữ ký kỳ vọng (đã probe): `mutateAsync({ data: { file }, params: { limit } })`, `ByImageBody = { file: Blob | File }`.

- [ ] **Step 4: Chạy test, xác nhận GREEN**

Run: `pnpm exec vp test run src/lib/api/imageSearchApi.test.ts`
Expected: PASS.

- [ ] **Step 5: Cổng + commit**

```bash
pnpm build && pnpm test
git add docs/openapi.json src/lib/api/imageSearchApi.test.ts
git commit -m "feat(search): cap nhat openapi va sinh hook byImage"
```

---

### Task 3: ImageSearchPanel — validate, preview, gọi mutation

**Files:**

- Create: `src/components/search/ImageSearchPanel.tsx`
- Create: `src/components/search/ImageSearchPanel.test.tsx`

**Interfaces:**

- Consumes: `useByImage` (Task 2), `imageSearchErrorText` (Task 1), `ApiError` từ `./apiFetch`.
- Produces: default export `ImageSearchPanel({ onResults, onClear }: Props)`; `onResults(hits: ImageSearchHit[])`, `onClear(): void`.

- [ ] **Step 1: Viết test trước (RED)**

Create `src/components/search/ImageSearchPanel.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vite-plus/test'

import { ApiError } from '@/lib/api/apiFetch'

const { mutateAsync, onClear, onResults } = vi.hoisted(function () {
  return { mutateAsync: vi.fn(), onClear: vi.fn(), onResults: vi.fn() }
})

vi.mock('@generated/endpoints/search/search', () => ({
  useByImage: () => ({ mutateAsync, isPending: false }),
}))

import ImageSearchPanel from './ImageSearchPanel'

beforeAll(function () {
  Object.defineProperty(URL, 'createObjectURL', {
    value: vi.fn(() => 'blob:preview'),
    configurable: true,
  })
  Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), configurable: true })
})

afterEach(function () {
  cleanup()
  vi.clearAllMocks()
})

function png(name: string, size: number): File {
  const file = new File([new Uint8Array(Math.min(size, 16))], name, { type: 'image/png' })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

function renderPanel() {
  return render(<ImageSearchPanel onResults={onResults} onClear={onClear} />)
}

function input(): HTMLInputElement {
  return document.querySelector('input[type="file"]') as HTMLInputElement
}

describe('ImageSearchPanel', () => {
  it('tu choi file khong phai anh', () => {
    renderPanel()
    fireEvent.change(input(), {
      target: { files: [new File(['x'], 'a.txt', { type: 'text/plain' })] },
    })
    expect(screen.getByText('Chỉ nhận file ảnh.')).toBeTruthy()
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('tu choi SVG va anh qua 8MB', () => {
    renderPanel()
    fireEvent.change(input(), {
      target: { files: [new File(['<svg/>'], 'a.svg', { type: 'image/svg+xml' })] },
    })
    expect(screen.getByText('Chỉ nhận file ảnh.')).toBeTruthy()

    fireEvent.change(input(), {
      target: { files: [png('big.png', 8 * 1024 * 1024 + 1)] },
    })
    expect(screen.getByText('Ảnh tối đa 8 MB.')).toBeTruthy()
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('gui dung file va limit, nhan items ve cho cha', async () => {
    mutateAsync.mockResolvedValueOnce({ data: { items: [{ id: 'p1' }] }, status: 200 })
    renderPanel()
    const file = png('ao.png', 2048)
    fireEvent.change(input(), { target: { files: [file] } })

    fireEvent.click(screen.getByRole('button', { name: 'Tìm sản phẩm giống ảnh' }))

    await waitFor(function () {
      expect(mutateAsync).toHaveBeenCalledWith({ data: { file }, params: { limit: 20 } })
    })
    expect(onResults).toHaveBeenCalledWith([{ id: 'p1' }])
  })

  it('hien thong diep 413 va 503', async () => {
    renderPanel()
    fireEvent.change(input(), { target: { files: [png('ao.png', 2048)] } })

    mutateAsync.mockRejectedValueOnce(new ApiError(413, ''))
    fireEvent.click(screen.getByRole('button', { name: 'Tìm sản phẩm giống ảnh' }))
    await screen.findByText('Ảnh quá lớn. Dung lượng tối đa là 8 MB.')

    mutateAsync.mockRejectedValueOnce(new ApiError(503, ''))
    fireEvent.click(screen.getByRole('button', { name: 'Tìm sản phẩm giống ảnh' }))
    await screen.findByText('Dịch vụ tìm kiếm đang bận. Vui lòng thử lại sau.')
  })

  it('goi onClear khi chon anh moi de xoa ket qua cu', () => {
    renderPanel()
    fireEvent.change(input(), { target: { files: [png('a.png', 100)] } })
    fireEvent.change(input(), { target: { files: [png('b.png', 200)] } })
    expect(onClear).toHaveBeenCalledTimes(2)
  })

  it('drop nhieu file thi chi lay file dau va bao loi', () => {
    const { container } = renderPanel()
    const zone = container.querySelector('[data-testid="image-dropzone"]') as HTMLElement
    const data = {
      files: [png('a.png', 100), png('b.png', 100)],
    }
    fireEvent.dragOver(zone)
    fireEvent.drop(zone, { dataTransfer: data })
    expect(screen.getByText('Chỉ hỗ trợ một ảnh mỗi lần tìm.')).toBeTruthy()
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('revoke object URL khi xoa anh', () => {
    renderPanel()
    fireEvent.change(input(), { target: { files: [png('a.png', 100)] } })
    fireEvent.click(screen.getByRole('button', { name: 'Xóa ảnh' }))
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview')
  })
})
```

- [ ] **Step 2: Chạy test, xác nhận RED**

Run: `pnpm exec vp test run src/components/search/ImageSearchPanel.test.tsx`
Expected: FAIL — không tìm thấy module `./ImageSearchPanel`.

- [ ] **Step 3: Implement component**

Create `src/components/search/ImageSearchPanel.tsx`:

```tsx
import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react'

import { useByImage } from '@generated/endpoints/search/search'
import { ImageSquare, UploadSimple, WarningCircle, X } from '@phosphor-icons/react'

import { imageSearchErrorText } from '@/lib/api/apiAdapters'
import { cn } from '@/lib/ui/styles'

import type { ImageSearchHit } from '@generated/model/imageSearchHit'

const MAX_QUERY_IMAGE_BYTES = 8 * 1024 * 1024

interface Props {
  onResults: (hits: ImageSearchHit[]) => void
  onClear: () => void
}

function fileSizeLabel(bytes: number): string {
  if (bytes < 1024) {
    return bytes + ' B'
  }
  if (bytes < 1024 * 1024) {
    return Math.round(bytes / 1024) + ' KB'
  }
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export default function ImageSearchPanel({ onResults, onClear }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const mutation = useByImage()

  useEffect(
    function () {
      return function () {
        if (previewUrl !== null) {
          URL.revokeObjectURL(previewUrl)
        }
      }
    },
    [previewUrl],
  )

  function accept(candidate: File | undefined): void {
    if (candidate === undefined) {
      return
    }
    if (candidate.type.startsWith('image/') === false || candidate.type === 'image/svg+xml') {
      setFile(null)
      setPreviewUrl(null)
      setError('Chỉ nhận file ảnh.')
      return
    }
    if (candidate.size > MAX_QUERY_IMAGE_BYTES) {
      setFile(null)
      setPreviewUrl(null)
      setError('Ảnh tối đa 8 MB.')
      return
    }
    setFile(candidate)
    setPreviewUrl(URL.createObjectURL(candidate))
    setError(null)
    onClear()
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>): void {
    accept(e.target.files?.[0])
    e.target.value = ''
  }

  function handleDrop(e: DragEvent<HTMLDivElement>): void {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files.length > 1) {
      setError('Chỉ hỗ trợ một ảnh mỗi lần tìm.')
      return
    }
    accept(files[0])
  }

  function clear(): void {
    setFile(null)
    setPreviewUrl(null)
    setError(null)
    onClear()
  }

  async function submit(): Promise<void> {
    if (file === null) {
      return
    }
    setError(null)
    try {
      const response = await mutation.mutateAsync({
        data: { file },
        params: { limit: 20 },
      })
      onResults(response.data.items ?? [])
    } catch (err: unknown) {
      setError(imageSearchErrorText(err))
    }
  }

  let dropzoneClass =
    'flex aspect-4/3 w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-4 text-center transition md:w-72'
  if (isDragging) {
    dropzoneClass = dropzoneClass + ' border-blue-600 bg-blue-50/70 dark:bg-blue-950/30'
  } else {
    dropzoneClass = dropzoneClass + ' border-zinc-300 hover:border-blue-500 dark:border-white/15'
  }

  return (
    <section aria-label="Tìm sản phẩm bằng ảnh" className="glass mt-6 rounded-3xl p-5 md:p-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-start">
        <div
          data-testid="image-dropzone"
          role="button"
          tabIndex={0}
          aria-label="Chọn ảnh để tìm sản phẩm giống"
          onClick={function () {
            inputRef.current?.click()
          }}
          onDragOver={function (e) {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={function () {
            setIsDragging(false)
          }}
          onDrop={handleDrop}
          className={cn(dropzoneClass)}
        >
          {previewUrl !== null && file !== null && (
            <img
              src={previewUrl}
              alt="Ảnh đã chọn để tìm"
              className="max-h-48 w-full rounded-xl object-contain"
            />
          )}
          {previewUrl === null && (
            <>
              <UploadSimple size={30} weight="bold" className="text-blue-600 dark:text-sky-300" />
              <p className="mt-2 text-sm font-bold text-zinc-800 dark:text-white">
                Chọn ảnh hoặc kéo thả vào đây
              </p>
              <p className="mt-1 text-[11px] text-zinc-500">JPG, PNG, WebP · tối đa 8 MB</p>
            </>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex items-center gap-2">
            <ImageSquare size={20} weight="bold" className="text-blue-700 dark:text-sky-300" />
            <h2 className="text-base font-extrabold text-zinc-900 dark:text-white">
              Tìm sản phẩm giống ảnh
            </h2>
          </div>
          <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            Chụp hoặc chọn một ảnh trang phục. Hệ thống sẽ so sánh ảnh đó với các sản phẩm trong sàn
            và trả về những item giống nhất.
          </p>

          {file !== null && (
            <div className="rounded-2xl border border-sky-100 bg-sky-50/50 p-3 dark:border-white/10 dark:bg-white/5">
              <p className="truncate text-xs font-bold text-zinc-800 dark:text-white">
                {file.name}
              </p>
              <p className="mt-0.5 text-[11px] text-zinc-500">{fileSizeLabel(file.size)}</p>
            </div>
          )}

          {error !== null && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300"
            >
              <WarningCircle size={16} weight="fill" className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              disabled={file === null || mutation.isPending}
              onClick={function () {
                void submit()
              }}
              className="btn-primary flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-extrabold disabled:opacity-50"
            >
              {mutation.isPending && <span aria-hidden="true">…</span>}
              Tìm sản phẩm giống ảnh
            </button>
            {file !== null && (
              <button
                type="button"
                onClick={clear}
                className="flex items-center gap-1.5 rounded-full border border-zinc-200 px-4 py-2.5 text-xs font-bold text-zinc-600 hover:bg-zinc-50 dark:border-white/15 dark:text-zinc-300"
              >
                <X size={14} weight="bold" />
                Xóa ảnh
              </button>
            )}
          </div>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />
    </section>
  )
}
```

- [ ] **Step 4: Chạy test, xác nhận GREEN**

Run: `pnpm exec vp test run src/components/search/ImageSearchPanel.test.tsx`
Expected: PASS (7 test). Nếu lỗi `role="button"` trùng với phần tử khác, dùng `getByRole('button', { name: 'Tìm sản phẩm giống ảnh' })` — tên nút submit là duy nhất.

- [ ] **Step 5: Cổng + commit**

```bash
pnpm format:check && pnpm lint && pnpm build && pnpm test
git add src/components/search/ImageSearchPanel.tsx src/components/search/ImageSearchPanel.test.tsx
git commit -m "feat(search): them panel upload anh voi validate va goi hook byImage"
```

---

### Task 4: Badge similarity trên ProductCard / ProductRow

**Files:**

- Create: `src/components/search/SimilarityBadge.tsx`, `src/components/search/SimilarityBadge.test.tsx`
- Modify: `src/components/home/Sections.tsx` (hàm `ProductCard`), `src/components/search/ProductRow.tsx`

**Interfaces:**

- Consumes: `similarityPercent` (Task 1).
- Produces: `SimilarityBadge({ similarity }: { similarity: number })`; prop `similarity?: number` trên `ProductCard` và `ProductRow`.

- [ ] **Step 1: Viết test trước (RED)**

Create `src/components/search/SimilarityBadge.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vite-plus/test'

import SimilarityBadge from './SimilarityBadge'

afterEach(cleanup)

describe('SimilarityBadge', () => {
  it('lam tron thanh phan tram', () => {
    render(<SimilarityBadge similarity={0.937} />)
    expect(screen.getByText('94% giống')).toBeTruthy()
  })

  it('clamp similarity am ve 0 phan tram', () => {
    render(<SimilarityBadge similarity={-0.5} />)
    expect(screen.getByText('0% giống')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Chạy test, xác nhận RED**

Run: `pnpm exec vp test run src/components/search/SimilarityBadge.test.tsx`
Expected: FAIL — không tìm thấy `./SimilarityBadge`.

- [ ] **Step 3: Implement badge + gắn vào card**

Create `src/components/search/SimilarityBadge.tsx`:

```tsx
import { Sparkle } from '@phosphor-icons/react'

import { similarityPercent } from '@/lib/format'

export default function SimilarityBadge({ similarity }: { similarity: number }) {
  return (
    <span className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-full bg-gradient-to-r from-[#312e81] to-[#1d4ed8] px-2 py-0.5 text-[10px] font-extrabold text-white shadow-xs">
      <Sparkle size={10} weight="fill" />
      {similarityPercent(similarity)}% giống
    </span>
  )
}
```

Trong `src/components/home/Sections.tsx`: thêm `import SimilarityBadge from '../search/SimilarityBadge'` (cùng nhóm import component), rồi đổi chữ ký và thêm badge:

```tsx
export function ProductCard(props: { item: ProductSummaryResponse; similarity?: number }) {
```

Ngay sau thẻ `<Link to={'/product/' + p.id}> ... </Link>` đầu tiên bên trong `<div className="relative">`, thêm:

```tsx
{
  props.similarity !== undefined && <SimilarityBadge similarity={props.similarity} />
}
```

Trong `src/components/search/ProductRow.tsx`: thêm `import SimilarityBadge from './SimilarityBadge'`, rồi:

```tsx
export default function ProductRow(props: {
  item: ProductSummaryResponse
  similarity?: number
}) {
```

và trong `<div className="relative shrink-0">`, ngay sau `</Link>` của ảnh, thêm:

```tsx
{
  props.similarity !== undefined && <SimilarityBadge similarity={props.similarity} />
}
```

- [ ] **Step 4: Chạy test, xác nhận GREEN**

Run: `pnpm exec vp test run src/components/search/SimilarityBadge.test.tsx`
Expected: PASS (2 test).

- [ ] **Step 5: Cổng + commit**

```bash
pnpm format:check && pnpm lint && pnpm build && pnpm test
git add src/components/search/SimilarityBadge.tsx src/components/search/SimilarityBadge.test.tsx src/components/home/Sections.tsx src/components/search/ProductRow.tsx
git commit -m "feat(search): hien badge phan tram giong tren card san pham"
```

---

### Task 5: Tích hợp chế độ image vào Search.tsx

**Files:**

- Modify: `src/pages/Search.tsx`
- Modify: `src/lib/api/apiAdapters.ts`, `src/lib/api/apiAdapters.test.ts` (thêm `imageHitToSummary`)
- Create: `src/pages/Search.imageMode.test.tsx`

**Interfaces:**

- Consumes: `ImageSearchPanel` (Task 3), `SimilarityBadge` qua card (Task 4), `imageHitToSummary` (tạo ở task này).
- Produces: trang `/search` có 2 chế độ; không đổi URL/params của chế độ text.

- [ ] **Step 1: Viết test trước (RED)**

Thêm vào `src/lib/api/apiAdapters.test.ts`: thêm `imageHitToSummary` vào import, rồi:

```ts
describe('imageHitToSummary', () => {
  it('chuyen hit anh sang shape summary, khong bi rank', () => {
    expect(
      imageHitToSummary({
        id: 'p1',
        name: 'Áo',
        slug: 'ao',
        minPrice: 250000,
        defaultImageUrl: 'https://cdn/a.png',
        similarity: 0.9,
      }),
    ).toEqual({
      id: 'p1',
      name: 'Áo',
      slug: 'ao',
      minPrice: 250000,
      defaultImageUrl: 'https://cdn/a.png',
    })
  })
})
```

Create `src/pages/Search.imageMode.test.tsx`:

```tsx
import { MemoryRouter } from 'react-router'

// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

vi.mock('@generated/endpoints/search/search', () => ({
  useSearch: vi.fn(() => ({
    data: { status: 200, data: { items: [], total: 0 } },
    isSuccess: true,
    isPending: false,
    isError: false,
  })),
  useFacets: vi.fn(() => ({ data: undefined })),
}))
vi.mock('@generated/endpoints/categories/categories', () => ({
  useListCategories: vi.fn(() => ({ data: { status: 200, data: [] } })),
}))
vi.mock('@/components/search/ImageSearchPanel', () => ({
  default: function FakePanel() {
    return <div>panel anh gia</div>
  },
}))

import Search from './Search'

afterEach(cleanup)

describe('Search — che do tim bang anh', () => {
  it('chuyen sang che do anh roi quay lai ma khong xoa query', () => {
    render(
      <MemoryRouter initialEntries={['/search?q=ao']}>
        <Search />
      </MemoryRouter>,
    )

    expect(screen.getByText('Xu hướng:')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Tìm bằng ảnh' }))

    expect(screen.getByText('panel anh gia')).toBeTruthy()
    expect(screen.queryByText('Xu hướng:')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Tìm bằng từ khóa' }))
    expect(screen.getByText('Xu hướng:')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Chạy test, xác nhận RED**

Run: `pnpm exec vp test run src/pages/Search.imageMode.test.tsx src/lib/api/apiAdapters.test.ts`
Expected: FAIL — không có nút "Tìm bằng ảnh" / `imageHitToSummary` chưa định nghĩa.

- [ ] **Step 3: Implement adapter trong apiAdapters.ts**

Thêm 2 import type (file hiện tại mới chỉ import `ProductResponse`):

```ts
import type { ImageSearchHit } from '@generated/model/imageSearchHit'
import type { ProductSummaryResponse } from '@generated/model/productSummaryResponse'
```

Thêm hàm cuối file:

```ts
/** Map hit của endpoint ảnh sang shape card dùng chung; không bịa field BM25 (rank). */
export function imageHitToSummary(hit: ImageSearchHit): ProductSummaryResponse {
  return {
    id: hit.id,
    name: hit.name,
    slug: hit.slug,
    minPrice: hit.minPrice,
    defaultImageUrl: hit.defaultImageUrl,
  }
}
```

- [ ] **Step 4: Implement Search.tsx**

Thêm import:

```ts
import { imageHitToSummary } from '@/lib/api/apiAdapters'

import ImageSearchPanel from '../components/search/ImageSearchPanel'
```

Thêm type import:

```ts
import type { ImageSearchHit } from '@generated/model/imageSearchHit'
```

Trong `export default function Search()`, thêm state và handler sau dòng `const [viewMode, ...]`:

```ts
const [mode, setMode] = useState<'text' | 'image'>('text')
const [imageHits, setImageHits] = useState<ImageSearchHit[]>([])
const [imageSearched, setImageSearched] = useState(false)

const isImageMode = mode === 'image'

function handleImageResults(hits: ImageSearchHit[]): void {
  setImageHits(hits)
  setImageSearched(true)
}

function handleImageClear(): void {
  setImageHits([])
  setImageSearched(false)
}
```

Ngay sau khối `<div className="mt-3"> ... </div>` của tiêu đề (trước hot search pills), thêm công tắc chế độ:

```tsx
<div className="mt-3 flex items-center gap-2">
  <div className={cn(segmentedTrackClass(), 'flex-wrap')}>
    <button
      type="button"
      aria-pressed={isImageMode === false}
      onClick={function () {
        setMode('text')
      }}
      className={segmentedItemClass(isImageMode === false)}
    >
      Tìm bằng từ khóa
    </button>
    <button
      type="button"
      aria-pressed={isImageMode}
      onClick={function () {
        setMode('image')
      }}
      className={segmentedItemClass(isImageMode)}
    >
      Tìm bằng ảnh
    </button>
  </div>
</div>
```

Bọc hot search pills + ActiveChips bằng điều kiện (thay vì xoá):

```tsx
{
  isImageMode === false && (
    <>
      {/* khối hot search pills hiện tại */}
      {/* khối <ActiveChips ... /> hiện tại */}
    </>
  )
}
```

Thay toàn bộ khối `<div className="mt-6 grid grid-cols-1 gap-7 lg:grid-cols-[280px_1fr]"> ... </div>` bằng:

```tsx
{
  isImageMode && (
    <>
      <ImageSearchPanel onResults={handleImageResults} onClear={handleImageClear} />
      {imageSearched && imageHits.length === 0 && (
        <p className="mt-6 text-center text-sm font-semibold text-zinc-500 dark:text-zinc-400">
          Không tìm thấy sản phẩm giống ảnh này.
        </p>
      )}
      {imageHits.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 xl:gap-5">
          {imageHits.map(function (hit) {
            return (
              <ProductCard
                key={hit.id}
                item={imageHitToSummary(hit)}
                similarity={hit.similarity ?? 0}
              />
            )
          })}
        </div>
      )}
    </>
  )
}
{
  isImageMode === false && (
    <div className="mt-6 grid grid-cols-1 gap-7 lg:grid-cols-[280px_1fr]">
      {/* giữ nguyên toàn bộ nội dung sidebar + results + pagination cũ */}
    </div>
  )
}
```

`segmentedItemClass` và `segmentedTrackClass` đã được import sẵn trong `Search.tsx` — không cần thêm. Không đụng `useSearchParams`, `filters`, `toApiParams`.

- [ ] **Step 5: Chạy test, xác nhận GREEN**

Run: `pnpm exec vp test run src/pages/Search.imageMode.test.tsx src/lib/api/apiAdapters.test.ts`
Expected: PASS.

- [ ] **Step 6: Cổng + commit**

```bash
pnpm format:check && pnpm lint && pnpm build && pnpm test
git add src/pages/Search.tsx src/pages/Search.imageMode.test.tsx src/lib/api/apiAdapters.ts src/lib/api/apiAdapters.test.ts
git commit -m "feat(search): them che do tim bang anh vao trang search"
```

---

## Kết thúc

Sau Task 5: chạy lại `pnpm format:check && pnpm lint && pnpm build && pnpm test`, review toàn nhánh, rồi bàn giao (merge/PR/giữ nguyên theo ý người dùng). Không push — nhánh chưa có upstream.
