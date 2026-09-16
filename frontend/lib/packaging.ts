/**
 * Centralized helper for detecting Packaging items across WPK MMS.
 * Normalizes case, whitespace, and recognized synonyms.
 */
export function isPackagingItem(itemType?: string | null): boolean {
  if (!itemType || typeof itemType !== 'string') return false
  const normalized = itemType.trim().toLowerCase()
  return (
    normalized === 'packaging' ||
    normalized === 'packaging material' ||
    normalized === 'packaging_material'
  )
}

/**
 * Normalizes any input itemType string to the canonical system representation.
 * Canonical Packaging value is strictly 'Packaging'.
 */
export function normalizeItemType(itemType?: string | null): string {
  if (!itemType || typeof itemType !== 'string') return 'FG'
  if (isPackagingItem(itemType)) return 'Packaging'
  const trimmed = itemType.trim()
  const lower = trimmed.toLowerCase()
  if (lower === 'fg' || lower === 'finished goods' || lower === 'finished_goods') return 'FG'
  if (lower === 'bulk') return 'Bulk'
  if (lower === 'raw material' || lower === 'raw_material' || lower === 'rawmaterial' || lower === 'rm') return 'Raw Material'
  return trimmed
}
