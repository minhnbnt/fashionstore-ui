// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import { buildOrderReviewLookup } from '@/lib/review/reviewOrderHelpers'

import CancelOrderModal from './CancelOrderModal'
import OrderProgressStepper from './OrderProgressStepper'
import ReorderResultModal from './ReorderResultModal'
import ReturnRequestModal from './ReturnRequestModal'
import ReviewModal from './ReviewModal'
import ReviewProductPickerModal from './ReviewProductPickerModal'
import ShipmentTrackingCard from './ShipmentTrackingCard'

const { uploadImageMock, uploadVideoMock } = vi.hoisted(() => ({
  uploadImageMock: vi.fn<(file: File) => Promise<string>>().mockResolvedValue('returns/img-1.jpg'),
  uploadVideoMock: vi
    .fn<(file: File, maxSeconds?: number) => Promise<string>>()
    .mockResolvedValue('returns/vid-1.mp4'),
}))

vi.mock('@/lib/api/uploadImage', () => ({
  uploadImage: (file: File) => uploadImageMock(file),
  uploadVideo: (file: File, maxSeconds?: number) => {
    if (maxSeconds === undefined) {
      return uploadVideoMock(file)
    }
    return uploadVideoMock(file, maxSeconds)
  },
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('OrderProgressStepper', () => {
  it('hien thi 5 moc tien trinh va banner doi tra dong bo khi co returnStatus', () => {
    render(
      <OrderProgressStepper
        status="DELIVERED"
        createdAt="2026-10-18T08:00:00Z"
        confirmedAt="2026-10-18T09:00:00Z"
        shippedAt="2026-10-19T10:00:00Z"
        deliveredAt="2026-10-20T14:00:00Z"
        receivedAt={null}
        returnStatus="APPROVED"
      />,
    )
    expect(screen.getAllByText('Đặt hàng').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Đang chuẩn bị').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Đang giao').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Đã giao').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Hoàn thành').length).toBeGreaterThan(0)
    expect(screen.getByText('Shop đã duyệt đổi trả')).toBeTruthy()
  })

  it('hien thi nhanh da huy rieng thay cho thanh tien trinh binh thuong', () => {
    render(
      <OrderProgressStepper
        status="CANCELLED"
        createdAt="2026-10-18T08:00:00Z"
        cancelledAt="2026-10-18T10:00:00Z"
      />,
    )
    expect(screen.getByText('Đơn hàng đã hủy')).toBeTruthy()
  })
})

describe('ShipmentTrackingCard', () => {
  it('hien thi don vi van chuyen, ma van don va cac moc hanh trinh', () => {
    render(
      <ShipmentTrackingCard
        shippingCarrier="GHN"
        trackingCode="VN-ORD-100"
        events={[
          {
            id: 'ev1',
            statusCode: 'PICKED_UP',
            title: 'Đã bàn giao cho đơn vị vận chuyển GHN',
            location: 'Kho Quận 1',
            description: 'Tạo vận đơn VN-ORD-100',
            eventTime: '2026-10-19T10:00:00Z',
          },
        ]}
        timeline={[
          {
            fromStatus: 'DELIVERED',
            toStatus: 'DELIVERED',
            actor: 'SYSTEM',
            note: 'Hệ thống tự động hoàn thành đơn sau 7 ngày.',
            createdAt: '2026-10-27T10:00:00Z',
          },
        ]}
      />,
    )
    expect(screen.getByText('GHN')).toBeTruthy()
    expect(screen.getByText('VN-ORD-100')).toBeTruthy()
    expect(screen.getByText('Đã bàn giao cho đơn vị vận chuyển GHN')).toBeTruthy()
    expect(screen.getByText('Kho Quận 1')).toBeTruthy()
    expect(screen.getByText('Hệ thống tự động xác nhận hoàn thành sau 7 ngày')).toBeTruthy()
  })
})

describe('CancelOrderModal', () => {
  it('bat buoc nhap ly do chi tiet khi chon Khac va gui dung payload khi hop le', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(
      <CancelOrderModal open={true} orderCode="ORD-1" onClose={vi.fn()} onConfirm={onConfirm} />,
    )

    await user.click(screen.getByRole('button', { name: 'Khác' }))
    await user.click(screen.getByRole('button', { name: 'Xác nhận hủy đơn' }))
    expect(screen.getByText('Vui lòng nhập lý do hủy đơn.')).toBeTruthy()
    expect(onConfirm).not.toHaveBeenCalled()

    await user.type(screen.getByPlaceholderText('Nhập lý do chi tiết...'), 'Đổi địa chỉ nhận')
    await user.click(screen.getByRole('button', { name: 'Xác nhận hủy đơn' }))
    expect(onConfirm).toHaveBeenCalledWith('OTHER', 'Đổi địa chỉ nhận')
  })
})

