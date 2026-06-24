'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { createTransaction, fetchProduct, Product } from '@/lib/auth'

export default function ScanPage() {
  const [itemCode, setItemCode] = useState('')
  const [type, setType] = useState<'receive' | 'issue'>('receive')
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState('')
  const [product, setProduct] = useState<Product | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const lookupProduct = async () => {
    setError('')
    setMessage('')
    setProduct(null)
    if (!itemCode.trim()) {
      setError('กรุณากรอก Item Code หรือข้อมูลจาก QR')
      return
    }

    setLoading(true)
    try {
      setProduct(await fetchProduct(itemCode.trim()))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่พบสินค้า')
    } finally {
      setLoading(false)
    }
  }

  const submitTransaction = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setMessage('')

    if (!product) {
      setError('กรุณาค้นหาสินค้าก่อนสร้างรายการ')
      return
    }

    setLoading(true)
    try {
      const transaction = await createTransaction({
        itemCode: product.itemCode,
        type,
        quantity,
        note,
      })
      setMessage(`สร้างรายการรอการยืนยัน #${transaction.id} สำเร็จ`)
      setNote('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'สร้างรายการไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
          กลับหน้าหลัก
        </Link>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">สแกนสินค้า</h1>

        <form onSubmit={submitTransaction} className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>}
          {message && (
            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">{message}</div>
          )}

          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <div>
              <label htmlFor="itemCode" className="mb-2 block text-sm font-medium text-slate-700">
                Item Code / QR
              </label>
              <input
                id="itemCode"
                value={itemCode}
                onChange={(event) => setItemCode(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900"
                placeholder="เช่น 7530010083"
              />
            </div>
            <button
              type="button"
              onClick={lookupProduct}
              disabled={loading}
              className="self-end rounded-lg bg-indigo-600 px-5 py-2 font-semibold text-white hover:bg-indigo-700 disabled:bg-slate-400"
            >
              ค้นหา
            </button>
          </div>

          {product && (
            <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm text-slate-500">{product.itemCode}</div>
              <div className="mt-1 font-semibold text-slate-900">{product.name}</div>
              <div className="mt-2 grid gap-2 text-sm text-slate-700 sm:grid-cols-3">
                <div>หน่วย: {product.unit}</div>
                <div>Location: {product.location || '-'}</div>
                <div>คงเหลือ: {product.quantity}</div>
              </div>
            </div>
          )}

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="type" className="mb-2 block text-sm font-medium text-slate-700">
                ประเภทธุรกรรม
              </label>
              <select
                id="type"
                value={type}
                onChange={(event) => setType(event.target.value as 'receive' | 'issue')}
                className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900"
              >
                <option value="receive">รับเข้า</option>
                <option value="issue">จ่ายออก</option>
              </select>
            </div>
            <div>
              <label htmlFor="quantity" className="mb-2 block text-sm font-medium text-slate-700">
                จำนวน
              </label>
              <input
                id="quantity"
                type="number"
                min={1}
                value={quantity}
                onChange={(event) => setQuantity(Number(event.target.value))}
                className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900"
              />
            </div>
          </div>

          <div className="mt-5">
            <label htmlFor="note" className="mb-2 block text-sm font-medium text-slate-700">
              หมายเหตุ
            </label>
            <textarea
              id="note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="min-h-24 w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !product}
            className="mt-6 w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:bg-slate-400"
          >
            สร้างรายการรอการยืนยัน
          </button>
        </form>
      </div>
    </main>
  )
}
