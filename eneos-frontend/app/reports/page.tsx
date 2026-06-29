'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { fetchTransactions, StockTransaction } from '@/lib/auth'
import { ArrowLeft } from 'lucide-react'

function statusLabel(status: StockTransaction['status']) {
  if (status === 'confirmed') return 'ยืนยันแล้ว'
  if (status === 'rejected') return 'ปฏิเสธแล้ว'
  return 'รอการยืนยัน'
}

export default function ReportsPage() {
  const [transactions, setTransactions] = useState<StockTransaction[]>([])
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const loadTransactions = async (nextStatus = status) => {
    setError('')
    setLoading(true)
    try {
      setTransactions(await fetchTransactions(nextStatus))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'โหลดรายงานไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true

    async function loadInitialTransactions() {
      try {
        const initialTransactions = await fetchTransactions('')
        if (isMounted) setTransactions(initialTransactions)
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : 'โหลดรายงานไม่สำเร็จ')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    void loadInitialTransactions()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-[#BE1111] transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span>กลับหน้าหลัก</span>
            </Link>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">รายงานธุรกรรม</h1>
          </div>
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value)
              loadTransactions(event.target.value)
            }}
            className="w-56 rounded-lg border border-slate-300 px-4 py-2 text-slate-900"
          >
            <option value="">ทั้งหมด</option>
            <option value="pending">รอการยืนยัน</option>
            <option value="confirmed">ยืนยันแล้ว</option>
            <option value="rejected">ปฏิเสธแล้ว</option>
          </select>
        </div>

        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>}

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-4 py-3">วันที่</th>
                <th className="px-4 py-3">สินค้า</th>
                <th className="px-4 py-3">ประเภท</th>
                <th className="px-4 py-3 text-right">จำนวน</th>
                <th className="px-4 py-3">สถานะ</th>
                <th className="px-4 py-3">ผู้สร้าง</th>
                <th className="px-4 py-3">ผู้อนุมัติ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={7}>
                    กำลังโหลดรายงาน
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={7}>
                    ไม่พบรายการ
                  </td>
                </tr>
              ) : (
                transactions.map((transaction) => (
                  <tr key={transaction.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 text-slate-700">
                      {new Date(transaction.createdAt).toLocaleString('th-TH')}
                    </td>
                    <td className="px-4 py-3 text-slate-900">
                      <div className="font-semibold">
                        {transaction.product?.description || transaction.itemSnapshot.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {transaction.product?.itemCode || transaction.itemSnapshot.itemCode}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {transaction.type === 'receive' ? 'รับเข้า' : 'จ่ายออก'}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{transaction.quantity}</td>
                    <td className="px-4 py-3 text-slate-700">{statusLabel(transaction.status)}</td>
                    <td className="px-4 py-3 text-slate-700">{transaction.createdBy?.fullName || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{transaction.approvedBy?.fullName || '-'}</td>
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