describe('ReviewModal & ReviewProductPickerModal', () => {
  it('bat buoc nhan xet toi thieu 10 ky tu, chon tag nhanh, an danh va upload media', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <ReviewModal
        open={true}
        productName="Áo sơ mi"
        variantLabel="M · Đen"
        reviewerName="Minh Nguyễn"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    )

    expect(screen.getByText('M · Đen')).toBeTruthy()
    const textarea = screen.getByPlaceholderText(/tối thiểu 10 ký tự/i)
    await user.type(textarea, 'Quá ngắn')
    await user.click(screen.getByRole('button', { name: 'Gửi đánh giá' }))
    expect(screen.getByText(/Vui lòng nhập nhận xét chi tiết tối thiểu 10 ký tự/i)).toBeTruthy()
    expect(onSubmit).not.toHaveBeenCalled()

    await user.clear(textarea)
    await user.type(textarea, 'Vải rất dày dặn, đường may tỉ mỉ và mặc mát.')
    await user.click(screen.getByRole('button', { name: 'Chất lượng tốt' }))
    await user.click(screen.getByRole('button', { name: 'Size đúng chuẩn' }))
    await user.click(screen.getByRole('checkbox'))
    expect(screen.getByText('M***n')).toBeTruthy()

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const vidFile = new File(['vid'], 'clip.mp4', { type: 'video/mp4' })
    await user.upload(fileInput, [vidFile])
    expect(uploadVideoMock).toHaveBeenCalledWith(vidFile, 30)

    await user.click(screen.getByRole('button', { name: 'Gửi đánh giá' }))
    expect(onSubmit).toHaveBeenCalledWith({
      stars: 5,
      comment: 'Vải rất dày dặn, đường may tỉ mỉ và mặc mát.',
      imageKeys: [],
      videoKey: 'returns/vid-1.mp4',
      tags: ['Chất lượng tốt', 'Size đúng chuẩn'],
      anonymous: true,
    })
  })

  it('chi cho sua 1 lan duy nhat va khoa khi da chinh sua', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    const { rerender } = render(
      <ReviewModal
        open={true}
        productName="Áo sơ mi"
        existingReview={{
          id: 'rev-1',
          stars: 4,
          comment: 'Nhận xét ban đầu đã đủ mười ký tự rồi.',
          edited: false,
        }}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    )
    expect(screen.getByText(/chỉ được chỉnh sửa đánh giá này 1 lần duy nhất/i)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Lưu chỉnh sửa' }))
    expect(onSubmit).toHaveBeenCalled()

    rerender(
      <ReviewModal
        open={true}
        productName="Áo sơ mi"
        existingReview={{
          id: 'rev-1',
          stars: 5,
          comment: 'Đã sửa nhận xét đủ mười ký tự.',
          edited: true,
        }}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    )
    expect(screen.getByText(/đã sử dụng hết lượt chỉnh sửa/i)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Lưu chỉnh sửa' })).toBeNull()
  })

  it('gom 1 dong moi productId trong cung don va khop dung theo (orderId, productId)', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const reviewLookup = buildOrderReviewLookup([
      {
        id: 'r2',
        orderId: 'o-9',
        productId: 'p2',
        stars: 4,
        comment: 'Ổn áp đủ 10 ký tự',
        edited: false,
      },
      {
        id: 'r3',
        orderId: 'o-9',
        productId: 'p3',
        stars: 5,
        comment: 'Đẹp lắm luôn nha',
        edited: true,
      },
      {
        id: 'r-other-order',
        orderId: 'o-8',
        productId: 'p1',
        stars: 5,
        comment: 'Đơn khác rồi',
        edited: true,
      },
    ])
    render(
      <ReviewProductPickerModal
        open={true}
        orderId="o-9"
        orderCode="ORD-9"
        items={[
          { id: 'i1a', productId: 'p1', productName: 'Áo thun', variantLabel: 'M · Đen' },
          { id: 'i1b', productId: 'p1', productName: 'Áo thun', variantLabel: 'L · Trắng' },
          { id: 'i2', productId: 'p2', productName: 'Quần tây', variantLabel: 'L' },
          { id: 'i3', productId: 'p3', productName: 'Thắt lưng', variantLabel: 'Free' },
        ]}
        reviewLookup={reviewLookup}
        onClose={vi.fn()}
        onSelectProduct={onSelect}
      />,
    )

    expect(screen.getByText('M · Đen, L · Trắng')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Đánh giá' }))
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ productId: 'p1' }),
      'M · Đen, L · Trắng',
      undefined,
    )
    await user.click(screen.getByRole('button', { name: 'Sửa đánh giá (1 lần)' }))
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ productId: 'p2' }),
      'L',
      expect.objectContaining({ id: 'r2' }),
    )
    const doneBtn = screen.getByRole('button', { name: 'Đã đánh giá' })
    expect((doneBtn as HTMLButtonElement).disabled).toBe(true)
  })
})

