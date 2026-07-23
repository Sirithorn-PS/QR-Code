'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { fetchTransactions, fetchProducts, StockTransaction, Product } from '@/lib/auth'
import { 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  Clock, 
  Package, 
  ScanLine, 
  BarChart3, 
  ChevronRight, 
  Calendar,
  CheckCircle2,
  XCircle,
  SlidersHorizontal,
  TrendingUp,
  TrendingDown
} from 'lucide-react'
import { motion } from 'framer-motion'

export default function DashboardPage() {
  const [transactions, setTransactions] = useState<StockTransaction[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const [txData, prodData] = await Promise.all([
          fetchTransactions(),
          fetchProducts()
        ])
        setTransactions(txData)
        setProducts(prodData)
      } catch (err) {
        console.error('Failed to load dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // --- 1. คำนวณสถิติ KPI Cards ---
  const todayStr = new Date().toISOString().split('T')[0]
  const yesterdayDate = new Date()
  yesterdayDate.setDate(yesterdayDate.getDate() - 1)
  const yesterdayStr = yesterdayDate.toISOString().split('T')[0]

  // รับเข้าวันนี้ & เมื่อวาน
  const todayReceives = transactions.filter(t => t.type === 'receive' && t.createdAt.startsWith(todayStr)).length
  const yesterdayReceives = transactions.filter(t => t.type === 'receive' && t.createdAt.startsWith(yesterdayStr)).length
  const receiveDiffPercent = yesterdayReceives === 0 ? (todayReceives > 0 ? 100 : 0) : Math.round(((todayReceives - yesterdayReceives) / yesterdayReceives) * 100)

  // เบิกออกวันนี้ & เมื่อวาน
  const todayIssues = transactions.filter(t => t.type === 'issue' && t.createdAt.startsWith(todayStr)).length
  const yesterdayIssues = transactions.filter(t => t.type === 'issue' && t.createdAt.startsWith(yesterdayStr)).length
  const issueDiffPercent = yesterdayIssues === 0 ? (todayIssues > 0 ? 100 : 0) : Math.round(((todayIssues - yesterdayIssues) / yesterdayIssues) * 100)

  // รายการรออนุมัติ
  const pendingCount = transactions.filter(t => t.status === 'pending').length

  // สินค้าทั้งหมดในคลัง (คลัง WPK / Packaging)
  const totalProductsCount = products.length

  // --- 2. คำนวณกราฟสรุป 7 วันล่าสุด ---
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const dateStr = d.toISOString().split('T')[0]
    const dayLabel = `${d.getDate()} ${d.toLocaleDateString('th-TH', { month: 'short' })}`
    
    const receiveCount = transactions.filter(t => t.type === 'receive' && t.createdAt.startsWith(dateStr)).length
    const issueCount = transactions.filter(t => t.type === 'issue' && t.createdAt.startsWith(dateStr)).length
    
    return { dateStr, dayLabel, receiveCount, issueCount }
  })

  const maxTxIn7Days = Math.max(...last7Days.map(d => Math.max(d.receiveCount, d.issueCount)), 5)

  // --- 3. คำนวณสัดส่วนหมวดบรรจุภัณฑ์ (Donut Chart Data) ---
  const categoriesDef = [
    { key: 'gallon', label: 'แกลลอน', keywords: ['แกลลอน', 'gallon', '20l', '5l', '4l', '1l'], color: '#10B981' }, // Emerald
    { key: 'cap', label: 'ฝา', keywords: ['ฝา', 'cap', 'lid', 'จุก'], color: '#3B82F6' }, // Blue
    { key: 'foil', label: 'ฟอยล์', keywords: ['ฟอยล์', 'foil', 'แผ่น'], color: '#EC4899' }, // Pink
    { key: 'box', label: 'กล่อง', keywords: ['กล่อง', 'box', 'ลัง', 'carton'], color: '#F59E0B' }, // Amber
    { key: 'label', label: 'ฉลาก', keywords: ['ฉลาก', 'label', 'สติกเกอร์', 'sticker'], color: '#8B5CF6' } // Purple
  ]

  let categoryCounts = categoriesDef.map(cat => {
    const count = products.filter(p => {
      const desc = (p.name || '').toLowerCase()
      return cat.keywords.some(kw => desc.includes(kw))
    }).length
    return { ...cat, count }
  })

  const totalCategorized = categoryCounts.reduce((acc, curr) => acc + curr.count, 0) || 1

  // Formatting date for banner
  const thaiFullDate = new Date().toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  // 5 รายการล่าสุด
  const recentTransactions = transactions.slice(0, 5)

  // Parse Stock Adjust Note Helper
  const parseStockAdjustNote = (note: string) => {
    if (!note.includes('ปรับปรุงสต็อก')) return { title: note, detail: '' }
    const match = note.match(/ปรับปรุงสต็อก\s*(\(.*\))?/)
    if (match) {
      return {
        title: 'ปรับปรุงสต็อก',
        detail: match[1] ? match[1].trim() : ''
      }
    }
    return { title: 'ปรับปรุงสต็อก', detail: '' }
  }

  return (
    <main className="min-h-screen bg-slate-50/60 px-4 sm:px-6 py-8">
      <div className="mx-auto max-w-7xl space-y-8">
        
        {/* Top Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-xs">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 tracking-tight">
              ระบบบริหารจัดการคลังวัตถุดิบบรรจุภัณฑ์
            </h1>
            <p className="mt-1.5 text-sm sm:text-base text-slate-500 font-medium">
              จัดการรับเข้า - เบิกออกวัตถุดิบบรรจุภัณฑ์ แบรนด์ YAMALUBE
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200/60 text-slate-600 text-sm font-semibold whitespace-nowrap shrink-0 self-start md:self-auto shadow-2xs">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="font-display">{thaiFullDate}</span>
          </div>
        </div>

        {/* 4 Summary KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: รับเข้าวันนี้ */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
                <ArrowDownToLine className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">รับเข้าวันนี้</span>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-display font-extrabold text-slate-900">{loading ? '-' : todayReceives}</span>
                <span className="text-xs font-semibold text-slate-500">รายการ</span>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>{receiveDiffPercent >= 0 ? `+${receiveDiffPercent}%` : `${receiveDiffPercent}%`} จากเมื่อวาน</span>
              </div>
            </div>
          </motion.div>

          {/* Card 2: เบิกออกวันนี้ */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 text-[#BE1111] flex items-center justify-center">
                <ArrowUpFromLine className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">เบิกออกวันนี้</span>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-display font-extrabold text-slate-900">{loading ? '-' : todayIssues}</span>
                <span className="text-xs font-semibold text-slate-500">รายการ</span>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-[#BE1111]">
                <TrendingDown className="w-3.5 h-3.5" />
                <span>{issueDiffPercent >= 0 ? `+${issueDiffPercent}%` : `${issueDiffPercent}%`} จากเมื่อวาน</span>
              </div>
            </div>
          </motion.div>

          {/* Card 3: รายการรอยืนยัน */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">รายการรอยืนยัน</span>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-display font-extrabold text-slate-900">{loading ? '-' : pendingCount}</span>
                <span className="text-xs font-semibold text-slate-500">รายการ</span>
              </div>
              <Link href="/transactions" className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-700 transition-colors">
                <span>ดูรายการรอยืนยัน</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </motion.div>

          {/* Card 4: วัตถุดิบทั้งหมด */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center">
                <Package className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">วัตถุดิบทั้งหมด</span>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-display font-extrabold text-slate-900">{loading ? '-' : totalProductsCount}</span>
                <span className="text-xs font-semibold text-slate-500">รายการ</span>
              </div>
              <Link href="/inventory" className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-purple-600 hover:text-purple-700 transition-colors">
                <span>ทั้งหมดในคลัง</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Charts Section: 7-Day Trend Chart & Packaging Distribution Chart & Quick Action */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* 7-Day Trend Bar Chart (7 Cols) */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.25 }}
            className="lg:col-span-6 bg-white p-6 sm:p-7 rounded-3xl border border-slate-100 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-display font-bold text-slate-900">สรุปการรับเข้า - เบิกออก 7 วันล่าสุด</h3>
                  <p className="text-xs text-slate-400 mt-0.5 font-medium">เปรียบเทียบจำนวนรายการแยกตามวัน</p>
                </div>
                <div className="flex items-center gap-4 text-xs font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                    <span className="text-slate-600">รับเข้า</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#BE1111]"></span>
                    <span className="text-slate-600">เบิกออก</span>
                  </div>
                </div>
              </div>

              {/* Bar Chart Representation */}
              <div className="h-56 flex items-end justify-between gap-2 sm:gap-4 pt-6 pb-2 border-b border-slate-100 px-2">
                {last7Days.map((day, idx) => {
                  const receiveHeight = Math.max((day.receiveCount / maxTxIn7Days) * 100, 6)
                  const issueHeight = Math.max((day.issueCount / maxTxIn7Days) * 100, 6)
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                      <div className="w-full flex items-end justify-center gap-1 h-full">
                        {/* Receive Bar */}
                        <div 
                          style={{ height: `${receiveHeight}%` }} 
                          className="w-1/2 max-w-[16px] bg-emerald-500 rounded-t-md transition-all duration-300 group-hover:bg-emerald-600 relative flex justify-center"
                          title={`รับเข้า: ${day.receiveCount} รายการ`}
                        >
                          {day.receiveCount > 0 && (
                            <span className="absolute -top-5 text-[10px] font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                              {day.receiveCount}
                            </span>
                          )}
                        </div>
                        {/* Issue Bar */}
                        <div 
                          style={{ height: `${issueHeight}%` }} 
                          className="w-1/2 max-w-[16px] bg-[#BE1111] rounded-t-md transition-all duration-300 group-hover:bg-[#A00F0F] relative flex justify-center"
                          title={`เบิกออก: ${day.issueCount} รายการ`}
                        >
                          {day.issueCount > 0 && (
                            <span className="absolute -top-5 text-[10px] font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                              {day.issueCount}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-[11px] font-medium text-slate-500 mt-3 whitespace-nowrap">{day.dayLabel}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </motion.div>

          {/* Donut Chart Category Distribution (3 Cols) */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="lg:col-span-3 bg-white p-6 sm:p-7 rounded-3xl border border-slate-100 shadow-xs flex flex-col justify-between"
          >
            <div>
              <h3 className="text-lg font-display font-bold text-slate-900 mb-1">สัดส่วนวัตถุดิบบรรจุภัณฑ์</h3>
              <p className="text-xs text-slate-400 font-medium mb-6">จำแนกตามประเภทบรรจุภัณฑ์หลัก</p>

              {/* Donut Visual Representation */}
              <div className="flex flex-col items-center justify-center my-2">
                <div className="relative w-36 h-36 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-slate-100"
                      strokeWidth="4"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    {categoryCounts.reduce((acc, cat, idx) => {
                      const percent = (cat.count / totalCategorized) * 100
                      const strokeDasharray = `${percent} ${100 - percent}`
                      const strokeDashoffset = acc.offset
                      acc.offset -= percent
                      acc.elements.push(
                        <path
                          key={idx}
                          stroke={cat.color}
                          strokeWidth="4"
                          strokeDasharray={strokeDasharray}
                          strokeDashoffset={strokeDashoffset}
                          strokeLinecap="round"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      )
                      return acc
                    }, { offset: 0, elements: [] as React.ReactNode[] }).elements}
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-xs text-slate-400 font-semibold uppercase">รวม</span>
                    <span className="text-xl font-display font-extrabold text-slate-900">{totalProductsCount}</span>
                    <span className="text-[10px] text-slate-400 font-medium">รายการ</span>
                  </div>
                </div>
              </div>

              {/* Legend List */}
              <div className="mt-6 space-y-2">
                {categoryCounts.map((cat, idx) => {
                  const pct = Math.round((cat.count / totalCategorized) * 100)
                  return (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }}></span>
                        <span className="font-semibold text-slate-700">{cat.label}</span>
                      </div>
                      <span className="font-display font-bold text-slate-500">{cat.count} <span className="text-[10px] text-slate-400">({pct}%)</span></span>
                    </div>
                  )
                })}
              </div>
            </div>
          </motion.div>

          {/* Quick Actions (3 Cols) */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.35 }}
            className="lg:col-span-3 bg-white p-6 sm:p-7 rounded-3xl border border-slate-100 shadow-xs flex flex-col justify-between"
          >
            <div>
              <h3 className="text-lg font-display font-bold text-slate-900 mb-1">เมนูด่วน (Quick Action)</h3>
              <p className="text-xs text-slate-400 font-medium mb-6">ปุ่มลัดสำหรับเข้าถึงฟังก์ชันหลัก</p>

              <div className="space-y-3">
                <Link 
                  href="/scan?mode=receive" 
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100/80 text-emerald-800 hover:bg-emerald-100/70 transition-all group font-semibold text-sm shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                      <ArrowDownToLine className="w-4 h-4" />
                    </div>
                    <span>รับเข้าสินค้า</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-emerald-600 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link 
                  href="/scan?mode=issue" 
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-red-50/70 border border-red-100/80 text-[#BE1111] hover:bg-red-100/70 transition-all group font-semibold text-sm shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#BE1111] text-white flex items-center justify-center shadow-xs">
                      <ArrowUpFromLine className="w-4 h-4" />
                    </div>
                    <span>เบิกออกสินค้า</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#BE1111] group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link 
                  href="/scan" 
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-purple-50/70 border border-purple-100/80 text-purple-800 hover:bg-purple-100/70 transition-all group font-semibold text-sm shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                      <ScanLine className="w-4 h-4" />
                    </div>
                    <span>สแกน QR Code</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-purple-600 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link 
                  href="/reports" 
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60 text-slate-700 hover:bg-slate-100 transition-all group font-semibold text-sm shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-700 text-white flex items-center justify-center shadow-xs">
                      <BarChart3 className="w-4 h-4" />
                    </div>
                    <span>ดูรายงานทั้งหมด</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </motion.div>

        </div>

        {/* Bottom Section: Recent Transactions Table (Full Width) */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-100 shadow-xs"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-display font-bold text-slate-900">รายการล่าสุด (Recent Transactions)</h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">5 รายการประวัติการทำรายการล่าสุดในระบบ</p>
            </div>
            <Link 
              href="/reports" 
              className="inline-flex items-center gap-1 text-xs font-bold text-[#BE1111] hover:text-red-700 transition-colors"
            >
              <span>ดูทั้งหมด</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 px-4">วันที่ / เวลา</th>
                  <th className="pb-3 px-4">วัตถุดิบบรรจุภัณฑ์</th>
                  <th className="pb-3 px-4 text-center">ประเภท</th>
                  <th className="pb-3 px-4 text-center">จำนวน</th>
                  <th className="pb-3 px-4 text-center">หมายเหตุ</th>
                  <th className="pb-3 px-4 text-center">สถานะ</th>
                  <th className="pb-3 px-4 text-center">ผู้ดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      กำลังโหลดข้อมูลรายการล่าสุด...
                    </td>
                  </tr>
                ) : recentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      ยังไม่มีรายการประวัติการทำรายการในระบบ
                    </td>
                  </tr>
                ) : (
                  recentTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-4 whitespace-nowrap text-xs font-display text-slate-500">
                        {tx.createdAt.replace('T', ' ').substring(0, 16)}
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-semibold text-slate-900 text-sm">
                          {tx.product?.description || tx.itemSnapshot.name}
                        </div>
                        <div className="text-xs font-display text-slate-400 mt-0.5">
                          {tx.product?.itemCode || tx.itemSnapshot.itemCode}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        {tx.type === 'receive' ? (
                          <span className="whitespace-nowrap inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold font-display bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
                            <span>รับเข้า</span>
                          </span>
                        ) : (
                          <span className="whitespace-nowrap inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold font-display bg-red-50 text-[#BE1111] border border-red-200/80 shadow-2xs">
                            <span>เบิกออก</span>
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center font-display font-bold text-slate-900 whitespace-nowrap">
                        {tx.quantity.toLocaleString()}
                      </td>
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        {tx.note && tx.note.includes('ปรับปรุงสต็อก') ? (
                          (() => {
                            const { title, detail } = parseStockAdjustNote(tx.note)
                            return (
                              <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500/10 px-2.5 py-1 text-xs font-bold font-display text-amber-800 border border-amber-200/60 shadow-2xs whitespace-nowrap">
                                <SlidersHorizontal className="w-3 h-3 text-amber-600 shrink-0" />
                                <span>{title}</span>
                                {detail && <span className="text-[10px] text-amber-700/90 font-medium">{detail}</span>}
                              </span>
                            )
                          })()
                        ) : tx.note ? (
                          <span className="text-xs text-slate-500 font-display bg-slate-100/50 px-2.5 py-1 rounded-lg border border-slate-200/50 inline-block">
                            {tx.note}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        {tx.status === 'confirmed' ? (
                          <span className="whitespace-nowrap inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold font-display bg-emerald-500/10 text-emerald-700 border border-emerald-200/70 shadow-2xs">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                            <span>ยืนยันแล้ว</span>
                          </span>
                        ) : tx.status === 'rejected' ? (
                          <span className="whitespace-nowrap inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold font-display bg-rose-500/10 text-rose-700 border border-rose-200/70 shadow-2xs">
                            <XCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                            <span>ปฏิเสธแล้ว</span>
                          </span>
                        ) : (
                          <span className="whitespace-nowrap inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold font-display bg-amber-500/10 text-amber-800 border border-amber-200/70 shadow-2xs">
                            <Clock className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                            <span>รอการยืนยัน</span>
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center whitespace-nowrap text-xs text-slate-700 font-medium">
                        {tx.createdBy?.fullName || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

      </div>
    </main>
  )
}
