'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { fetchProducts, updateProductQuantity, createProduct, deleteProduct, Product } from '@/lib/auth'
import QRCode from 'react-qr-code'
import { Search, Package, ArrowLeft, Layers, Download, Check, History, Plus, X, Trash2 } from 'lucide-react'

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

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
    const container = document.getElementById(`qr-${itemCode}`)
    if (!container) return
    const svg = container.querySelector('svg')
    if (!svg) return

    const clonedSvg = svg.cloneNode(true) as SVGSVGElement
    clonedSvg.setAttribute('width', '500')
    clonedSvg.setAttribute('height', '500')
    if (!clonedSvg.getAttribute('xmlns')) {
      clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    }

    const svgData = new XMLSerializer().serializeToString(clonedSvg)
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const DOMURL = window.URL || window.webkitURL || window
    const url = DOMURL.createObjectURL(svgBlob)

    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const size = 600
      const qrSize = 500
      const offset = (size - qrSize) / 2
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, size, size)
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(img, offset, offset, qrSize, qrSize)
        const pngUrl = canvas.toDataURL('image/png')
        const downloadLink = document.createElement('a')
        downloadLink.href = pngUrl
        downloadLink.download = `QR-${itemCode}.png`
        document.body.appendChild(downloadLink)
        downloadLink.click()
        document.body.removeChild(downloadLink)
      }
      DOMURL.revokeObjectURL(url)
    }
    img.src = url
  }




  const loadProducts = async (query = search) => {
    setError('')
    setLoading(true)
    try {
      setProducts(await fetchProducts(query))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'โหลดข้อมูลสต็อกไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true

    async function loadInitialProducts() {
      try {
        const initialProducts = await fetchProducts('')
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

        {/* Table Header & Minimalist Add Button */}
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-sm font-medium text-gray-500">
            รายการสินค้าทั้งหมด ({products.length})
          </div>
          <button
            type="button"
            onClick={() => {
              setAddingError('')
              setShowAddModal(true)
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1d1d1f] hover:bg-[#333336] text-white px-4 py-2.5 text-sm font-semibold transition-all shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มรายการสินค้า</span>
          </button>
        </div>

        {/* Table Card */}
        <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-gray-50/80 text-gray-600 font-medium border-b border-gray-200/80">
                <tr>
                  <th className="px-6 py-4 font-semibold">Item Code</th>
                  <th className="px-6 py-4 font-semibold">QR Code</th>
                  <th className="px-6 py-4 font-semibold">สินค้า</th>
                  <th className="px-6 py-4 font-semibold">หน่วย</th>
                  <th className="px-6 py-4 font-semibold">คลัง</th>
                  <th className="px-6 py-4 font-semibold">Location</th>
                  <th className="px-6 py-4 font-semibold text-right">คงเหลือ</th>
                  <th className="px-6 py-4 font-semibold text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td className="px-6 py-12 text-center text-gray-500" colSpan={8}>
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-6 h-6 border-2 border-[#BE1111] border-t-transparent rounded-full animate-spin"></div>
                        <span>กำลังโหลดข้อมูล...</span>
                      </div>
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td className="px-6 py-12 text-center text-gray-500" colSpan={8}>
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                          <Package className="w-6 h-6" />
                        </div>
                        <p className="font-medium text-gray-600">ไม่พบรายการสินค้า</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-900">{product.itemCode}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div id={`qr-${product.itemCode}`} className="bg-white p-1.5 inline-block border border-gray-200 rounded-xl shadow-sm">
                            <QRCode value={product.itemCode} size={56} />
                          </div>
                          <button
                            onClick={() => downloadQRCodeAsPNG(product.itemCode)}
                            className="p-2 rounded-xl bg-gray-100 hover:bg-[#BE1111] text-gray-600 hover:text-white transition-all shadow-sm group"
                            title="ดาวน์โหลด QR Code เป็นไฟล์ PNG"
                          >
                            <Download className="w-4 h-4 group-hover:scale-110 transition-transform" />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-800">{product.name}</td>
                      <td className="px-6 py-4 text-gray-600">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                          {product.unit}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{product.warehouse}</td>
                      <td className="px-6 py-4 text-gray-600">{product.location || '-'}</td>
                      <td className="px-6 py-4 text-right">
                        {(() => {
                          const currentVal = editQuantities[product.id] !== undefined ? editQuantities[product.id] : String(product.quantity)
                          const isChanged = currentVal !== String(product.quantity)
                          return (
                            <div className="flex items-center justify-end gap-1.5">
                              <input
                                type="text"
                                inputMode="numeric"
                                value={currentVal}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/[^0-9]/g, '')
                                  setEditQuantities(prev => ({ ...prev, [product.id]: val }))
                                }}
                                className={`w-24 text-right rounded-xl border px-3 py-1.5 text-sm font-bold transition-all shadow-sm focus:outline-none focus:ring-2 ${
                                  isChanged 
                                    ? 'border-[#BE1111] bg-red-50 text-[#BE1111] focus:ring-[#BE1111]/30 focus:bg-white' 
                                    : 'border-gray-200 bg-gray-50/50 text-gray-800 hover:border-gray-300 focus:border-[#BE1111] focus:bg-white focus:text-[#BE1111]'
                                }`}
                                title="แก้ไขตัวเลขคงเหลือ"
                              />
                              {isChanged && (
                                <button
                                  onClick={() => {
                                    const parsed = Number(currentVal)
                                    if (!isNaN(parsed) && parsed >= 0) {
                                      setConfirmTarget({ product, newQty: parsed })
                                    }
                                  }}
                                  className="p-1.5 rounded-xl bg-[#BE1111] text-white hover:bg-[#A00F0F] transition-all shadow-sm animate-pulse flex items-center justify-center shrink-0"
                                  title="บันทึกจำนวนคงเหลือ"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          )
                        })()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(product)}
                          className="inline-flex items-center justify-center p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all shadow-2xs active:scale-95 cursor-pointer"
                          title="ลบรายการสินค้า"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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

    </main>
  )
}
