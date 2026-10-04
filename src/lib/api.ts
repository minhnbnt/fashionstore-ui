import { supabase } from '@/lib/auth'

export interface Product {
  id: number
  name: string
  description: string | null
  price: number
  imageKey: string | null
  createdAt: string
  updatedAt: string
}

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

// Dạng JSON trả về từ backend (snake_case) — map sang Product camelCase một lần duy nhất ở đây
interface ApiProduct {
  id: number
  name: string
  description: string | null
  price: number
  image_key: string | null
  created_at: string
  updated_at: string
}

function fromApi(raw: ApiProduct): Product {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    price: raw.price,
    imageKey: raw.image_key,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }
}

function mockApiEnabled() {
  return import.meta.env.VITE_USE_MOCK === '1' || !import.meta.env.VITE_API_URL
}

function redirectToLogin() {
  const from = encodeURIComponent(window.location.pathname + window.location.search)
  window.location.assign(`/login?from=${from}`)
}

async function readErrorMessage(response: Response) {
  let message = `Yêu cầu thất bại (${response.status})`
  try {
    const body: unknown = await response.json()
    if (
      typeof body === 'object' &&
      body !== null &&
      'message' in body &&
      typeof body.message === 'string' &&
      body.message.length > 0
    ) {
      message = body.message
    }
  } catch {
    // body không phải JSON — giữ message mặc định
  }
  return message
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const { data } = await supabase.getSession()
  const headers = new Headers(options.headers)
  const token = data.session?.access_token
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${import.meta.env.VITE_API_URL}${path}`, {
    ...options,
    headers,
  })

  if (response.status === 401) {
    await supabase.signOut()
    redirectToLogin()
    throw new ApiError(401, 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại')
  }

  if (!response.ok) {
    throw new ApiError(response.status, await readErrorMessage(response))
  }

  return response
}

// Ảnh mock: Pexels (user đã duyệt danh sách URL trong hội thoại)
const MOCK_IMAGES = [
  'https://images.pexels.com/photos/8307669/pexels-photo-8307669.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1082526/pexels-photo-1082526.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1488470/pexels-photo-1488470.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/5698851/pexels-photo-5698851.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/6461325/pexels-photo-6461325.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/7202800/pexels-photo-7202800.jpeg?auto=compress&cs=tinysrgb&w=800',
]

const MOCK_NOW = '2026-10-04T00:00:00Z'

let mockProducts: Product[] = [
  {
    id: 1,
    name: 'Áo sơ mi lụa trắng',
    description: 'Sơ mi lụa tơ tằm dệt thủ công, form regular.',
    price: 890000,
    imageKey: MOCK_IMAGES[0],
    createdAt: MOCK_NOW,
    updatedAt: MOCK_NOW,
  },
  {
    id: 2,
    name: 'Váy midi đen',
    description: 'Váy midi dáng A, chất crepe co giãn nhẹ.',
    price: 1250000,
    imageKey: MOCK_IMAGES[1],
    createdAt: MOCK_NOW,
    updatedAt: MOCK_NOW,
  },
  {
    id: 3,
    name: 'Áo khoác trench',
    description: 'Trench coat lụa pha, chân váy xẻ sau.',
    price: 2190000,
    imageKey: MOCK_IMAGES[2],
    createdAt: MOCK_NOW,
    updatedAt: MOCK_NOW,
  },
  {
    id: 4,
    name: 'Quần âu vải lụa',
    description: 'Quần âu ống suông, eo cao.',
    price: 780000,
    imageKey: MOCK_IMAGES[3],
    createdAt: MOCK_NOW,
    updatedAt: MOCK_NOW,
  },
  {
    id: 5,
    name: 'Áo len cổ lọ',
    description: 'Len merino mỏng, màu be trung tính.',
    price: 650000,
    imageKey: MOCK_IMAGES[4],
    createdAt: MOCK_NOW,
    updatedAt: MOCK_NOW,
  },
  {
    id: 6,
    name: 'Đầm maxi hoa',
    description: 'Đầm maxi họa tiết hoa nhỏ, tay phồng nhẹ.',
    price: 1490000,
    imageKey: MOCK_IMAGES[5],
    createdAt: MOCK_NOW,
    updatedAt: MOCK_NOW,
  },
]

export async function listProducts(): Promise<Product[]> {
  if (mockApiEnabled()) {
    return [...mockProducts]
  }
  const response = await apiFetch('/api/products')
  const body = (await response.json()) as ApiProduct[]
  return body.map(fromApi)
}
