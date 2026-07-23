'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { fetchTransactions, StockTransaction } from '@/lib/auth'
import { ArrowLeft, FileText, Wrench, Filter, CheckCircle2, XCircle, Clock, Calendar, Search } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function ReportsPage() {
  const [transactions, setTransactions] = useState<StockTransaction[]>([])
  const [status, setStatus] = useState('')
  const [dateFilterType, setDateFilterType] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [viewCategory, setViewCategory] = useState<'all' | 'adjust' | 'normal'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [submittedSearch, setSubmittedSearch] = useState('')

  const loadTransactions = async (
    nextStatus = status,
    nextStartDate = startDate,
    nextEndDate = endDate,
    nextSearchQuery = submittedSearch
  ) => {
    setError('')
    setLoading(true)
    try {
      setTransactions(await fetchTransactions(nextStatus, nextStartDate, nextEndDate, nextSearchQuery))
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
    loadTransactions(status, nextStart, nextEnd, submittedSearch)
  }

  useEffect(() => {
    let isMounted = true

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('view') === 'adjust') {
        // eslint-disable-next-line react-hooks/set-state-in-effect
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
    if (submittedSearch.trim() !== '') {
      const q = submittedSearch.trim().toLowerCase()
      const code = (t.product?.itemCode || t.itemSnapshot?.itemCode || '').toLowerCase()
      if (code !== q) return false
    }
    const isAdjustment = t.note && t.note.includes('ปรับปรุงสต็อก')
    if (viewCategory === 'adjust') return isAdjustment
    if (viewCategory === 'normal') return !isAdjustment
    return true
  })
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDateParts = (dateString: string) => {
    const d = new Date(dateString)
    const dateStr = d.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
    const timeStr = d.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
    return { dateStr, timeStr }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 sm:px-6 py-8">
      <div className="mx-auto max-w-7xl">
        {/* Top Header */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-[#BE1111] transition-colors mb-2">
              <ArrowLeft className="w-4 h-4" />
              <span>กลับหน้าหลัก</span>
            </Link>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-gray-900 tracking-tight">รายงานธุรกรรม</h1>
          </div>
          
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap justify-end">
            {dateFilterType === 'custom' && (
              <motion.div 
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2"
              >
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value)
                    loadTransactions(status, e.target.value, endDate, submittedSearch)
                  }}
                  className="rounded-2xl border border-gray-200/80 px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#BE1111]/20 focus:border-[#BE1111] bg-white/50 backdrop-blur-sm shadow-sm transition-all"
                />
                <span className="text-gray-400 font-medium">-</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value)
                    loadTransactions(status, startDate, e.target.value, submittedSearch)
                  }}
                  className="rounded-2xl border border-gray-200/80 px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#BE1111]/20 focus:border-[#BE1111] bg-white/50 backdrop-blur-sm shadow-sm transition-all"
                />
              </motion.div>
            )}
            
            <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/80 px-3 py-1.5 shadow-sm hover:border-gray-300 transition-colors">
              <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
              <select
                value={dateFilterType}
                onChange={(e) => handleDateFilterChange(e.target.value)}
                className="w-full sm:w-36 py-1 text-sm text-gray-900 focus:outline-none bg-transparent cursor-pointer font-medium"
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
                loadTransactions(event.target.value, startDate, endDate, submittedSearch)
              }}
              className="w-full sm:w-40 rounded-2xl border border-gray-200/80 px-4 py-2.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#BE1111]/20 focus:border-[#BE1111] bg-white/80 backdrop-blur-sm shadow-sm hover:border-gray-300 transition-all cursor-pointer"
            >
              <option value="">ทุกสถานะ</option>
              <option value="pending">รอการยืนยัน</option>
              <option value="confirmed">ยืนยันแล้ว</option>
              <option value="rejected">ปฏิเสธแล้ว</option>
            </select>

            <form
              className="flex gap-2 items-center w-full sm:w-auto"
              onSubmit={(e) => {
                e.preventDefault()
                setSubmittedSearch(searchQuery)
                loadTransactions(status, startDate, endDate, searchQuery)
              }}
            >
              <div className="relative flex-1 sm:w-64 md:w-72">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหา component ItemCode"
                  className="w-full sm:w-64 md:w-72 rounded-xl border border-gray-200 pl-10 pr-9 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#BE1111]/20 focus:border-[#BE1111] bg-white shadow-sm transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('')
                      setSubmittedSearch('')
                      loadTransactions(status, startDate, endDate, '')
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer p-0.5"
                    title="ล้างค่าค้นหา"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition-colors shadow-sm shrink-0 cursor-pointer"
              >
                ค้นหา
              </button>
            </form>
          </div>
        </div>

        {/* Category Filter Tabs (Pill Style) */}
        <div className="mb-6 flex flex-wrap gap-2 p-1 bg-gray-200/50 rounded-full w-fit">
          {[
            { id: 'all', label: `ทั้งหมด (${transactions.length})`, icon: FileText },
            { id: 'adjust', label: `ประวัติการแก้ไขสต็อก (${transactions.filter(t => t.note?.includes('ปรับปรุงสต็อก')).length})`, icon: Wrench, color: 'text-amber-500' },
            { id: 'normal', label: `รายการทั่วไป (${transactions.filter(t => !t.note?.includes('ปรับปรุงสต็อก')).length})`, icon: Filter }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setViewCategory(tab.id as 'all' | 'adjust' | 'normal')}
              className="relative flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-full transition-colors z-10"
            >
              {viewCategory === tab.id && (
                <motion.div
                  layoutId="activeReportTab"
                  className="absolute inset-0 bg-white rounded-full shadow-sm border border-gray-200/50"
                  initial={false}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                />
              )}
              <tab.icon className={`w-4 h-4 relative z-10 ${viewCategory === tab.id ? (tab.color || 'text-[#BE1111]') : 'text-gray-400'}`} />
              <span className={`relative z-10 ${viewCategory === tab.id ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                {tab.label}
              </span>
            </button>
          ))}
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800 font-medium shadow-sm flex items-center gap-3"
          >
            <XCircle className="w-5 h-5 text-red-500" />
            {error}
          </motion.div>
        )}

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-hidden rounded-3xl border border-gray-200/60 bg-white/80 backdrop-blur-md shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-center text-sm border-collapse">
              <thead className="bg-gray-50/50 text-gray-500 text-xs uppercase tracking-wider font-semibold border-b border-gray-200/60">
                <tr>
                  <th className="px-6 py-4 text-center">วันที่ / เวลา</th>
                  <th className="px-6 py-4 text-center">สินค้า</th>
                  <th className="px-6 py-4 text-center">ประเภท</th>
                  <th className="px-6 py-4 text-center">จำนวน</th>
                  <th className="px-6 py-4 text-center">หมายเหตุ / รายละเอียด</th>
                  <th className="px-6 py-4 text-center">สถานะ</th>
                  <th className="px-6 py-4 text-center">ผู้ดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <AnimatePresence mode="wait">
                  {loading ? (
                    <motion.tr key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <td className="px-6 py-12 text-center text-gray-500" colSpan={7}>
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="w-6 h-6 border-2 border-[#BE1111] border-t-transparent rounded-full animate-spin"></div>
                          <span className="font-medium text-gray-500">กำลังโหลดรายงานธุรกรรม...</span>
                        </div>
                      </td>
                    </motion.tr>
                  ) : filteredTransactions.length === 0 ? (
                    <motion.tr key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <td className="px-6 py-16 text-center text-gray-500" colSpan={7}>
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-2">
                            <FileText className="w-6 h-6 text-gray-400" />
                          </div>
                          <span className="font-semibold text-gray-700 text-base">
                            {submittedSearch ? `ไม่พบรายการธุรกรรมของชิ้นส่วนรหัส "${submittedSearch}"` : 'ไม่พบรายการธุรกรรม'}
                          </span>
                          <span className="text-gray-400 text-sm">
                            {submittedSearch ? 'กรุณาตรวจสอบความถูกต้องของรหัส componentItemCode อีกครั้งเพื่อป้องกันข้อผิดพลาด' : 'ลองเปลี่ยนหมวดหมู่หรือตัวกรองวันที่'}
                          </span>
                        </div>
                      </td>
                    </motion.tr>
                  ) : (
                    filteredTransactions.map((transaction, index) => {
                      const { dateStr, timeStr } = formatDateParts(transaction.createdAt)
                      return (
                        <motion.tr 
                          key={transaction.id} 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: index * 0.02 }}
                          className="hover:bg-gray-50/80 transition-colors group"
                        >
                          <td className="px-6 py-5 text-center">
                            <div className="flex flex-col items-center justify-center text-xs font-display">
                              <span className="font-semibold text-gray-700 whitespace-nowrap">{dateStr}</span>
                              <span className="text-[11px] font-bold text-gray-400 mt-0.5 whitespace-nowrap">{timeStr}</span>
                            </div>
                          </td>
                        <td className="px-6 py-5 text-center">
                          <div className="font-semibold text-gray-900 text-sm">
                            {transaction.product?.description || transaction.itemSnapshot.name}
                          </div>
                          <div className="text-xs font-mono text-gray-400 mt-1">
                            {transaction.product?.itemCode || transaction.itemSnapshot.itemCode}
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center">
                          {transaction.type === 'receive' ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-200/50">
                              + รับเข้า
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-700 border border-rose-200/50">
                              - จ่ายออก
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-5 text-center font-mono font-bold text-gray-900 text-base">
                          {transaction.quantity.toLocaleString()}
                        </td>
                        <td className="px-6 py-5 text-center">
                          {transaction.note && transaction.note.includes('ปรับปรุงสต็อก') ? (
                            <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-700 border border-amber-200/50">
                              <Wrench className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>{transaction.note}</span>
                            </span>
                          ) : transaction.note ? (
                            <span className="text-xs text-gray-500 bg-gray-100/50 px-3 py-1.5 rounded-xl border border-gray-200/50 inline-block">
                              {transaction.note}
                            </span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                        <td className="px-6 py-5 text-center whitespace-nowrap">
                          {transaction.status === 'confirmed' ? (
                            <span className="whitespace-nowrap inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              <span>ยืนยันแล้ว</span>
                            </span>
                          ) : transaction.status === 'rejected' ? (
                            <span className="whitespace-nowrap inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-100">
                              <XCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>ปฏิเสธแล้ว</span>
                            </span>
                          ) : (
                            <span className="whitespace-nowrap inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-100">
                              <Clock className="w-3.5 h-3.5 shrink-0" />
                              <span>รอการยืนยัน</span>
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-5 text-center text-xs">
                          <div className="font-medium text-gray-900">{transaction.createdBy?.fullName || '-'}</div>
                          {transaction.approvedBy && (
                            <div className="text-gray-400 mt-1 font-mono text-[10px] uppercase tracking-wider">
                              APPV: {transaction.approvedBy.fullName}
                            </div>
                          )}
                        </td>
                      </motion.tr>
                    )
                  })
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Card List View */}
        <div className="md:hidden flex flex-col gap-4">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-12 flex justify-center">
                <div className="w-6 h-6 border-2 border-[#BE1111] border-t-transparent rounded-full animate-spin"></div>
              </motion.div>
            ) : filteredTransactions.length === 0 ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-12 flex flex-col items-center text-gray-500">
                <div className="w-12 h-12 rounded-full bg-white border border-gray-100 flex items-center justify-center mb-3 shadow-sm">
                  <FileText className="w-6 h-6 text-gray-400" />
                </div>
                <span className="font-semibold text-gray-700">ไม่พบรายการธุรกรรม</span>
              </motion.div>
            ) : (
              filteredTransactions.map((transaction, index) => (
                <motion.div 
                  key={transaction.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.02 }}
                  className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-gray-900 text-sm leading-tight">
                        {transaction.product?.description || transaction.itemSnapshot.name}
                      </div>
                      <div className="text-xs font-mono text-gray-400 mt-1">
                        {transaction.product?.itemCode || transaction.itemSnapshot.itemCode}
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <div className={`font-mono font-bold text-lg ${transaction.type === 'receive' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {transaction.type === 'receive' ? '+' : '-'}{transaction.quantity.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs">
                    {transaction.status === 'confirmed' ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold bg-emerald-50 px-2 py-1 rounded-lg">
                        <CheckCircle2 className="w-3.5 h-3.5" /> ยืนยันแล้ว
                      </span>
                    ) : transaction.status === 'rejected' ? (
                      <span className="inline-flex items-center gap-1 text-rose-600 font-semibold bg-rose-50 px-2 py-1 rounded-lg">
                        <XCircle className="w-3.5 h-3.5" /> ปฏิเสธแล้ว
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-600 font-semibold bg-amber-50 px-2 py-1 rounded-lg">
                        <Clock className="w-3.5 h-3.5" /> รอการยืนยัน
                      </span>
                    )}
                    <span className="text-gray-400 font-mono">•</span>
                    <span className="text-gray-400 font-mono">{formatDate(transaction.createdAt)}</span>
                  </div>

                  {transaction.note && (
                    <div className="pt-3 border-t border-gray-50">
                      {transaction.note.includes('ปรับปรุงสต็อก') ? (
                        <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 w-full">
                          <Wrench className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>{transaction.note}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 block">
                          {transaction.note}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="pt-3 border-t border-gray-50 flex items-center justify-between text-xs">
                    <div className="text-gray-500">
                      <span className="text-gray-400">โดย: </span>
                      <span className="font-medium text-gray-700">{transaction.createdBy?.fullName || '-'}</span>
                    </div>
                    {transaction.approvedBy && (
                      <div className="text-gray-500">
                        <span className="text-gray-400">อนุมัติ: </span>
                        <span className="font-medium text-gray-700">{transaction.approvedBy.fullName}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

      </div>
    </main>
  )
}
