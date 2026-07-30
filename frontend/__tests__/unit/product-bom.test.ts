import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createProductWithBom, API_BASE_URL } from '@/lib/auth'

// Helper function for testing QR code eligibility logic
export function isEligibleForQr(item: { itemType?: string | null; warehouse?: string | null }): boolean {
  const type = (item.itemType || '').trim()
  const wh = (item.warehouse || '').trim()
  return type === 'Packaging' && wh === 'WPK'
}

describe('Product & BOM Unit Tests (Logic & Validation)', () => {
  beforeEach(() => {
    localStorage.clear()
    global.fetch = vi.fn()
  })

  describe('QR Code Eligibility Logic', () => {
    it('should return true ONLY when itemType is Packaging AND warehouse is WPK', () => {
      expect(isEligibleForQr({ itemType: 'Packaging', warehouse: 'WPK' })).toBe(true)
    })

    it('should return false for Packaging with other warehouses', () => {
      expect(isEligibleForQr({ itemType: 'Packaging', warehouse: 'WRM' })).toBe(false)
      expect(isEligibleForQr({ itemType: 'Packaging', warehouse: 'WFG' })).toBe(false)
    })

    it('should return false for other material types in WPK warehouse', () => {
      expect(isEligibleForQr({ itemType: 'FG', warehouse: 'WPK' })).toBe(false)
      expect(isEligibleForQr({ itemType: 'Raw Material', warehouse: 'WPK' })).toBe(false)
      expect(isEligibleForQr({ itemType: 'Bulk', warehouse: 'WPK' })).toBe(false)
    })

    it('should return false for missing or null values', () => {
      expect(isEligibleForQr({ itemType: null, warehouse: 'WPK' })).toBe(false)
      expect(isEligibleForQr({ itemType: 'Packaging', warehouse: null })).toBe(false)
    })
  })

  describe('createProductWithBom Service', () => {
    it('should successfully post product with BOM components', async () => {
      const mockPayload = {
        parentItemCode: 'P-100',
        componentItemCode: 'P-100',
        description: 'Test Product',
        uom: 'PCS',
        warehouse: 'WPK',
        quantity: 100,
        bomType: 'Packaging',
        components: [
          {
            componentItemCode: 'C-001',
            description: 'Cap 001',
            warehouse: 'WPK',
            quantity: 1,
            uom: 'PCS'
          }
        ]
      }

      const mockResponse = {
        message: 'บันทึกข้อมูลสินค้าและ BOM เรียบร้อยแล้ว',
        product: { id: 1, itemCode: 'P-100', description: 'Test Product', quantity: 100, unit: 'PCS', warehouse: 'WPK', location: '-' }
      }

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response)

      const result = await createProductWithBom(mockPayload)

      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/products/with-bom`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(mockPayload)
        })
      )
      expect(result).toEqual(mockResponse)
    })

    it('should handle backend duplicate itemCode error gracefully', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'รหัสสินค้า P-100 มีอยู่ในระบบแล้ว' })
      } as Response)

      await expect(
        createProductWithBom({
          parentItemCode: 'P-100',
          componentItemCode: 'P-100',
          description: 'Dup',
          uom: 'PCS',
          warehouse: 'WPK',
          quantity: 10,
          bomType: 'Packaging'
        })
      ).rejects.toThrow('รหัสสินค้า P-100 มีอยู่ในระบบแล้ว')
    })
  })
})