describe('ReorderResultModal & ReturnRequestModal', () => {
  it('hien thi thong tin mon bi bo qua/giam so luong trong ReorderResultModal', async () => {
    const user = userEvent.setup()
    const onGoToCart = vi.fn()
    render(
      <ReorderResultModal
        result={{
          totalRequestedItems: 2,
          addedCount: 1,
          adjustedCount: 1,
          skippedCount: 1,
          adjustedItems: [
            {
              productName: 'Áo thun',
              variantLabel: 'M / Đen',
              reason: 'STOCK_LIMITED',
              requestedQuantity: 3,
              addedQuantity: 1,
            },
          ],
          skippedItems: [
            {
              productName: 'Quần jeans',
              variantLabel: 'L',
              reason: 'OUT_OF_STOCK',
              requestedQuantity: 1,
              addedQuantity: 0,
            },
          ],
        }}
        onClose={vi.fn()}
        onGoToCart={onGoToCart}
      />,
    )
    expect(screen.getByText('Áo thun')).toBeTruthy()
    expect(screen.getByText('Quần jeans')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Đi tới giỏ hàng' }))
    expect(onGoToCart).toHaveBeenCalled()
  })

  it('ho tro upload ca anh lan video trong ReturnRequestModal', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <ReturnRequestModal open={true} orderCode="ORD-9" onClose={vi.fn()} onSubmit={onSubmit} />,
    )
    const input = screen.getByLabelText(/Tải ảnh hoặc video mở hộp/i) as HTMLInputElement
    const imgFile = new File(['img'], 'photo.jpg', { type: 'image/jpeg' })
    const vidFile = new File(['vid'], 'clip.mp4', { type: 'video/mp4' })
    await user.upload(input, [imgFile, vidFile])
    expect(uploadImageMock).toHaveBeenCalledWith(imgFile)
    expect(uploadVideoMock).toHaveBeenCalledWith(vidFile)

    await user.type(
      screen.getByPlaceholderText('Mô tả chi tiết tình trạng sản phẩm...'),
      'Áo rách tay',
    )
    await user.click(screen.getByRole('button', { name: 'Gửi yêu cầu đổi trả' }))
    expect(onSubmit).toHaveBeenCalledWith({
      reason: 'DAMAGED',
      description: 'Áo rách tay',
      evidenceKeys: ['returns/img-1.jpg', 'returns/vid-1.mp4'],
    })
  })
})
