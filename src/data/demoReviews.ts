// TODO(mock): module demo, thay bằng API reviews khi backend có endpoint.
// Mọi import từ file này đều là dữ liệu giả, grep TODO(mock) để dọn.

import type { DemoRating, DemoReview } from '@/types/product'

export const DEMO_RATING: DemoRating = {
  value: 4.8,
  count: 132,
  breakdown: [85, 10, 3, 1, 1],
}

export const DEMO_REVIEWS: DemoReview[] = [
  { name: 'Linh, Hà Nội', rating: 5, text: 'Vải dày dặn, form đẹp.', date: '02.10.2026' },
  { name: 'Trâm, Sài Gòn', rating: 5, text: 'Mặc 3 tháng chưa xù.', date: '28.09.2026' },
  {
    name: 'Khang, Sài Gòn',
    rating: 4,
    text: 'Form rộng thoải mái, giao nhanh.',
    date: '20.09.2026',
  },
  { name: 'An, Đà Nẵng', rating: 5, text: 'Màu lên chuẩn ảnh shop.', date: '12.09.2026' },
]
