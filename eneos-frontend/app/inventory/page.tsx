'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { fetchProducts, updateProductQuantity, createProduct, deleteProduct, fetchProductBom, Product, BillOfMaterial } from '@/lib/auth'
import QRCode from 'react-qr-code'
import { Search, Package, ArrowLeft, Layers, Download, Check, History, Plus, X, Trash2, FileText, FolderTree, ChevronDown, ChevronRight, LayoutGrid, Crown, Droplets, Box, FlaskConical } from 'lucide-react'

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const [activeTab, setActiveTab] = useState('ALL')
  const [selectedParentCode, setSelectedParentCode] = useState<string | null>(null)
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({})
  const [selectedBomProduct, setSelectedBomProduct] = useState<Product | null>(null)
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
      let container = document.getElementById(`qr-group-${itemCode}`) || document.getElementById(`qr-${itemCode}`)
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
  }, [activeTab])

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

  const displayedProducts = products.filter(product => {
    if (!selectedParentCode) return true
    if (product.itemCode === selectedParentCode && product.itemType === 'FG') return true
    return product.parentItemCodes?.includes(selectedParentCode)
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

        {/* Modern Vector Icon Filter Tabs & View Mode Switcher */}
        <div className="mb-6 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 bg-white/95 backdrop-blur-md p-3 rounded-2xl border border-gray-200/80 shadow-xs transition-all">
          <div className="flex flex-wrap items-center gap-2">
            {[
              {
                id: 'ALL',
                label: 'ทั้งหมด',
                count: products.length,
                icon: LayoutGrid,
                activeBg: 'from-slate-900 via-slate-800 to-slate-900 border-slate-700/80 shadow-slate-900/20 text-white ring-1 ring-slate-900/20',
                iconContainerActive: 'bg-white/15 text-white shadow-inner',
                iconContainerInactive: 'bg-slate-100 text-slate-600 group-hover:bg-slate-200 group-hover:text-slate-900',
                badgeActive: 'bg-white text-slate-900 shadow-2xs font-black',
                badgeInactive: 'bg-slate-100 text-slate-600 group-hover:bg-slate-200 group-hover:text-slate-900 font-extrabold'
              },
              {
                id: 'FG',
                label: 'FG (สินค้าหลัก)',
                count: products.filter(p => p.itemType === 'FG').length,
                icon: Crown,
                activeBg: 'from-slate-900 via-slate-800 to-slate-900 border-slate-700/80 shadow-slate-900/20 text-white ring-1 ring-slate-900/20',
                iconContainerActive: 'bg-white/15 text-amber-300 shadow-inner',
                iconContainerInactive: 'bg-slate-100 text-slate-600 group-hover:bg-slate-200 group-hover:text-slate-900',
                badgeActive: 'bg-white text-slate-900 shadow-2xs font-black',
                badgeInactive: 'bg-slate-100 text-slate-600 group-hover:bg-slate-200 group-hover:text-slate-900 font-extrabold'
              },
              {
                id: 'Bulk',
                label: 'Bulk (กึ่งสำเร็จรูป)',
                count: products.filter(p => p.itemType === 'Bulk').length,
                icon: Droplets,
                activeBg: 'from-slate-900 via-slate-800 to-slate-900 border-slate-700/80 shadow-slate-900/20 text-white ring-1 ring-slate-900/20',
                iconContainerActive: 'bg-white/15 text-white shadow-inner',
                iconContainerInactive: 'bg-slate-100 text-slate-600 group-hover:bg-slate-200 group-hover:text-slate-900',
                badgeActive: 'bg-white text-slate-900 shadow-2xs font-black',
                badgeInactive: 'bg-slate-100 text-slate-600 group-hover:bg-slate-200 group-hover:text-slate-900 font-extrabold'
              },
              {
                id: 'Packaging',
                label: 'Packaging (บรรจุภัณฑ์)',
                count: products.filter(p => p.itemType === 'Packaging').length,
                icon: Box,
                activeBg: 'from-slate-900 via-slate-800 to-slate-900 border-slate-700/80 shadow-slate-900/20 text-white ring-1 ring-slate-900/20',
                iconContainerActive: 'bg-white/15 text-white shadow-inner',
                iconContainerInactive: 'bg-slate-100 text-slate-600 group-hover:bg-slate-200 group-hover:text-slate-900',
                badgeActive: 'bg-white text-slate-900 shadow-2xs font-black',
                badgeInactive: 'bg-slate-100 text-slate-600 group-hover:bg-slate-200 group-hover:text-slate-900 font-extrabold'
              },
              {
                id: 'Raw Material',
                label: 'Raw Material (วัตถุดิบ)',
                count: products.filter(p => p.itemType === 'Raw Material').length,
                icon: FlaskConical,
                activeBg: 'from-slate-900 via-slate-800 to-slate-900 border-slate-700/80 shadow-slate-900/20 text-white ring-1 ring-slate-900/20',
                iconContainerActive: 'bg-white/15 text-white shadow-inner',
                iconContainerInactive: 'bg-slate-100 text-slate-600 group-hover:bg-slate-200 group-hover:text-slate-900',
                badgeActive: 'bg-white text-slate-900 shadow-2xs font-black',
                badgeInactive: 'bg-slate-100 text-slate-600 group-hover:bg-slate-200 group-hover:text-slate-900 font-extrabold'
              },
            ].map((tab) => {
              const IconComp = tab.icon
              const isActive = activeTab === tab.id

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id)
                    setSelectedParentCode(null)
                  }}
                  className={`group relative inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 border cursor-pointer select-none ${
                    isActive
                      ? `bg-gradient-to-r ${tab.activeBg} shadow-md scale-[1.01]`
                      : 'bg-white text-slate-700 border-gray-200/90 hover:border-slate-300 hover:bg-slate-50/80 shadow-2xs'
                  }`}
                >
                  <div className={`flex items-center justify-center p-1.5 rounded-lg transition-all duration-200 ${
                    isActive ? tab.iconContainerActive : tab.iconContainerInactive
                  }`}>
                    <IconComp className="w-4 h-4 shrink-0" />
                  </div>

                  <span className="tracking-tight">{tab.label}</span>

                  <span className={`px-2 py-0.5 rounded-full text-[11px] transition-all duration-200 ${
                    isActive ? tab.badgeActive : tab.badgeInactive
                  }`}>
                    {tab.count}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100/90 text-slate-700 border border-slate-200/90 font-extrabold text-xs shrink-0 shadow-2xs">
            <FolderTree className="w-4 h-4 text-slate-500 shrink-0" />
            <span>มุมมอง: จัดกลุ่มตามรหัสหลัก (Item 1 / Formula Group)</span>
          </div>
        </div>

        {/* Quick Filter Banner if parent selected */}
        {selectedParentCode && (
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-red-50 via-orange-50 to-amber-50 p-4 border border-red-200/80 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#BE1111] text-white shadow-md shadow-[#BE1111]/20">
                <Search className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-red-800 flex items-center gap-1.5">
                  <span>✨ กรองข้อมูลตามรหัสหลัก (Item 1 Quick Filter)</span>
                </div>
                <div className="text-sm font-semibold text-gray-900 mt-0.5">
                  แสดงรายการและส่วนประกอบที่เชื่อมโยงกับรหัสหลัก: <span className="font-bold text-[#BE1111] underline decoration-[#BE1111]/40 decoration-2 underline-offset-4">{selectedParentCode}</span> ({displayedProducts.length} รายการ)
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedParentCode(null)}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white hover:bg-red-50 px-4 py-2.5 text-xs font-bold text-gray-700 hover:text-[#BE1111] border border-gray-200/80 hover:border-red-200 shadow-2xs transition-all active:scale-95 shrink-0"
            >
              <X className="h-4 w-4" />
              <span>ล้างตัวกรอง (ดูทั้งหมด)</span>
            </button>
          </div>
        )}

        {/* View Mode Content: Grouped View (`จัดกลุ่มตามรหัสหลัก / Parent Formula Cards`) */}
        <div className="space-y-6">
          {/* Dedicated Category Summary Table & Dashboard when tab is Bulk, Packaging, or Raw Material */}
          {activeTab !== 'ALL' && activeTab !== 'FG' && (() => {
            const categoryItems = products.filter(p => p.itemType === activeTab)
            const CategoryIcon = activeTab === 'Bulk' ? Droplets : activeTab === 'Packaging' ? Box : FlaskConical
            const categoryTitle = activeTab === 'Bulk' ? 'Bulk (กึ่งสำเร็จรูป / สารผสม)' : activeTab === 'Packaging' ? 'Packaging (บรรจุภัณฑ์ / วัสดุห่อหุ้ม)' : 'Raw Material (วัตถุดิบตั้งต้น / เคมีภัณฑ์)'

            return (
              <div className="mb-8 overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-md animate-in fade-in duration-300">
                <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-5 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-700/60">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white border border-white/20 shadow-inner">
                      <CategoryIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-display font-black text-lg tracking-wide flex items-center gap-2 text-white">
                        <span>รายการ {categoryTitle} ทั้งหมด</span>
                      </h3>
                      <p className="text-xs text-slate-300 mt-0.5">
                        สรุปรายการสินค้าในหมวดหมู่ {activeTab} พร้อมระบุรหัสหลัก Item 1 (สูตรสินค้าสำเร็จรูป) ที่ใช้งานชิ้นส่วนนี้อยู่
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <span className="px-3.5 py-1.5 rounded-full bg-[#BE1111] text-xs font-extrabold text-white shadow-sm border border-red-400/40">
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
                              <td className="px-4 py-3.5 font-mono font-bold text-gray-900">{item.itemCode}</td>
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

          {/* 1. Group Cards for each Parent FG (Item 1) */}
          {products
            .filter(p => p.itemType === 'FG' && (!selectedParentCode || p.itemCode === selectedParentCode))
            .map(fg => {
              const components = products.filter(p => p.parentItemCodes?.includes(fg.itemCode) && (activeTab === 'ALL' || activeTab === 'FG' ? true : p.itemType === activeTab))
              if (activeTab !== 'ALL' && activeTab !== 'FG' && components.length === 0) return null
              const isExpanded = expandedParents[fg.itemCode] ?? true
              return (
                <div key={fg.id} className="overflow-hidden rounded-2xl border-2 border-red-200/80 bg-white shadow-md transition-all">
                  {/* Parent Formula Card Header Bar */}
                  <div className="bg-gradient-to-r from-[#8E0B0B] via-[#BE1111] to-[#D62828] p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start sm:items-center gap-4">
                      <div id={`qr-group-${fg.itemCode}`} className="p-1.5 bg-white rounded-xl shadow-sm border border-white/40 shrink-0">
                        <QRCode value={fg.itemCode} size={56} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/20 text-white font-mono font-bold text-xs tracking-wider border border-white/30 backdrop-blur-xs">
                            <Crown className="w-3.5 h-3.5 text-amber-300" />
                            <span>รหัสหลัก (FG Item 1)</span>
                          </span>
                          <span className="text-red-100 text-xs font-medium font-mono">
                            {fg.itemCode}
                          </span>
                        </div>
                        <h3 className="text-xl font-display font-black text-white tracking-tight leading-snug drop-shadow-2xs">
                          {fg.name}
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-white/10">
                      <div className="text-left sm:text-right">
                        <div className="text-xs text-red-100 font-medium">สต็อกสินค้าหลัก</div>
                        <div className="text-2xl font-black font-mono tracking-tight text-white drop-shadow-2xs">
                          {fg.quantity.toLocaleString()} <span className="text-xs font-normal font-sans text-red-100">{fg.unit}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => downloadQRCodeAsPNG(fg.itemCode)}
                          className="p-2 rounded-xl bg-white/15 hover:bg-white text-white hover:text-[#BE1111] transition-all shadow-sm backdrop-blur-xs cursor-pointer"
                          title="ดาวน์โหลด QR Code รหัสหลัก"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openBomModal(fg)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-[#BE1111] font-bold text-xs hover:bg-red-50 hover:shadow-md transition-all shadow-sm active:scale-95 cursor-pointer"
                        >
                          <FileText className="w-4 h-4" />
                          <span>ดูสูตร BOM</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setExpandedParents(prev => ({ ...prev, [fg.itemCode]: !isExpanded }))}
                          className="p-2 rounded-xl bg-white/15 hover:bg-white/30 text-white transition-all backdrop-blur-xs cursor-pointer"
                          title={isExpanded ? "ย่อรายการส่วนประกอบ" : "ขยายรายการส่วนประกอบ"}
                        >
                          {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Components List Inside Parent Formula */}
                  {isExpanded && (
                    <div className="p-4 bg-gray-50/50">
                      <div className="flex items-center justify-between mb-3 px-2">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-[#BE1111]" />
                          <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                            รายการส่วนประกอบและบรรจุภัณฑ์ที่ผูกในสูตรนี้ ({components.length} รายการ)
                          </span>
                        </div>
                      </div>

                      {components.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                          <p className="text-sm">ยังไม่มีรายการวัตถุดิบหรือส่วนประกอบที่ผูกกับสูตรรหัสหลักนี้</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-gray-200/80 bg-white shadow-2xs">
                          <table className="w-full border-collapse text-left text-xs">
                            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-gray-200 uppercase">
                              <tr>
                                <th className="px-4 py-3 font-semibold">Item Code</th>
                                <th className="px-4 py-3 font-semibold">ประเภท</th>
                                <th className="px-4 py-3 font-semibold">ชื่อรายการสินค้า / ส่วนประกอบ</th>
                                <th className="px-4 py-3 font-semibold">คลัง / โซน</th>
                                <th className="px-4 py-3 font-semibold text-right">คงเหลือ</th>
                                <th className="px-4 py-3 font-semibold text-center">จัดการ</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {components.map(comp => (
                                <tr key={comp.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-4 py-3 font-mono font-bold text-gray-900">{comp.itemCode}</td>
                                  <td className="px-4 py-3">
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                      comp.itemType === 'Bulk' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                                      comp.itemType === 'Packaging' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                      'bg-purple-50 text-purple-700 border-purple-200'
                                    }`}>
                                      {comp.itemType || 'Raw Material'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 font-medium text-gray-800">{comp.name}</td>
                                  <td className="px-4 py-3 text-gray-600">
                                    <span className="font-semibold">{comp.warehouse}</span>
                                    {comp.location && <span className="text-gray-400 ml-1">({comp.location})</span>}
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    {(() => {
                                      const currentVal = editQuantities[comp.id] !== undefined ? editQuantities[comp.id] : String(comp.quantity)
                                      const isChanged = currentVal !== String(comp.quantity)
                                      return (
                                        <div className="flex items-center justify-end gap-1">
                                          <input
                                            type="text"
                                            inputMode="numeric"
                                            value={currentVal}
                                            onChange={(e) => {
                                              const val = e.target.value.replace(/[^0-9]/g, '')
                                              setEditQuantities(prev => ({ ...prev, [comp.id]: val }))
                                            }}
                                            className={`w-20 text-right rounded-lg border px-2 py-1 text-xs font-bold transition-all shadow-2xs focus:outline-none focus:ring-1 ${
                                              isChanged 
                                                ? 'border-[#BE1111] bg-red-50 text-[#BE1111]' 
                                                : 'border-gray-200 bg-gray-50 text-gray-800 focus:bg-white focus:border-[#BE1111]'
                                            }`}
                                          />
                                          <span className="text-gray-500 w-8 text-left">{comp.unit}</span>
                                          {isChanged && (
                                            <button
                                              onClick={() => {
                                                const parsed = Number(currentVal)
                                                if (!isNaN(parsed) && parsed >= 0) {
                                                  setConfirmTarget({ product: comp, newQty: parsed })
                                                }
                                              }}
                                              className="p-1 rounded-lg bg-[#BE1111] text-white hover:bg-[#A00F0F] transition-all shadow-2xs animate-pulse"
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
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
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
              if (assignedOrParentCodes.has(p.itemCode)) return false
              if (activeTab === 'ALL') return p.itemType !== 'FG'
              if (activeTab === 'FG') return false
              return p.itemType === activeTab
            })

            if (unassignedProducts.length === 0 || selectedParentCode) return null

            return (
              <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm mt-8">
                <div className="bg-slate-800 p-4 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Package className="w-5 h-5 text-amber-400" />
                    <div>
                      <h4 className="font-bold text-sm">รายการสินค้าทั่วไป / รายการที่ยังไม่ได้ผูกรหัสหลัก (Unassigned Items)</h4>
                      <p className="text-xs text-slate-300">สินค้าและบรรจุภัณฑ์ที่ไม่มีสถานะเป็นสูตรหลัก และยังไม่ได้ผูกกับสูตร BOM ใดๆ</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-slate-700 text-xs font-bold text-slate-200">
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
                          <td className="px-4 py-3 font-mono font-bold text-gray-900">{item.itemCode}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-200">
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
                      {bomList.map((comp) => (
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
                          <td className="px-4 py-2.5 font-mono font-semibold text-gray-900">{comp.componentItemCode}</td>
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

    </main>
  )
}
