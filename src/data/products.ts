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
  ratingBreakdown: number[]
  details: string[]
  gallery: string[]
  reviews: Review[]
}

export const CATEGORIES = [
  { id: 'ao', label: 'Áo', img: 'https://picsum.photos/seed/net-ao/600/700' },
  { id: 'vay', label: 'Váy & Đầm', img: 'https://picsum.photos/seed/net-vay/600/700' },
  { id: 'khoac', label: 'Áo khoác', img: 'https://picsum.photos/seed/net-khoac/600/700' },
  { id: 'quan', label: 'Quần', img: 'https://picsum.photos/seed/net-quan/600/700' },
  { id: 'phukien', label: 'Phụ kiện', img: 'https://picsum.photos/seed/net-pk/600/700' },
]

export const PRODUCTS: Product[] = [
  {
    id: 1,
    name: 'Áo thun oversize nét',
    desc: 'Cotton 260gsm, form rộng cá tính.',
    price: 391000,
    oldPrice: null,
    tag: 'Mới',
    img: 'https://picsum.photos/seed/net-p1/600/750',
    category: 'ao',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: [
      { name: 'Trắng', hex: '#ffffff' },
      { name: 'Đen', hex: '#171717' },
      { name: 'Xanh băng', hex: '#38bdf8' },
    ],
    stock: 12,
    rating: 4.8,
    reviewsCount: 132,
    ratingBreakdown: [85, 10, 3, 1, 1],
    details: ['Cotton 260gsm', 'Form oversize', 'Giặt máy nhẹ'],
    gallery: [
      'https://picsum.photos/seed/net-p1/600/750',
      'https://picsum.photos/seed/net-p1-a/600/750',
      'https://picsum.photos/seed/net-p1-b/600/750',
    ],
    reviews: [
      { name: 'Linh, Hà Nội', rating: 5, text: 'Vải dày dặn, form đẹp.', date: '02.10.2026' },
      { name: 'Trâm, Sài Gòn', rating: 5, text: 'Mặc 3 tháng chưa xù.', date: '28.09.2026' },
      {
        name: 'Khang, Sài Gòn',
        rating: 4,
        text: 'Form rộng thoải mái, giao nhanh.',
        date: '20.09.2026',
      },
      { name: 'An, Đà Nẵng', rating: 5, text: 'Màu lên chuẩn ảnh shop.', date: '12.09.2026' },
    ],
  },
  {
    id: 2,
    name: 'Váy midi xếp ly',
    desc: 'Nhẹ tênh, xoay là bung xòe.',
    price: 784000,
    oldPrice: 980000,
    tag: '-20%',
    img: 'https://picsum.photos/seed/net-p2/600/750',
    category: 'vay',
    sizes: ['S', 'M', 'L'],
    colors: [
      { name: 'Hồng', hex: '#f9a8d4' },
      { name: 'Đen', hex: '#171717' },
    ],
    stock: 8,
    rating: 4.9,
    reviewsCount: 210,
    ratingBreakdown: [90, 7, 2, 1, 0],
    details: ['Vải voan 2 lớp', 'Khóa ẩn sau lưng', 'Dài midi qua gối'],
    gallery: [
      'https://picsum.photos/seed/net-p2/600/750',
      'https://picsum.photos/seed/net-p2-a/600/750',
      'https://picsum.photos/seed/net-p2-b/600/750',
    ],
    reviews: [
      { name: 'An, Đà Nẵng', rating: 5, text: 'Váy lên form đúng ảnh.', date: '01.10.2026' },
      { name: 'Linh, Hà Nội', rating: 4, text: 'Vải nhẹ, cần lót cẩn thận.', date: '25.09.2026' },
      {
        name: 'Trâm, Sài Gòn',
        rating: 5,
        text: 'Xoay là xòe, đi tiệc ai cũng hỏi.',
        date: '18.09.2026',
      },
    ],
  },
  {
    id: 3,
    name: 'Áo khoác parka layer',
    desc: 'Phối caro, đi mưa đi nắng đều ổn.',
    price: 980000,
    oldPrice: null,
    tag: 'Hot',
    img: 'https://picsum.photos/seed/net-p3/600/750',
    category: 'khoac',
    sizes: ['M', 'L', 'XL'],
    colors: [
      { name: 'Rêu', hex: '#4d7c0f' },
      { name: 'Đen', hex: '#171717' },
    ],
    stock: 5,
    rating: 4.7,
    reviewsCount: 89,
    ratingBreakdown: [78, 15, 5, 1, 1],
    details: ['Chống nước nhẹ', 'Lót lưới thoáng', 'Túi hộp 4 ngăn'],
    gallery: [
      'https://picsum.photos/seed/net-p3/600/750',
      'https://picsum.photos/seed/net-p3-a/600/750',
      'https://picsum.photos/seed/net-p3-b/600/750',
    ],
    reviews: [
      { name: 'Khang, Sài Gòn', rating: 5, text: 'Đi mưa ổn, form đẹp.', date: '20.09.2026' },
      { name: 'Linh, Hà Nội', rating: 4, text: 'Hơi dày nhưng ấm, khóa tốt.', date: '12.09.2026' },
      {
        name: 'An, Đà Nẵng',
        rating: 5,
        text: 'Phối caro lạ, mặc thu đông hợp.',
        date: '02.09.2026',
      },
    ],
  },
  {
    id: 4,
    name: 'Quần jeans ống suông',
    desc: 'Denim thật, co giãn như quần nỉ.',
    price: 784000,
    oldPrice: 980000,
    tag: '-20%',
    img: 'https://picsum.photos/seed/net-p4/600/750',
    category: 'quan',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: [
      { name: 'Xanh đậm', hex: '#1e3a8a' },
      { name: 'Xanh nhạt', hex: '#7dd3fc' },
    ],
    stock: 15,
    rating: 4.6,
    reviewsCount: 176,
    ratingBreakdown: [72, 18, 7, 2, 1],
    details: ['Denim co giãn', 'Ống suông', 'Cạp cao'],
    gallery: [
      'https://picsum.photos/seed/net-p4/600/750',
      'https://picsum.photos/seed/net-p4-a/600/750',
      'https://picsum.photos/seed/net-p4-b/600/750',
    ],
    reviews: [
      { name: 'Trâm, Sài Gòn', rating: 4, text: 'Co giãn tốt, ống hơi dài.', date: '18.09.2026' },
      { name: 'Linh, Hà Nội', rating: 5, text: 'Hack chân dài thật, vải đẹp.', date: '10.09.2026' },
      { name: 'Khang, Sài Gòn', rating: 4, text: 'Cạp hơi rộng, còn lại ổn.', date: '01.09.2026' },
    ],
  },
  {
    id: 5,
    name: 'Áo len cotton mềm',
    desc: '100% cotton, 6 màu kẹo ngọt.',
    price: 686000,
    oldPrice: null,
    tag: 'Mới',
    img: 'https://picsum.photos/seed/net-p5/600/750',
    category: 'ao',
    sizes: ['S', 'M', 'L'],
    colors: [
      { name: 'Kem', hex: '#fef3c7' },
      { name: 'Hồng', hex: '#f9a8d4' },
    ],
    stock: 20,
    rating: 4.8,
    reviewsCount: 64,
    ratingBreakdown: [84, 11, 3, 1, 1],
    details: ['100% cotton', 'Dệt mịn', 'Không xù lông'],
    gallery: [
      'https://picsum.photos/seed/net-p5/600/750',
      'https://picsum.photos/seed/net-p5-a/600/750',
      'https://picsum.photos/seed/net-p5-b/600/750',
    ],
    reviews: [
      { name: 'An, Đà Nẵng', rating: 5, text: 'Mềm, màu ngọt.', date: '15.09.2026' },
      { name: 'Linh, Hà Nội', rating: 5, text: 'Không xù sau 5 lần giặt.', date: '08.09.2026' },
      {
        name: 'Trâm, Sài Gòn',
        rating: 4,
        text: 'Hơi mỏng, mặc lót trong là đẹp.',
        date: '28.08.2026',
      },
    ],
  },
  {
    id: 6,
    name: 'Chân váy chữ A',
    desc: 'Tôn dáng, hack chân dài.',
    price: 588000,
    oldPrice: null,
    tag: null,
    img: 'https://picsum.photos/seed/net-p6/600/750',
    category: 'vay',
    sizes: ['S', 'M', 'L'],
    colors: [
      { name: 'Đen', hex: '#171717' },
      { name: 'Be', hex: '#d6c7a8' },
    ],
    stock: 10,
    rating: 4.5,
    reviewsCount: 58,
    ratingBreakdown: [68, 20, 8, 3, 1],
    details: ['Form chữ A', 'Khóa hông', 'Vải dày dặn'],
    gallery: [
      'https://picsum.photos/seed/net-p6/600/750',
      'https://picsum.photos/seed/net-p6-a/600/750',
      'https://picsum.photos/seed/net-p6-b/600/750',
    ],
    reviews: [
      { name: 'Linh, Hà Nội', rating: 4, text: 'Tôn dáng, vải ổn.', date: '10.09.2026' },
      { name: 'An, Đà Nẵng', rating: 5, text: 'Đi làm ai cũng hỏi link.', date: '02.09.2026' },
      { name: 'Trâm, Sài Gòn', rating: 4, text: 'Khóa hông hơi chặt lúc đầu.', date: '25.08.2026' },
    ],
  },
  {
    id: 7,
    name: 'Túi tote canvas',
    desc: 'Đựng vừa laptop 14 inch.',
    price: 391000,
    oldPrice: null,
    tag: null,
    img: 'https://picsum.photos/seed/net-p7/600/750',
    category: 'phukien',
    sizes: ['Freesize'],
    colors: [
      { name: 'Trắng', hex: '#ffffff' },
      { name: 'Be', hex: '#d6c7a8' },
    ],
    stock: 30,
    rating: 4.7,
    reviewsCount: 41,
    ratingBreakdown: [76, 16, 6, 1, 1],
    details: ['Canvas 16oz', 'Đựng laptop 14 inch', 'Quai chắc chắn'],
    gallery: [
      'https://picsum.photos/seed/net-p7/600/750',
      'https://picsum.photos/seed/net-p7-a/600/750',
      'https://picsum.photos/seed/net-p7-b/600/750',
    ],
    reviews: [
      {
        name: 'Khang, Sài Gòn',
        rating: 5,
        text: 'Đựng vừa laptop, quai chắc.',
        date: '05.09.2026',
      },
      {
        name: 'Linh, Hà Nội',
        rating: 5,
        text: 'Vải canvas dày, đường may đẹp.',
        date: '28.08.2026',
      },
      { name: 'An, Đà Nẵng', rating: 4, text: 'Hơi to với người nhỏ con.', date: '20.08.2026' },
    ],
  },
  {
    id: 8,
    name: 'Quần nỉ ống rộng',
    desc: 'Mềm, ấm, mặc nhà ra phố đều đẹp.',
    price: 588000,
    oldPrice: 784000,
    tag: '-25%',
    img: 'https://picsum.photos/seed/net-p8/600/750',
    category: 'quan',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: [
      { name: 'Xám', hex: '#9ca3af' },
      { name: 'Đen', hex: '#171717' },
    ],
    stock: 0,
    rating: 4.6,
    reviewsCount: 97,
    ratingBreakdown: [70, 20, 7, 2, 1],
    details: ['Nỉ chân cua', 'Ống rộng', 'Cạp chun'],
    gallery: [
      'https://picsum.photos/seed/net-p8/600/750',
      'https://picsum.photos/seed/net-p8-a/600/750',
      'https://picsum.photos/seed/net-p8-b/600/750',
    ],
    reviews: [
      { name: 'Trâm, Sài Gòn', rating: 5, text: 'Mềm ấm, mặc sướng.', date: '01.09.2026' },
      { name: 'Linh, Hà Nội', rating: 5, text: 'Mặc nhà ra phố đều đẹp.', date: '22.08.2026' },
      {
        name: 'Khang, Sài Gòn',
        rating: 4,
        text: 'Ống rộng thoải mái, hơi dài.',
        date: '15.08.2026',
      },
    ],
  },
]

export function formatVnd(n: number): string {
  return n.toLocaleString('vi-VN') + ' ₫'
}

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
