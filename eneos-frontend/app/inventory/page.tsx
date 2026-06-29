'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { fetchProducts, createProduct, deleteProduct, Product } from '@/lib/auth'
import QRCode from 'react-qr-code'
import { Search, Plus, Trash2, Package, ArrowLeft, Layers, Download } from 'lucide-react'

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const [showAddModal, setShowAddModal] = useState(false)
  const [newItem, setNewItem] = useState<{
    itemCode: string
    description: string
    unit: string
    warehouse: string
    location: string
    quantity: number | string
  }>({
    itemCode: '',
    description: '',
    unit: 'PCS',
    warehouse: 'WPK',
    location: '',
    quantity: ''
  })
  const [adding, setAdding] = useState(false)

  const handleDelete = async (id: number, itemCode: string) => {
    if (!window.confirm(`คุณต้องการลบรายการสินค้า "${itemCode}" ใช่หรือไม่?`)) return
    
    try {
      await deleteProduct(id)
      setProducts(products.filter(p => p.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ลบรายการสินค้าไม่สำเร็จ')
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


  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdding(true)
    setError('')
    try {
      await createProduct({
        ...newItem,
        quantity: Number(newItem.quantity) || 0
      })
      setShowAddModal(false)
      setNewItem({ itemCode: '', description: '', unit: 'PCS', warehouse: 'WPK', location: '', quantity: '' })
      loadProducts(search)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เพิ่มรายการสินค้าไม่สำเร็จ')
    } finally {
      setAdding(false)
    }
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

          <div className="flex flex-col sm:flex-row gap-3">
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
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#BE1111] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#A00F0F] shadow-sm hover:shadow transition-all shrink-0"
            >
              <Plus className="w-4 h-4" />
              เพิ่มรายการสินค้า
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800 shadow-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-600 hover:text-red-900 font-bold ml-4">✕</button>
          </div>
        )}

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
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-red-50 text-[#BE1111] border border-red-100/80">
                          {product.quantity.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleDelete(product.id, product.itemCode)}
                          className="inline-flex items-center gap-1 rounded-xl bg-red-50 px-3 py-1.5 text-xs font-semibold text-[#BE1111] hover:bg-[#BE1111] hover:text-white transition-all shadow-sm"
                          title="ลบรายการสินค้า"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          ลบ
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

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 md:p-8 shadow-2xl border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-red-50 text-[#BE1111] rounded-xl flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-display font-bold text-gray-900">เพิ่มรายการสินค้าใหม่</h2>
                <p className="text-xs text-gray-500">กรอกรายละเอียดเพื่อเพิ่มสินค้าลงในสต็อก</p>
              </div>
            </div>

            <form onSubmit={handleAddItem} className="flex flex-col gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">Item Code <span className="text-[#BE1111]">*</span></label>
                <input
                  type="text"
                  required
                  value={newItem.itemCode}
                  onChange={(e) => setNewItem({ ...newItem, itemCode: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#BE1111]/20 focus:border-[#BE1111] transition-all"
                  placeholder="เช่น 7290103900"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">ชื่อสินค้า (Description) <span className="text-[#BE1111]">*</span></label>
                <input
                  type="text"
                  required
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#BE1111]/20 focus:border-[#BE1111] transition-all"
                  placeholder="ชื่อของสินค้า"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-700">หน่วย <span className="text-[#BE1111]">*</span></label>
                  <input
                    type="text"
                    required
                    value={newItem.unit}
                    onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#BE1111]/20 focus:border-[#BE1111] transition-all"
                    placeholder="PCS"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-700">คลัง <span className="text-[#BE1111]">*</span></label>
                  <input
                    type="text"
                    required
                    value={newItem.warehouse}
                    onChange={(e) => setNewItem({ ...newItem, warehouse: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#BE1111]/20 focus:border-[#BE1111] transition-all"
                    placeholder="WPK"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-700">Location (ไม่บังคับ)</label>
                  <input
                    type="text"
                    value={newItem.location}
                    onChange={(e) => setNewItem({ ...newItem, location: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#BE1111]/20 focus:border-[#BE1111] transition-all"
                    placeholder="ระบุ Location"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-700">จำนวนเริ่มต้น <span className="text-[#BE1111]">*</span></label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#BE1111]/20 focus:border-[#BE1111] transition-all"
                    placeholder="เช่น 100"
                  />
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={adding}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-[#BE1111] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#A00F0F] disabled:opacity-50 transition-all shadow-sm"
                  disabled={adding}
                >
                  {adding ? 'กำลังบันทึก...' : 'บันทึกสินค้า'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
