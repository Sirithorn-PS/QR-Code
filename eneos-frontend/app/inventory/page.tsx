'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { fetchProducts, createProduct, deleteProduct, Product } from '@/lib/auth'
import QRCode from 'react-qr-code'

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
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
              กลับหน้าหลัก
            </Link>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">สต็อกสินค้า</h1>
          </div>
          <div className="flex gap-2">
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault()
                loadProducts(search)
              }}
            >
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-64 rounded-lg border border-slate-300 px-4 py-2 text-slate-900"
                placeholder="ค้นหา item code / ชื่อ / location"
              />
              <button className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700">
                ค้นหา
              </button>
            </form>
            <button
              onClick={() => setShowAddModal(true)}
              className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700"
            >
              + เพิ่มรายการสินค้า
            </button>
          </div>
        </div>

        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>}

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-4 py-3">Item Code</th>
                <th className="px-4 py-3">QR Code</th>
                <th className="px-4 py-3">สินค้า</th>
                <th className="px-4 py-3">หน่วย</th>
                <th className="px-4 py-3">คลัง</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3 text-right">คงเหลือ</th>
                <th className="px-4 py-3 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={8}>
                    กำลังโหลดข้อมูล
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={8}>
                    ไม่พบสินค้า
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-semibold text-slate-900">{product.itemCode}</td>
                    <td className="px-4 py-3">
                      <div className="bg-white p-1 inline-block border border-slate-200 rounded">
                        <QRCode value={product.itemCode} size={64} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{product.name}</td>
                    <td className="px-4 py-3 text-slate-700">{product.unit}</td>
                    <td className="px-4 py-3 text-slate-700">{product.warehouse}</td>
                    <td className="px-4 py-3 text-slate-700">{product.location}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{product.quantity}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleDelete(product.id, product.itemCode)}
                        className="rounded bg-red-100 px-3 py-1 text-sm font-semibold text-red-600 hover:bg-red-200"
                        title="ลบรายการสินค้า"
                      >
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

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-bold text-slate-900">เพิ่มรายการสินค้าใหม่</h2>
            <form onSubmit={handleAddItem} className="flex flex-col gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Item Code</label>
                <input
                  type="text"
                  required
                  value={newItem.itemCode}
                  onChange={(e) => setNewItem({ ...newItem, itemCode: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900"
                  placeholder="เช่น 7290103900"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">ชื่อสินค้า (Description)</label>
                <input
                  type="text"
                  required
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900"
                  placeholder="ชื่อของสินค้า"
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-slate-700">หน่วย</label>
                  <input
                    type="text"
                    required
                    value={newItem.unit}
                    onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900"
                    placeholder="PCS"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-slate-700">คลัง</label>
                  <input
                    type="text"
                    required
                    value={newItem.warehouse}
                    onChange={(e) => setNewItem({ ...newItem, warehouse: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900"
                    placeholder="WPK"
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-slate-700">Location (ไม่บังคับ)</label>
                  <input
                    type="text"
                    value={newItem.location}
                    onChange={(e) => setNewItem({ ...newItem, location: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900"
                    placeholder="ระบุ Location"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-slate-700">จำนวนเริ่มต้น</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900"
                    placeholder="เช่น 100"
                  />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
                  disabled={adding}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
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
