import { useEffect, useRef, useState } from 'react'
import type { SubmitEvent } from 'react'
import { ImageOff } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useProduct } from '@/hooks/useProduct'
import { useSaveProduct } from '@/hooks/useSaveProduct'
import { resolveImageUrl } from '@/lib/format'

const MAX_FILE_SIZE = 5 * 1024 * 1024

function parseProductId(raw: string | undefined) {
  if (raw === undefined) {
    return null
  }
  return Number(raw)
}

function validateName(value: string) {
  if (value.trim().length === 0) {
    return 'Tên sản phẩm không được để trống'
  }
  return null
}

function validatePrice(value: string) {
  const trimmed = value.trim()
  const amount = Number(trimmed)
  if (trimmed.length === 0 || Number.isNaN(amount) || amount <= 0) {
    return 'Giá phải là số lớn hơn 0'
  }
  return null
}

function validateFile(file: File) {
  if (!file.type.startsWith('image/') || file.size > MAX_FILE_SIZE) {
    return 'Chỉ nhận file ảnh (tối đa 5 MB)'
  }
  return null
}

function descriptionOrNull(value: string) {
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return null
  }
  return trimmed
}

function errorId(error: string | null, id: string) {
  if (error !== null) {
    return id
  }
  return undefined
}

function titleFor(editing: boolean) {
  if (editing) {
    return 'Sửa sản phẩm'
  }
  return 'Thêm sản phẩm'
}

function submitLabel(pending: boolean, editing: boolean) {
  if (pending) {
    return 'Đang lưu…'
  }
  if (editing) {
    return 'Lưu thay đổi'
  }
  return 'Tạo sản phẩm'
}

function previewAlt(name: string) {
  if (name === '') {
    return 'Ảnh sản phẩm hiện tại'
  }
  return name
}

function loadErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }
  return 'Không tải được sản phẩm.'
}

function fileNameFor(file: File | null) {
  if (file === null) {
    return 'Chưa chọn file'
  }
  return file.name
}

function ImagePreview({
  objectUrl,
  existingUrl,
  name,
}: {
  objectUrl: string | null
  existingUrl: string | null
  name: string
}) {
  if (objectUrl !== null) {
    return (
      <img
        src={objectUrl}
        alt="Ảnh xem trước"
        className="aspect-square w-full max-w-xs object-cover"
      />
    )
  }
  if (existingUrl !== null) {
    return (
      <img
        src={existingUrl}
        alt={previewAlt(name)}
        loading="lazy"
        className="aspect-square w-full max-w-xs object-cover"
      />
    )
  }
  return (
    <div className="flex aspect-square w-full max-w-xs items-center justify-center bg-muted text-muted-foreground">
      <ImageOff className="size-8" aria-hidden="true" />
      <span className="sr-only">Chưa có ảnh</span>
    </div>
  )
}

