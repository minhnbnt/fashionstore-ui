export interface Product {
  id: number
  name: string
  desc: string
  price: number
  oldPrice: number | null
  tag: string | null
  img: string
  category: string
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
  },
]

export function formatVnd(n: number): string {
  return n.toLocaleString('vi-VN') + ' ₫'
}
