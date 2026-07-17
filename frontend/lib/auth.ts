export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

interface LoginCredentials {
  username: string
  password: string
}

interface RegisterData {
  username: string
  password: string
  fullName: string
}

interface AuthResponse {
  token: string
  user: {
    id: number
    username: string
    fullName: string
    role: string
  }
}

export interface Product {
  id: number
  itemCode: string
  productId: string | null
  name: string
  unit: string
  warehouse: string
  location: string
  quantity: number
  itemType?: string
  parentItemCodes?: string[]
}

export interface BillOfMaterial {
  id: number
  parentItemCode: string
  componentItemCode: string
  description: string
  uom: string
  quantity: number
  warehouse: string
  depth: number
  bomType: string
}

export interface StockTransaction {
  id: number
  productId: number
  type: 'receive' | 'issue'
  quantity: number
  status: 'pending' | 'confirmed' | 'rejected'
  itemSnapshot: Product
  note: string | null
  createdAt: string
  confirmedAt: string | null
  rejectedAt: string | null
  product?: {
    itemCode: string
    description: string
    unit: string
    quantity: number
  }
  createdBy?: {
    fullName: string
    username: string
  }
  approvedBy?: {
    fullName: string
    username: string
  } | null
}

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken()
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    })
  } catch {
    throw new Error('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ Backend ได้ กรุณาตรวจสอบการเปิดใช้งานระบบ')
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || 'Request failed')
  }

  return response.json()
}

export async function register(data: RegisterData): Promise<AuthResponse> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
  } catch {
    throw new Error('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ Backend ได้ กรุณาตรวจสอบการเปิดใช้งานระบบ')
  }

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Registration failed')
  }

  return response.json()
}

export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    })
  } catch {
    throw new Error('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ Backend ได้ กรุณาตรวจสอบการเปิดใช้งานระบบ')
  }

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Login failed')
  }

  return response.json()
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('token')
}

export function getUser(): AuthResponse['user'] | null {
  if (typeof window === 'undefined') return null
  const userStr = localStorage.getItem('user')
  return userStr ? JSON.parse(userStr) : null
}

export function logout(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

export function setAuthData(token: string, user: AuthResponse['user']): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('token', token)
  localStorage.setItem('user', JSON.stringify(user))
}

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false
  return !!localStorage.getItem('token')
}

export function fetchProducts(search = '', itemType = '') {
  const params = new URLSearchParams()
  if (search) params.append('search', search)
  if (itemType && itemType !== 'ALL') params.append('itemType', itemType)
  const queryString = params.toString() ? `?${params.toString()}` : ''
  return apiRequest<Product[]>(`/products${queryString}`)
}

export function fetchProduct(itemCode: string) {
  return apiRequest<Product>(`/products/${encodeURIComponent(itemCode)}`)
}

export function fetchProductBom(itemCode: string) {
  return apiRequest<BillOfMaterial[]>(`/products/${encodeURIComponent(itemCode)}/bom`)
}

export function createProduct(data: {
  itemCode: string
  description: string
  unit: string
  warehouse: string
  location: string
  quantity: number
}) {
  return apiRequest<Product>('/products', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateProductQuantity(id: number, quantity: number) {
  return apiRequest<Product>(`/products/${id}/quantity`, {
    method: 'PATCH',
    body: JSON.stringify({ quantity }),
  })
}

export function deleteProduct(id: number) {
  return apiRequest<{ success: boolean }>(`/products/${id}`, {
    method: 'DELETE',
  })
}

export function fetchTransactions(status = '', startDate = '', endDate = '', search = '') {
  const params = new URLSearchParams()
  if (status) params.append('status', status)
  if (startDate) params.append('startDate', startDate)
  if (endDate) params.append('endDate', endDate)
  if (search) params.append('search', search)
  
  const queryString = params.toString() ? `?${params.toString()}` : ''
  return apiRequest<StockTransaction[]>(`/transactions${queryString}`)
}

export function createTransaction(data: {
  itemCode: string
  type: 'receive' | 'issue'
  quantity: number
  note?: string
}) {
  return apiRequest<StockTransaction>('/transactions', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function confirmTransaction(id: number) {
  return apiRequest<StockTransaction>(`/transactions/${id}/confirm`, {
    method: 'POST',
  })
}

export function rejectTransaction(id: number, note?: string) {
  return apiRequest<StockTransaction>(`/transactions/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  })
}
