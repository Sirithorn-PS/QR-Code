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
  const [dateFilterType, setDateFilterType] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const loadTransactions = async (
    nextStatus = status,
    nextStartDate = startDate,
    nextEndDate = endDate
  ) => {
    setError('')
    setLoading(true)
    try {
      setTransactions(await fetchTransactions(nextStatus, nextStartDate, nextEndDate))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'โหลดรายงานไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  const handleDateFilterChange = (type: string) => {
    setDateFilterType(type)
    
    let nextStart = ''
    let nextEnd = ''
    const now = new Date()
    
    if (type === 'today') {
      nextStart = now.toISOString().split('T')[0]
      nextEnd = nextStart
    } else if (type === 'this_week') {
      const firstDay = new Date(now.setDate(now.getDate() - now.getDay()))
      // Reset `now` to current date so it doesn't carry over the previous mutation
      const now2 = new Date()
      const lastDay = new Date(now2.setDate(now2.getDate() - now2.getDay() + 6))
      nextStart = firstDay.toISOString().split('T')[0]
      nextEnd = lastDay.toISOString().split('T')[0]
    } else if (type === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      nextStart = firstDay.toISOString().split('T')[0]
      nextEnd = lastDay.toISOString().split('T')[0]
    } else if (type === 'all') {
      nextStart = ''
      nextEnd = ''
    } else if (type === 'custom') {
      nextStart = startDate
      nextEnd = endDate
    }

    setStartDate(nextStart)
    setEndDate(nextEnd)
    loadTransactions(status, nextStart, nextEnd)
  }

  useEffect(() => {
    let isMounted = true

    async function loadInitialTransactions() {
      try {
        const initialTransactions = await fetchTransactions('', '', '')
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
          
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {dateFilterType === 'custom' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value)
                    loadTransactions(status, e.target.value, endDate)
                  }}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 bg-white"
                />
                <span className="text-slate-500">-</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value)
                    loadTransactions(status, startDate, e.target.value)
                  }}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 bg-white"
                />
              </div>
            )}
            
            <select
              value={dateFilterType}
              onChange={(e) => handleDateFilterChange(e.target.value)}
              className="w-full sm:w-40 rounded-lg border border-slate-300 px-4 py-2 text-slate-900 text-sm bg-white"
            >
              <option value="all">ทุกช่วงเวลา</option>
              <option value="today">วันนี้</option>
              <option value="this_week">สัปดาห์นี้</option>
              <option value="this_month">เดือนนี้</option>
              <option value="custom">กำหนดเอง</option>
            </select>

            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value)
                loadTransactions(event.target.value, startDate, endDate)
              }}
              className="w-full sm:w-40 rounded-lg border border-slate-300 px-4 py-2 text-slate-900 text-sm bg-white"
            >
              <option value="">ทุกสถานะ</option>
              <option value="pending">รอการยืนยัน</option>
              <option value="confirmed">ยืนยันแล้ว</option>
              <option value="rejected">ปฏิเสธแล้ว</option>
            </select>
          </div>
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
