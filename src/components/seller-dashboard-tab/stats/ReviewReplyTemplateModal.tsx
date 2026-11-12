import { useState } from 'react'

import {
  getListTemplatesQueryKey,
  useCreateTemplate,
  useDeleteTemplate,
  useUpdateTemplate,
} from '@generated/endpoints/seller-reviews/seller-reviews'
import { PencilSimple, Plus, Trash, WarningCircle } from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import Modal from '@/components/Modal'
import { hookErrorMessage } from '@/lib/api/apiAdapters'

import type { ReviewReplyTemplateItem } from '@/types/seller'

interface ReviewReplyTemplateModalProps {
  shopId: string
  templates: ReviewReplyTemplateItem[]
  canManage: boolean
  onClose: () => void
  onChanged: (message: string) => void
}

export default function ReviewReplyTemplateModal({
  shopId,
  templates,
  canManage,
  onClose,
  onChanged,
}: ReviewReplyTemplateModalProps) {
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const createMutation = useCreateTemplate({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getListTemplatesQueryKey() })
        setEditingId(null)
        setTitle('')
        setContent('')
        setErrorMessage(null)
        onChanged('Đã thêm mẫu phản hồi nhanh!')
      },
      onError: function (error) {
        setErrorMessage(hookErrorMessage('sellerReplyTemplate', error))
      },
    },
  })

  const updateMutation = useUpdateTemplate({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getListTemplatesQueryKey() })
        setEditingId(null)
        setTitle('')
        setContent('')
        setErrorMessage(null)
        onChanged('Đã cập nhật mẫu phản hồi nhanh!')
      },
      onError: function (error) {
        setErrorMessage(hookErrorMessage('sellerReplyTemplate', error))
      },
    },
  })

  const deleteMutation = useDeleteTemplate({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getListTemplatesQueryKey() })
        if (editingId !== null) {
          setEditingId(null)
          setTitle('')
          setContent('')
        }
        setErrorMessage(null)
        onChanged('Đã xóa mẫu phản hồi nhanh!')
      },
      onError: function (error) {
        setErrorMessage(hookErrorMessage('sellerReplyTemplate', error))
      },
    },
  })

  const isSubmitting =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending

  function handleStartEdit(tpl: ReviewReplyTemplateItem) {
    setEditingId(tpl.id)
    setTitle(tpl.title)
    setContent(tpl.content)
    setErrorMessage(null)
  }

  function handleCancelEdit() {
    setEditingId(null)
    setTitle('')
    setContent('')
    setErrorMessage(null)
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedTitle = title.trim()
    const trimmedContent = content.trim()
    if (trimmedTitle === '' || trimmedContent === '') {
      setErrorMessage('Vui lòng nhập đầy đủ tiêu đề và nội dung mẫu.')
      return
    }
    setErrorMessage(null)
    if (editingId !== null) {
      updateMutation.mutate({
        templateId: editingId,
        data: { title: trimmedTitle, content: trimmedContent },
      })
      return
    }
    createMutation.mutate({
      params: { shopId },
      data: { title: trimmedTitle, content: trimmedContent },
    })
  }

  let submitLabel = 'Thêm mẫu'
  if (editingId !== null) {
    submitLabel = 'Lưu cập nhật'
  }

  return (
    <Modal title="Quản lý mẫu phản hồi nhanh" onClose={onClose} widthClass="max-w-2xl">
      <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
        <span>Mẫu văn bản thuần giúp trả lời đánh giá nhanh và đồng bộ giọng điệu shop.</span>
        <span className="font-bold text-zinc-700 dark:text-zinc-300">
          {templates.length}/50 mẫu
        </span>
      </div>

      {errorMessage !== null && (
        <div className="mt-3 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          <WarningCircle size={16} weight="bold" />
          <span>{errorMessage}</span>
        </div>
      )}

      {canManage && (
        <form
          onSubmit={handleSubmit}
          className="mt-4 space-y-3 rounded-2xl border border-zinc-200/80 bg-zinc-50/70 p-4 dark:border-white/10 dark:bg-white/5"
        >
          <div>
            <label
              htmlFor="templateTitleInput"
              className="block text-xs font-bold text-zinc-700 dark:text-zinc-300"
            >
              Tiêu đề mẫu
            </label>
            <input
              id="templateTitleInput"
              type="text"
              maxLength={100}
              value={title}
              onChange={function (e) {
                setTitle(e.target.value)
              }}
              placeholder="Ví dụ: Cảm ơn đánh giá 5 sao"
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs outline-none focus:border-indigo-500 dark:border-white/10 dark:bg-[#0b101b] dark:text-white"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="templateContentInput"
                className="block text-xs font-bold text-zinc-700 dark:text-zinc-300"
              >
                Nội dung phản hồi
              </label>
              <span className="text-[11px] text-zinc-400">{content.trim().length}/2000</span>
            </div>
            <textarea
              id="templateContentInput"
              rows={3}
              maxLength={2000}
              value={content}
              onChange={function (e) {
                setContent(e.target.value)
              }}
              placeholder="Nhập nội dung phản hồi văn bản thuần..."
              className="mt-1 w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs outline-none focus:border-indigo-500 dark:border-white/10 dark:bg-[#0b101b] dark:text-white"
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            {editingId !== null && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="rounded-full border border-zinc-200 px-4 py-1.5 text-xs font-bold text-zinc-600 hover:bg-zinc-100 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/10"
              >
                Hủy sửa
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <Plus size={14} weight="bold" />
              {submitLabel}
            </button>
          </div>
        </form>
      )}

      <div className="mt-4 max-h-72 space-y-2.5 overflow-y-auto pr-1">
        {templates.length === 0 && (
          <p className="py-8 text-center text-xs text-zinc-400">
            Shop chưa có mẫu phản hồi nhanh nào.
          </p>
        )}

        {templates.map(function (tpl) {
          return (
            <div
              key={tpl.id}
              className="rounded-2xl border border-zinc-200/80 bg-white p-3.5 dark:border-white/10 dark:bg-white/[0.03]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-zinc-900 dark:text-white">{tpl.title}</p>
                  <p className="mt-1 text-xs leading-relaxed whitespace-pre-line text-zinc-600 dark:text-zinc-300">
                    {tpl.content}
                  </p>
                </div>

                {canManage && (
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={function () {
                        handleStartEdit(tpl)
                      }}
                      className="inline-flex items-center gap-1 rounded-full border border-zinc-200 px-2.5 py-1 text-[11px] font-bold text-zinc-600 hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/10"
                    >
                      <PencilSimple size={13} />
                      Sửa
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={function () {
                        deleteMutation.mutate({ templateId: tpl.id })
                      }}
                      className="inline-flex items-center gap-1 rounded-full border border-red-200 px-2.5 py-1 text-[11px] font-bold text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
                    >
                      <Trash size={13} />
                      Xóa
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </Modal>
  )
}
