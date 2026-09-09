import { describe, it, expect, beforeEach, vi } from 'vitest'
import { updateProductMinStock, Product } from '@/lib/auth'

// Frontend helper logic for Min Stock validation
export function validateMinStockInput(input: string): { valid: boolean; value: number | null; error?: string } {
  const trimmed = input.trim()
  if (trimmed === '') {
    return { valid: true, value: null }
  }
  const num = Number(trimmed)
  if (isNaN(num) || !Number.isInteger(num) || num < 0) {
    return { valid: false, value: null, error: 'จุดสั่งซื้อ (Min Stock) ต้องเป็นตัวเลขจำนวนเต็มที่ไม่ติดลบ (>= 0)' }
  }
  return { valid: true, value: num }
}

// Frontend helper logic to check if a product is in low stock state for UI highlight
export function isLowStock(product: Product): boolean {
  return (
    product.itemType === 'Packaging' &&
    product.status === 'active' &&
    product.minStock !== null &&
    product.minStock !== undefined &&
    product.quantity <= product.minStock
  )
}

// Frontend helper logic for permission to manage min stock
export function canManageMinStock(user: { role: string } | null, product: Product): boolean {
  if (!user || user.role !== 'supervisor') return false
  return product.itemType === 'Packaging'
}

describe('Low Stock & Min Stock Frontend Unit Tests', () => {
  beforeEach(() => {
    localStorage.clear()
    global.fetch = vi.fn()
  })

  describe('validateMinStockInput Helper', () => {
    it('should accept empty string as null (clear min stock)', () => {
      const res = validateMinStockInput('')
      expect(res.valid).toBe(true)
      expect(res.value).toBeNull()
    })

    it('should accept whitespace string as null', () => {
      const res = validateMinStockInput('   ')
      expect(res.valid).toBe(true)
      expect(res.value).toBeNull()
    })

    it('should accept valid positive integer', () => {
      const res = validateMinStockInput('50')
      expect(res.valid).toBe(true)
      expect(res.value).toBe(50)
    })

    it('should accept zero as valid min stock', () => {
      const res = validateMinStockInput('0')
      expect(res.valid).toBe(true)
      expect(res.value).toBe(0)
    })

    it('should reject negative integer', () => {
      const res = validateMinStockInput('-5')
      expect(res.valid).toBe(false)
      expect(res.error).toBeDefined()
    })

    it('should reject decimal number', () => {
      const res = validateMinStockInput('12.5')
      expect(res.valid).toBe(false)
      expect(res.error).toBeDefined()
    })

    it('should reject non-numeric string', () => {
      const res = validateMinStockInput('abc')
      expect(res.valid).toBe(false)
      expect(res.error).toBeDefined()
    })
  })

  describe('isLowStock Helper', () => {
    it('should return true when packaging is active and quantity <= minStock', () => {
      const p: Product = {
        id: 1,
        itemCode: 'PKG-1',
        productId: null,
        name: 'Packaging Box',
        unit: 'PCS',
        warehouse: 'WPK',
        location: 'A-1',
        quantity: 10,
        itemType: 'Packaging',
        status: 'active',
        minStock: 10,
      }
      expect(isLowStock(p)).toBe(true)
    })

    it('should return true when quantity < minStock', () => {
      const p: Product = {
        id: 1,
        itemCode: 'PKG-1',
        productId: null,
        name: 'Packaging Box',
        unit: 'PCS',
        warehouse: 'WPK',
        location: 'A-1',
        quantity: 5,
        itemType: 'Packaging',
        status: 'active',
        minStock: 10,
      }
      expect(isLowStock(p)).toBe(true)
    })

    it('should return false when quantity > minStock', () => {
      const p: Product = {
        id: 1,
        itemCode: 'PKG-1',
        productId: null,
        name: 'Packaging Box',
        unit: 'PCS',
        warehouse: 'WPK',
        location: 'A-1',
        quantity: 15,
        itemType: 'Packaging',
        status: 'active',
        minStock: 10,
      }
      expect(isLowStock(p)).toBe(false)
    })

    it('should return false when minStock is null', () => {
      const p: Product = {
        id: 1,
        itemCode: 'PKG-1',
        productId: null,
        name: 'Packaging Box',
        unit: 'PCS',
        warehouse: 'WPK',
        location: 'A-1',
        quantity: 0,
        itemType: 'Packaging',
        status: 'active',
        minStock: null,
      }
      expect(isLowStock(p)).toBe(false)
    })

    it('should return false when product is inactive even if quantity <= minStock', () => {
      const p: Product = {
        id: 1,
        itemCode: 'PKG-1',
        productId: null,
        name: 'Packaging Box',
        unit: 'PCS',
        warehouse: 'WPK',
        location: 'A-1',
        quantity: 2,
        itemType: 'Packaging',
        status: 'inactive',
        minStock: 10,
      }
      expect(isLowStock(p)).toBe(false)
    })

    it('should return false when itemType is not Packaging (e.g. FG)', () => {
      const p: Product = {
        id: 2,
        itemCode: 'FG-1',
        productId: null,
        name: 'Finished Goods Oil',
        unit: 'BOTTLE',
        warehouse: 'WPK',
        location: 'B-1',
        quantity: 2,
        itemType: 'FG',
        status: 'active',
        minStock: 10,
      }
      expect(isLowStock(p)).toBe(false)
    })
  })

  describe('canManageMinStock Role Boundary Helper', () => {
    const pkgProduct: Product = {
      id: 1,
      itemCode: 'PKG-1',
      productId: null,
      name: 'Packaging Box',
      unit: 'PCS',
      warehouse: 'WPK',
      location: 'A-1',
      quantity: 10,
      itemType: 'Packaging',
      status: 'active',
    }

    it('should allow Supervisor on Packaging product', () => {
      expect(canManageMinStock({ role: 'supervisor' }, pkgProduct)).toBe(true)
    })

    it('should reject Staff on Packaging product', () => {
      expect(canManageMinStock({ role: 'warehouse_staff' }, pkgProduct)).toBe(false)
    })

    it('should reject Admin on Packaging product', () => {
      expect(canManageMinStock({ role: 'admin' }, pkgProduct)).toBe(false)
    })

    it('should reject unauthenticated user', () => {
      expect(canManageMinStock(null, pkgProduct)).toBe(false)
    })

    it('should reject Supervisor on FG product', () => {
      const fgProduct: Product = { ...pkgProduct, itemType: 'FG' }
      expect(canManageMinStock({ role: 'supervisor' }, fgProduct)).toBe(false)
    })
  })

  describe('updateProductMinStock API Helper', () => {
    it('should send PATCH request to /products/:id/min-stock with minStock value', async () => {
      const mockProduct: Product = {
        id: 5,
        itemCode: 'PK-005',
        productId: null,
        name: 'Gallon 4L',
        unit: 'PCS',
        warehouse: 'WPK',
        location: 'W-01',
        quantity: 30,
        itemType: 'Packaging',
        status: 'active',
        minStock: 25,
      }

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockProduct,
      } as Response)

      const result = await updateProductMinStock(5, 25)
      expect(result).toEqual(mockProduct)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/products/5/min-stock'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ minStock: 25 }),
        })
      )
    })

    it('should send PATCH request with null to clear minStock', async () => {
      const mockProduct: Product = {
        id: 5,
        itemCode: 'PK-005',
        productId: null,
        name: 'Gallon 4L',
        unit: 'PCS',
        warehouse: 'WPK',
        location: 'W-01',
        quantity: 30,
        itemType: 'Packaging',
        status: 'active',
        minStock: null,
      }

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockProduct,
      } as Response)

      const result = await updateProductMinStock(5, null)
      expect(result.minStock).toBeNull()
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/products/5/min-stock'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ minStock: null }),
        })
      )
    })
  })
})
