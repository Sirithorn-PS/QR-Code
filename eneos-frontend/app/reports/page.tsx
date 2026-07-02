'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { fetchTransactions, StockTransaction } from '@/lib/auth'
import { ArrowLeft, FileText, Wrench, Filter, CheckCircle2, XCircle, Clock, Calendar } from 'lucide-react'

export default function ReportsPage() {
  const [transactions, setTransactions] = useState<StockTransaction[]>([])
  const [status, setStatus] = useState('')
  const [dateFilterType, setDateFilterType] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [viewCategory, setViewCategory] = useState<'all' | 'adjust' | 'normal'>('all')

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
    
    const formatLocalYYYYMMDD = (date: Date) => {
      const yyyy = date.getFullYear()
      const mm = String(date.getMonth() + 1).padStart(2, '0')
      const dd = String(date.getDate()).padStart(2, '0')
      return `${yyyy}-${mm}-${dd}`
    }

    let nextStart = ''
    let nextEnd = ''
    const now = new Date()
    
    if (type === 'today') {
      nextStart = formatLocalYYYYMMDD(now)
      nextEnd = nextStart
    } else if (type === 'this_week') {
      const firstDay = new Date(now.setDate(now.getDate() - now.getDay()))
      const now2 = new Date()
      const lastDay = new Date(now2.setDate(now2.getDate() - now2.getDay() + 6))
      nextStart = formatLocalYYYYMMDD(firstDay)
      nextEnd = formatLocalYYYYMMDD(lastDay)
    } else if (type === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      nextStart = formatLocalYYYYMMDD(firstDay)
      nextEnd = formatLocalYYYYMMDD(lastDay)
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

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('view') === 'adjust') {
        setViewCategory('adjust')
      }
    }

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

  const filteredTransactions = transactions.filter((t) => {
    const isAdjustment = t.note && t.note.includes('ปรับปรุงสต็อก')
    if (viewCategory === 'adjust') return isAdjustment
    if (viewCategory === 'normal') return !isAdjustment
    return true
  })

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-7xl">
        {/* Top Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-[#BE1111] transition-colors mb-2">
              <ArrowLeft className="w-4 h-4" />
              <span>กลับหน้าหลัก</span>
            </Link>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-gray-900 tracking-tight">รายงานธุรกรรม</h1>
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
                  className="rounded-xl border border-gray-200 px-3.5 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#BE1111]/20 focus:border-[#BE1111] bg-white shadow-sm transition-all"
                />
                <span className="text-gray-500">-</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value)
                    loadTransactions(status, startDate, e.target.value)
                  }}
                  className="rounded-xl border border-gray-200 px-3.5 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#BE1111]/20 focus:border-[#BE1111] bg-white shadow-sm transition-all"
                />
              </div>
            )}
            
            <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 px-3 py-1 shadow-sm">
              <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
              <select
                value={dateFilterType}
                onChange={(e) => handleDateFilterChange(e.target.value)}
                className="w-full sm:w-36 py-1.5 text-sm text-gray-900 focus:outline-none bg-transparent cursor-pointer font-medium"
              >
                <option value="all">ทุกช่วงเวลา</option>
                <option value="today">วันนี้</option>
                <option value="this_week">สัปดาห์นี้</option>
                <option value="this_month">เดือนนี้</option>
                <option value="custom">กำหนดเอง</option>
              </select>
            </div>

            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value)
                loadTransactions(event.target.value, startDate, endDate)
              }}
              className="w-full sm:w-40 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#BE1111]/20 focus:border-[#BE1111] bg-white shadow-sm transition-all cursor-pointer"
            >
              <option value="">ทุกสถานะ</option>
              <option value="pending">รอการยืนยัน</option>
              <option value="confirmed">ยืนยันแล้ว</option>
              <option value="rejected">ปฏิเสธแล้ว</option>
            </select>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="mb-6 flex flex-wrap gap-2 border-b border-gray-200/80 pb-4">
          <button
            type="button"
            onClick={() => setViewCategory('all')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
              viewCategory === 'all'
                ? 'bg-[#BE1111] text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>ทั้งหมด ({transactions.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setViewCategory('adjust')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
              viewCategory === 'adjust'
                ? 'bg-[#BE1111] text-white shadow-sm ring-2 ring-[#BE1111]/20'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-red-50 hover:text-[#BE1111] hover:border-red-200'
            }`}
          >
            <Wrench className="w-4 h-4 text-amber-500" />
            <span>ประวัติการแก้ไขสต็อก ({transactions.filter(t => t.note?.includes('ปรับปรุงสต็อก')).length})</span>
          </button>
          <button
            type="button"
            onClick={() => setViewCategory('normal')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
              viewCategory === 'normal'
                ? 'bg-[#BE1111] text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>รายการรับ-จ่ายทั่วไป ({transactions.filter(t => !t.note?.includes('ปรับปรุงสต็อก')).length})</span>
          </button>
        </div>

        {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 font-medium shadow-sm">{error}</div>}

        {/* Table Card */}
        <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-gray-50/80 text-gray-600 font-medium border-b border-gray-200/80">
                <tr>
                  <th className="px-6 py-4 font-semibold">วันที่ / เวลา</th>
                  <th className="px-6 py-4 font-semibold">สินค้า</th>
                  <th className="px-6 py-4 font-semibold">ประเภท</th>
                  <th className="px-6 py-4 font-semibold text-right">จำนวน</th>
                  <th className="px-6 py-4 font-semibold">หมายเหตุ / รายละเอียด</th>
                  <th className="px-6 py-4 font-semibold">สถานะ</th>
                  <th className="px-6 py-4 font-semibold">ผู้ดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td className="px-6 py-12 text-center text-gray-500" colSpan={7}>
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-6 h-6 border-2 border-[#BE1111] border-t-transparent rounded-full animate-spin"></div>
                        <span>กำลังโหลดรายงานธุรกรรม...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td className="px-6 py-12 text-center text-gray-500" colSpan={7}>
                      <div className="flex flex-col items-center justify-center gap-2">
                        <FileText className="w-8 h-8 text-gray-300" />
                        <span className="font-medium text-gray-600">ไม่พบรายการธุรกรรมในหมวดหมู่นี้</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-6 py-4 text-gray-700 whitespace-nowrap font-medium">
                        {new Date(transaction.createdAt).toLocaleString('th-TH', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">
                          {transaction.product?.description || transaction.itemSnapshot.name}
                        </div>
                        <div className="text-xs font-mono text-gray-500 mt-0.5">
                          {transaction.product?.itemCode || transaction.itemSnapshot.itemCode}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {transaction.type === 'receive' ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                            + รับเข้า
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-100">
                            - จ่ายออก
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-gray-900 text-base">
                        {transaction.quantity.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        {transaction.note && transaction.note.includes('ปรับปรุงสต็อก') ? (
                          <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 border border-amber-200/80 shadow-2xs">
                            <Wrench className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>{transaction.note}</span>
                          </span>
                        ) : transaction.note ? (
                          <span className="text-xs text-gray-600 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100 inline-block">
                            {transaction.note}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {transaction.status === 'confirmed' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            ยืนยันแล้ว
                          </span>
                        ) : transaction.status === 'rejected' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/60">
                            <XCircle className="w-3.5 h-3.5" />
                            ปฏิเสธแล้ว
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                            <Clock className="w-3.5 h-3.5" />
                            รอการยืนยัน
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-xs">
                        <div className="font-medium text-gray-800">{transaction.createdBy?.fullName || '-'}</div>
                        {transaction.approvedBy && (
                          <div className="text-gray-400 mt-0.5">อนุมัติ: {transaction.approvedBy.fullName}</div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  )
}