export default function ProductForm() {
  const { id } = useParams()
  const productId = parseProductId(id)
  const editing = productId !== null
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [priceText, setPriceText] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)
  const [priceError, setPriceError] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const summaryRef = useRef<HTMLDivElement>(null)

  const productQuery = useProduct(productId)

  useEffect(() => {
    const loaded = productQuery.data
    if (loaded === undefined) {
      return
    }
    setName(loaded.name)
    setPriceText(String(loaded.price))
    setDescription(loaded.description ?? '')
  }, [productQuery.data])

  useEffect(() => {
    return () => {
      if (objectUrl !== null) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [objectUrl])

  const saveMutation = useSaveProduct(productId, {
    onStatus: setStatus,
    onSuccess: () => {
      void navigate('/admin')
    },
  })
  const saveError = saveMutation.error

  useEffect(() => {
    if (saveError !== null) {
      summaryRef.current?.focus()
    }
  }, [saveError])

  function handleNameBlur() {
    setNameError(validateName(name))
  }

  function handlePriceBlur() {
    setPriceError(validatePrice(priceText))
  }

  function handleFileChange(files: FileList | null) {
    const chosen = files?.[0] ?? null
    if (chosen === null) {
      return
    }
    const error = validateFile(chosen)
    setFileError(error)
    if (error !== null) {
      return
    }
    setFile(chosen)
    setObjectUrl(URL.createObjectURL(chosen))
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextNameError = validateName(name)
    const nextPriceError = validatePrice(priceText)
    setNameError(nextNameError)
    setPriceError(nextPriceError)
    if (nextNameError !== null || nextPriceError !== null) {
      return
    }
    saveMutation.reset()
    saveMutation.mutate({
      values: {
        name: name.trim(),
        description: descriptionOrNull(description),
        price: Number(priceText.trim()),
      },
      file,
      existingImageKey: productQuery.data?.imageKey ?? null,
    })
  }

  if (editing && productQuery.isPending) {
    return (
      <div
        role="status"
        aria-label="Đang tải sản phẩm"
        aria-busy="true"
        className="mx-auto max-w-xl space-y-4"
      >
        <div className="h-8 w-1/3 animate-pulse bg-muted" />
        <div className="h-10 animate-pulse bg-muted" />
        <div className="h-10 animate-pulse bg-muted" />
        <div className="h-24 animate-pulse bg-muted" />
      </div>
    )
  }

  if (editing && productQuery.isError) {
    const message = loadErrorMessage(productQuery.error)
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <div role="alert" className="text-sm text-destructive">
          {message}
        </div>
        <Link
          to="/admin"
          className="mt-6 inline-block text-sm font-medium underline-offset-4 hover:underline"
        >
          Về danh sách
        </Link>
      </div>
    )
  }

  const existingUrl = resolveImageUrl(productQuery.data?.imageKey ?? null)

  return (
    <section className="mx-auto max-w-xl">
      <h1 className="font-display text-3xl">{titleFor(editing)}</h1>

      {saveError !== null && (
        <div
          ref={summaryRef}
          role="alert"
          tabIndex={-1}
          className="mt-6 rounded-sm border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive focus:outline-2 focus:outline-destructive"
        >
          {saveError.message}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name">Tên sản phẩm</Label>
          <Input
            id="name"
            type="text"
            autoComplete="off"
            value={name}
            onChange={(changeEvent) => setName(changeEvent.target.value)}
            onBlur={handleNameBlur}
            aria-invalid={nameError !== null}
            aria-describedby={errorId(nameError, 'name-error')}
          />
          {nameError !== null && (
            <p id="name-error" className="text-xs text-destructive">
              {nameError}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="price">Giá (VND)</Label>
          <Input
            id="price"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="VD: 350000"
            value={priceText}
            onChange={(changeEvent) => setPriceText(changeEvent.target.value)}
            onBlur={handlePriceBlur}
            aria-invalid={priceError !== null}
            aria-describedby={errorId(priceError, 'price-error')}
          />
          {priceError !== null && (
            <p id="price-error" className="text-xs text-destructive">
              {priceError}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Mô tả</Label>
          <Textarea
            id="description"
            rows={4}
            value={description}
            onChange={(changeEvent) => setDescription(changeEvent.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="image">Ảnh sản phẩm</Label>
          <ImagePreview objectUrl={objectUrl} existingUrl={existingUrl} name={name} />
          <div className="flex items-center gap-3">
            <Button asChild>
              <label htmlFor="image" className="cursor-pointer">
                Chọn ảnh
              </label>
            </Button>
            <span className="truncate text-sm text-muted-foreground">{fileNameFor(file)}</span>
          </div>
          <Input
            id="image"
            type="file"
            accept="image/*"
            onChange={(changeEvent) => handleFileChange(changeEvent.target.files)}
            aria-invalid={fileError !== null}
            aria-describedby={errorId(fileError, 'image-error')}
            className="sr-only"
          />
          {fileError !== null && (
            <p id="image-error" className="text-xs text-destructive">
              {fileError}
            </p>
          )}
        </div>

        {status !== null && (
          <p role="status" className="text-sm text-muted-foreground">
            {status}
          </p>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={saveMutation.isPending}>
            {submitLabel(saveMutation.isPending, editing)}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link to="/admin">Huỷ</Link>
          </Button>
        </div>
      </form>
    </section>
  )
}
