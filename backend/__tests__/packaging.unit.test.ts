import { describe, it, expect } from 'vitest'
import { isPackagingItem, normalizeItemType } from '../src/index'

describe('Backend Packaging Helper Unit Tests', () => {
  describe('isPackagingItem', () => {
    it('should return true for exact "Packaging"', () => {
      expect(isPackagingItem('Packaging')).toBe(true)
    })

    it('should return true for lowercase "packaging"', () => {
      expect(isPackagingItem('packaging')).toBe(true)
    })

    it('should return true for whitespace and uppercase "  PACKAGING  "', () => {
      expect(isPackagingItem('  PACKAGING  ')).toBe(true)
    })

    it('should return true for "Packaging Material"', () => {
      expect(isPackagingItem('Packaging Material')).toBe(true)
    })

    it('should return true for lowercase "packaging material"', () => {
      expect(isPackagingItem('packaging material')).toBe(true)
    })

    it('should return true for snake_case "packaging_material"', () => {
      expect(isPackagingItem('packaging_material')).toBe(true)
    })

    it('should return false for non-packaging types: FG, Bulk, Raw Material', () => {
      expect(isPackagingItem('FG')).toBe(false)
      expect(isPackagingItem('Bulk')).toBe(false)
      expect(isPackagingItem('Raw Material')).toBe(false)
    })

    it('should return false for null, undefined, and empty string', () => {
      expect(isPackagingItem(null)).toBe(false)
      expect(isPackagingItem(undefined)).toBe(false)
      expect(isPackagingItem('')).toBe(false)
      expect(isPackagingItem('   ')).toBe(false)
    })
  })

  describe('normalizeItemType', () => {
    it('should normalize packaging synonyms to canonical "Packaging"', () => {
      expect(normalizeItemType('Packaging')).toBe('Packaging')
      expect(normalizeItemType('packaging')).toBe('Packaging')
      expect(normalizeItemType('  PACKAGING  ')).toBe('Packaging')
      expect(normalizeItemType('Packaging Material')).toBe('Packaging')
      expect(normalizeItemType('packaging_material')).toBe('Packaging')
    })

    it('should normalize other standard item types', () => {
      expect(normalizeItemType('FG')).toBe('FG')
      expect(normalizeItemType('fg')).toBe('FG')
      expect(normalizeItemType('Bulk')).toBe('Bulk')
      expect(normalizeItemType('Raw Material')).toBe('Raw Material')
      expect(normalizeItemType('raw_material')).toBe('Raw Material')
      expect(normalizeItemType(null)).toBe('FG')
      expect(normalizeItemType(undefined)).toBe('FG')
    })
  })
})
