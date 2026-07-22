'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { fetchProducts, updateProductQuantity, createProduct, deleteProduct, fetchProductBom, Product, BillOfMaterial } from '@/lib/auth'
import QRCode from 'react-qr-code'
import { Search, Package, ArrowLeft, Layers, Download, Check, History, X, Trash2, FileText, LayoutGrid, Crown, Droplets, Box, FlaskConical, QrCode, Star, Copy, Zap, Disc } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const getPackagingSubCategory = (item: Product): 'gallon' | 'foil' | 'cap' | 'box' | 'other' => {
  const code = (item.itemCode || '').toLowerCase()
  const name = (item.name || '').toLowerCase()
  const unit = (item.unit || '').toLowerCase()

  // 1. Other prioritizing Label and Strap
  if (
    code.includes('lbl') || name.includes('label') || name.includes('sticker') || name.includes('ฉลาก') ||
    code.includes('strap') || name.includes('strap') || name.includes('สายรัด') || name.includes('รัดกล่อง')
  ) {
    return 'other'
  }

  // 2. แกลลอน (GALLON)
  if (
    name.includes('gallon') || name.includes('pail') || name.includes('drum') || name.includes('can') ||
    name.includes('ถัง') || name.includes('ขวด') || name.includes('แกลลอน') ||
    unit.includes('gallon') || unit.includes('pail') || unit.includes('drum')
  ) {
    return 'gallon'
  }

  // 3. ฟอยล์ (FOIL)
  if (
    name.includes('foil') || name.includes('film') || name.includes('seal') || name.includes('shrink') ||
    name.includes('ฟอยล์') || name.includes('ซีล') || name.includes('ฟิล์ม')
  ) {
    return 'foil'
  }

  // 4. ฝา (CAP)
  if (
    name.includes('cap') || name.includes('lid') || name.includes('ฝา') ||
    code.startsWith('355')
  ) {
    return 'cap'
  }

  // 5. กล่อง (BOX)
  if (
    name.includes('box') || name.includes('carton') || name.includes('กล่อง') || name.includes('ลัง')
  ) {
    return 'box'
  }

  return 'other'
}

