import { useState } from 'react'
import { Link } from 'react-router'

import {
  useCreatePage,
  useDeletePage,
  usePublishPage,
  useUnpublishPage,
  useUpdatePage,
} from '@generated/endpoints/admin-pages/admin-pages'
import { ArrowLeft, ArrowSquareOut, Eye, EyeSlash, FloppyDisk, Trash } from '@phosphor-icons/react'

import { hookErrorMessage, takeData } from '@/lib/apiAdapters'
import {
  FOOTER_GROUP_OPTIONS,
  pageStatusBadgeClass,
  pageStatusLabel,
  SLUG_PATTERN,
  slugify,
} from '@/lib/siteContent'

import Markdown from '../Markdown'
import ConfirmDialog from './ConfirmDialog'
import { ERROR_CLASS, HINT_CLASS, INPUT_CLASS, LABEL_CLASS } from './ContentDialog'

import type { FooterGroupValue } from '@/lib/siteContent'
import type { SitePageRequest } from '@generated/model/sitePageRequest'
import type { SitePageResponse } from '@generated/model/sitePageResponse'

const META_MAX = 160
const CONTENT_MAX = 50000

const STARTER_CONTENT = '# Tiêu đề\n\nNội dung trang...\n\n## Mục 1\n\n- Ý thứ nhất\n- Ý thứ hai\n'

interface Props {
  /** null = trang mới. */
  page: SitePageResponse | null
  onBack: () => void
  /** Gọi sau mỗi thay đổi đã lưu; trả trang mới nhất để editor tiếp tục sửa. */
  onSaved: (page: SitePageResponse, message: string) => void
  onDeleted: (message: string) => void
}

function formFrom(page: SitePageResponse | null): SitePageRequest {
  return {
    slug: page?.slug ?? '',
    title: page?.title ?? '',
    content: page?.content ?? STARTER_CONTENT,
    metaDescription: page?.metaDescription ?? '',
    footerGroup: page?.footerGroup ?? 'POLICY',
    sortOrder: page?.sortOrder ?? 0,
  }
}

function sameForm(a: SitePageRequest, b: SitePageRequest): boolean {
  return (
    a.slug === b.slug &&
    a.title === b.title &&
    a.content === b.content &&
    (a.metaDescription ?? '') === (b.metaDescription ?? '') &&
    a.footerGroup === b.footerGroup &&
    a.sortOrder === b.sortOrder
  )
}

