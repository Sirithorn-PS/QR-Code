'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { fetchProducts, updateProductQuantity, createProduct, deleteProduct, fetchProductBom, Product, BillOfMaterial } from '@/lib/auth'
import QRCode from 'react-qr-code'
import { Search, Package, ArrowLeft, Layers, Download, Check, History, Plus, X, Trash2, FileText, FolderTree, ChevronDown, ChevronRight, LayoutGrid, Crown, Droplets, Box, FlaskConical, QrCode, Filter, Tag } from 'lucide-react'

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const [activeTab, setActiveTab] = useState('ALL')
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false)
  const [selectedUnit, setSelectedUnit] = useState('ALL')
  const [isUnitDropdownOpen, setIsUnitDropdownOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped')
  const [selectedParentCode, setSelectedParentCode] = useState<string | null>(null)
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({})
  const [expandedBomSubgroups, setExpandedBomSubgroups] = useState<Record<string, boolean>>({})
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

  useEffect(() => {
    setSelectedParentCode(null)
  }, [activeTab, selectedUnit])

  useEffect(() => {
    let isMounted = true

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

  const matchesUnit = (unit?: string) => selectedUnit === 'ALL' || (unit && Boolean(unit.toLowerCase() === selectedUnit.toLowerCase()))

  const displayedProducts = products.filter(product => {
    if (!matchesUnit(product.unit)) return false
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
                <Layers className="w-5 h-5" />
              </div>
              <h1 className="text-2xl md:text-3xl font-display font-bold text-gray-900 tracking-tight">จัดการสต็อกสินค้า</h1>
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
                  onChange={(event) => setSearch(event.target.value)}
                  className="w-full sm:w-64 rounded-xl border border-gray-200 pl-10 pr-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#BE1111]/20 focus:border-[#BE1111] bg-white shadow-sm transition-all"
                  placeholder="ค้นหา item code / ชื่อ / location"
                />
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

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800 shadow-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-600 hover:text-red-900 font-bold ml-4">✕</button>
          </div>
        )}

        {/* Dropdown Selectors: Category Filter & Unit Filter */}
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-4xl">
          {/* Custom Modern Vector-Only Category Dropdown Selector (No Emojis!) */}
          <div className="relative w-full">
            {(() => {
              const categoryOptions = [
                { id: 'ALL', label: 'ทั้งหมด', count: products.length, icon: LayoutGrid, desc: 'All Categories' },
                { id: 'FG', label: 'FG (สินค้าหลัก)', count: products.filter(p => p.itemType === 'FG').length, icon: Crown, desc: 'Finished Goods' },
                { id: 'Bulk', label: 'Bulk (กึ่งสำเร็จรูป)', count: products.filter(p => p.itemType === 'Bulk').length, icon: Droplets, desc: 'Semi-Finished' },
                { id: 'Packaging', label: 'Packaging (บรรจุภัณฑ์)', count: products.filter(p => p.itemType === 'Packaging').length, icon: Box, desc: 'Packaging Materials' },
                { id: 'Raw Material', label: 'Raw Material (วัตถุดิบ)', count: products.filter(p => p.itemType === 'Raw Material').length, icon: FlaskConical, desc: 'Raw Ingredients' },
              ]
              const currentOpt = categoryOptions.find(o => o.id === activeTab) || categoryOptions[0]
              const CurrentIcon = currentOpt.icon

              return (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCategoryDropdownOpen(!isCategoryDropdownOpen)
                      if (isUnitDropdownOpen) setIsUnitDropdownOpen(false)
                    }}
                    className="w-full flex items-center justify-between gap-3 bg-white/95 backdrop-blur-md p-2.5 sm:p-3 rounded-2xl border border-gray-200 shadow-xs hover:border-gray-300 transition-all text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-800 shadow-xs group-hover:bg-red-50 group-hover:text-[#BE1111] transition-colors">
                        <CurrentIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold text-gray-400 tracking-wider uppercase font-mono">หมวดหมู่สินค้า (Category Filter)</div>
                        <div className="text-xs sm:text-sm font-black text-gray-900 tracking-tight">
                          {currentOpt.label} ({currentOpt.count} รายการ)
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pr-1">
                      <span className="text-xs font-bold text-[#BE1111] bg-red-50 px-2.5 py-1 rounded-lg border border-red-100 font-mono">
                        {activeTab}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isCategoryDropdownOpen ? 'rotate-180 text-gray-800' : ''}`} />
                    </div>
                  </button>

                  {/* Popover Backdrop */}
                  {isCategoryDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsCategoryDropdownOpen(false)}
                      />

                      {/* Popover Menu List */}
                      <div className="absolute left-0 top-full mt-2 w-full z-50 rounded-2xl border border-gray-200/90 bg-white/98 backdrop-blur-xl p-2 shadow-xl animate-in fade-in zoom-in-95 duration-150 divide-y divide-gray-100/80">
                        {categoryOptions.map((opt) => {
                          const IconComp = opt.icon
                          const isSelected = activeTab === opt.id
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                setActiveTab(opt.id)
                                setSelectedParentCode(null)
                                setIsCategoryDropdownOpen(false)
                              }}
                              className={`w-full flex items-center justify-between gap-3 p-2.5 rounded-xl transition-all text-left cursor-pointer group ${
                                isSelected
                                  ? 'bg-gray-100/90 text-gray-900 shadow-2xs font-black border border-gray-200/80'
                                  : 'hover:bg-gray-50 text-gray-600 font-extrabold'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                                  isSelected
                                    ? 'bg-white text-[#BE1111] shadow-2xs border border-gray-200/80'
                                    : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200 group-hover:text-gray-900'
                                }`}>
                                  <IconComp className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className={`text-xs sm:text-sm font-bold tracking-tight ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                                    {opt.label}
                                  </div>
                                  <div className={`text-[10px] sm:text-[11px] ${isSelected ? 'text-gray-500 font-medium' : 'text-gray-400'}`}>
                                    {opt.desc}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                                  isSelected
                                    ? 'bg-red-50 text-[#BE1111] border border-red-200/80'
                                    : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                                }`}>
                                  {opt.count} รายการ
                                </span>
                                {isSelected && <Check className="w-4 h-4 text-white shrink-0" />}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </>
                  )}
                </>
              )
            })()}
          </div>

          {/* Custom Modern Unit Filter Dropdown Selector */}
          <div className="relative w-full">
            {(() => {
              const unitOptions = [
                { id: 'ALL', label: 'All Units (ทุกหน่วยนับ)', desc: 'แสดงทุกหน่วยนับ' },
                { id: 'Pail20L', label: 'Pail20L', desc: 'ถัง 20 ลิตร' },
                { id: 'Litre', label: 'Litre', desc: 'ลิตร (L)' },
                { id: 'Kilogram', label: 'Kilogram', desc: 'กิโลกรัม (Kg)' },
                { id: 'Label18L', label: 'Label18L', desc: 'ป้ายฉลาก 18L' },
              ]
              const currentUnitOpt = unitOptions.find(o => o.id.toLowerCase() === selectedUnit.toLowerCase()) || unitOptions[0]

              return (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setIsUnitDropdownOpen(!isUnitDropdownOpen)
                      if (isCategoryDropdownOpen) setIsCategoryDropdownOpen(false)
                    }}
                    className="w-full flex items-center justify-between gap-3 bg-white/95 backdrop-blur-md p-2.5 sm:p-3 rounded-2xl border border-gray-200 shadow-xs hover:border-gray-300 transition-all text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-800 shadow-xs group-hover:bg-red-50 group-hover:text-[#BE1111] transition-colors">
                        <Filter className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold text-gray-400 tracking-wider uppercase font-mono">หน่วยนับ (Unit Filter)</div>
                        <div className="text-xs sm:text-sm font-black text-gray-900 tracking-tight">
                          {currentUnitOpt.label}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pr-1">
                      <span className="text-xs font-bold text-[#BE1111] bg-red-50 px-2.5 py-1 rounded-lg border border-red-100 font-mono">
                        {selectedUnit === 'ALL' ? 'ALL' : currentUnitOpt.id}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isUnitDropdownOpen ? 'rotate-180 text-gray-800' : ''}`} />
                    </div>
                  </button>

                  {/* Popover Backdrop */}
                  {isUnitDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsUnitDropdownOpen(false)}
                      />

                      {/* Popover Menu List */}
                      <div className="absolute left-0 top-full mt-2 w-full z-50 rounded-2xl border border-gray-200/90 bg-white/98 backdrop-blur-xl p-2 shadow-xl animate-in fade-in zoom-in-95 duration-150 divide-y divide-gray-100/80">
                        {unitOptions.map((opt) => {
                          const isSelected = selectedUnit.toLowerCase() === opt.id.toLowerCase()
                          const count = products.filter(p => opt.id === 'ALL' ? true : Boolean(p.unit && p.unit.toLowerCase() === opt.id.toLowerCase())).length
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                setSelectedUnit(opt.id)
                                setSelectedParentCode(null)
                                setIsUnitDropdownOpen(false)
                              }}
                              className={`w-full flex items-center justify-between gap-3 p-2.5 rounded-xl transition-all text-left cursor-pointer group ${
                                isSelected
                                  ? 'bg-gray-100/90 text-gray-900 shadow-2xs font-black border border-gray-200/80'
                                  : 'hover:bg-gray-50 text-gray-600 font-extrabold'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                                  isSelected
                                    ? 'bg-white text-[#BE1111] shadow-2xs border border-gray-200/80'
                                    : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200 group-hover:text-gray-900'
                                }`}>
                                  <Tag className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className={`text-xs sm:text-sm font-bold tracking-tight ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                                    {opt.label}
                                  </div>
                                  <div className={`text-[10px] sm:text-[11px] ${isSelected ? 'text-gray-500 font-medium' : 'text-gray-400'}`}>
                                    {opt.desc}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                                  isSelected
                                    ? 'bg-red-50 text-[#BE1111] border border-red-200/80'
                                    : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                                }`}>
                                  {count} รายการ
                                </span>
                                {isSelected && <Check className="w-4 h-4 text-white shrink-0" />}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </>
                  )}
                </>
              )
            })()}
          </div>
        </div>

        {/* Quick Filter Banner if parent selected */}
        {selectedParentCode && (
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-white p-4 border border-gray-200/90 shadow-2xs animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-[#BE1111] border border-red-100 shadow-2xs">
                <Search className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-[#BE1111] flex items-center gap-1.5 font-mono">
                  <span>✨ กรองข้อมูลตามรหัสหลัก (Item 1 Quick Filter)</span>
                </div>
                <div className="text-sm font-semibold text-gray-800 mt-0.5">
                  แสดงรายการและส่วนประกอบที่เชื่อมโยงกับรหัสหลัก: <span className="font-bold text-[#BE1111] font-mono underline decoration-[#BE1111]/40 decoration-2 underline-offset-4">{selectedParentCode}</span> ({displayedProducts.length} รายการ)
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
          {/* Dedicated Category Summary Table & Dashboard when tab is Bulk, Packaging, or Raw Material */}
          {activeTab !== 'ALL' && activeTab !== 'FG' && (() => {
            const categoryItems = products.filter(p => p.itemType === activeTab && matchesUnit(p.unit))
            const CategoryIcon = activeTab === 'Bulk' ? Droplets : activeTab === 'Packaging' ? Box : FlaskConical
            const categoryTitle = activeTab === 'Bulk' ? 'Bulk (กึ่งสำเร็จรูป / สารผสม)' : activeTab === 'Packaging' ? 'Packaging (บรรจุภัณฑ์ / วัสดุห่อหุ้ม)' : 'Raw Material (วัตถุดิบตั้งต้น / เคมีภัณฑ์)'

            return (
              <div className="mb-8 overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-md animate-in fade-in duration-300">
                <div className="bg-slate-50 p-5 text-gray-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-200/90">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-gray-800 border border-gray-200 shadow-2xs">
                      <CategoryIcon className="w-5 h-5 text-gray-700" />
                    </div>
                    <div>
                      <h3 className="font-display font-black text-lg tracking-wide flex items-center gap-2 text-gray-900">
                        <span>รายการ {categoryTitle} ทั้งหมด</span>
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
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-gray-200 uppercase">
                        <tr>
                          <th className="px-4 py-3.5 font-semibold">Item Code</th>
                          <th className="px-4 py-3.5 font-semibold">ชื่อรายการ ({activeTab})</th>
                          <th className="px-4 py-3.5 font-semibold">คลัง / โซน</th>
                          <th className="px-4 py-3.5 font-semibold">👑 สูตรสินค้าหลัก Item 1 ที่ใช้งาน</th>
                          <th className="px-4 py-3.5 font-semibold text-right">คงเหลือ</th>
                          <th className="px-4 py-3.5 font-semibold text-center">จัดการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {categoryItems.map(item => {
                          const currentVal = editQuantities[item.id] !== undefined ? editQuantities[item.id] : String(item.quantity)
                          const isChanged = currentVal !== String(item.quantity)
                          const linkedParents = item.parentItemCodes || []

                          return (
                            <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="px-4 py-3.5 font-mono font-bold text-gray-900">
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
                              <td className="px-4 py-3.5 font-medium text-gray-800">{item.name}</td>
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
                                </div>
                              </td>
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

          {activeTab !== 'ALL' && activeTab !== 'FG' && (
            <div className="flex items-center gap-2.5 pt-2 pb-1 text-slate-800 font-extrabold text-sm sm:text-base border-b border-gray-200/80">
              <FolderTree className="w-5 h-5 text-[#BE1111]" />
              <span>แยกรายการตามสูตรสินค้าหลัก Item 1 ที่มีการใช้ชิ้นส่วน {activeTab}</span>
            </div>
          )}

          {/* 1. Group Cards for each Parent FG (Item 1): แยกข้อมูลสินค้าหลัก (FG) ด้านบน ออกจากรายการ BOM ด้านล่าง */}
          {products
            .filter(p => p.itemType === 'FG' && (!selectedParentCode || p.itemCode === selectedParentCode))
            .map(fg => {
              const fgMatchesUnit = matchesUnit(fg.unit)
              const components = products.filter(p => p.itemCode !== fg.itemCode && p.parentItemCodes?.includes(fg.itemCode) && (activeTab === 'ALL' || activeTab === 'FG' ? true : p.itemType === activeTab) && matchesUnit(p.unit))
              if (activeTab === 'FG' && !fgMatchesUnit) return null
              if (activeTab !== 'ALL' && activeTab !== 'FG' && components.length === 0) return null
              if (activeTab === 'ALL' && !fgMatchesUnit && components.length === 0) return null
              const isExpanded = expandedParents[fg.itemCode] ?? false
              return (
                <div key={fg.id} className="space-y-6 animate-in fade-in duration-300">
                  {/* 👑 Header ด้านบน: กล่องแสดงข้อมูลสินค้าหลัก (FG) แยกออกจากรายการ BOM อย่างชัดเจนในดีไซน์มินิมอล (White Card with Soft Slate Border) */}
                  <div className="overflow-hidden rounded-2xl border border-gray-200/90 bg-white p-6 shadow-sm relative transition-all hover:shadow-md hover:border-gray-300">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                      {/* Left: QR Code + Item Code + Name + Warehouse info */}
                      <div className="flex items-start sm:items-center gap-5">
                        <div 
                          onClick={() => setSelectedQrProduct(fg)}
                          className="p-2.5 bg-gray-50 rounded-2xl shadow-xs border border-gray-200 shrink-0 cursor-pointer hover:scale-105 transition-transform group/qr relative"
                          title="คลิกเพื่อดูและดาวน์โหลด QR Code สำหรับสินค้าหลักนี้"
                        >
                          <QRCode value={fg.itemCode} size={80} />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/qr:opacity-100 rounded-2xl flex items-center justify-center transition-opacity text-white text-[10px] font-bold text-center p-1 leading-tight backdrop-blur-2xs">
                            📱<br/>ขยาย QR
                          </div>
                          <div id={`qr-group-${fg.itemCode}`} className="hidden">
                            <QRCode value={fg.itemCode} size={150} />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-[#BE1111] font-mono font-bold text-xs tracking-wider border border-red-200/80">
                              <Crown className="w-3.5 h-3.5 text-[#BE1111]" />
                              <span>สินค้าหลัก (FG - Finished Goods)</span>
                            </span>
                            <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-800 font-mono font-bold text-xs border border-slate-200">
                              Item Code: {fg.itemCode}
                            </span>
                          </div>

                          <h3 className="text-2xl sm:text-3xl font-display font-black text-gray-900 tracking-tight leading-snug pt-0.5">
                            {fg.name}
                          </h3>

                          <div className="flex flex-wrap items-center gap-2.5 text-xs text-gray-600 font-medium pt-1">
                            <span className="flex items-center gap-1.5 bg-gray-50 text-gray-700 px-3 py-1 rounded-lg border border-gray-200 font-mono">
                              📍 คลังจัดเก็บ: <strong className="text-gray-900 font-sans font-bold">{fg.warehouse || 'WFG-JX'}</strong> {fg.location && `(${fg.location})`}
                            </span>
                            <span className="flex items-center gap-1.5 bg-gray-50 text-gray-700 px-3 py-1 rounded-lg border border-gray-200 font-mono">
                              📦 ส่วนประกอบในสูตร: <strong className="text-[#BE1111] font-sans font-bold">{components.length} รายการ</strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Stock คงเหลือ + Action Buttons */}
                      <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-4 border-t md:border-t-0 pt-4 md:pt-0 border-gray-100 shrink-0">
                        <div className="text-left md:text-right bg-red-50/60 px-5 py-3.5 rounded-2xl border border-red-100 shadow-2xs">
                          <div className="text-[11px] text-[#BE1111] font-bold uppercase tracking-wider font-mono">
                            <span>Stock คงเหลือปัจจุบัน</span>
                          </div>
                          <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-[#BE1111] mt-0.5 flex items-baseline gap-2">
                            {fg.quantity.toLocaleString()} <span className="text-xs font-bold font-sans text-gray-600">{fg.unit}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => downloadQRCodeAsPNG(fg.itemCode)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-all border border-gray-200 cursor-pointer active:scale-95 shadow-2xs"
                          >
                            <Download className="w-4 h-4 text-gray-600" />
                            <span>ดาวน์โหลด QR</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openBomModal(fg)}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#BE1111] text-white font-extrabold text-xs hover:bg-[#A00F0F] transition-all shadow-xs active:scale-95 cursor-pointer"
                          >
                            <FileText className="w-4 h-4" />
                            <span>ดูรายงานสูตร BOM</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setExpandedParents(prev => ({ ...prev, [fg.itemCode]: !isExpanded }))}
                            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-all border border-gray-200 cursor-pointer active:scale-95 shadow-2xs"
                            title={isExpanded ? "ซ่อนตารางส่วนประกอบ BOM ด้านล่าง" : "แสดงตารางส่วนประกอบ BOM ด้านล่าง"}
                          >
                            <span>{isExpanded ? 'ซ่อนรายการ BOM' : 'แสดงรายการ BOM'}</span>
                            {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-600" /> : <ChevronRight className="w-4 h-4 text-gray-600" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 📦 กล่องด้านล่าง: ตารางรายการส่วนประกอบ BOM แยกออกมาจากข้อมูลสินค้าหลักอย่างชัดเจน */}
                  {isExpanded && (
                    <div className="overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-sm transition-all">
                      <div className="bg-slate-50 p-4 sm:p-5 text-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200/90">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-gray-800 border border-gray-200 shadow-2xs">
                            <Layers className="w-5 h-5 text-gray-700" />
                          </div>
                          <div>
                            <h4 className="font-display font-black text-base sm:text-lg text-gray-900 flex items-center gap-2">
                              <span>ตารางรายการ BOM (ส่วนประกอบและบรรจุภัณฑ์) ของ {fg.itemCode}</span>
                            </h4>
                            <p className="text-xs text-gray-500">
                              รายการวัตถุดิบและบรรจุภัณฑ์ที่ต้องใช้ในการผลิตสินค้าหลัก {fg.name}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <span className="px-3.5 py-1.5 rounded-full bg-white text-gray-800 text-xs font-bold border border-gray-200 shadow-2xs font-mono">
                            รวม {components.length} ส่วนประกอบ
                          </span>
                        </div>
                      </div>

                      <div className="p-4 sm:p-6 bg-gray-50/60">
                        {components.length === 0 ? (
                          <div className="p-8 text-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                            <p className="text-sm font-semibold">ยังไม่มีรายการวัตถุดิบหรือส่วนประกอบที่ผูกกับสูตรรหัสหลักนี้</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {[
                              {
                                id: 'Bulk',
                                title: 'Bulk (กึ่งสำเร็จรูป / สารผสม)',
                                items: components.filter(c => c.itemType === 'Bulk'),
                                icon: Droplets,
                              },
                              {
                                id: 'Packaging',
                                title: 'Packaging (บรรจุภัณฑ์ / กล่อง / ป้าย)',
                                items: components.filter(c => c.itemType === 'Packaging'),
                                icon: Box,
                              },
                              {
                                id: 'Raw Material',
                                title: 'Raw Material (วัตถุดิบตั้งต้น / เคมีภัณฑ์ / อื่นๆ)',
                                items: components.filter(c => c.itemType !== 'Bulk' && c.itemType !== 'Packaging'),
                                icon: FlaskConical,
                              },
                            ].map(group => {
                              const subKey = `${fg.itemCode}-${group.id}`
                              const isSubExpanded = expandedBomSubgroups[subKey] ?? true
                              const GroupIcon = group.icon

                              return (
                                <div key={group.id} className="rounded-2xl border border-gray-200/90 bg-white overflow-hidden shadow-2xs transition-all">
                                  {/* Subgroup Header Button for Collapse / Expand */}
                                  <button
                                    type="button"
                                    onClick={() => setExpandedBomSubgroups(prev => ({ ...prev, [subKey]: !isSubExpanded }))}
                                    className="w-full px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 bg-slate-50/80 hover:bg-slate-100/80 transition-colors cursor-pointer text-left border-b border-gray-100 group/sub"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-gray-700 border border-gray-200/90 shadow-2xs group-hover/sub:border-gray-300 transition-all">
                                        <GroupIcon className="w-4 h-4 text-gray-700 group-hover/sub:scale-110 transition-transform" />
                                      </div>
                                      <div>
                                        <div className="font-display font-bold text-sm sm:text-base text-gray-900 flex items-center gap-2">
                                          <span>{group.title}</span>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                      <span className="px-3 py-1 rounded-full bg-white text-gray-700 text-xs font-extrabold font-mono border border-gray-200/90 shadow-2xs">
                                        {group.items.length} รายการ
                                      </span>
                                      <div className="p-1.5 rounded-lg bg-white border border-gray-200/90 text-gray-500 shadow-2xs group-hover/sub:bg-gray-100 transition-colors">
                                        {isSubExpanded ? <ChevronDown className="w-4 h-4 text-gray-600" /> : <ChevronRight className="w-4 h-4 text-gray-600" />}
                                      </div>
                                    </div>
                                  </button>

                                  {/* Subgroup Table Content */}
                                  {isSubExpanded && (
                                    group.items.length === 0 ? (
                                      <div className="p-6 text-center text-gray-400 text-xs font-semibold bg-white/50">
                                        ไม่มีรายการในหมวดหมู่นี้
                                      </div>
                                    ) : (
                                      <div className="overflow-x-auto">
                                        <table className="w-full border-collapse text-left text-xs">
                                          <thead className="bg-gray-50/80 text-gray-600 font-bold border-b border-gray-100 uppercase tracking-wider text-[11px]">
                                            <tr>
                                              <th className="px-4 py-3 font-semibold">Item Code</th>
                                              <th className="px-4 py-3 font-semibold">ประเภท</th>
                                              <th className="px-4 py-3 font-semibold">ชื่อรายการส่วนประกอบ / บรรจุภัณฑ์</th>
                                              <th className="px-4 py-3 font-semibold">คลัง / โซน</th>
                                              <th className="px-4 py-3 font-semibold text-right">คงเหลือ</th>
                                              <th className="px-4 py-3 font-semibold text-center">จัดการ</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-gray-100">
                                            {group.items.map(comp => (
                                              <tr key={comp.id} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="px-4 py-3 font-mono font-bold text-gray-900">
                                                  <div className="flex items-center gap-2">
                                                    <button
                                                      type="button"
                                                      onClick={() => setSelectedQrProduct(comp)}
                                                      className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-red-50 border border-gray-200/80 hover:border-red-200 text-gray-800 hover:text-[#BE1111] transition-all shadow-2xs cursor-pointer shrink-0"
                                                      title={`คลิกเพื่อดูและดาวน์โหลด QR Code สำหรับ ${comp.itemCode}`}
                                                    >
                                                      <QrCode className="w-3.5 h-3.5 text-[#BE1111] group-hover:scale-110 transition-transform" />
                                                      <span>{comp.itemCode}</span>
                                                    </button>
                                                    <div id={`qr-${comp.itemCode}`} className="hidden">
                                                      <QRCode value={comp.itemCode} size={64} />
                                                    </div>
                                                  </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                  <span className="px-2.5 py-1 rounded-md text-[11px] font-bold border font-mono bg-slate-100 text-slate-700 border-slate-200/80">
                                                    {comp.itemType || 'Raw Material'}
                                                  </span>
                                                </td>
                                                <td className="px-4 py-3 font-medium text-gray-800">{comp.name}</td>
                                                <td className="px-4 py-3 text-gray-600">
                                                  <span className="font-semibold text-gray-800">{comp.warehouse}</span>
                                                  {comp.location && <span className="text-gray-400 ml-1">({comp.location})</span>}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                  {(() => {
                                                    const currentVal = editQuantities[comp.id] !== undefined ? editQuantities[comp.id] : String(comp.quantity)
                                                    const isChanged = currentVal !== String(comp.quantity)
                                                    return (
                                                      <div className="flex items-center justify-end gap-1.5">
                                                        <input
                                                          type="text"
                                                          inputMode="numeric"
                                                          value={currentVal}
                                                          onChange={(e) => {
                                                            const val = e.target.value.replace(/[^0-9]/g, '')
                                                            setEditQuantities(prev => ({ ...prev, [comp.id]: val }))
                                                          }}
                                                          className={`w-24 text-right rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-all shadow-2xs focus:outline-none focus:ring-1 ${
                                                            isChanged 
                                                              ? 'border-[#BE1111] bg-red-50 text-[#BE1111]' 
                                                              : 'border-gray-200 bg-gray-50 text-gray-800 focus:bg-white focus:border-[#BE1111]'
                                                          }`}
                                                        />
                                                        <span className="text-gray-500 w-10 text-left font-medium">{comp.unit}</span>
                                                        {isChanged && (
                                                          <button
                                                            onClick={() => {
                                                              const parsed = Number(currentVal)
                                                              if (!isNaN(parsed) && parsed >= 0) {
                                                                setConfirmTarget({ product: comp, newQty: parsed })
                                                              }
                                                            }}
                                                            className="p-1.5 rounded-lg bg-[#BE1111] text-white hover:bg-[#A00F0F] transition-all shadow-2xs animate-pulse cursor-pointer"
                                                            title="บันทึกจำนวนสต็อก"
                                                          >
                                                            <Check className="w-3.5 h-3.5" />
                                                          </button>
                                                        )}
                                                      </div>
                                                    )
                                                  })()}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                  <button
                                                    type="button"
                                                    onClick={() => setDeleteTarget(comp)}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-all cursor-pointer"
                                                    title="ลบรายการสินค้า"
                                                  >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                  </button>
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

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
              <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm mt-8">
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
                  <span className="px-3.5 py-1.5 rounded-full bg-white text-gray-800 text-xs font-bold border border-gray-200 shadow-2xs font-mono">
                    {unassignedProducts.length} รายการ
                  </span>
                </div>

                <div className="overflow-x-auto p-4">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Item Code</th>
                        <th className="px-4 py-3 font-semibold">ประเภท</th>
                        <th className="px-4 py-3 font-semibold">ชื่อรายการสินค้า</th>
                        <th className="px-4 py-3 font-semibold">คลัง / โซน</th>
                        <th className="px-4 py-3 font-semibold text-right">คงเหลือ</th>
                        <th className="px-4 py-3 font-semibold text-center">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {unassignedProducts.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-gray-900">
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
                            <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200/80 font-mono">
                              {item.itemType || 'General'}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-800">{item.name}</td>
                          <td className="px-4 py-3 text-gray-600">{item.warehouse} ({item.location || '-'})</td>
                          <td className="px-4 py-3 text-right font-bold text-gray-900">
                            {item.quantity.toLocaleString()} <span className="font-normal text-gray-500 text-[11px]">{item.unit}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(item)}
                              className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
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
          <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-md animate-in fade-in duration-300">
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
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-gray-800 border border-gray-200 shadow-2xs font-mono">
                <span>จำนวนทั้งสิ้น: <strong className="text-[#BE1111]">{(() => {
                  const filtered = displayedProducts.filter(p => activeTab === 'ALL' || p.itemType === activeTab)
                  return filtered.length
                })()}</strong> รายการ</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-gray-50/80 text-gray-600 font-bold border-b border-gray-200/80 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5">Item Code</th>
                    <th className="px-4 py-3.5">ประเภท</th>
                    <th className="px-4 py-3.5">ชื่อสินค้า</th>
                    <th className="px-4 py-3.5">คลังสินค้า / ตำแหน่ง</th>
                    <th className="px-4 py-3.5 text-right">จำนวนคงเหลือ</th>
                    <th className="px-4 py-3.5 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(() => {
                    const filteredFlat = displayedProducts.filter(p => activeTab === 'ALL' || p.itemType === activeTab)
                    if (filteredFlat.length === 0) {
                      return (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-gray-500 font-medium">
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
                          <td className="px-4 py-3.5 font-mono font-bold text-gray-900">
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
                            <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold border font-mono ${
                              item.itemType === 'FG' 
                                ? 'bg-red-50 text-[#BE1111] border-red-200 font-black' 
                                : 'bg-slate-100 text-slate-700 border-slate-200/80'
                            }`}>
                              {item.itemType || 'General'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 font-medium text-gray-800">{item.name}</td>
                          <td className="px-4 py-3.5 text-gray-600">{item.warehouse} ({item.location || '-'})</td>
                          <td className="px-4 py-3.5 text-right">
                            <div className="inline-flex items-center justify-end gap-1.5">
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
                            </div>
                          </td>
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

      {confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-gray-100 overflow-hidden">
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
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-gray-100 overflow-hidden">
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
              คุณต้องการลบสินค้า <span className="font-semibold text-gray-900">{deleteTarget.name}</span> (รหัส: <span className="font-mono font-bold text-gray-800">{deleteTarget.itemCode}</span>) ออกจากระบบใช่หรือไม่?
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
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 md:p-8 shadow-2xl border border-gray-100 overflow-hidden max-h-[85vh] overflow-y-auto mb-16 sm:mb-0">
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
          </div>
        </div>
      )}

      {/* BOM Recipe Modal */}
      {selectedBomProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl border border-gray-100 max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-start justify-between pb-4 border-b border-gray-100 mb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-[#BE1111] border border-red-100 mb-1">
                  👑 SAP Bill of Materials (BOM) Recipe
                </div>
                <h3 className="text-xl font-bold text-gray-900">{selectedBomProduct.name}</h3>
                <p className="text-xs font-mono text-gray-500 mt-0.5">รหัสสินค้าหลัก: {selectedBomProduct.itemCode}</p>
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
                        <th className="px-4 py-3 text-center w-16">Depth</th>
                        <th className="px-4 py-3">รหัสส่วนประกอบ</th>
                        <th className="px-4 py-3">ชื่อรายการ / วัตถุดิบ</th>
                        <th className="px-4 py-3 text-right">ปริมาณใช้</th>
                        <th className="px-4 py-3">หน่วย</th>
                        <th className="px-4 py-3">คลัง</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {bomList.filter(comp => comp.componentItemCode !== comp.parentItemCode).map((comp) => (
                        <tr key={comp.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-4 py-2.5 text-center font-mono font-bold text-gray-500">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                              comp.depth === 1 ? 'bg-red-100 text-red-700' :
                              comp.depth === 2 ? 'bg-amber-100 text-amber-800' :
                              'bg-purple-100 text-purple-700'
                            }`}>
                              {comp.depth}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 font-mono font-semibold text-gray-900">
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
                              className="group inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-gray-100 hover:bg-red-50 border border-gray-200 hover:border-red-200 text-gray-800 hover:text-[#BE1111] transition-all shadow-2xs cursor-pointer"
                              title="คลิกเพื่อดูและดาวน์โหลด QR Code"
                            >
                              <QrCode className="w-3.5 h-3.5 text-[#BE1111]" />
                              <span>{comp.componentItemCode}</span>
                            </button>
                          </td>
                          <td className="px-4 py-2.5 text-gray-800 font-medium">{comp.description}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-[#BE1111]">{comp.quantity}</td>
                          <td className="px-4 py-2.5 text-gray-600">{comp.uom}</td>
                          <td className="px-4 py-2.5 text-gray-600 font-mono">{comp.warehouse}</td>
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
          </div>
        </div>
      )}

      {/* QR Code Quick View & Download Modal for Individual Item Code */}
      {selectedQrProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedQrProduct(null)}
        >
          <div
            className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl border border-gray-100 p-6 text-center animate-in zoom-in-95 duration-200"
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
                <span className="font-mono text-base font-black text-gray-900 tracking-wide">
                  {selectedQrProduct.itemCode}
                </span>
              </div>
              <h3 className="text-lg font-bold text-gray-800 leading-snug">
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
                className="flex-1 rounded-xl bg-[#BE1111] hover:bg-[#A00F0F] py-3 text-sm font-bold text-white shadow-md shadow-[#BE1111]/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>ดาวน์โหลดรูปภาพ PNG</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedQrProduct(null)}
                className="rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 px-5 py-3 text-sm font-bold text-gray-700 transition-all cursor-pointer"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  )
}
