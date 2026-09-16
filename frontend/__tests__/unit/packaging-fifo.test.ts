import { describe, it, expect } from 'vitest'
import { isPackagingItem, normalizeItemType } from '@/lib/packaging'

// Types for FIFO simulation unit testing
interface MockProduct {
  id: number
  itemCode: string
  itemType: string
  quantity: number
  status: string
}

interface MockProductLot {
  id: number
  productId: number
  lotNumber: string
  supplierLot: string
  receivedDate: string
  receivedQuantity: number
  remainingQuantity: number
  transactionId?: number | null
  status: 'active' | 'depleted'
  createdAt: string
}

interface MockLotAllocation {
  transactionId: number
  productLotId: number
  quantity: number
}

// Atomic Receive Simulation matching backend confirm transaction logic
function simulateConfirmReceive(
  product: MockProduct,
  lots: MockProductLot[],
  receiveTx: { id: number; productId: number; quantity: number; receivedDate?: string; supplierLot?: string }
): { updatedProduct: MockProduct; updatedLots: MockProductLot[]; createdLot: MockProductLot | null } {
  const nextQuantity = product.quantity + receiveTx.quantity
  const updatedProduct = { ...product, quantity: nextQuantity }
  let createdLot: MockProductLot | null = null
  const updatedLots = [...lots]

  if (isPackagingItem(product.itemType)) {
    const lotId = updatedLots.length > 0 ? Math.max(...updatedLots.map(l => l.id)) + 1 : 1
    const d = receiveTx.receivedDate ? new Date(receiveTx.receivedDate) : new Date('2026-09-16T10:00:00.000Z')
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const lotNumber = `LOT-${yyyy}${mm}${dd}-${String(lotId).padStart(4, '0')}`

    createdLot = {
      id: lotId,
      productId: product.id,
      lotNumber,
      supplierLot: receiveTx.supplierLot || 'SUP-DEFAULT',
      receivedDate: d.toISOString(),
      receivedQuantity: receiveTx.quantity,
      remainingQuantity: receiveTx.quantity,
      transactionId: receiveTx.id,
      status: 'active',
      createdAt: new Date().toISOString(),
    }
    updatedLots.push(createdLot)
  }

  return { updatedProduct, updatedLots, createdLot }
}

// FIFO Issue Simulation matching backend confirm transaction logic
function simulateConfirmIssue(
  product: MockProduct,
  lots: MockProductLot[],
  issueTx: { id: number; productId: number; quantity: number }
): {
  updatedProduct: MockProduct
  updatedLots: MockProductLot[]
  allocations: MockLotAllocation[]
} {
  if (isPackagingItem(product.itemType)) {
    // 1. Get active lots with remainingQuantity > 0
    const availableLots = lots.filter(
      l => l.productId === product.id && l.status === 'active' && l.remainingQuantity > 0
    )

    // 2. Sort by FIFO: 1. receivedDate ASC -> 2. createdAt ASC -> 3. id ASC
    availableLots.sort((a, b) => {
      const timeA = new Date(a.receivedDate).getTime()
      const timeB = new Date(b.receivedDate).getTime()
      if (timeA !== timeB) return timeA - timeB

      const createA = new Date(a.createdAt).getTime()
      const createB = new Date(b.createdAt).getTime()
      if (createA !== createB) return createA - createB

      return a.id - b.id
    })

    const totalAvailable = availableLots.reduce((acc, l) => acc + l.remainingQuantity, 0)
    if (issueTx.quantity > totalAvailable || issueTx.quantity > product.quantity) {
      throw new Error('สต็อกใน Lot ไม่เพียงพอสำหรับการเบิก')
    }

    let qtyNeeded = issueTx.quantity
    const allocations: MockLotAllocation[] = []
    const updatedLots = lots.map(l => ({ ...l }))

    for (const lot of availableLots) {
      if (qtyNeeded <= 0) break
      const targetLot = updatedLots.find(l => l.id === lot.id)!
      const deductQty = Math.min(targetLot.remainingQuantity, qtyNeeded)
      targetLot.remainingQuantity -= deductQty
      if (targetLot.remainingQuantity <= 0) {
        targetLot.status = 'depleted'
      }

      allocations.push({
        transactionId: issueTx.id,
        productLotId: targetLot.id,
        quantity: deductQty,
      })

      qtyNeeded -= deductQty
    }

    const updatedProduct = { ...product, quantity: product.quantity - issueTx.quantity }
    return { updatedProduct, updatedLots, allocations }
  } else {
    // Non-packaging: simple quantity reduction without ProductLot
    if (product.quantity < issueTx.quantity) {
      throw new Error('Insufficient stock')
    }
    const updatedProduct = { ...product, quantity: product.quantity - issueTx.quantity }
    return { updatedProduct, updatedLots: [...lots], allocations: [] }
  }
}