export default function PageEditor({ page, onBack, onSaved, onDeleted }: Props) {
  const [form, setForm] = useState<SitePageRequest>(formFrom(page))
  const [slugTouched, setSlugTouched] = useState(page !== null)
  const [mode, setMode] = useState<'write' | 'preview'>('write')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const create = useCreatePage()
  const update = useUpdatePage()
  const publish = usePublishPage()
  const unpublish = useUnpublishPage()
  const remove = useDeletePage()

  const saved = formFrom(page)
  const dirty = page === null || sameForm(form, saved) === false
  const slugProblem = form.slug !== '' && SLUG_PATTERN.test(form.slug) === false
  const metaLength = (form.metaDescription ?? '').trim().length
  const canSave =
    form.title.trim() !== '' &&
    SLUG_PATTERN.test(form.slug) &&
    form.content.trim() !== '' &&
    form.content.length <= CONTENT_MAX &&
    metaLength <= META_MAX
  const busy = create.isPending || update.isPending || publish.isPending || unpublish.isPending
  const published = page?.status === 'PUBLISHED'

  let error: string | null = null
  if (create.isError) {
    error = hookErrorMessage('adminPageSave', create.error)
  }
  if (update.isError) {
    error = hookErrorMessage('adminPageSave', update.error)
  }
  if (publish.isError) {
    error = hookErrorMessage('adminPageStatus', publish.error)
  }
  if (unpublish.isError) {
    error = hookErrorMessage('adminPageStatus', unpublish.error)
  }
  let deleteError: string | undefined = undefined
  if (remove.isError) {
    deleteError = hookErrorMessage('adminPageStatus', remove.error)
  }

  function setTitle(title: string) {
    if (slugTouched) {
      setForm({ ...form, title })
      return
    }
    setForm({ ...form, title, slug: slugify(title).slice(0, 80) })
  }

  function handleSave() {
    if (canSave === false) {
      return
    }
    const data: SitePageRequest = {
      ...form,
      title: form.title.trim(),
      metaDescription: (form.metaDescription ?? '').trim() || undefined,
    }
    if (page?.id === undefined) {
      create.mutate(
        { data },
        { onSuccess: (response) => onSaved(takeData(response), 'Đã tạo trang nháp.') },
      )
      return
    }
    update.mutate(
      { id: page.id, data },
      { onSuccess: (response) => onSaved(takeData(response), 'Đã lưu trang.') },
    )
  }

  function handleStatus() {
    if (page?.id === undefined) {
      return
    }
    if (published) {
      unpublish.mutate(
        { id: page.id },
        { onSuccess: (response) => onSaved(takeData(response), 'Đã gỡ xuất bản, trang về nháp.') },
      )
      return
    }
    publish.mutate(
      { id: page.id },
      { onSuccess: (response) => onSaved(takeData(response), 'Đã xuất bản trang.') },
    )
  }

  let modeWriteClass = 'rounded-full px-3 py-1 text-xs font-bold text-zinc-600 dark:text-zinc-300'
  let modePreviewClass =
    'rounded-full px-3 py-1 text-xs font-bold bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
  if (mode === 'write') {
    modeWriteClass =
      'rounded-full px-3 py-1 text-xs font-bold bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
    modePreviewClass = 'rounded-full px-3 py-1 text-xs font-bold text-zinc-600 dark:text-zinc-300'
  }

  let statusLabel = 'Xuất bản'
  let StatusIcon = Eye
  if (published) {
    statusLabel = 'Gỡ xuất bản'
    StatusIcon = EyeSlash
  }
  let statusHint: string | undefined = undefined
  if (dirty) {
    statusHint = 'Lưu thay đổi trước'
  }
  let metaCounterClass = HINT_CLASS
  if (metaLength > META_MAX) {
    metaCounterClass = ERROR_CLASS
  }
  let writePaneClass = ''
  let previewPaneClass =
    'max-h-[560px] overflow-y-auto rounded-2xl border border-zinc-100 bg-white p-5 dark:border-white/10 dark:bg-zinc-950'
  if (mode === 'preview') {
    writePaneClass = 'hidden lg:block'
  }
  if (mode === 'write') {
    previewPaneClass = `${previewPaneClass} hidden lg:block`
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-bold text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
        >
          <ArrowLeft size={16} weight="bold" />
          Danh sách trang
        </button>
        <div className="flex flex-wrap items-center gap-2">
          {page !== null && (
            <span className={pageStatusBadgeClass(page.status)}>
              {pageStatusLabel(page.status)}
            </span>
          )}
          {published && (
            <Link
              to={`/pages/${page?.slug ?? ''}`}
              target="_blank"
              className="flex items-center gap-1 rounded-full px-3 py-2 text-xs font-bold text-indigo-600 hover:underline dark:text-indigo-300"
            >
              Xem trang
              <ArrowSquareOut size={14} weight="bold" />
            </Link>
          )}
          {page !== null && published === false && (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 rounded-full border border-red-200 px-4 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              <Trash size={14} weight="bold" />
              Xóa
            </button>
          )}
          {page !== null && (
            <button
              type="button"
              onClick={handleStatus}
              disabled={busy || dirty}
              title={statusHint}
              className="flex items-center gap-1.5 rounded-full border border-indigo-200 px-4 py-2 text-xs font-bold text-indigo-600 transition hover:bg-indigo-50 disabled:opacity-50 dark:border-indigo-500/30 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
            >
              <StatusIcon size={14} weight="bold" />
              {statusLabel}
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={canSave === false || busy || dirty === false}
            className="flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500"
          >
            <FloppyDisk size={14} weight="bold" />
            Lưu
          </button>
        </div>
      </div>

      {page !== null && dirty && (
        <p className="mb-3 text-xs font-semibold text-amber-700 dark:text-amber-300">
          Có thay đổi chưa lưu.{published && ' Trang đang xuất bản: lưu xong khách thấy ngay.'}
        </p>
      )}
      {error !== null && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="block">
          <span className={LABEL_CLASS}>Tiêu đề</span>
          <input
            value={form.title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={150}
            placeholder="Chính sách đổi trả"
            className={INPUT_CLASS}
          />
        </label>
        <label className="block">
          <span className={LABEL_CLASS}>Đường dẫn</span>
          <div className="flex items-center rounded-2xl border border-zinc-200 bg-white pl-4 text-sm dark:border-white/10 dark:bg-white/5">
            <span className="shrink-0 text-zinc-400">/pages/</span>
            <input
              value={form.slug}
              onChange={(event) => {
                setSlugTouched(true)
                setForm({ ...form, slug: event.target.value })
              }}
              maxLength={80}
              aria-invalid={slugProblem}
              className="w-full bg-transparent py-2.5 pr-4 outline-none"
            />
          </div>
          {slugProblem && (
            <span className={ERROR_CLASS}>Chỉ chữ thường không dấu, số, nối bằng dấu -.</span>
          )}
          {published && slugProblem === false && form.slug !== saved.slug && (
            <span className={ERROR_CLASS}>
              Đổi đường dẫn làm link cũ (đã chia sẻ) không mở được nữa.
            </span>
          )}
        </label>
        <label className="block">
          <span className={LABEL_CLASS}>Hiện ở footer</span>
          <select
            value={form.footerGroup}
            onChange={(event) =>
              setForm({ ...form, footerGroup: event.target.value as FooterGroupValue })
            }
            className={INPUT_CLASS}
          >
            {FOOTER_GROUP_OPTIONS.map(function (option) {
              return (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              )
            })}
          </select>
        </label>
        <label className="block">
          <span className={LABEL_CLASS}>Thứ tự trong cột</span>
          <input
            type="number"
            min={0}
            max={9999}
            value={form.sortOrder}
            onChange={(event) => setForm({ ...form, sortOrder: Number(event.target.value) })}
            className={INPUT_CLASS}
          />
        </label>
        <label className="block md:col-span-2">
          <span className={LABEL_CLASS}>Mô tả SEO</span>
          <input
            value={form.metaDescription ?? ''}
            onChange={(event) => setForm({ ...form, metaDescription: event.target.value })}
            placeholder="Một câu tóm tắt hiện trên kết quả Google"
            className={INPUT_CLASS}
          />
          <span className={metaCounterClass}>
            {metaLength}/{META_MAX} ký tự
          </span>
        </label>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-sm font-bold">Nội dung</span>
          <div className="flex gap-1 rounded-full bg-zinc-100 p-1 lg:hidden dark:bg-white/10">
            <button type="button" onClick={() => setMode('write')} className={modeWriteClass}>
              Soạn
            </button>
            <button type="button" onClick={() => setMode('preview')} className={modePreviewClass}>
              Xem trước
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className={writePaneClass}>
            <textarea
              value={form.content}
              onChange={(event) => setForm({ ...form, content: event.target.value })}
              rows={22}
              aria-label="Nội dung Markdown"
              className={`${INPUT_CLASS} resize-y font-mono leading-relaxed`}
            />
            <p className={HINT_CLASS}>
              Markdown: # Tiêu đề lớn, ## Tiêu đề mục, **đậm**, - gạch đầu dòng, 1. đánh số,
              [chữ](/pages/slug) để chèn link. {form.content.length.toLocaleString('vi-VN')}/
              {CONTENT_MAX.toLocaleString('vi-VN')}
            </p>
          </div>
          <div className={previewPaneClass}>
            <Markdown source={form.content} />
          </div>
        </div>
      </div>

      {confirmDelete && page?.id !== undefined && (
        <ConfirmDialog
          open
          title="Xóa trang"
          description={`Xóa hẳn trang nháp "${page.title ?? ''}"?`}
          confirmLabel="Xóa trang"
          pending={remove.isPending}
          error={deleteError}
          onClose={() => setConfirmDelete(false)}
          onConfirm={() => {
            if (page.id === undefined) {
              return
            }
            remove.mutate(
              { id: page.id },
              { onSuccess: () => onDeleted(`Đã xóa trang "${page.title ?? ''}".`) },
            )
          }}
        />
      )}
    </div>
  )
}
