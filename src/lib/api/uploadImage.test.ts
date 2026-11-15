// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import { MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, uploadImage, uploadVideo } from './uploadImage'

const { presignMock } = vi.hoisted(() => ({
  presignMock: vi.fn(),
}))

vi.mock('@generated/endpoints/uploads/uploads', () => ({
  presign: (body: unknown) => presignMock(body),
}))

function stubPresign(uploadId: string) {
  presignMock.mockResolvedValue({
    status: 200,
    data: { uploadId, uploadUrl: 'https://s3.test/put-here', expiresAt: '2026-11-14T00:10:00Z' },
  })
}

function stubPutResponse(ok: boolean) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok, status: ok ? 200 : 403 }))
}

function fakeVideoElement(duration: number): HTMLVideoElement {
  const el: Record<string, unknown> = { preload: 'metadata', duration }
  Object.defineProperty(el, 'src', {
    set: function () {
      const loaded = el.onloadedmetadata as (() => void) | null
      if (loaded !== null && loaded !== undefined) {
        loaded()
      }
    },
  })
  return el as unknown as HTMLVideoElement
}

afterEach(() => {
  vi.unstubAllGlobals()
  presignMock.mockReset()
  vi.restoreAllMocks()
})

describe('uploadImage', () => {
  it('presign rồi PUT file, trả về uploadId và truyền purpose', async () => {
    stubPresign('u-1')
    const putMock = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    vi.stubGlobal('fetch', putMock)
    const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' })

    const id = await uploadImage(file, 'kyc')

    expect(id).toBe('u-1')
    expect(presignMock).toHaveBeenCalledWith({ contentType: 'image/jpeg', purpose: 'kyc' })
    expect(putMock).toHaveBeenCalledWith(
      'https://s3.test/put-here',
      expect.objectContaining({ method: 'PUT', body: file }),
    )
  })

  it('mặc định không gửi purpose', async () => {
    stubPresign('u-2')
    stubPutResponse(true)
    const file = new File(['x'], 'a.png', { type: 'image/png' })

    await uploadImage(file)

    expect(presignMock).toHaveBeenCalledWith({ contentType: 'image/png', purpose: undefined })
  })

  it('chặn file không phải ảnh', async () => {
    stubPutResponse(true)
    const file = new File(['x'], 'a.pdf', { type: 'application/pdf' })

    await expect(uploadImage(file)).rejects.toThrow('Chỉ nhận file ảnh.')
    expect(presignMock).not.toHaveBeenCalled()
  })

  it('chặn file SVG', async () => {
    stubPutResponse(true)
    const file = new File(['<svg/>'], 'a.svg', { type: 'image/svg+xml' })

    await expect(uploadImage(file)).rejects.toThrow('Không nhận file SVG.')
    expect(presignMock).not.toHaveBeenCalled()
  })

  it('chặn ảnh vượt 5 MB', async () => {
    stubPutResponse(true)
    const big = new File([new ArrayBuffer(8)], 'big.jpg', { type: 'image/jpeg' })
    Object.defineProperty(big, 'size', { value: MAX_IMAGE_BYTES + 1 })

    await expect(uploadImage(big)).rejects.toThrow('Ảnh tối đa 5 MB.')
    expect(presignMock).not.toHaveBeenCalled()
  })

  it('PUT thất bại thì báo lỗi upload', async () => {
    stubPresign('u-3')
    stubPutResponse(false)
    const file = new File(['x'], 'a.webp', { type: 'image/webp' })

    await expect(uploadImage(file)).rejects.toThrow('Upload tệp thất bại, thử lại sau.')
  })
})

describe('uploadVideo', () => {
  it('check thời lượng rồi presign, trả về uploadId', async () => {
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation(function (tag: string) {
      if (tag === 'video') {
        return fakeVideoElement(30)
      }
      return originalCreateElement(tag)
    })
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: () => 'blob:test',
      revokeObjectURL: () => undefined,
    })
    stubPresign('v-1')
    stubPutResponse(true)
    const file = new File(['x'], 'v.mp4', { type: 'video/mp4' })

    const id = await uploadVideo(file, 60)

    expect(id).toBe('v-1')
    expect(presignMock).toHaveBeenCalledWith({ contentType: 'video/mp4', purpose: undefined })
  })

  it('chặn file không phải video', async () => {
    stubPutResponse(true)
    const file = new File(['x'], 'v.jpg', { type: 'image/jpeg' })

    await expect(uploadVideo(file)).rejects.toThrow('Chỉ nhận file video.')
    expect(presignMock).not.toHaveBeenCalled()
  })

  it('chặn video vượt 50 MB', async () => {
    stubPutResponse(true)
    const big = new File([new ArrayBuffer(8)], 'big.mp4', { type: 'video/mp4' })
    Object.defineProperty(big, 'size', { value: MAX_VIDEO_BYTES + 1 })

    await expect(uploadVideo(big)).rejects.toThrow('Video tối đa 50 MB.')
    expect(presignMock).not.toHaveBeenCalled()
  })

  it('video vượt thời lượng tối đa thì báo lỗi', async () => {
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation(function (tag: string) {
      if (tag === 'video') {
        return fakeVideoElement(90)
      }
      return originalCreateElement(tag)
    })
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: () => 'blob:test',
      revokeObjectURL: () => undefined,
    })
    stubPutResponse(true)
    const file = new File(['x'], 'long.mp4', { type: 'video/mp4' })

    await expect(uploadVideo(file, 60)).rejects.toThrow('vượt quá giới hạn tối đa 60 giây')
    expect(presignMock).not.toHaveBeenCalled()
  })
})
