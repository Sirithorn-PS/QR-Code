'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { fetchProducts, Product } from '@/lib/auth'

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

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
        </div>

        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>}

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-4 py-3">Item Code</th>
                <th className="px-4 py-3">สินค้า</th>
                <th className="px-4 py-3">หน่วย</th>
                <th className="px-4 py-3">คลัง</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3 text-right">คงเหลือ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={6}>
                    กำลังโหลดข้อมูล
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={6}>
                    ไม่พบสินค้า
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-semibold text-slate-900">{product.itemCode}</td>
                    <td className="px-4 py-3 text-slate-700">{product.name}</td>
                    <td className="px-4 py-3 text-slate-700">{product.unit}</td>
                    <td className="px-4 py-3 text-slate-700">{product.warehouse}</td>
                    <td className="px-4 py-3 text-slate-700">{product.location}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{product.quantity}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}