export default function InventoryPage() {
  const [user, setUser] = useState<{ id: number; fullName: string; role: string } | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loading, setLoading] = useState(true)

  const [activeTab, setActiveTab] = useState('Packaging')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped')
  const [selectedParentCode, setSelectedParentCode] = useState<string | null>(null)
  const [packagingSubTab, setPackagingSubTab] = useState<'all' | 'gallon' | 'foil' | 'cap' | 'box' | 'other'>('all')

  const [selectedBomProduct, setSelectedBomProduct] = useState<Product | null>(null)
  const [selectedQrProduct, setSelectedQrProduct] = useState<Product | null>(null)
  const [bomList, setBomList] = useState<BillOfMaterial[]>([])
  const [bomLoading, setBomLoading] = useState(false)

  const openBomModal = async (product: Product) => {
    setSelectedBomProduct(product)
    setBomLoading(true)
    try {
      const boms = await fetchProductBom(product.itemCode)
      setBomList(boms)
    } catch (err) {
      console.error(err)
      setBomList([])
    } finally {
      setBomLoading(false)
    }
  }

  const [editQuantities, setEditQuantities] = useState<Record<number, string>>({})
  const [confirmTarget, setConfirmTarget] = useState<{ product: Product; newQty: number } | null>(null)
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const [deletingLoading, setDeletingLoading] = useState(false)

  const [showAddModal, setShowAddModal] = useState(false)
  const [newItemCode, setNewItemCode] = useState('')
  const [newName, setNewName] = useState('')
  const [newUnit, setNewUnit] = useState('PCS')
  const [newWarehouse, setNewWarehouse] = useState('WPK')
  const [newLocation, setNewLocation] = useState('')
  const [newQuantity, setNewQuantity] = useState('0')
  const [addingError, setAddingError] = useState('')
  const [addingLoading, setAddingLoading] = useState(false)

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddingError('')
    const qtyNum = Number(newQuantity)
    if (!newItemCode.trim() || !newName.trim()) {
      setAddingError('กรุณากรอกรหัสสินค้าและชื่อสินค้าให้ครบถ้วน')
      return
    }
    if (isNaN(qtyNum) || qtyNum < 0 || !Number.isInteger(qtyNum)) {
      setAddingError('จำนวนเริ่มต้นต้องเป็นตัวเลขจำนวนเต็มที่ไม่ติดลบ')
      return
    }
    setAddingLoading(true)
    try {
      const created = await createProduct({
        itemCode: newItemCode.trim(),
        description: newName.trim(),
        unit: newUnit.trim() || 'PCS',
        warehouse: newWarehouse.trim() || 'WPK',
        location: newLocation.trim(),
        quantity: qtyNum,
      })
      setProducts(prev => [created, ...prev])
      setShowAddModal(false)
      setNewItemCode('')
      setNewName('')
      setNewUnit('PCS')
      setNewWarehouse('WPK')
      setNewLocation('')
      setNewQuantity('0')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เพิ่มรายการสินค้าไม่สำเร็จ'
      if (msg.toLowerCase().includes('already exists') || msg.toLowerCase().includes('unique constraint')) {
        setAddingError('รหัสสินค้า (Item Code) นี้มีอยู่ในระบบแล้ว กรุณาใช้รหัสอื่น')
      } else {
        setAddingError(msg)
      }
    } finally {
      setAddingLoading(false)
    }
  }

  const downloadQRCodeAsPNG = (itemCode: string) => {
    try {
      // Find container by checking both possible IDs or searching DOM
      let container = document.getElementById(`qr-modal-${itemCode}`) || document.getElementById(`qr-group-${itemCode}`) || document.getElementById(`qr-${itemCode}`)
      if (!container) {
        // Fallback: search any element whose ID ends with itemCode
        const found = Array.from(document.querySelectorAll('[id^="qr-"]')).find(el => el.id.endsWith(itemCode))
        if (found) container = found as HTMLElement
      }
      if (!container) {
        alert(`ไม่พบกล่อง QR Code สำหรับรหัส ${itemCode} กรุณารีเฟรชหน้าจอแล้วลองใหม่อีกครั้ง`)
        return
      }

      const svg = container.querySelector('svg')
      if (!svg) {
        alert('ไม่พบข้อมูลรูปภาพ SVG ของ QR Code')
        return
      }

      // Clone SVG and set explicit dimensions and xmlns
      const clonedSvg = svg.cloneNode(true) as SVGSVGElement
      const size = 600
      const qrSize = 500
      const offset = (size - qrSize) / 2

      clonedSvg.setAttribute('width', `${qrSize}px`)
      clonedSvg.setAttribute('height', `${qrSize}px`)
      if (!clonedSvg.getAttribute('xmlns')) {
        clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
      }

      const svgData = new XMLSerializer().serializeToString(clonedSvg)
      const svgDataBase64 = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgData)}`

      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          canvas.width = size
          canvas.height = size
          const ctx = canvas.getContext('2d')
          if (!ctx) throw new Error('Cannot get 2d context')

          // Fill white background
          ctx.fillStyle = '#FFFFFF'
          ctx.fillRect(0, 0, size, size)
          ctx.drawImage(img, offset, offset, qrSize, qrSize)

          const pngUrl = canvas.toDataURL('image/png')
          const downloadLink = document.createElement('a')
          downloadLink.href = pngUrl
          downloadLink.download = `QR_${itemCode}.png`
          document.body.appendChild(downloadLink)
          downloadLink.click()
          document.body.removeChild(downloadLink)
        } catch (canvasErr) {
          console.error('Canvas error, falling back to SVG:', canvasErr)
          // Fallback to downloading SVG file
          const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
          const url = URL.createObjectURL(blob)
          const downloadLink = document.createElement('a')
          downloadLink.href = url
          downloadLink.download = `QR_${itemCode}.svg`
          document.body.appendChild(downloadLink)
          downloadLink.click()
          document.body.removeChild(downloadLink)
          URL.revokeObjectURL(url)
        }
      }
      img.onerror = (err) => {
        console.error('Image load error, falling back to SVG:', err)
        const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const downloadLink = document.createElement('a')
        downloadLink.href = url
        downloadLink.download = `QR_${itemCode}.svg`
        document.body.appendChild(downloadLink)
        downloadLink.click()
        document.body.removeChild(downloadLink)
        URL.revokeObjectURL(url)
      }
      img.src = svgDataBase64
    } catch (error) {
      console.error('Download QR Code Error:', error)
      alert('เกิดข้อผิดพลาดในการดาวน์โหลด QR Code')
    }
  }

  const loadProducts = async (query = search) => {
    setError('')
    setLoading(true)
    try {
      setProducts(await fetchProducts(query, 'ALL'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'โหลดข้อมูลสต็อกไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  // Removed useEffect to prevent set-state-in-effect. State is updated in onClick handler instead.

  useEffect(() => {
    let isMounted = true

    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        setUser(JSON.parse(storedUser))
      }
    }

    async function loadInitialProducts() {
      try {
        const initialProducts = await fetchProducts('', 'ALL')
        if (isMounted) setProducts(initialProducts)
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : 'โหลดข้อมูลสต็อกไม่สำเร็จ')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    void loadInitialProducts()

    return () => {
      isMounted = false
    }
  }, [])

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const matchesUnit = (_unit?: string) => true

  const displayedProducts = products.filter(product => {
    if (!matchesUnit(product.unit)) return false
    if (search.trim() !== '') {
      const s = search.trim().toLowerCase()
      const code = (product.itemCode || '').toLowerCase()
      const name = (product.name || '').toLowerCase()
      const loc = (product.location || '').toLowerCase()
      const wh = (product.warehouse || '').toLowerCase()
      const selfMatches = code.includes(s) || name.includes(s) || loc.includes(s) || wh.includes(s)
      
      let familyMatches = false
      if (product.itemType === 'FG') {
        familyMatches = products.some(p => p.parentItemCodes?.includes(product.itemCode) && ((p.itemCode || '').toLowerCase().includes(s) || (p.name || '').toLowerCase().includes(s) || (p.location || '').toLowerCase().includes(s)))
      } else if (product.parentItemCodes && product.parentItemCodes.length > 0) {
        familyMatches = products.some(p => product.parentItemCodes?.includes(p.itemCode) && ((p.itemCode || '').toLowerCase().includes(s) || (p.name || '').toLowerCase().includes(s)))
      }
      if (!selfMatches && !familyMatches) return false
    }
    if (!selectedParentCode) return true
    if (product.itemCode === selectedParentCode && product.itemType === 'FG') return true
    return Boolean(product.parentItemCodes?.includes(selectedParentCode))
  })

  return (
    <main className="min-h-screen bg-gray-50/50 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-[#BE1111] transition-colors mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              กลับหน้าหลัก
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-50 text-[#BE1111] rounded-xl flex items-center justify-center shadow-sm">
                <Box className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-display font-bold text-gray-900 tracking-tight">จัดการสต็อกบรรจุภัณฑ์ (Packaging Stock)</h1>
                <p className="text-xs text-gray-500 mt-0.5">คลังข้อมูลและระบบจัดการสต็อกบรรจุภัณฑ์ (แกลลอน, ฟอยล์, ฝา, กล่อง) สำหรับตรวจสอบและดาวน์โหลด QR Code</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Link
              href="/reports?view=adjust"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-50 border border-red-100 px-4 py-2.5 text-sm font-semibold text-[#BE1111] hover:bg-[#BE1111] hover:text-white transition-all shadow-sm shrink-0"
            >
              <History className="w-4 h-4" />
              <span>ประวัติการแก้ไขสต็อก</span>
            </Link>
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault()
                loadProducts(search)
              }}
            >
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  value={search}
                  onChange={(event) => {
                    const val = event.target.value
                    setSearch(val)
                    if (val.trim() === '') {
                      setPackagingSubTab('all')
                      loadProducts('')
                    }
                  }}
                  className="w-full sm:w-64 rounded-xl border border-gray-200 pl-10 pr-9 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#BE1111]/20 focus:border-[#BE1111] bg-white shadow-sm transition-all"
                  placeholder="ค้นหา item code / ชื่อ / location"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('')
                      setPackagingSubTab('all')
                      loadProducts('')
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                    title="ล้างคำค้นหา"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition-colors shadow-sm shrink-0"
              >
                ค้นหา
              </button>
            </form>
          </div>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800 shadow-sm flex items-center justify-between"
            >
              <span>{error}</span>
              <button onClick={() => setError('')} className="text-red-600 hover:text-red-900 font-bold ml-4">✕</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Interactive Overview Statistics Cards for Packaging (Acts as Direct Filter Buttons) */}
        <div className="mb-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {[
            { id: 'all', label: 'บรรจุภัณฑ์ทั้งหมด', count: products.filter(p => p.itemType === 'Packaging').length, icon: Package, badgeBg: 'bg-red-50/50 text-[#BE1111] border-red-200/80' },
            { id: 'gallon', label: 'แกลลอน (Gallon)', count: products.filter(p => p.itemType === 'Packaging' && getPackagingSubCategory(p) === 'gallon').length, icon: Droplets, badgeBg: 'bg-red-50/50 text-[#BE1111] border-red-200/80' },
            { id: 'foil', label: 'ฟอยล์ (Foil)', count: products.filter(p => p.itemType === 'Packaging' && getPackagingSubCategory(p) === 'foil').length, icon: Zap, badgeBg: 'bg-red-50/50 text-[#BE1111] border-red-200/80' },
            { id: 'cap', label: 'ฝา (Cap)', count: products.filter(p => p.itemType === 'Packaging' && getPackagingSubCategory(p) === 'cap').length, icon: Disc, badgeBg: 'bg-red-50/50 text-[#BE1111] border-red-200/80' },
            { id: 'box', label: 'กล่อง (Box)', count: products.filter(p => p.itemType === 'Packaging' && getPackagingSubCategory(p) === 'box').length, icon: Box, badgeBg: 'bg-red-50/50 text-[#BE1111] border-red-200/80' },
            { id: 'other', label: 'อื่นๆ (Others)', count: products.filter(p => p.itemType === 'Packaging' && getPackagingSubCategory(p) === 'other').length, icon: LayoutGrid, badgeBg: 'bg-red-50/50 text-[#BE1111] border-red-200/80' },
          ].map(card => {
            const isSelected = packagingSubTab === card.id
            const IconComponent = card.icon
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => setPackagingSubTab(card.id as typeof packagingSubTab)}
                className={`p-4 rounded-2xl border font-display flex flex-col items-center justify-center text-center transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'bg-white border-2 border-[#BE1111] shadow-none scale-[1.01]'
                    : 'bg-white/80 border border-gray-200/90 hover:border-gray-300 hover:bg-white opacity-85 hover:opacity-100'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl border flex items-center justify-center mb-2 shadow-2xs ${card.badgeBg}`}>
                  <IconComponent className="w-4.5 h-4.5" />
                </div>
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 truncate max-w-full">
                  {card.label}
                </span>
                <div className="text-2xl font-black text-gray-900 text-center leading-none mt-1">
                  {card.count}
                </div>
                <span className="text-[10px] font-semibold text-gray-400 mt-1">
                  รายการ
                </span>
              </button>
            )
          })}
        </div>
        {/* Quick Filter Banner if parent selected */}
        {selectedParentCode && (
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-white p-4 border border-gray-200/90 shadow-2xs animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-[#BE1111] border border-red-100 shadow-2xs">
                <Search className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-[#BE1111] flex items-center gap-1.5 font-display">
                  <span>✨ กรองข้อมูลตามรหัสหลัก (Item 1 Quick Filter)</span>
                </div>
                <div className="text-sm font-semibold text-gray-800 mt-0.5">
                  แสดงรายการและส่วนประกอบที่เชื่อมโยงกับรหัสหลัก: <span className="font-bold text-[#BE1111] font-display underline decoration-[#BE1111]/40 decoration-2 underline-offset-4">{selectedParentCode}</span> ({displayedProducts.length} รายการ)
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedParentCode(null)}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 px-4 py-2.5 text-xs font-bold text-gray-700 hover:text-gray-900 border border-gray-200/80 transition-all active:scale-95 shrink-0 cursor-pointer"
            >
              <X className="h-4 w-4" />
              <span>ล้างตัวกรอง (ดูทั้งหมด)</span>
            </button>
          </div>
        )}

        {/* View Mode Content: Switch between Grouped and Flat views */}
        {viewMode === 'grouped' ? (
          <div className="space-y-6">
          {/* Dedicated Category Summary Table for Bulk & Raw Material */}
          {(activeTab === 'Bulk' || activeTab === 'Raw Material') && (() => {
            const categoryItems = products
              .filter(p => p.itemType === activeTab && matchesUnit(p.unit))
            const CategoryIcon = activeTab === 'Bulk' ? Droplets : FlaskConical
            const categoryTitle = activeTab === 'Bulk' ? 'Bulk (กึ่งสำเร็จรูป / สารผสม)' : 'Raw Material (วัตถุดิบตั้งต้น / เคมีภัณฑ์)'

            return (
              <div className="mb-8 overflow-hidden rounded-3xl border border-gray-200/80 bg-white shadow-[0_4px_20px_rgb(0,0,0,0.03)] animate-in fade-in duration-300 font-display">
                <div className="bg-slate-50 p-5 text-gray-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-200/90">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-gray-800 border border-gray-200 shadow-2xs">
                      <CategoryIcon className="w-5 h-5 text-gray-700" />
                    </div>
                    <div>
                      <h3 className="font-black text-lg tracking-wide flex items-center gap-2 text-gray-900">
                        <span>
                          รายการ {categoryTitle}
                        </span>
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        สรุปรายการสินค้าในหมวดหมู่ {activeTab} พร้อมระบุรหัสหลัก Item 1 (สูตรสินค้าสำเร็จรูป) ที่ใช้งานชิ้นส่วนนี้อยู่
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <span className="px-3.5 py-1.5 rounded-full bg-white text-gray-800 text-xs font-bold shadow-2xs border border-gray-200">
                      รวม {categoryItems.length} รายการ
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto p-4">
                  {categoryItems.length === 0 ? (
                    <div className="p-12 text-center text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                      <p className="text-sm font-semibold">ไม่พบข้อมูลสินค้าประเภท {activeTab}</p>
                    </div>
                  ) : (
                    <table className="w-full border-collapse text-left text-xs">
                      <thead className="bg-slate-50/50 text-slate-500 font-bold border-b border-gray-200 uppercase tracking-wider text-[11px]">
                        <tr>
                          <th className="px-4 py-3.5 font-semibold">Item Code</th>
                          <th className="px-4 py-3.5 font-semibold">ชื่อรายการ ({activeTab})</th>
                          <th className="px-4 py-3.5 font-semibold">คลัง / โซน</th>
                          <th className="px-4 py-3.5 font-semibold">👑 สูตรสินค้าหลัก Item 1 ที่ใช้งาน</th>
                          <th className="px-4 py-3.5 font-semibold text-right">คงเหลือ</th>
                          {user?.role === 'admin' && <th className="px-4 py-3.5 font-semibold text-center">จัดการ</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {categoryItems.map(item => {
                          const currentVal = editQuantities[item.id] !== undefined ? editQuantities[item.id] : String(item.quantity)
                          const isChanged = currentVal !== String(item.quantity)
                          const linkedParents = item.parentItemCodes || []

                          return (
                            <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="px-4 py-3.5 font-display font-bold text-gray-900">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedQrProduct(item)}
                                    className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-red-50 border border-gray-200/80 hover:border-red-200 text-gray-800 hover:text-[#BE1111] transition-all shadow-2xs cursor-pointer shrink-0"
                                    title={`คลิกเพื่อดูและดาวน์โหลด QR Code สำหรับ ${item.itemCode}`}
                                  >
                                    <QrCode className="w-3.5 h-3.5 text-[#BE1111] group-hover:scale-110 transition-transform" />
                                    <span>{item.itemCode}</span>
                                  </button>
                                  <div id={`qr-${item.itemCode}`} className="hidden">
                                    <QRCode value={item.itemCode} size={64} />
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 font-display font-semibold text-gray-800 tracking-tight text-xs sm:text-sm">{item.name}</td>
                              <td className="px-4 py-3.5 text-gray-600">
                                <span className="font-semibold text-gray-800">{item.warehouse}</span>
                                {item.location && <span className="text-gray-400 ml-1">({item.location})</span>}
                              </td>
                              <td className="px-4 py-3.5">
                                {linkedParents.length === 0 ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 text-[11px] font-semibold border border-gray-200">
                                    📦 รายการทั่วไป (ไม่ระบุสูตร)
                                  </span>
                                ) : (
                                  <div className="flex flex-wrap gap-1.5">
                                    {linkedParents.map(parentCode => (
                                      <button
                                        key={parentCode}
                                        type="button"
                                        onClick={() => {
                                          setSelectedParentCode(parentCode)
                                          setActiveTab('ALL')
                                        }}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 text-[#BE1111] text-[11px] font-bold border border-red-200/80 hover:bg-[#BE1111] hover:text-white transition-all shadow-2xs active:scale-95 cursor-pointer group/btn"
                                        title={`คลิกเพื่อดูสูตรหลัก ${parentCode}`}
                                      >
                                        <Crown className="w-3.5 h-3.5 text-[#BE1111] group-hover/btn:text-amber-300 shrink-0 transition-colors" />
                                        <span>{parentCode}</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3.5 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {user?.role === 'admin' ? (
                                    <>
                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        value={currentVal}
                                        onChange={(e) => {
                                          const val = e.target.value.replace(/[^0-9]/g, '')
                                          setEditQuantities(prev => ({ ...prev, [item.id]: val }))
                                        }}
                                        className={`w-24 text-right rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-all shadow-2xs focus:outline-none focus:ring-1 ${
                                          isChanged 
                                            ? 'border-[#BE1111] bg-red-50 text-[#BE1111]' 
                                            : 'border-gray-200 bg-gray-50 text-gray-800 focus:bg-white focus:border-[#BE1111]'
                                        }`}
                                      />
                                      <span className="text-gray-500 w-10 text-left font-medium">{item.unit}</span>
                                      {isChanged && (
                                        <button
                                          onClick={() => {
                                            const parsed = Number(currentVal)
                                            if (!isNaN(parsed) && parsed >= 0) {
                                              setConfirmTarget({ product: item, newQty: parsed })
                                            }
                                          }}
                                          className="p-1.5 rounded-lg bg-[#BE1111] text-white hover:bg-[#A00F0F] transition-all shadow-2xs animate-pulse cursor-pointer"
                                          title="บันทึกจำนวนสต็อก"
                                        >
                                          <Check className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </>
                                  ) : (
                                    <>
                                      <span className="font-bold text-gray-900 text-sm">{item.quantity.toLocaleString()}</span>
                                      <span className="text-gray-500 w-10 text-left font-medium">{item.unit}</span>
                                    </>
                                  )}
                                </div>
                              </td>
                              {user?.role === 'admin' && (
                                <td className="px-4 py-3.5 text-center">
                                  <button
                                    type="button"
                                    onClick={() => setDeleteTarget(item)}
                                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-all cursor-pointer"
                                    title="ลบรายการสินค้า"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              )}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )
          })()}

          {/* 1. Group Cards for each Parent FG (Item 1): จัดเรียงแบบแถบแนวนอนยาวตามรูปที่แนบ โดยคงฟอนต์และโทนสีเดิมไว้ทั้งหมด */}
          <div className="flex flex-col gap-5 animate-in fade-in duration-300">
            {displayedProducts
              .filter(p => p.itemType === 'FG' && (!selectedParentCode || p.itemCode === selectedParentCode))
              .map(fg => {
                if (activeTab !== 'ALL' && activeTab !== 'FG') return null
                const fgMatchesUnit = matchesUnit(fg.unit)
                const components = displayedProducts.filter(p => p.itemCode !== fg.itemCode && p.parentItemCodes?.includes(fg.itemCode) && matchesUnit(p.unit))
                if (activeTab === 'FG' && !fgMatchesUnit) return null
                if (activeTab === 'ALL' && !fgMatchesUnit && components.length === 0) return null
                return (
                  <div key={fg.id} className="w-full rounded-3xl border border-gray-200/90 bg-white p-5 sm:p-6 shadow-[0_2px_15px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:border-gray-300 transition-all flex flex-col justify-between gap-4 relative group/card font-display">
                    {/* ปุ่ม Star ไอคอนมุมขวาบนตามดีไซน์ */}
                    <div className="absolute top-5 sm:top-6 right-5 sm:right-6 text-gray-300 hover:text-amber-500 transition-colors cursor-pointer z-10" title="รายการโปรด">
                      <Star className="w-5 h-5" />
                    </div>

                    {/* Main Row Content: แถบแนวนอน 3 คอลัมน์ (QR Code | ข้อมูลสินค้า | Stock & Actions) */}
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                      {/* Col 1: QR Code Box พร้อมกรอบมุมสีแดง/ส้มตามดีไซน์ */}
                      <div className="w-full md:w-auto shrink-0 flex justify-center md:justify-start">
                        <div 
                          onClick={() => setSelectedQrProduct(fg)}
                          className="w-28 sm:w-36 h-28 sm:h-36 rounded-2xl bg-white border border-gray-100 shadow-2xs flex items-center justify-center p-3 relative cursor-pointer group/qr transition-all hover:border-red-200 hover:shadow-sm"
                          title="คลิกเพื่อดูและขยาย QR Code"
                        >
                          {/* กรอบมุม reticle ทั้ง 4 มุม */}
                          <div className="absolute top-2.5 left-2.5 w-3 h-3 border-t-2 border-l-2 border-[#BE1111] rounded-tl-xs pointer-events-none" />
                          <div className="absolute top-2.5 right-2.5 w-3 h-3 border-t-2 border-r-2 border-[#BE1111] rounded-tr-xs pointer-events-none" />
                          <div className="absolute bottom-2.5 left-2.5 w-3 h-3 border-b-2 border-l-2 border-[#BE1111] rounded-bl-xs pointer-events-none" />
                          <div className="absolute bottom-2.5 right-2.5 w-3 h-3 border-b-2 border-r-2 border-[#BE1111] rounded-br-xs pointer-events-none" />

                          <QRCode value={fg.itemCode} size={110} />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/qr:opacity-100 rounded-2xl flex flex-col items-center justify-center transition-opacity text-white text-xs font-bold text-center p-2 leading-tight backdrop-blur-2xs">
                            <span className="text-lg mb-1">📱</span>
                            <span>คลิกขยาย QR</span>
                          </div>
                          <div id={`qr-group-${fg.itemCode}`} className="hidden">
                            <QRCode value={fg.itemCode} size={150} />
                          </div>
                        </div>
                      </div>

                      {/* Col 2: รายละเอียดสินค้า (Badge -> ชื่อสินค้า -> รหัสสินค้า -> คลัง & ส่วนประกอบ) */}
                      <div className="flex-1 min-w-0 space-y-2 pr-6 md:pr-4 w-full">
                        <div>
                          <span className="px-3 py-1 rounded-full bg-red-50 text-[#BE1111] font-bold text-xs border border-red-100/80 inline-block shadow-2xs">
                            FG (สินค้าหลัก)
                          </span>
                        </div>

                        <h3 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight leading-snug truncate" title={fg.name}>
                          {fg.name}
                        </h3>

                        <div className="flex items-center gap-1.5 text-xs text-gray-600 font-medium pt-0.5">
                          <span>Item Code:</span>
                          <strong className="text-gray-800 font-bold">{fg.itemCode}</strong>
                          <button 
                            type="button" 
                            onClick={() => navigator.clipboard?.writeText(fg.itemCode)} 
                            className="p-1 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer rounded hover:bg-gray-100" 
                            title="คัดลอก Item Code"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-1 text-xs">
                          <div className="flex items-center gap-1.5 bg-gray-50 text-gray-600 px-3 py-1.5 rounded-xl border border-gray-200/80 font-medium">
                            <span>📍 คลังจัดเก็บ:</span>
                            <strong className="text-gray-900 font-bold ml-0.5">{fg.warehouse || 'WFG-JX'} {fg.location && `(${fg.location})`}</strong>
                          </div>
                          <div className="flex items-center gap-1.5 bg-gray-50 text-gray-600 px-3 py-1.5 rounded-xl border border-gray-200/80 font-medium">
                            <span>📦 ส่วนประกอบในสูตร:</span>
                            <strong className="text-[#BE1111] font-bold ml-0.5">{components.length} รายการ</strong>
                          </div>
                        </div>
                      </div>

                      {/* Col 3: Stock Block + ปุ่ม Action ด้านขวา */}
                      <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-stretch sm:items-center md:items-stretch lg:items-center gap-3 sm:gap-4 shrink-0 w-full md:w-auto mt-2 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-gray-100">
                        <div className="bg-red-50/70 min-w-[140px] px-4 py-3 rounded-2xl border border-red-100/80 flex flex-col justify-center text-left sm:text-center shadow-2xs">
                          <span className="text-[10px] sm:text-[11px] text-[#BE1111] font-bold uppercase tracking-wider">
                            STOCK คงเหลือ
                          </span>
                          <div className="text-2xl sm:text-3xl font-black text-[#BE1111] flex items-baseline sm:justify-center gap-1.5 mt-0.5">
                            {fg.quantity.toLocaleString()} <span className="text-xs font-bold text-gray-600">{fg.unit}</span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 shrink-0 min-w-[165px]">
                          <button
                            type="button"
                            onClick={() => downloadQRCodeAsPNG(fg.itemCode)}
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs border border-gray-200 cursor-pointer shadow-2xs active:scale-95 transition-all"
                          >
                            <Download className="w-4 h-4 text-gray-600 shrink-0" />
                            <span>ดาวน์โหลด QR</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openBomModal(fg)}
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#BE1111] hover:bg-[#A00F0F] text-white font-extrabold text-xs shadow-xs cursor-pointer active:scale-95 transition-all"
                          >
                            <FileText className="w-4 h-4 shrink-0" />
                            <span>ดูรายละเอียด BOM</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* หากมีการค้นหา (search) และพบส่วนประกอบที่ตรงคำค้นหา ให้แสดงตารางส่วนประกอบที่ตรงกันภายในการ์ดนี้ */}
                    {search.trim() !== '' && components.length > 0 && (
                      <div className="overflow-hidden rounded-2xl border border-red-200/80 bg-white shadow-xs mt-2 animate-in fade-in duration-300">
                        <div className="bg-red-50/70 px-3.5 py-2 text-gray-800 flex items-center justify-between border-b border-red-100">
                          <div className="flex items-center gap-2">
                            <span className="p-1 rounded bg-red-100 text-[#BE1111]">
                              <Layers className="w-3.5 h-3.5" />
                            </span>
                            <span className="text-xs font-bold text-gray-900">
                              📦 ตรงคำค้นหา ({components.length})
                            </span>
                          </div>
                        </div>
                        <div className="overflow-x-auto max-h-44 overflow-y-auto">
                          <table className="w-full text-left text-[11px]">
                            <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-200 uppercase">
                              <tr>
                                <th className="px-3 py-2">Item Code</th>
                                <th className="px-3 py-2">ชื่อ</th>
                                <th className="px-3 py-2 text-right">คงเหลือ</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {components.map(comp => (
                                <tr key={comp.id} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="px-3 py-2 font-bold text-gray-900">{comp.itemCode}</td>
                                  <td className="px-3 py-2 font-semibold text-gray-800 truncate max-w-[110px]" title={comp.name}>{comp.name}</td>
                                  <td className="px-3 py-2 text-right font-bold text-gray-900">{comp.quantity.toLocaleString()} {comp.unit}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
          </div>

          {/* Packaging Cards View (Design matching FG Cards) */}
          {activeTab === 'Packaging' && (
            <div className="flex flex-col gap-5 animate-in fade-in duration-300 mb-6">
              {displayedProducts
                .filter(p => p.itemType === 'Packaging' && (packagingSubTab === 'all' || getPackagingSubCategory(p) === packagingSubTab))
                .map(item => (
                  <div key={item.id} className="w-full rounded-3xl border border-gray-200/90 bg-white p-5 sm:p-6 shadow-[0_2px_15px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:border-gray-300 transition-all flex flex-col justify-between gap-4 relative group/card font-display">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                      <div className="w-full md:w-auto shrink-0 flex justify-center md:justify-start">
                        <div 
                          onClick={() => setSelectedQrProduct(item)}
                          className="w-28 sm:w-36 h-28 sm:h-36 rounded-2xl bg-white border border-gray-100 shadow-2xs flex items-center justify-center p-3 relative cursor-pointer group/qr transition-all hover:border-red-200 hover:shadow-sm"
                          title="คลิกเพื่อดูและขยาย QR Code"
                        >
                          <div className="absolute top-2.5 left-2.5 w-3 h-3 border-t-2 border-l-2 border-[#BE1111] rounded-tl-xs pointer-events-none" />
                          <div className="absolute top-2.5 right-2.5 w-3 h-3 border-t-2 border-r-2 border-[#BE1111] rounded-tr-xs pointer-events-none" />
                          <div className="absolute bottom-2.5 left-2.5 w-3 h-3 border-b-2 border-l-2 border-[#BE1111] rounded-bl-xs pointer-events-none" />
                          <div className="absolute bottom-2.5 right-2.5 w-3 h-3 border-b-2 border-r-2 border-[#BE1111] rounded-br-xs pointer-events-none" />
                          <QRCode value={item.itemCode} size={110} />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/qr:opacity-100 rounded-2xl flex flex-col items-center justify-center transition-opacity text-white text-xs font-bold text-center p-2 leading-tight backdrop-blur-2xs">
                            <span className="text-lg mb-1">📱</span>
                            <span>คลิกขยาย QR</span>
                          </div>
                          <div id={`qr-group-${item.itemCode}`} className="hidden">
                            <QRCode value={item.itemCode} size={150} />
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 min-w-0 space-y-2 pr-6 md:pr-4 w-full">
                        <div>
                          <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200/80 inline-block shadow-2xs">
                            Packaging
                          </span>
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight leading-snug truncate" title={item.name}>
                          {item.name}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs text-gray-600 font-medium pt-0.5">
                          <span>Item Code:</span>
                          <strong className="text-gray-800 font-bold">{item.itemCode}</strong>
                          <button 
                            type="button" 
                            onClick={() => navigator.clipboard?.writeText(item.itemCode)} 
                            className="p-1 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer rounded hover:bg-gray-100" 
                            title="คัดลอก Item Code"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-1 text-xs">
                          <div className="flex items-center gap-1.5 bg-gray-50 text-gray-600 px-3 py-1.5 rounded-xl border border-gray-200/80 font-medium">
                            <span>📍 คลังจัดเก็บ:</span>
                            <strong className="text-gray-900 font-bold ml-0.5">{item.warehouse || '-'} {item.location && `(${item.location})`}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-stretch sm:items-center md:items-stretch lg:items-center gap-3 sm:gap-4 shrink-0 w-full md:w-auto mt-2 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-gray-100">
                        <div className="bg-slate-50 min-w-[140px] px-4 py-3 rounded-2xl border border-slate-200 flex flex-col justify-center text-left sm:text-center shadow-2xs">
                          <span className="text-[10px] sm:text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                            STOCK คงเหลือ
                          </span>
                          <div className="text-2xl sm:text-3xl font-black text-gray-900 flex items-baseline sm:justify-center gap-1.5 mt-0.5">
                            {item.quantity.toLocaleString()} <span className="text-xs font-bold text-gray-600">{item.unit}</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 shrink-0 min-w-[165px]">
                          <button
                            type="button"
                            onClick={() => downloadQRCodeAsPNG(item.itemCode)}
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs border border-gray-200 cursor-pointer shadow-2xs active:scale-95 transition-all"
                          >
                            <Download className="w-4 h-4 text-gray-600 shrink-0" />
                            <span>ดาวน์โหลด QR</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openBomModal(item)}
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#BE1111] hover:bg-[#A00F0F] text-white font-extrabold text-xs shadow-xs cursor-pointer active:scale-95 transition-all"
                          >
                            <FileText className="w-4 h-4 shrink-0" />
                            <span>ดูรายละเอียด BOM</span>
                          </button>
                          {user?.role === 'admin' && (
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(item)}
                              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-red-50 text-gray-400 hover:text-red-600 font-bold text-xs border border-gray-200 hover:border-red-200 cursor-pointer shadow-2xs active:scale-95 transition-all"
                            >
                              <Trash2 className="w-4 h-4 shrink-0" />
                              <span>ลบรายการ</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* 2. Unassigned Items Card (Items not linked as Parent or Component) */}
          {(() => {
            const assignedOrParentCodes = new Set<string>()
            products.forEach(p => {
              if (p.itemType === 'FG') {
                assignedOrParentCodes.add(p.itemCode)
              }
              if (p.parentItemCodes && p.parentItemCodes.length > 0) {
                assignedOrParentCodes.add(p.itemCode)
              }
            })
            const unassignedProducts = products.filter(p => {
              if (!matchesUnit(p.unit)) return false
              if (assignedOrParentCodes.has(p.itemCode)) return false
              if (activeTab === 'ALL') return p.itemType !== 'FG'
              if (activeTab === 'FG') return false
              return p.itemType === activeTab
            })

            if (unassignedProducts.length === 0 || selectedParentCode) return null

            return (
              <div className="overflow-hidden rounded-3xl border border-gray-200/80 bg-white shadow-[0_4px_20px_rgb(0,0,0,0.03)] mt-8">
                <div className="bg-slate-50 p-4 sm:p-5 text-gray-800 flex items-center justify-between border-b border-gray-200/90">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-gray-800 border border-gray-200 shadow-2xs">
                      <Package className="w-5 h-5 text-gray-700" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-gray-900">รายการสินค้าทั่วไป / รายการที่ยังไม่ได้ผูกรหัสหลัก (Unassigned Items)</h4>
                      <p className="text-xs text-gray-500">สินค้าและบรรจุภัณฑ์ที่ไม่มีสถานะเป็นสูตรหลัก และยังไม่ได้ผูกกับสูตร BOM ใดๆ</p>
                    </div>
                  </div>
                  <span className="px-3.5 py-1.5 rounded-full bg-white text-gray-800 text-xs font-bold border border-gray-200 shadow-2xs font-display">
                    {unassignedProducts.length} รายการ
                  </span>
                </div>

                <div className="overflow-x-auto p-4">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead className="bg-slate-50/50 text-slate-500 font-bold border-b border-gray-200 uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Item Code</th>
                        <th className="px-4 py-3 font-semibold">ประเภท</th>
                        <th className="px-4 py-3 font-semibold">ชื่อรายการสินค้า</th>
                        <th className="px-4 py-3 font-semibold">คลัง / โซน</th>
                        <th className="px-4 py-3 font-semibold text-right">คงเหลือ</th>
                        {user?.role === 'admin' && <th className="px-4 py-3 font-semibold text-center">จัดการ</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {unassignedProducts.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-display font-bold text-gray-900">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedQrProduct(item)}
                                className="group inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-100 hover:bg-red-50 border border-gray-200/80 hover:border-red-200 text-gray-800 hover:text-[#BE1111] transition-all shadow-2xs cursor-pointer shrink-0"
                                title={`คลิกเพื่อดูและดาวน์โหลด QR Code สำหรับ ${item.itemCode}`}
                              >
                                <QrCode className="w-3.5 h-3.5 text-[#BE1111] group-hover:scale-110 transition-transform" />
                                <span>{item.itemCode}</span>
                              </button>
                              <div id={`qr-${item.itemCode}`} className="hidden">
                                <QRCode value={item.itemCode} size={64} />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200/80 font-display">
                              {item.itemType || 'General'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 font-display font-semibold text-gray-800 tracking-tight text-xs sm:text-sm">{item.name}</td>
                          <td className="px-4 py-3 text-gray-600">{item.warehouse} ({item.location || '-'})</td>
                          <td className="px-4 py-3 text-right font-bold text-gray-900">
                            {item.quantity.toLocaleString()} <span className="font-normal text-gray-500 text-[11px]">{item.unit}</span>
                          </td>
                          {user?.role === 'admin' && (
                            <td className="px-4 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(item)}
                                className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-all cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })()}
        </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-gray-200/80 bg-white shadow-[0_4px_20px_rgb(0,0,0,0.03)] animate-in fade-in duration-300">
            <div className="bg-slate-50 p-5 text-gray-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-200/90">
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-gray-800 border border-gray-200 shadow-2xs">
                  <LayoutGrid className="w-5 h-5 text-gray-700" />
                </div>
                <div>
                  <h3 className="font-display font-black text-lg tracking-wide flex items-center gap-2 text-gray-900">
                    <span>รายการสินค้าทั้งหมด (แบบแยกรายการ / Flat List Mode)</span>
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    แสดงรายการสินค้าทั้งหมดตามตัวกรองที่เลือก โดยไม่จัดกลุ่มตามรหัสหลัก (Item 1)
                  </p>
                </div>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-gray-800 border border-gray-200 shadow-2xs font-display">
                <span>จำนวนทั้งสิ้น: <strong className="text-[#BE1111]">{(() => {
                  const filtered = displayedProducts.filter(p => activeTab === 'ALL' || p.itemType === activeTab)
                  return filtered.length
                })()}</strong> รายการ</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-slate-50/50 text-slate-500 font-bold border-b border-gray-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3.5 font-semibold">Item Code</th>
                    <th className="px-4 py-3.5 font-semibold">ประเภท</th>
                    <th className="px-4 py-3.5 font-semibold">ชื่อสินค้า</th>
                    <th className="px-4 py-3.5 font-semibold">คลังสินค้า / ตำแหน่ง</th>
                    <th className="px-4 py-3.5 font-semibold text-right">จำนวนคงเหลือ</th>
                    {user?.role === 'admin' && <th className="px-4 py-3.5 font-semibold text-center">จัดการ</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(() => {
                    const filteredFlat = displayedProducts.filter(p => activeTab === 'ALL' || p.itemType === activeTab)
                    if (filteredFlat.length === 0) {
                      return (
                        <tr>
                          <td colSpan={user?.role === 'admin' ? 6 : 5} className="px-6 py-12 text-center text-gray-500 font-medium">
                            ไม่พบรายการสินค้าในหมวดหมู่นี้
                          </td>
                        </tr>
                      )
                    }
                    return filteredFlat.map((item) => {
                      const currentVal = editQuantities[item.id] !== undefined ? editQuantities[item.id] : String(item.quantity)
                      const isChanged = currentVal !== String(item.quantity)

                      return (
                        <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-4 py-3.5 font-display font-bold text-gray-900">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedQrProduct(item)}
                                className="group inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-100 hover:bg-red-50 border border-gray-200/80 hover:border-red-200 text-gray-800 hover:text-[#BE1111] transition-all shadow-2xs cursor-pointer shrink-0"
                                title={`คลิกเพื่อดูและดาวน์โหลด QR Code สำหรับ ${item.itemCode}`}
                              >
                                <QrCode className="w-3.5 h-3.5 text-[#BE1111] group-hover:scale-110 transition-transform" />
                                <span>{item.itemCode}</span>
                              </button>
                              <div id={`qr-${item.itemCode}`} className="hidden">
                                <QRCode value={item.itemCode} size={64} />
                              </div>
                              {item.itemType === 'FG' && (
                                <button
                                  type="button"
                                  onClick={() => openBomModal(item)}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 text-[#BE1111] font-extrabold text-[10px] border border-red-200/80 hover:bg-[#BE1111] hover:text-white transition-all shadow-2xs cursor-pointer"
                                >
                                  <span>สูตร BOM</span>
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                             <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold border font-display ${
                               item.itemType === 'FG' 
                                ? 'bg-red-50 text-[#BE1111] border-red-200 font-black' 
                                : 'bg-slate-100 text-slate-700 border-slate-200/80'
                            }`}>
                              {item.itemType || 'General'}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-display font-semibold text-gray-800 tracking-tight text-xs sm:text-sm">{item.name}</td>
                          <td className="px-4 py-3.5 text-gray-600">{item.warehouse} ({item.location || '-'})</td>
                          <td className="px-4 py-3.5 text-right">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              {user?.role === 'admin' ? (
                                <>
                                  <input
                                    type="text"
                                    value={currentVal}
                                    onChange={(e) => {
                                      const val = e.target.value.replace(/[^0-9]/g, '')
                                      setEditQuantities(prev => ({ ...prev, [item.id]: val }))
                                    }}
                                    className={`w-24 text-right rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-all shadow-2xs focus:outline-none focus:ring-1 ${
                                      isChanged 
                                        ? 'border-[#BE1111] bg-red-50 text-[#BE1111]' 
                                        : 'border-gray-200 bg-gray-50 text-gray-800 focus:bg-white focus:border-[#BE1111]'
                                    }`}
                                  />
                                  <span className="text-gray-500 w-10 text-left font-medium">{item.unit}</span>
                                  {isChanged && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const parsed = Number(currentVal)
                                        if (!isNaN(parsed) && parsed >= 0) {
                                          setConfirmTarget({ product: item, newQty: parsed })
                                        }
                                      }}
                                      className="p-1.5 rounded-lg bg-[#BE1111] text-white hover:bg-[#A00F0F] transition-all shadow-2xs animate-pulse cursor-pointer"
                                      title="บันทึกจำนวนสต็อก"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </>
                              ) : (
                                <>
                                  <span className="font-bold text-gray-900 text-sm">{item.quantity.toLocaleString()}</span>
                                  <span className="text-gray-500 w-10 text-left font-medium">{item.unit}</span>
                                </>
                              )}
                            </div>
                          </td>
                          {user?.role === 'admin' && (
                            <td className="px-4 py-3.5 text-center">
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(item)}
                                className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-all cursor-pointer"
                                title="ลบรายการสินค้า"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      )
                    })
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {confirmTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: "tween", ease: "easeOut", duration: 0.2 }}
              className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-gray-100 overflow-hidden"
            >
              <h3 className="text-lg font-display font-bold text-gray-900 mb-2">ยืนยันการแก้ไขจำนวนคงเหลือ</h3>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              คุณต้องการแก้ไขจำนวนคงเหลือของรหัสสินค้า <span className="font-semibold text-gray-900">{confirmTarget.product.itemCode} ({confirmTarget.product.name})</span> จาก <span className="font-bold text-gray-700">{confirmTarget.product.quantity.toLocaleString()}</span> เป็น <span className="font-bold text-[#BE1111]">{confirmTarget.newQty.toLocaleString()}</span> {confirmTarget.product.unit} ใช่หรือไม่?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmTarget(null)}
                disabled={saving}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={async () => {
                  setSaving(true)
                  try {
                    await updateProductQuantity(confirmTarget.product.id, confirmTarget.newQty)
                    setProducts(products.map(p => p.id === confirmTarget.product.id ? { ...p, quantity: confirmTarget.newQty } : p))
                    setEditQuantities(prev => {
                      const next = { ...prev }
                      delete next[confirmTarget.product.id]
                      return next
                    })
                    setConfirmTarget(null)
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'อัปเดตจำนวนสต็อกไม่สำเร็จ')
                    setConfirmTarget(null)
                  } finally {
                    setSaving(false)
                  }
                }}
                disabled={saving}
                className="flex-1 rounded-xl bg-[#BE1111] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#A00F0F] disabled:opacity-50 transition-all shadow-sm"
              >
                {saving ? 'กำลังบันทึก...' : 'ยืนยันบันทึก'}
              </button>
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: "tween", ease: "easeOut", duration: 0.2 }}
              className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-gray-100 overflow-hidden"
            >
              <div className="flex items-center gap-3 mb-4 text-red-600">
              <div className="p-3 bg-red-50 rounded-2xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-display font-bold text-gray-900">ยืนยันการลบรายการสินค้า</h3>
                <p className="text-xs text-gray-500">การกระทำนี้จะไม่สามารถย้อนกลับได้</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              คุณต้องการลบสินค้า <span className="font-semibold text-gray-900">{deleteTarget.name}</span> (รหัส: <span className="font-display font-bold text-gray-800">{deleteTarget.itemCode}</span>) ออกจากระบบใช่หรือไม่?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deletingLoading}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={async () => {
                  setDeletingLoading(true)
                  try {
                    await deleteProduct(deleteTarget.id)
                    setProducts(products.filter(p => p.id !== deleteTarget.id))
                    setDeleteTarget(null)
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'ลบสินค้าไม่สำเร็จ')
                    setDeleteTarget(null)
                  } finally {
                    setDeletingLoading(false)
                  }
                }}
                disabled={deletingLoading}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-all shadow-sm cursor-pointer active:scale-95"
              >
                {deletingLoading ? 'กำลังลบ...' : 'ยืนยันลบสินค้า'}
              </button>
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Product Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: "tween", ease: "easeOut", duration: 0.2 }}
              className="w-full max-w-lg rounded-3xl bg-white p-6 md:p-8 shadow-2xl border border-gray-100 overflow-hidden max-h-[85vh] overflow-y-auto mb-16 sm:mb-0"
            >
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-xl font-display font-bold text-gray-900">เพิ่มรายการสินค้าใหม่</h3>
                <p className="text-xs text-gray-500 mt-0.5">ระบบจะสร้าง QR Code ของสินค้านี้ให้อัตโนมัติในตารางหลังบันทึก</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {addingError && (
              <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-sm font-medium text-red-800 shadow-2xs flex items-center justify-between">
                <span>{addingError}</span>
                <button type="button" onClick={() => setAddingError('')} className="text-red-600 hover:text-red-900 font-bold ml-2">✕</button>
              </div>
            )}

            <form onSubmit={handleAddProduct} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    รหัสสินค้า (Item Code) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newItemCode}
                    onChange={(e) => setNewItemCode(e.target.value)}
                    placeholder="เช่น 7290103900"
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1d1d1f]/20 focus:border-[#1d1d1f] bg-gray-50/50 focus:bg-white transition-all shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    จำนวนเริ่มต้น <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm font-bold text-[#BE1111] bg-red-50/30 focus:outline-none focus:ring-2 focus:ring-[#1d1d1f]/20 focus:border-[#1d1d1f] focus:bg-white transition-all shadow-2xs text-right"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  ชื่อสินค้า <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="ระบุชื่อหรือรายละเอียดสินค้า"
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1d1d1f]/20 focus:border-[#1d1d1f] bg-gray-50/50 focus:bg-white transition-all shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    หน่วย
                  </label>
                  <input
                    type="text"
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    placeholder="PCS"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1d1d1f]/20 focus:border-[#1d1d1f] bg-gray-50/50 focus:bg-white transition-all shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    คลัง
                  </label>
                  <input
                    type="text"
                    value={newWarehouse}
                    onChange={(e) => setNewWarehouse(e.target.value)}
                    placeholder="WPK"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1d1d1f]/20 focus:border-[#1d1d1f] bg-gray-50/50 focus:bg-white transition-all shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Location
                  </label>
                  <input
                    type="text"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="-"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1d1d1f]/20 focus:border-[#1d1d1f] bg-gray-50/50 focus:bg-white transition-all shadow-2xs"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3 border-t border-gray-100 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={addingLoading}
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={addingLoading}
                  className="flex-1 rounded-xl bg-[#1d1d1f] hover:bg-[#333336] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  {addingLoading ? 'กำลังบันทึก...' : 'บันทึกสินค้าใหม่'}
                </button>
              </div>
            </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BOM Recipe Modal */}
      <AnimatePresence>
        {selectedBomProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: "tween", ease: "easeOut", duration: 0.2 }}
              className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl border border-gray-100 max-h-[85vh] flex flex-col overflow-hidden"
            >
              <div className="flex items-start justify-between pb-4 border-b border-gray-100 mb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-[#BE1111] border border-red-100 mb-1">
                  👑 SAP Bill of Materials (BOM) Recipe
                </div>
                <h3 className="text-base sm:text-lg font-display font-bold text-gray-900 tracking-tight">{selectedBomProduct.name}</h3>
                <p className="text-xs font-display font-semibold text-gray-500 mt-0.5">รหัสสินค้าหลัก: {selectedBomProduct.itemCode}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBomProduct(null)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 pr-1">
              {bomLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-gray-500">
                  <div className="w-8 h-8 border-3 border-[#BE1111] border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm font-medium">กำลังโหลดสูตรการผลิต SAP...</span>
                </div>
              ) : bomList.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  <p className="text-sm">ไม่พบข้อมูลสูตร BOM สำหรับสินค้ารายการนี้</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-gray-200">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-center w-16 whitespace-nowrap">Depth</th>
                        <th className="px-4 py-3 whitespace-nowrap">รหัสส่วนประกอบ</th>
                        <th className="px-4 py-3 whitespace-nowrap">ชื่อรายการ / วัตถุดิบ</th>
                        <th className="px-4 py-3 text-right whitespace-nowrap">ปริมาณใช้</th>
                        <th className="px-4 py-3 whitespace-nowrap">หน่วย</th>
                        <th className="px-4 py-3 whitespace-nowrap">คลัง</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {bomList.filter(comp => comp.componentItemCode !== comp.parentItemCode).map((comp) => (
                        <tr key={comp.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-4 py-2.5 text-center font-display font-bold text-gray-500 whitespace-nowrap">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                              comp.depth === 1 ? 'bg-red-100 text-red-700' :
                              comp.depth === 2 ? 'bg-amber-100 text-amber-800' :
                              'bg-purple-100 text-purple-700'
                            }`}>
                              {comp.depth}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 font-display font-bold text-gray-900 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setSelectedQrProduct({
                                id: comp.id,
                                itemCode: comp.componentItemCode,
                                productId: null,
                                name: comp.description,
                                unit: comp.uom,
                                quantity: comp.quantity,
                                warehouse: comp.warehouse || '',
                                location: '',
                                itemType: comp.depth === 1 ? 'FG' : comp.depth === 2 ? 'Bulk' : 'Raw Material'
                              })}
                              className="group inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-gray-100 hover:bg-red-50 border border-gray-200 hover:border-red-200 text-gray-800 hover:text-[#BE1111] transition-all shadow-2xs cursor-pointer whitespace-nowrap"
                              title="คลิกเพื่อดูและดาวน์โหลด QR Code"
                            >
                              <QrCode className="w-3.5 h-3.5 text-[#BE1111] shrink-0" />
                              <span className="whitespace-nowrap">{comp.componentItemCode}</span>
                            </button>
                          </td>
                          <td className="px-4 py-2.5 text-gray-800 font-medium">{comp.description}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-[#BE1111] whitespace-nowrap">{comp.quantity}</td>
                          <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{comp.uom}</td>
                          <td className="px-4 py-2.5 text-gray-600 font-display font-semibold whitespace-nowrap">{comp.warehouse}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-gray-100 mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedBomProduct(null)}
                className="rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition-colors shadow-sm"
              >
                ปิดหน้าต่าง
              </button>
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QR Code Quick View & Download Modal for Individual Item Code */}
      <AnimatePresence>
        {selectedQrProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md p-4"
            onClick={() => setSelectedQrProduct(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: "tween", ease: "easeOut", duration: 0.2 }}
              className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl border border-gray-100 p-6 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button
              onClick={() => setSelectedQrProduct(null)}
              className="absolute right-4 top-4 rounded-full bg-gray-100 p-2 text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-red-50 px-3.5 py-1 text-xs font-bold text-[#BE1111] border border-red-100">
              <QrCode className="w-3.5 h-3.5" />
              <span>QR Code ประจำรหัสสินค้า (Item Code)</span>
            </div>

            <div id={`qr-modal-${selectedQrProduct.itemCode}`} className="mx-auto my-4 inline-block rounded-2xl bg-white p-5 shadow-inner border border-gray-200/80">
              <QRCode value={selectedQrProduct.itemCode} size={200} />
            </div>

            <div className="mb-6 space-y-1.5 px-4">
              <div className="flex items-center justify-center gap-2">
                <span className={`px-2 py-0.5 rounded-md text-[11px] font-extrabold border ${
                  selectedQrProduct.itemType === 'FG' ? 'bg-red-50 text-red-700 border-red-200' :
                  selectedQrProduct.itemType === 'Bulk' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                  selectedQrProduct.itemType === 'Packaging' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                  'bg-purple-50 text-purple-700 border-purple-200'
                }`}>
                  {selectedQrProduct.itemType || 'General'}
                </span>
                <span className="font-display text-base font-bold text-gray-900 tracking-tight">
                  {selectedQrProduct.itemCode}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-display font-bold text-gray-900 tracking-tight leading-snug">
                {selectedQrProduct.name}
              </h3>
              <div className="grid grid-cols-2 gap-2 mt-3 bg-gray-50 p-3 rounded-xl border border-gray-100 text-left">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">คลังสินค้า / โซน</span>
                  <span className="text-xs font-semibold text-gray-700 block truncate mt-0.5">
                    {selectedQrProduct.warehouse || 'ไม่มี'} {selectedQrProduct.location ? `(${selectedQrProduct.location})` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">คงเหลือปัจจุบัน</span>
                  <span className="text-xs font-bold text-gray-900 block mt-0.5">
                    {Number(selectedQrProduct.quantity || 0).toLocaleString()} <span className="font-normal text-gray-500">{selectedQrProduct.unit}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => downloadQRCodeAsPNG(selectedQrProduct.itemCode)}
                className="w-full rounded-xl bg-[#BE1111] hover:bg-[#A00F0F] py-3 text-sm font-bold text-white shadow-md shadow-[#BE1111]/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>ดาวน์โหลดรูปภาพ PNG</span>
              </button>
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </main>
  )
}
