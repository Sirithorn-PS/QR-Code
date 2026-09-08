import { describe, it, expect, beforeEach, vi } from 'vitest'
import { updateProductStatus, API_BASE_URL, Product } from '@/lib/auth'

// Helper logic to test role permission for status action in UI
export function canManageProductStatus(user: { role: string } | null, product: { itemType?: string }): boolean {
  if (!user || user.role !== 'supervisor') return false
  return product.itemType === 'Packaging'
}

// Helper logic to test scan submit eligibility
export function canSubmitScanTransaction(product: { status?: string; itemType?: string; warehouse?: string } | null): { allowed: boolean; reason?: string } {
  if (!product) return { allowed: false, reason: 'กรุณาค้นหาสินค้าก่อนสร้างรายการ' }
  if (product.status === 'inactive') return { allowed: false, reason: 'สินค้านี้ถูกปิดการใช้งาน ไม่สามารถทำรายการรับเข้าหรือเบิกออกได้' }
  if (product.itemType !== 'Packaging' || (product.warehouse || '').toUpperCase().trim() !== 'WPK') {
    return { allowed: false, reason: 'ทำรายการได้เฉพาะสินค้าประเภท Packaging ในคลัง WPK เท่านั้น' }
  }
  return { allowed: true }
}

// Helper logic for packaging status filter
export function filterPackagingByStatus(
  products: Product[],
  statusFilter: 'all' | 'active' | 'inactive'
): Product[] {
  return products.filter(p => {
    if (p.itemType !== 'Packaging') return false
    if (statusFilter === 'active') return p.status !== 'inactive'
    if (statusFilter === 'inactive') return p.status === 'inactive'
    return true
  })
}

describe('Product Lifecycle Frontend Unit Tests', () => {
  beforeEach(() => {
    localStorage.clear()
    global.fetch = vi.fn()
  })

  describe('updateProductStatus API Helper', () => {
    it('should send PATCH request to /products/:id/status with active status', async () => {
      const mockProduct: Product = {
        id: 10,
        itemCode: 'PK-TEST',
        productId: null,
        name: 'Test Packaging',
        unit: 'PCS',
        warehouse: 'WPK',
        location: 'A-01',
        quantity: 50,
        itemType: 'Packaging',
        status: 'active',
      }

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockProduct,
      } as Response)

      const result = await updateProductStatus(10, 'active')

      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/products/10/status`,
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ status: 'active' }),
        })
      )
      expect(result).toEqual(mockProduct)
    })

    it('should send PATCH request to /products/:id/status with inactive status', async () => {
      const mockProduct: Product = {
        id: 10,
        itemCode: 'PK-TEST',
        productId: null,
        name: 'Test Packaging',
        unit: 'PCS',
        warehouse: 'WPK',
        location: 'A-01',
        quantity: 50,
        itemType: 'Packaging',
        status: 'inactive',
      }

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockProduct,
      } as Response)

      const result = await updateProductStatus(10, 'inactive')

      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/products/10/status`,
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ status: 'inactive' }),
        })
      )
      expect(result).toEqual(mockProduct)
    })

    it('should handle error when PATCH status fails', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'สินค้ารายการนี้ถูกปิดการใช้งาน' }),
      } as Response)

      await expect(updateProductStatus(10, 'inactive')).rejects.toThrow('สินค้ารายการนี้ถูกปิดการใช้งาน')
    })
  })

  describe('Role-Based Status Action Visibility & Scope', () => {
    it('Supervisor should be allowed to manage status for Packaging only', () => {
      expect(canManageProductStatus({ role: 'supervisor' }, { itemType: 'Packaging' })).toBe(true)
    })

    it('Supervisor should NOT be allowed to manage status for Non-Packaging (FG, Bulk, Raw Material)', () => {
      expect(canManageProductStatus({ role: 'supervisor' }, { itemType: 'FG' })).toBe(false)
      expect(canManageProductStatus({ role: 'supervisor' }, { itemType: 'Bulk' })).toBe(false)
      expect(canManageProductStatus({ role: 'supervisor' }, { itemType: 'Raw Material' })).toBe(false)
    })

    it('Admin should NOT be allowed to manage product status', () => {
      expect(canManageProductStatus({ role: 'admin' }, { itemType: 'Packaging' })).toBe(false)
    })

    it('Staff should NOT be allowed to manage product status', () => {
      expect(canManageProductStatus({ role: 'warehouse_staff' }, { itemType: 'Packaging' })).toBe(false)
    })

    it('Unauthenticated user should NOT be allowed to manage product status', () => {
      expect(canManageProductStatus(null, { itemType: 'Packaging' })).toBe(false)
    })
  })

  describe('Scan Transaction Guard for Inactive Products', () => {
    it('Active Packaging in WPK should be allowed to receive/issue', () => {
      const activeItem = { itemType: 'Packaging', warehouse: 'WPK', status: 'active' }
      const res = canSubmitScanTransaction(activeItem)
      expect(res.allowed).toBe(true)
    })

    it('Inactive Packaging should be BLOCKED from receive/issue', () => {
      const inactiveItem = { itemType: 'Packaging', warehouse: 'WPK', status: 'inactive' }
      const res = canSubmitScanTransaction(inactiveItem)
      expect(res.allowed).toBe(false)
      expect(res.reason).toContain('ปิดการใช้งาน')
    })

    it('Non-Packaging item should be rejected from scan receive/issue', () => {
      const fgItem = { itemType: 'FG', warehouse: 'WPK', status: 'active' }
      const res = canSubmitScanTransaction(fgItem)
      expect(res.allowed).toBe(false)
      expect(res.reason).toContain('เฉพาะสินค้าประเภท Packaging')
    })
  })

  describe('Packaging Status Filter Logic', () => {
    const mockList: Product[] = [
      { id: 1, itemCode: 'PK-1', productId: null, name: 'Pack 1', unit: 'PCS', warehouse: 'WPK', location: 'A', quantity: 10, itemType: 'Packaging', status: 'active' },
      { id: 2, itemCode: 'PK-2', productId: null, name: 'Pack 2', unit: 'PCS', warehouse: 'WPK', location: 'A', quantity: 20, itemType: 'Packaging', status: 'inactive' },
      { id: 3, itemCode: 'PK-3', productId: null, name: 'Pack 3', unit: 'PCS', warehouse: 'WPK', location: 'A', quantity: 30, itemType: 'Packaging' }, // default active
      { id: 4, itemCode: 'FG-1', productId: null, name: 'FG 1', unit: 'BTL', warehouse: 'WFG', location: 'B', quantity: 5, itemType: 'FG', status: 'active' },
    ]

    it('should return all packaging when filter is "all"', () => {
      const res = filterPackagingByStatus(mockList, 'all')
      expect(res.length).toBe(3)
      expect(res.map(p => p.itemCode)).toEqual(['PK-1', 'PK-2', 'PK-3'])
    })

    it('should return only active packaging when filter is "active"', () => {
      const res = filterPackagingByStatus(mockList, 'active')
      expect(res.length).toBe(2)
      expect(res.map(p => p.itemCode)).toEqual(['PK-1', 'PK-3'])
    })

    it('should return only inactive packaging when filter is "inactive"', () => {
      const res = filterPackagingByStatus(mockList, 'inactive')
      expect(res.length).toBe(1)
      expect(res[0].itemCode).toBe('PK-2')
    })
  })
})