describe('Packaging Item Type + ProductLot + FIFO Logic Automated Tests', () => {
  // =========================================================================
  // TEST 5: Case & Whitespace Normalization for isPackagingItem
  // =========================================================================
  describe('TEST 5: Case & Whitespace Normalization (isPackagingItem)', () => {
    it('should recognize exact "Packaging"', () => {
      expect(isPackagingItem('Packaging')).toBe(true)
    })

    it('should recognize lowercase "packaging"', () => {
      expect(isPackagingItem('packaging')).toBe(true)
    })

    it('should recognize uppercase with spaces "  PACKAGING  "', () => {
      expect(isPackagingItem('  PACKAGING  ')).toBe(true)
    })

    it('should recognize "Packaging Material"', () => {
      expect(isPackagingItem('Packaging Material')).toBe(true)
    })

    it('should recognize lowercase "packaging material"', () => {
      expect(isPackagingItem('packaging material')).toBe(true)
    })

    it('should recognize snake_case "packaging_material"', () => {
      expect(isPackagingItem('packaging_material')).toBe(true)
    })

    it('should recognize uppercase snake_case "  PACKAGING_MATERIAL  "', () => {
      expect(isPackagingItem('  PACKAGING_MATERIAL  ')).toBe(true)
    })
  })

  // =========================================================================
  // TEST 6: Non-packaging products
  // =========================================================================
  describe('TEST 6: Non-packaging products', () => {
    it('should return false for "FG"', () => {
      expect(isPackagingItem('FG')).toBe(false)
    })

    it('should return false for "Bulk"', () => {
      expect(isPackagingItem('Bulk')).toBe(false)
    })

    it('should return false for "Raw Material"', () => {
      expect(isPackagingItem('Raw Material')).toBe(false)
    })

    it('should return false for null, undefined, empty string, and non-strings', () => {
      expect(isPackagingItem(null)).toBe(false)
      expect(isPackagingItem(undefined)).toBe(false)
      expect(isPackagingItem('')).toBe(false)
      expect(isPackagingItem('   ')).toBe(false)
    })

    it('should NOT enter ProductLot/FIFO packaging logic for non-packaging Receive', () => {
      const fgProduct: MockProduct = {
        id: 101,
        itemCode: 'FG-OIL-01',
        itemType: 'FG',
        quantity: 100,
        status: 'active',
      }
      const existingLots: MockProductLot[] = []

      const result = simulateConfirmReceive(fgProduct, existingLots, {
        id: 501,
        productId: 101,
        quantity: 50,
      })

      expect(result.updatedProduct.quantity).toBe(150)
      expect(result.createdLot).toBeNull()
      expect(result.updatedLots.length).toBe(0)
    })

    it('should NOT enter ProductLot/FIFO packaging logic for non-packaging Issue', () => {
      const rmProduct: MockProduct = {
        id: 201,
        itemCode: 'RM-BASE-01',
        itemType: 'Raw Material',
        quantity: 80,
        status: 'active',
      }
      const existingLots: MockProductLot[] = []

      const result = simulateConfirmIssue(rmProduct, existingLots, {
        id: 502,
        productId: 201,
        quantity: 30,
      })

      expect(result.updatedProduct.quantity).toBe(50)
      expect(result.allocations.length).toBe(0)
      expect(result.updatedLots.length).toBe(0)
    })
  })

  // =========================================================================
  // Canonical Normalization (normalizeItemType)
  // =========================================================================
  describe('Canonical Input Normalization (normalizeItemType)', () => {
    it('should normalize all packaging synonyms to canonical "Packaging"', () => {
      expect(normalizeItemType('Packaging')).toBe('Packaging')
      expect(normalizeItemType('packaging')).toBe('Packaging')
      expect(normalizeItemType('  PACKAGING  ')).toBe('Packaging')
      expect(normalizeItemType('Packaging Material')).toBe('Packaging')
      expect(normalizeItemType('packaging_material')).toBe('Packaging')
      expect(normalizeItemType(' packaging material ')).toBe('Packaging')
    })

    it('should preserve and normalize other canonical item types', () => {
      expect(normalizeItemType('FG')).toBe('FG')
      expect(normalizeItemType('fg')).toBe('FG')
      expect(normalizeItemType('finished goods')).toBe('FG')
      expect(normalizeItemType('Bulk')).toBe('Bulk')
      expect(normalizeItemType('bulk')).toBe('Bulk')
      expect(normalizeItemType('Raw Material')).toBe('Raw Material')
      expect(normalizeItemType('raw_material')).toBe('Raw Material')
      expect(normalizeItemType('rm')).toBe('Raw Material')
      expect(normalizeItemType(null)).toBe('FG')
      expect(normalizeItemType(undefined)).toBe('FG')
    })
  })

  // =========================================================================
  // TEST 1: Confirm Receive for itemType = "Packaging"
  // =========================================================================
  describe('TEST 1: Confirm Receive for itemType = "Packaging"', () => {
    it('should increase Product.quantity, create ProductLot, and maintain Product.quantity = SUM(ProductLot.remainingQuantity)', () => {
      const product: MockProduct = {
        id: 1001,
        itemCode: 'PK-BOX-01',
        itemType: 'Packaging',
        quantity: 10,
        status: 'active',
      }

      const initialLot: MockProductLot = {
        id: 1,
        productId: 1001,
        lotNumber: 'INIT-PK-BOX-01',
        supplierLot: 'INITIAL_STOCK',
        receivedDate: '2026-08-31T00:00:00.000Z',
        receivedQuantity: 10,
        remainingQuantity: 10,
        status: 'active',
        createdAt: '2026-08-31T00:00:00.000Z',
      }

      const existingLots = [initialLot]

      const receiveTx = {
        id: 520,
        productId: 1001,
        quantity: 5,
        receivedDate: '2026-09-16T10:00:00.000Z',
        supplierLot: 'SUP-LOT-001',
      }

      const result = simulateConfirmReceive(product, existingLots, receiveTx)

      // 1. Product.quantity increases 10 -> 15
      expect(result.updatedProduct.quantity).toBe(15)

      // 2. ProductLot is created
      expect(result.createdLot).not.toBeNull()
      expect(result.createdLot?.receivedQuantity).toBe(5)
      expect(result.createdLot?.remainingQuantity).toBe(5)
      expect(result.createdLot?.supplierLot).toBe('SUP-LOT-001')
      expect(result.createdLot?.status).toBe('active')

      // 3. Invariant check: Product.quantity = SUM(ProductLot.remainingQuantity)
      const sumRemaining = result.updatedLots.reduce((sum, lot) => sum + lot.remainingQuantity, 0)
      expect(result.updatedProduct.quantity).toBe(sumRemaining)
      expect(sumRemaining).toBe(15)
    })
  })

  // =========================================================================
  // TEST 2: Confirm Receive for itemType = "Packaging Material"
  // =========================================================================
  describe('TEST 2: Confirm Receive for itemType = "Packaging Material"', () => {
    it('should apply packaging logic, create ProductLot, and maintain Product.quantity = SUM(ProductLot.remainingQuantity)', () => {
      // Simulates the exact UAT-REC-002 scenario (ITEM-TEST-UAT, Product ID 1892)
      const product: MockProduct = {
        id: 1892,
        itemCode: 'ITEM-TEST-UAT',
        itemType: 'Packaging Material', // Historical non-canonical value
        quantity: 10,
        status: 'active',
      }

      const initialLot: MockProductLot = {
        id: 161,
        productId: 1892,
        lotNumber: 'LOT-UAT-INIT',
        supplierLot: 'INITIAL_STOCK',
        receivedDate: '2026-09-15T00:00:00.000Z',
        receivedQuantity: 10,
        remainingQuantity: 10,
        status: 'active',
        createdAt: '2026-09-15T00:00:00.000Z',
      }

      const existingLots = [initialLot]

      const receiveTx = {
        id: 519,
        productId: 1892,
        quantity: 5,
        receivedDate: '2026-09-16T08:00:00.000Z',
        supplierLot: 'LOT-UAT-REC01',
      }

      const result = simulateConfirmReceive(product, existingLots, receiveTx)

      // 1. Product.quantity increases 10 -> 15
      expect(result.updatedProduct.quantity).toBe(15)

      // 2. ProductLot IS created for "Packaging Material" because isPackagingItem returns true
      expect(result.createdLot).not.toBeNull()
      expect(result.createdLot?.receivedQuantity).toBe(5)
      expect(result.createdLot?.remainingQuantity).toBe(5)
      expect(result.createdLot?.supplierLot).toBe('LOT-UAT-REC01')

      // 3. Invariant check: Product.quantity = SUM(ProductLot.remainingQuantity)
      const sumRemaining = result.updatedLots.reduce((sum, lot) => sum + lot.remainingQuantity, 0)
      expect(result.updatedProduct.quantity).toBe(sumRemaining)
      expect(sumRemaining).toBe(15)
      expect(result.updatedLots.length).toBe(2)
    })
  })

  // =========================================================================
  // TEST 3: Confirm Issue for itemType = "Packaging"
  // =========================================================================
  describe('TEST 3: Confirm Issue for itemType = "Packaging"', () => {
    it('should allocate lots by FIFO order, deduct older lot first, and match Product.quantity', () => {
      const product: MockProduct = {
        id: 1001,
        itemCode: 'PK-BOX-01',
        itemType: 'Packaging',
        quantity: 15,
        status: 'active',
      }

      const lot1: MockProductLot = {
        id: 1,
        productId: 1001,
        lotNumber: 'LOT-20260901-0001',
        supplierLot: 'SUP-A',
        receivedDate: '2026-09-01T00:00:00.000Z',
        receivedQuantity: 10,
        remainingQuantity: 10,
        status: 'active',
        createdAt: '2026-09-01T00:00:00.000Z',
      }

      const lot2: MockProductLot = {
        id: 2,
        productId: 1001,
        lotNumber: 'LOT-20260910-0002',
        supplierLot: 'SUP-B',
        receivedDate: '2026-09-10T00:00:00.000Z',
        receivedQuantity: 5,
        remainingQuantity: 5,
        status: 'active',
        createdAt: '2026-09-10T00:00:00.000Z',
      }

      const existingLots = [lot1, lot2]

      // Issue 12 units (should fully consume Lot 1 of 10 units + 2 units from Lot 2)
      const issueTx = {
        id: 601,
        productId: 1001,
        quantity: 12,
      }

      const result = simulateConfirmIssue(product, existingLots, issueTx)

      // 1. Product quantity drops 15 -> 3
      expect(result.updatedProduct.quantity).toBe(3)

      // 2. FIFO allocation verifies older lot was consumed first
      expect(result.allocations.length).toBe(2)
      expect(result.allocations[0]).toEqual({
        transactionId: 601,
        productLotId: 1,
        quantity: 10,
      })
      expect(result.allocations[1]).toEqual({
        transactionId: 601,
        productLotId: 2,
        quantity: 2,
      })

      // 3. Lot 1 is depleted (0), Lot 2 has 3 remaining
      const updatedLot1 = result.updatedLots.find(l => l.id === 1)!
      const updatedLot2 = result.updatedLots.find(l => l.id === 2)!
      expect(updatedLot1.remainingQuantity).toBe(0)
      expect(updatedLot1.status).toBe('depleted')
      expect(updatedLot2.remainingQuantity).toBe(3)
      expect(updatedLot2.status).toBe('active')

      // 4. Invariant check: Product.quantity = SUM(ProductLot.remainingQuantity)
      const sumRemaining = result.updatedLots.reduce((sum, lot) => sum + lot.remainingQuantity, 0)
      expect(result.updatedProduct.quantity).toBe(sumRemaining)
      expect(sumRemaining).toBe(3)
    })
  })

  // =========================================================================
  // TEST 4: Confirm Issue for itemType = "Packaging Material"
  // =========================================================================
  describe('TEST 4: Confirm Issue for itemType = "Packaging Material"', () => {
    it('should apply Packaging FIFO logic correctly for "Packaging Material"', () => {
      const product: MockProduct = {
        id: 1892,
        itemCode: 'ITEM-TEST-UAT',
        itemType: 'Packaging Material',
        quantity: 15,
        status: 'active',
      }

      const lotInit: MockProductLot = {
        id: 161,
        productId: 1892,
        lotNumber: 'LOT-UAT-INIT',
        supplierLot: 'INITIAL_STOCK',
        receivedDate: '2026-09-15T00:00:00.000Z',
        receivedQuantity: 10,
        remainingQuantity: 10,
        status: 'active',
        createdAt: '2026-09-15T00:00:00.000Z',
      }

      const lotRec: MockProductLot = {
        id: 162,
        productId: 1892,
        lotNumber: 'LOT-20260916-0162',
        supplierLot: 'LOT-UAT-REC01',
        receivedDate: '2026-09-16T08:00:00.000Z',
        receivedQuantity: 5,
        remainingQuantity: 5,
        status: 'active',
        createdAt: '2026-09-16T08:00:00.000Z',
      }

      const existingLots = [lotInit, lotRec]

      // Issue 6 units (should take 6 from lotInit)
      const issueTx = {
        id: 521,
        productId: 1892,
        quantity: 6,
      }

      const result = simulateConfirmIssue(product, existingLots, issueTx)

      // 1. Product quantity drops 15 -> 9
      expect(result.updatedProduct.quantity).toBe(9)

      // 2. FIFO allocation deducted from lotInit first
      expect(result.allocations.length).toBe(1)
      expect(result.allocations[0]).toEqual({
        transactionId: 521,
        productLotId: 161,
        quantity: 6,
      })

      // 3. Lot status checks
      const updatedLotInit = result.updatedLots.find(l => l.id === 161)!
      const updatedLotRec = result.updatedLots.find(l => l.id === 162)!
      expect(updatedLotInit.remainingQuantity).toBe(4)
      expect(updatedLotInit.status).toBe('active')
      expect(updatedLotRec.remainingQuantity).toBe(5)
      expect(updatedLotRec.status).toBe('active')

      // 4. Invariant check: Product.quantity = SUM(ProductLot.remainingQuantity)
      const sumRemaining = result.updatedLots.reduce((sum, lot) => sum + lot.remainingQuantity, 0)
      expect(result.updatedProduct.quantity).toBe(sumRemaining)
      expect(sumRemaining).toBe(9)
    })

    it('should throw error when issuing more than available lot quantity', () => {
      const product: MockProduct = {
        id: 1892,
        itemCode: 'ITEM-TEST-UAT',
        itemType: 'Packaging Material',
        quantity: 5,
        status: 'active',
      }

      const lotInit: MockProductLot = {
        id: 161,
        productId: 1892,
        lotNumber: 'LOT-UAT-INIT',
        supplierLot: 'INITIAL_STOCK',
        receivedDate: '2026-09-15T00:00:00.000Z',
        receivedQuantity: 5,
        remainingQuantity: 5,
        status: 'active',
        createdAt: '2026-09-15T00:00:00.000Z',
      }

      expect(() => {
        simulateConfirmIssue(product, [lotInit], { id: 522, productId: 1892, quantity: 10 })
      }).toThrow('สต็อกใน Lot ไม่เพียงพอสำหรับการเบิก')
    })
  })
})
