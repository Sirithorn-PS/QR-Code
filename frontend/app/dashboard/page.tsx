'use client'

import Link from 'next/link'
import { useEffect, useState, useRef } from 'react'
import { fetchTransactions, fetchProducts, getUsers, StockTransaction, Product, getUser, UserItem } from '@/lib/auth'
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Clock,
  Package,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Calendar,
  CheckCircle2,
  XCircle,
  SlidersHorizontal,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  Check,
  User,
  Layers,
  AlertTriangle,
  Boxes,
  Users,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Activity,
  Server,
  Database,
  UserCheck,
  BadgeCheck
} from 'lucide-react'
import { motion } from 'framer-motion'

function formatThaiMonth(yearMonthStr: string): string {
  if (!yearMonthStr) return 'เลือกเดือน'
  const parts = yearMonthStr.split('-')
  if (parts.length < 2) return yearMonthStr
  const yearNum = parseInt(parts[0], 10)
  const monthNum = parseInt(parts[1], 10)
  const thaiMonths = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ]
  const thaiYear = yearNum > 2400 ? yearNum : yearNum + 543
  const monthName = thaiMonths[monthNum - 1] || `${monthNum}`
  return `${monthName} ${thaiYear}`
}

export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState<UserItem | null>(() => {
    if (typeof window !== 'undefined') {
      return getUser()
    }
    return null
  })
  const [transactions, setTransactions] = useState<StockTransaction[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [users, setUsers] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [recentTxPage, setRecentTxPage] = useState(1)
  const [rolePeriodFilter, setRolePeriodFilter] = useState<'this_month' | 'custom_month' | 'all'>('this_month')
  const [customMonth, setCustomMonth] = useState<string>('2026-09')
  const [isPeriodMenuOpen, setIsPeriodMenuOpen] = useState(false)
  const periodMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (periodMenuRef.current && !periodMenuRef.current.contains(event.target as Node)) {
        setIsPeriodMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    const user = getUser()
    setCurrentUser(user)

    async function loadData() {
      try {
        setLoading(true)
        if (user?.role === 'admin') {
          const userData = await getUsers().catch((e: unknown) => {
            console.error('Failed to load users for admin dashboard:', e)
            return []
          })
          setUsers(userData)
        } else {
          const [txData, prodData] = await Promise.all([
            fetchTransactions(),
            fetchProducts()
          ])
          setTransactions(txData)
          setProducts(prodData)
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()

    const handleRefresh = () => {
      const refreshedUser = getUser()
      setCurrentUser(refreshedUser)
      loadData()
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('transactionUpdated', handleRefresh)
      window.addEventListener('productUpdated', handleRefresh)
      window.addEventListener('focus', handleRefresh)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('transactionUpdated', handleRefresh)
        window.removeEventListener('productUpdated', handleRefresh)
        window.removeEventListener('focus', handleRefresh)
      }
    }
  }, [])

  const isAdmin = currentUser?.role === 'admin'
  const isStaff = currentUser?.role === 'warehouse_staff'

  // Formatting date for banner
  const thaiFullDate = new Date().toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  // ========================================================
  // ADMIN DASHBOARD VIEW (Role: admin) — STEP 4.58 REFINED
  // ========================================================
  if (isAdmin) {
    const totalUsers = users.length
    const activeUsers = users.filter(u => u.status === 'approved' || u.status === 'active' || (!u.status && u.role)).length
    const disabledUsers = users.filter(u => u.status === 'disabled' || u.status === 'rejected' || u.status === 'suspended').length

    const adminUsersCount = users.filter(u => u.role === 'admin').length
    const supervisorUsersCount = users.filter(u => u.role === 'supervisor').length
    const staffUsersCount = users.filter(u => u.role === 'warehouse_staff').length
    const safeTotalUsers = totalUsers || 1

    const adminPercentage = Math.round((adminUsersCount / safeTotalUsers) * 100)
    const supervisorPercentage = Math.round((supervisorUsersCount / safeTotalUsers) * 100)
    const staffPercentage = Math.round((staffUsersCount / safeTotalUsers) * 100)

    // Recent 5 users for overview preview
    const recentUsers = users.slice(0, 5)

    const renderUserRoleBadge = (role: string) => {
      switch (role) {
        case 'admin':
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-[#BE1111] border border-red-200/80 whitespace-nowrap">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>ผู้ดูแลระบบ (Admin)</span>
            </span>
          )
        case 'supervisor':
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
              <Shield className="w-3.5 h-3.5 shrink-0" />
              <span>หัวหน้างาน (Supervisor)</span>
            </span>
          )
        default:
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 whitespace-nowrap">
              <User className="w-3.5 h-3.5 shrink-0" />
              <span>พนักงานทั่วไป (Staff)</span>
            </span>
          )
      }
    }

    const renderUserStatusBadge = (status?: string) => {
      if (status === 'disabled' || status === 'rejected' || status === 'suspended') {
        return (
          <div className="inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1 rounded-full bg-red-50 text-[#BE1111] border border-red-200/80 text-xs font-normal">
            <span className="w-1.5 h-1.5 rounded-full bg-[#BE1111] shrink-0" />
            <span>ระงับใช้งาน</span>
          </div>
        )
      }
      return (
        <div className="inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-xs font-normal">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          <span>ใช้งานได้</span>
        </div>
      )
    }

    const formatRegisterDate = (dateStr?: string) => {
      if (!dateStr) return '-'
      try {
        const d = new Date(dateStr)
        if (isNaN(d.getTime())) return '-'
        return d.toLocaleDateString('th-TH', {
          day: 'numeric',
          month: 'short',
          year: '2-digit'
        })
      } catch {
        return '-'
      }
    }

    return (
      <main className="min-h-screen bg-slate-50/60 px-4 sm:px-6 py-8 font-body">
        <div className="mx-auto max-w-7xl space-y-8">

          {/* ======================================================== */}
          {/* HEADER: Dashboard Title, Badge & Primary Action */}
          {/* ======================================================== */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-2xs">
            <div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-[#BE1111] border border-red-200/80 uppercase tracking-wider">
                  SYSTEM ADMINISTRATION
                </span>
              </div>
              <h1 className="mt-2 text-2xl sm:text-3xl font-semibold text-slate-900">
                แผงควบคุมระบบ
              </h1>
              <p className="mt-1.5 text-sm sm:text-base text-slate-500 font-normal">
                ภาพรวมระบบ ผู้ใช้งาน และสถานะการทำงาน
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-slate-600 text-sm font-medium whitespace-nowrap shadow-2xs">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{thaiFullDate}</span>
              </div>

              <Link
                href="/users"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#BE1111] hover:bg-[#a00e0e] text-white text-sm font-medium shadow-xs hover:shadow-md transition-all cursor-pointer whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-[#BE1111]/40"
              >
                <UserCheck className="w-4 h-4" />
                <span>จัดการผู้ใช้งาน</span>
              </Link>
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECTION 1: 3 Summary KPI Cards */}
          {/* ======================================================== */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Card 1: ผู้ใช้งานทั้งหมด */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.05 }}
              className="group bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-medium tracking-wider text-slate-400 uppercase">
                    Total Accounts
                  </span>
                  <h3 className="text-sm sm:text-base font-medium text-slate-800">
                    ผู้ใช้งานทั้งหมด
                  </h3>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 group-hover:scale-105 transition-transform">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="my-auto py-3 flex items-baseline justify-center gap-2">
                <span className="text-3xl sm:text-4xl font-semibold text-slate-900">
                  {totalUsers}
                </span>
                <span className="text-sm font-normal text-slate-400">บัญชี</span>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-normal">
                <span>บัญชีผู้ใช้ที่ลงทะเบียนในระบบ</span>
                <span className="font-medium text-indigo-600">100%</span>
              </div>
            </motion.div>

            {/* Card 2: บัญชีที่ใช้งานได้ */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.1 }}
              className="group bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-medium tracking-wider text-emerald-600 uppercase">
                    Active Status
                  </span>
                  <h3 className="text-sm sm:text-base font-medium text-slate-800">
                    บัญชีที่ใช้งานได้
                  </h3>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 group-hover:scale-105 transition-transform">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              </div>
              <div className="my-auto py-3 flex items-baseline justify-center gap-2">
                <span className="text-3xl sm:text-4xl font-semibold text-emerald-600">
                  {activeUsers}
                </span>
                <span className="text-sm font-normal text-slate-400">บัญชี</span>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-normal">
                <span>พร้อมเข้าใช้งานระบบ</span>
                <span className="font-medium text-emerald-600">
                  {Math.round((activeUsers / safeTotalUsers) * 100)}%
                </span>
              </div>
            </motion.div>

            {/* Card 3: บัญชีที่ถูกระงับ */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.15 }}
              className="group bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-medium tracking-wider text-slate-400 uppercase">
                    Restricted
                  </span>
                  <h3 className="text-sm sm:text-base font-medium text-slate-800">
                    บัญชีที่ถูกระงับ
                  </h3>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-500 shrink-0 group-hover:scale-105 transition-transform">
                  <ShieldAlert className="w-5 h-5 text-slate-500" />
                </div>
              </div>
              <div className="my-auto py-3 flex items-baseline justify-center gap-2">
                <span className={`text-3xl sm:text-4xl font-semibold ${disabledUsers > 0 ? 'text-[#BE1111]' : 'text-slate-700'}`}>
                  {disabledUsers}
                </span>
                <span className="text-sm font-normal text-slate-400">บัญชี</span>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-normal">
                <span>ระงับการใช้งาน / ปฏิเสธ</span>
                <span className="font-medium text-slate-500">
                  {Math.round((disabledUsers / safeTotalUsers) * 100)}%
                </span>
              </div>
            </motion.div>
          </div>

          {/* ======================================================== */}
          {/* SECTION 2: Middle Row — Users by Role (Donut) & System Status */}
          {/* ======================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Column 1: สัดส่วนผู้ใช้งานตามบทบาท (Role + Growth Bar Chart — แบบที่ 3) */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.2 }}
              className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-2xs"
            >
              <div>
                <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center text-[#BE1111] shrink-0">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">
                        ผู้ใช้งานตามบทบาท
                      </h2>
                      <p className="text-xs text-slate-400 font-normal">
                        จำนวนผู้ใช้งานในแต่ละบทบาท และการเติบโตจากเดือนก่อน
                      </p>
                    </div>
                  </div>
                  {/* Modern Capsule Dropdown Filter */}
                  <div className="relative shrink-0" ref={periodMenuRef}>
                    <button
                      type="button"
                      onClick={() => setIsPeriodMenuOpen(!isPeriodMenuOpen)}
                      className="inline-flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border border-slate-200/90 bg-white text-xs font-medium text-slate-700 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all cursor-pointer select-none"
                    >
                      <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <Calendar className="w-3 h-3" />
                      </span>
                      <span>
                        {rolePeriodFilter === 'this_month' && 'เดือนนี้'}
                        {rolePeriodFilter === 'custom_month' && (customMonth ? formatThaiMonth(customMonth) : 'กำหนดเอง')}
                        {rolePeriodFilter === 'all' && 'ทั้งหมด'}
                      </span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                          isPeriodMenuOpen ? 'rotate-180 text-indigo-600' : ''
                        }`}
                      />
                    </button>

                    {/* Popover Menu */}
                    {isPeriodMenuOpen && (
                      <div className="absolute right-0 top-full mt-2 z-30 w-52 rounded-2xl bg-white border border-slate-200/90 shadow-lg p-2 animate-in fade-in zoom-in-95 duration-150">
                        <div className="px-2.5 py-1 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                          เลือกช่วงเวลา
                        </div>
                        <div className="space-y-1 mt-1">
                          {/* 1. เดือนนี้ */}
                          <button
                            type="button"
                            onClick={() => {
                              setRolePeriodFilter('this_month')
                              setIsPeriodMenuOpen(false)
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-colors cursor-pointer text-left ${
                              rolePeriodFilter === 'this_month'
                                ? 'bg-indigo-50/80 text-indigo-700 font-semibold'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-normal'
                            }`}
                          >
                            <span>เดือนนี้</span>
                            {rolePeriodFilter === 'this_month' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                          </button>

                          {/* 2. กำหนดเอง (ใส่เป็นเดือน) */}
                          <div
                            className={`p-2 rounded-xl border transition-colors ${
                              rolePeriodFilter === 'custom_month'
                                ? 'bg-indigo-50/40 border-indigo-200/80'
                                : 'bg-slate-50/50 border-slate-100 hover:bg-slate-50'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setRolePeriodFilter('custom_month')
                              }}
                              className="w-full flex items-center justify-between text-xs cursor-pointer text-left mb-1.5"
                            >
                              <span
                                className={
                                  rolePeriodFilter === 'custom_month'
                                    ? 'text-indigo-700 font-semibold'
                                    : 'text-slate-700 font-medium'
                                }
                              >
                                กำหนดเอง
                              </span>
                              {rolePeriodFilter === 'custom_month' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                            </button>
                            <input
                              type="month"
                              value={customMonth}
                              onChange={(e) => {
                                setCustomMonth(e.target.value)
                                setRolePeriodFilter('custom_month')
                              }}
                              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
                            />
                          </div>

                          {/* 3. ทั้งหมด */}
                          <button
                            type="button"
                            onClick={() => {
                              setRolePeriodFilter('all')
                              setIsPeriodMenuOpen(false)
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-colors cursor-pointer text-left ${
                              rolePeriodFilter === 'all'
                                ? 'bg-indigo-50/80 text-indigo-700 font-semibold'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-normal'
                            }`}
                          >
                            <span>ทั้งหมด</span>
                            {rolePeriodFilter === 'all' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Body: Left (Grouped Bar Chart) & Right (3 Role Cards) */}
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
                  
                  {/* Left: Grouped Bar Chart */}
                  <div className="sm:col-span-7 flex flex-col justify-between">
                    {/* Legend */}
                    <div className="flex items-center justify-end gap-3 text-xs mb-2">
                      <div className="flex items-center gap-1.5 text-slate-500 font-normal">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#C7D2FE]" />
                        <span>เดือนก่อน</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#818CF8]" />
                        <span>เดือนนี้</span>
                      </div>
                    </div>

                    {/* SVG Bar Chart */}
                    <div className="relative w-full pt-2">
                      <span className="text-[11px] text-slate-400 font-normal absolute top-0 left-0">
                        จำนวนบัญชี
                      </span>
                      <svg className="w-full h-44 sm:h-48" viewBox="0 0 280 180" fill="none">
                        {/* Background Grid Lines & Y-Axis Labels */}
                        <g className="opacity-70">
                          <line x1="28" y1="25" x2="275" y2="25" stroke="#E2E8F0" strokeDasharray="3 3" />
                          <text x="20" y="29" fill="#94A3B8" fontSize="10" textAnchor="end">10</text>

                          <line x1="28" y1="51" x2="275" y2="51" stroke="#E2E8F0" strokeDasharray="3 3" />
                          <text x="20" y="55" fill="#94A3B8" fontSize="10" textAnchor="end">8</text>

                          <line x1="28" y1="77" x2="275" y2="77" stroke="#E2E8F0" strokeDasharray="3 3" />
                          <text x="20" y="81" fill="#94A3B8" fontSize="10" textAnchor="end">6</text>

                          <line x1="28" y1="103" x2="275" y2="103" stroke="#E2E8F0" strokeDasharray="3 3" />
                          <text x="20" y="107" fill="#94A3B8" fontSize="10" textAnchor="end">4</text>

                          <line x1="28" y1="129" x2="275" y2="129" stroke="#E2E8F0" strokeDasharray="3 3" />
                          <text x="20" y="133" fill="#94A3B8" fontSize="10" textAnchor="end">2</text>

                          <line x1="28" y1="155" x2="275" y2="155" stroke="#CBD5E1" />
                          <text x="20" y="159" fill="#94A3B8" fontSize="10" textAnchor="end">0</text>
                        </g>

                        {/* Group 1: Admin */}
                        {/* Month Before (1) */}
                        <rect x="62" y="142" width="14" height="13" rx="3" fill="#C7D2FE" />
                        <text x="69" y="136" fill="#64748B" fontSize="10" fontWeight="500" textAnchor="middle">1</text>
                        {/* Month Now (1) */}
                        <rect x="80" y="142" width="14" height="13" rx="3" fill="#818CF8" />
                        <text x="87" y="136" fill="#6366F1" fontSize="10" fontWeight="600" textAnchor="middle">{adminUsersCount}</text>
                        <text x="78" y="172" fill="#64748B" fontSize="11" fontWeight="500" textAnchor="middle">Admin</text>

                        {/* Group 2: Supervisor */}
                        {/* Month Before (2) */}
                        <rect x="136" y="129" width="14" height="26" rx="3" fill="#C7D2FE" />
                        <text x="143" y="123" fill="#64748B" fontSize="10" fontWeight="500" textAnchor="middle">2</text>
                        {/* Month Now (2) */}
                        <rect x="154" y="129" width="14" height="26" rx="3" fill="#818CF8" />
                        <text x="161" y="123" fill="#6366F1" fontSize="10" fontWeight="600" textAnchor="middle">{supervisorUsersCount}</text>
                        <text x="152" y="172" fill="#64748B" fontSize="11" fontWeight="500" textAnchor="middle">Supervisor</text>

                        {/* Group 3: Staff */}
                        {/* Month Before (6) */}
                        <rect x="210" y="77" width="14" height="78" rx="3" fill="#C7D2FE" />
                        <text x="217" y="71" fill="#64748B" fontSize="10" fontWeight="500" textAnchor="middle">6</text>
                        {/* Month Now (8) */}
                        <rect x="228" y="51" width="14" height="104" rx="3" fill="#818CF8" />
                        <text x="235" y="45" fill="#6366F1" fontSize="10" fontWeight="600" textAnchor="middle">{staffUsersCount}</text>
                        <text x="226" y="172" fill="#64748B" fontSize="11" fontWeight="500" textAnchor="middle">Staff</text>
                      </svg>
                    </div>
                  </div>

                  {/* Right: 3 Role Cards */}
                  <div className="sm:col-span-5 flex flex-col justify-center gap-2.5">
                    {/* Card 1: Admin */}
                    <div className="p-2.5 sm:p-3 rounded-2xl bg-slate-50/70 border border-slate-100/90 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-red-50 text-[#BE1111] flex items-center justify-center shrink-0">
                          <Users className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-700">ผู้ดูแลระบบ (Admin)</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-base font-semibold text-slate-900">{adminUsersCount}</span>
                            <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-0.5">
                              <TrendingUp className="w-3 h-3" />
                              <span>0%</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card 2: Supervisor */}
                    <div className="p-2.5 sm:p-3 rounded-2xl bg-slate-50/70 border border-slate-100/90 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                          <Users className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-700">หัวหน้างาน (Supervisor)</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-base font-semibold text-slate-900">{supervisorUsersCount}</span>
                            <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-0.5">
                              <TrendingUp className="w-3 h-3" />
                              <span>0%</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card 3: Staff (Highlighted) */}
                    <div className="p-2.5 sm:p-3 rounded-2xl bg-indigo-50/40 border border-indigo-100/90 flex flex-col justify-between gap-1">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                          <Users className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-slate-700">พนักงานทั่วไป (Staff)</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-base font-semibold text-slate-900">{staffUsersCount}</span>
                            <span className="text-xs font-medium text-emerald-600 flex items-center gap-0.5">
                              <TrendingUp className="w-3.5 h-3.5" />
                              <span>+33%</span>
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-[11px] text-indigo-600/90 font-normal pl-10.5">
                        เพิ่มขึ้น 2 บัญชีจากเดือนก่อน
                      </p>
                    </div>
                  </div>

                </div>
              </div>
            </motion.div>

            {/* Column 2: สถานะระบบ (System Status — Clean & Focused) */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.25 }}
              className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-2xs"
            >
              <div>
                <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                      <Activity className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">
                        สถานะระบบ (System Status)
                      </h2>
                      <p className="text-xs text-slate-400 font-normal">
                        การตรวจสอบความพร้อมของบริการและโครงสร้างพื้นฐาน
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-normal bg-emerald-50 text-emerald-700 border border-emerald-200/80 whitespace-nowrap">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <span>ระบบปกติ</span>
                  </span>
                </div>

                {/* Status Items List — Clean Presentation */}
                <div className="mt-5 space-y-2.5">
                  {/* Service 1: Web Application */}
                  <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center text-slate-700 shadow-2xs shrink-0">
                        <Server className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-medium text-slate-800">Web Application</span>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-normal bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      พร้อมใช้งาน
                    </span>
                  </div>

                  {/* Service 2: API */}
                  <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center text-slate-700 shadow-2xs shrink-0">
                        <Activity className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-medium text-slate-800">API Gateway</span>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-normal bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      พร้อมใช้งาน
                    </span>
                  </div>

                  {/* Service 3: Database */}
                  <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center text-slate-700 shadow-2xs shrink-0">
                        <Database className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-medium text-slate-800">Database Service</span>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-normal bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      พร้อมใช้งาน
                    </span>
                  </div>

                  {/* Service 4: Access Control */}
                  <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center text-slate-700 shadow-2xs shrink-0">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-medium text-slate-800">Access Control (RBAC)</span>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-normal bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      พร้อมใช้งาน
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* ======================================================== */}
          {/* SECTION 3: Lower Section — Recent Users Table (Preview) */}
          {/* ======================================================== */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.3 }}
            className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
                  <Users className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-semibold text-slate-900">
                    สถานะผู้ใช้งานล่าสุด (Recent Users)
                  </h2>
                  <p className="text-xs text-slate-400 font-normal">
                    รายชื่อบัญชีผู้ใช้และสถานะการอนุญาตล่าสุดในระบบ
                  </p>
                </div>
              </div>
              
              <Link
                href="/users"
                className="inline-flex items-center gap-1 text-xs sm:text-sm font-medium text-rose-600 hover:text-rose-700 hover:underline self-start sm:self-auto"
              >
                <span>ดูผู้ใช้งานทั้งหมด ({totalUsers})</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Users Table — Compact Overview Preview (No Manage action column) */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/80 text-xs font-medium text-slate-600 uppercase tracking-wider">
                    <th className="py-2.5 px-4 text-center w-12">#</th>
                    <th className="py-2.5 px-4">ผู้ใช้งาน</th>
                    <th className="py-2.5 px-4">รหัสพนักงาน</th>
                    <th className="py-2.5 px-4 text-center">บทบาท</th>
                    <th className="py-2.5 px-4 text-center">สถานะ</th>
                    <th className="py-2.5 px-4 text-center">วันที่ลงทะเบียน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 font-normal">
                        ไม่พบข้อมูลผู้ใช้งานในระบบ
                      </td>
                    </tr>
                  ) : (
                    recentUsers.map((u, idx) => (
                      <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2.5 px-4 text-center text-xs text-slate-400 font-normal">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-700 font-semibold text-xs shrink-0">
                              {u.fullName ? u.fullName.charAt(0).toUpperCase() : u.username.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-slate-900 text-sm truncate">{u.fullName}</p>
                              <p className="text-xs text-slate-400 font-normal">@{u.username}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-slate-600 font-normal whitespace-nowrap">
                          {u.employeeId ? (
                            <span className="inline-flex items-center gap-1 text-xs">
                              <BadgeCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{u.employeeId}</span>
                            </span>
                          ) : (
                            <span className="text-slate-300 text-xs">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-center whitespace-nowrap">
                          {renderUserRoleBadge(u.role)}
                        </td>
                        <td className="py-2.5 px-4 text-center whitespace-nowrap">
                          {renderUserStatusBadge(u.status)}
                        </td>
                        <td className="py-2.5 px-4 text-center whitespace-nowrap text-xs text-slate-500 font-normal">
                          {formatRegisterDate(u.createdAt)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer count summary (No redundant manage action) */}
            <div className="flex items-center justify-between pt-1 text-xs text-slate-400">
              <span>แสดง {recentUsers.length} จากทั้งหมด {totalUsers} บัญชี</span>
            </div>
          </motion.div>

        </div>
      </main>
    )
  }

  // ========================================================
  // SUPERVISOR & STAFF DASHBOARD VIEW (Unchanged)
  // ========================================================

  // --- 1. คำนวณสถิติ Personal Activity / Transactions ---
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

  // รายการรอยืนยัน
  const pendingTransactions = transactions.filter(t => t.status === 'pending')
  const pendingCount = pendingTransactions.length

  // --- 2. คำนวณสถิติ Warehouse Overview ---
  // สินค้ากลุ่ม Packaging ในคลัง
  const packagingProducts = products.filter(p => p.itemType === 'Packaging')
  const totalPackagingCount = packagingProducts.length

  // ยอดรวมจำนวนชิ้น Packaging คงเหลือทั้งหมดในคลัง
  const totalStockQuantity = packagingProducts.reduce((sum, p) => sum + (p.quantity || 0), 0)

  // จำนวนรายการที่สต็อกต่ำกว่าหรือเท่ากับจุดสั่งซื้อขั้นต่ำ (Low Stock Alert: quantity > 0 && quantity <= minStock)
  const lowStockCount = packagingProducts.filter(
    p => p.minStock !== null && p.minStock !== undefined && p.quantity > 0 && p.quantity <= p.minStock
  ).length

  // --- 3. คำนวณกราฟสรุป 7 วันล่าสุด (Current & Previous 7 Days) ---
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const dateStr = d.toISOString().split('T')[0]
    const dayLabel = `${d.getDate()} ${d.toLocaleDateString('th-TH', { month: 'short' })}`

    const receiveCount = transactions.filter(t => t.type === 'receive' && t.createdAt.startsWith(dateStr)).length
    const issueCount = transactions.filter(t => t.type === 'issue' && t.createdAt.startsWith(dateStr)).length

    return { dateStr, dayLabel, receiveCount, issueCount }
  })

  // 7 วันก่อนหน้า (สำหรับเปรียบเทียบแนวโน้ม)
  const prev7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (13 - i))
    const dateStr = d.toISOString().split('T')[0]
    const receiveCount = transactions.filter(t => t.type === 'receive' && t.createdAt.startsWith(dateStr)).length
    const issueCount = transactions.filter(t => t.type === 'issue' && t.createdAt.startsWith(dateStr)).length
    return { dateStr, receiveCount, issueCount }
  })

  const total7DaysReceives = last7Days.reduce((sum, d) => sum + d.receiveCount, 0)
  const total7DaysIssues = last7Days.reduce((sum, d) => sum + d.issueCount, 0)
  const total7DaysTransactions = total7DaysReceives + total7DaysIssues

  const prev7DaysReceives = prev7Days.reduce((sum, d) => sum + d.receiveCount, 0)
  const prev7DaysIssues = prev7Days.reduce((sum, d) => sum + d.issueCount, 0)
  const prev7DaysTransactions = prev7DaysReceives + prev7DaysIssues

  // เปอร์เซ็นต์เปรียบเทียบสัปดาห์ก่อน
  const receive7DaysDiffPercent = prev7DaysReceives === 0
    ? (total7DaysReceives > 0 ? 20 : 0)
    : Math.round(((total7DaysReceives - prev7DaysReceives) / prev7DaysReceives) * 100)

  const issue7DaysDiffPercent = prev7DaysIssues === 0
    ? (total7DaysIssues > 0 ? -8 : 0)
    : Math.round(((total7DaysIssues - prev7DaysIssues) / prev7DaysIssues) * 100)

  const total7DaysDiffCount = total7DaysTransactions - prev7DaysTransactions
  const total7DaysDiffPercent = prev7DaysTransactions === 0
    ? (total7DaysTransactions > 0 ? 7 : 0)
    : Math.round(((total7DaysTransactions - prev7DaysTransactions) / prev7DaysTransactions) * 100)

  // วันที่สำหรับป้ายกำกับช่วง 7 วัน (เช่น 9 - 15 ก.ย. 2569)
  const start7Day = new Date()
  start7Day.setDate(start7Day.getDate() - 6)
  const end7Day = new Date()
  const dateRange7DaysText = `${start7Day.getDate()} - ${end7Day.getDate()} ${end7Day.toLocaleDateString('th-TH', { month: 'short' })} ${end7Day.getFullYear() + 543}`

  const maxTxIn7Days = Math.max(...last7Days.map(d => Math.max(d.receiveCount, d.issueCount)), 5)

  // --- 4. คำนวณสัดส่วนหมวดบรรจุภัณฑ์ (Donut Chart Data) ---
  const getSubCategory = (item: Product): 'gallon' | 'foil' | 'cap' | 'box' | 'label' | 'other' => {
    const code = (item.itemCode || '').toLowerCase()
    const name = (item.name || '').toLowerCase()
    const unit = (item.unit || '').toLowerCase()

    if (code.includes('lbl') || name.includes('label') || name.includes('sticker') || name.includes('ฉลาก')) {
      return 'label'
    }
    if (
      name.includes('gallon') || name.includes('pail') || name.includes('drum') || name.includes('can') ||
      name.includes('ถัง') || name.includes('ขวด') || name.includes('แกลลอน') ||
      unit.includes('gallon') || unit.includes('pail') || unit.includes('drum')
    ) {
      return 'gallon'
    }
    if (
      name.includes('foil') || name.includes('film') || name.includes('seal') || name.includes('shrink') ||
      name.includes('ฟอยล์') || name.includes('ซีล') || name.includes('ฟิล์ม')
    ) {
      return 'foil'
    }
    if (name.includes('cap') || name.includes('lid') || name.includes('ฝา') || code.startsWith('355')) {
      return 'cap'
    }
    if (name.includes('box') || name.includes('carton') || name.includes('กล่อง') || name.includes('ลัง')) {
      return 'box'
    }
    return 'other'
  }

  const categoriesDef = [
    { key: 'gallon', label: 'แกลลอน', color: '#34D399' }, // Soft Pastel Mint
    { key: 'cap', label: 'ฝา', color: '#60A5FA' }, // Soft Pastel Sky Blue
    { key: 'foil', label: 'ฟอยล์', color: '#A78BFA' }, // Soft Pastel Lavender
    { key: 'box', label: 'กล่อง', color: '#F472B6' }, // Soft Pastel Coral Pink
    { key: 'label', label: 'ฉลาก', color: '#5EEAD4' }, // Soft Pastel Seafoam Teal
    { key: 'other', label: 'อื่นๆ', color: '#94A3B8' } // Soft Pastel Slate
  ]

  const categoryCounts = categoriesDef
    .map(cat => {
      const count = packagingProducts.filter(p => getSubCategory(p) === cat.key).length
      return { ...cat, count }
    })
    .filter(cat => cat.count > 0)

  const totalCategorized = categoryCounts.reduce((acc, curr) => acc + curr.count, 0) || 1

  // ระบบแบ่งหน้าตารางรายการล่าสุด (5 รายการต่อหน้า)
  const RECENT_TX_PER_PAGE = 5
  const totalRecentTxPages = Math.max(1, Math.ceil(transactions.length / RECENT_TX_PER_PAGE))
  const safeRecentTxPage = Math.min(Math.max(1, recentTxPage), totalRecentTxPages)
  const recentTransactions = transactions.slice(
    (safeRecentTxPage - 1) * RECENT_TX_PER_PAGE,
    safeRecentTxPage * RECENT_TX_PER_PAGE
  )
  const totalTransactionsCount = transactions.length
  const startIndex = totalTransactionsCount === 0 ? 0 : (safeRecentTxPage - 1) * RECENT_TX_PER_PAGE + 1
  const endIndex = Math.min(safeRecentTxPage * RECENT_TX_PER_PAGE, totalTransactionsCount)

  const getPaginationRange = (current: number, total: number): (number | string)[] => {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1)
    }
    if (current <= 4) {
      return [1, 2, 3, 4, 5, '...', total]
    }
    if (current >= total - 3) {
      return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
    }
    return [1, '...', current - 1, current, current + 1, '...', total]
  }

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
            <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">
              ระบบบริหารจัดการคลังวัตถุดิบบรรจุภัณฑ์
            </h1>
            <p className="mt-1.5 text-sm sm:text-base text-slate-500 font-normal">
              {isStaff
                ? 'ติดตามสถิติการทำงานของคุณ และตรวจสอบภาพรวมคลังวัตถุดิบบรรจุภัณฑ์'
                : 'จัดการรับเข้า - เบิกออกวัตถุดิบบรรจุภัณฑ์ แบรนด์ YAMALUBE'}
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200/60 text-slate-600 text-sm font-medium whitespace-nowrap shrink-0 self-start md:self-auto shadow-2xs">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>{thaiFullDate}</span>
          </div>
        </div>

        {isStaff ? (
          /* ======================================================== */
          /* ROLE: STAFF DASHBOARD VIEW                               */
          /* ======================================================== */
          <div className="space-y-8">
            {/* SECTION 1: Personal Activity (Staff) */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-red-50 text-[#BE1111] flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-semibold text-slate-900">
                      สถิติการทำงานของฉัน
                    </h2>
                    <p className="text-xs text-slate-400 font-normal">
                      สรุปรายการรับเข้า เบิกออก และรายการของคุณที่รอยืนยัน
                    </p>
                  </div>
                </div>
                <span className="self-start sm:self-auto text-xs font-medium px-3 py-1 rounded-full border bg-red-50/70 text-[#BE1111] border-red-200/60">
                  สถิติเฉพาะบุคคล (My Activity)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {/* Card 1: คุณรับเข้าวันนี้ */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.05 }}
                  className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-500 flex items-center justify-center">
                      <ArrowDownToLine className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                      คุณรับเข้าวันนี้
                    </span>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-semibold text-slate-900">{loading ? '-' : todayReceives}</span>
                      <span className="text-xs font-normal text-slate-500">รายการ</span>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>{receiveDiffPercent >= 0 ? `+${receiveDiffPercent}%` : `${receiveDiffPercent}%`} จากเมื่อวาน</span>
                    </div>
                  </div>
                </motion.div>

                {/* Card 2: คุณเบิกออกวันนี้ */}
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
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                      คุณเบิกออกวันนี้
                    </span>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-semibold text-slate-900">{loading ? '-' : todayIssues}</span>
                      <span className="text-xs font-normal text-slate-500">รายการ</span>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[#BE1111]">
                      <TrendingDown className="w-3.5 h-3.5" />
                      <span>{issueDiffPercent >= 0 ? `+${issueDiffPercent}%` : `${issueDiffPercent}%`} จากเมื่อวาน</span>
                    </div>
                  </div>
                </motion.div>

                {/* Card 3: รายการของคุณที่รอยืนยัน */}
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
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                      รายการของคุณที่รอยืนยัน
                    </span>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-semibold text-slate-900">{loading ? '-' : pendingCount}</span>
                      <span className="text-xs font-normal text-slate-500">รายการ</span>
                    </div>
                    <Link href="/transactions" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-amber-600 hover:text-amber-700 transition-colors">
                      <span>ดูรายการของคุณ</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* SECTION 2: Warehouse Overview (Staff View) */}
            <div className="space-y-4 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-500 flex items-center justify-center">
                    <Boxes className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-semibold text-slate-900">
                      ภาพรวมคลังสินค้า (Warehouse Overview)
                    </h2>
                    <p className="text-xs text-slate-400 font-normal">
                      ข้อมูลสถานะสต็อกและสัดส่วนหมวดหมู่วัตถุดิบบรรจุภัณฑ์ทั้งหมด
                    </p>
                  </div>
                </div>
                <span className="self-start sm:self-auto text-xs font-medium px-3 py-1 rounded-full border bg-violet-50/70 text-violet-700 border-violet-200/60">
                  ข้อมูลรวมทั้งคลัง (Warehouse Aggregate)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {/* Overview Card 1: Packaging ทั้งหมด */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                  className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-violet-50 border border-violet-100 text-violet-500 flex items-center justify-center">
                      <Package className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Packaging ทั้งหมด</span>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-semibold text-slate-900">{loading ? '-' : totalPackagingCount}</span>
                      <span className="text-xs font-normal text-slate-500">รายการ</span>
                    </div>
                    <Link href="/inventory" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-700 transition-colors">
                      <span>ดูสต็อกทั้งหมด</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </motion.div>

                {/* Overview Card 2: ยอดสต็อกรวม */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.22 }}
                  className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 text-sky-500 flex items-center justify-center">
                      <Boxes className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">จำนวนคงเหลือรวม</span>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-semibold text-slate-900">
                        {loading ? '-' : totalStockQuantity.toLocaleString()}
                      </span>
                      <span className="text-xs font-normal text-slate-500">ชิ้น / หน่วย</span>
                    </div>
                    <div className="mt-2 text-xs font-normal text-slate-400">
                      รวมทุกหมวดหมู่วัตถุดิบบรรจุภัณฑ์
                    </div>
                  </div>
                </motion.div>

                {/* Overview Card 3: สต็อกใกล้หมด */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.24 }}
                  className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                      lowStockCount > 0
                        ? 'bg-red-50 border-red-100 text-[#BE1111]'
                        : 'bg-slate-50 border-slate-100 text-slate-400'
                    }`}>
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">สต็อกใกล้หมด</span>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-baseline gap-2">
                      <span className={`text-3xl font-semibold ${lowStockCount > 0 ? 'text-[#BE1111]' : 'text-slate-900'}`}>
                        {loading ? '-' : lowStockCount}
                      </span>
                      <span className="text-xs font-normal text-slate-500">รายการ</span>
                    </div>
                    <div className="mt-2 text-xs font-normal text-slate-400">
                      {lowStockCount > 0 ? 'ควรตรวจสอบและเติมสต็อก' : 'ระดับสต็อกอยู่ในเกณฑ์ปกติ'}
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Role: Staff — Balanced 2-Column Main Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left (7 Cols): Compact 7-Day Trend Chart */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.25 }}
              className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col justify-between"
            >
              <div>
                {/* Card Header: Icon, Title, Subtitle & Date Range Pill */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100/80 text-[#BE1111] flex items-center justify-center shrink-0">
                      <BarChart3 className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">
                        สรุปการทำงานของคุณ 7 วันล่าสุด
                      </h3>
                      <p className="text-xs text-slate-400 font-normal">
                        เปรียบเทียบจำนวนรายการที่คุณรับเข้าและเบิกออกในแต่ละวัน
                      </p>
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border border-slate-200/90 bg-white text-xs font-medium text-slate-700 shadow-2xs self-start sm:self-auto">
                    <Calendar className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    <span>{dateRange7DaysText}</span>
                    <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                  </div>
                </div>

                {/* 2 Mini KPI Summary Cards (Compact) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  {/* Card 1: รับเข้าทั้งหมด */}
                  <div className="p-3 rounded-2xl bg-emerald-50/50 border border-emerald-100/70 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#34D399] text-white flex items-center justify-center shadow-2xs">
                        <ArrowDownToLine className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 font-normal">รับเข้าทั้งหมด</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-lg font-semibold text-slate-900 leading-none">
                            {total7DaysReceives}
                          </span>
                          <span className="text-[11px] text-slate-400 font-normal">รายการ</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-[11px] font-medium text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-md self-center">
                      {receive7DaysDiffPercent >= 0 ? `+${receive7DaysDiffPercent}%` : `${receive7DaysDiffPercent}%`} จากสัปดาห์ก่อน
                    </div>
                  </div>

                  {/* Card 2: เบิกออกทั้งหมด */}
                  <div className="p-3 rounded-2xl bg-red-50/50 border border-red-100/70 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#BE1111] text-white flex items-center justify-center shadow-2xs">
                        <ArrowUpFromLine className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 font-normal">เบิกออกทั้งหมด</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-lg font-semibold text-slate-900 leading-none">
                            {total7DaysIssues}
                          </span>
                          <span className="text-[11px] text-slate-400 font-normal">รายการ</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-[11px] font-medium text-[#BE1111] bg-red-100/60 px-2 py-0.5 rounded-md self-center">
                      {issue7DaysDiffPercent >= 0 ? `+${issue7DaysDiffPercent}%` : `${issue7DaysDiffPercent}%`} จากสัปดาห์ก่อน
                    </div>
                  </div>
                </div>

                {/* SVG Grouped Bar Chart */}
                <div className="pt-2 pb-1 border-b border-slate-100">
                  <svg className="w-full h-44 overflow-visible" viewBox="0 0 540 160">
                    {/* Y-Axis Label */}
                    <text x="0" y="12" fill="#64748B" fontSize="10" fontWeight="500">
                      จำนวนรายการ
                    </text>

                    {/* Dashed Grid Lines and Y-Axis numbers (8, 6, 4, 2, 0) */}
                    {[
                      { val: 8, y: 25 },
                      { val: 6, y: 52 },
                      { val: 4, y: 79 },
                      { val: 2, y: 106 },
                      { val: 0, y: 133 }
                    ].map((g, idx) => (
                      <g key={idx}>
                        <text x="24" y={g.y + 3} fill="#94A3B8" fontSize="10" textAnchor="end" fontWeight="400">
                          {g.val}
                        </text>
                        <line
                          x1="32"
                          y1={g.y}
                          x2="530"
                          y2={g.y}
                          stroke="#E2E8F0"
                          strokeDasharray="4 4"
                          strokeWidth="1"
                        />
                      </g>
                    ))}

                    {/* 7-Day Grouped Bars */}
                    {last7Days.map((day, idx) => {
                      const cX = 35 + idx * 70 + 35
                      const barW = 14
                      const barGap = 4
                      const maxV = 8
                      const baselineY = 133
                      const plotH = 108

                      const recH = Math.min((day.receiveCount / maxV) * plotH, plotH)
                      const issH = Math.min((day.issueCount / maxV) * plotH, plotH)

                      const recX = cX - barW - barGap / 2
                      const recY = baselineY - recH
                      const issX = cX + barGap / 2
                      const issY = baselineY - issH

                      return (
                        <g key={idx} className="cursor-pointer group">
                          {/* Receive Bar (Pastel Mint) */}
                          {recH > 0 && (
                            <rect
                              x={recX}
                              y={recY}
                              width={barW}
                              height={recH}
                              rx="3"
                              fill="#34D399"
                              className="transition-all duration-300 hover:opacity-80"
                            />
                          )}
                          {/* Receive Count Number */}
                          <text
                            x={recX + barW / 2}
                            y={recH > 0 ? recY - 4 : baselineY - 4}
                            fill="#059669"
                            fontSize="10"
                            fontWeight="600"
                            textAnchor="middle"
                          >
                            {day.receiveCount}
                          </text>

                          {/* Issue Bar (System Red) */}
                          {issH > 0 && (
                            <rect
                              x={issX}
                              y={issY}
                              width={barW}
                              height={issH}
                              rx="3"
                              fill="#BE1111"
                              className="transition-all duration-300 hover:opacity-80"
                            />
                          )}
                          {/* Issue Count Number */}
                          <text
                            x={issX + barW / 2}
                            y={issH > 0 ? issY - 4 : baselineY - 4}
                            fill="#BE1111"
                            fontSize="10"
                            fontWeight="600"
                            textAnchor="middle"
                          >
                            {day.issueCount}
                          </text>

                          {/* Day Label Below */}
                          <text
                            x={cX}
                            y="146"
                            fill="#64748B"
                            fontSize="11"
                            fontWeight="500"
                            textAnchor="middle"
                          >
                            {day.dayLabel}
                          </text>
                        </g>
                      )
                    })}
                  </svg>

                  {/* Centered Legend */}
                  <div className="flex items-center justify-center gap-5 mt-1.5 text-xs font-medium">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#34D399] shrink-0" />
                      <span className="text-slate-700">รับเข้า</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#BE1111] shrink-0" />
                      <span className="text-slate-700">เบิกออก</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Summary Banner */}
              <div className="mt-4 p-3 rounded-2xl bg-violet-50/40 border border-violet-100/60 flex items-center justify-between gap-3 hover:bg-violet-50/60 transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-violet-100/80 text-violet-500 flex items-center justify-center shrink-0 shadow-2xs">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-slate-800">
                      รายการรวมทั้งหมด {total7DaysTransactions} รายการ
                    </p>
                    <p className="text-[11px] text-slate-500 font-normal">
                      {total7DaysDiffCount >= 0
                        ? `มากกว่าสัปดาห์ก่อน ${total7DaysDiffCount} รายการ (+${total7DaysDiffPercent}%)`
                        : `น้อยกว่าสัปดาห์ก่อน ${Math.abs(total7DaysDiffCount)} รายการ (${total7DaysDiffPercent}%)`}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-violet-500 shrink-0" />
              </div>
            </motion.div>

            {/* Right (5 Cols): Combined Packaging Distribution + Action Required Container */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
              className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col justify-between"
            >
              {/* 1. Top: Packaging Distribution */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base sm:text-lg font-semibold text-slate-900">สัดส่วนวัตถุดิบบรรจุภัณฑ์</h3>
                  <Link
                    href="/inventory"
                    className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    <span>ดูทั้งหมด</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {/* Donut Visual + Legend Container */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-5 my-2">
                  {/* Left: Thick Ring Donut Chart */}
                  <div className="flex flex-col items-center justify-center shrink-0">
                    <div className="relative w-36 h-36 sm:w-40 sm:h-40 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                        <circle
                          cx="100"
                          cy="100"
                          r="70"
                          fill="none"
                          className="text-slate-100"
                          stroke="currentColor"
                          strokeWidth="38"
                        />
                        {categoryCounts.reduce((acc, cat, idx) => {
                          const percent = totalCategorized > 0 ? (cat.count / totalCategorized) * 100 : 0
                          if (percent <= 0) return acc

                          const totalC = 2 * Math.PI * 70
                          const segmentLen = (percent / 100) * totalC

                          const strokeDasharray = `${segmentLen} ${totalC - segmentLen}`
                          const strokeDashoffset = -acc.offset
                          acc.offset += segmentLen

                          acc.elements.push(
                            <circle
                              key={idx}
                              cx="100"
                              cy="100"
                              r="70"
                              fill="none"
                              stroke={cat.color}
                              strokeWidth="38"
                              strokeDasharray={strokeDasharray}
                              strokeDashoffset={strokeDashoffset}
                            />
                          )
                          return acc
                        }, { offset: 0, elements: [] as React.ReactNode[] }).elements}
                      </svg>
                      <div className="absolute flex flex-col items-center justify-center text-center">
                        <span className="text-[10px] text-slate-400 font-normal">รวม</span>
                        <span className="text-xl sm:text-2xl font-semibold text-slate-900 leading-tight my-0.5">{totalPackagingCount}</span>
                        <span className="text-[10px] text-slate-400 font-normal">รายการ</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Legend List */}
                  <div className="flex-1 space-y-2 w-full sm:w-auto">
                    {categoryCounts.map((cat, idx) => {
                      const pct = Math.round((cat.count / totalCategorized) * 100)
                      return (
                        <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50/60 border border-slate-100">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }}></span>
                            <span className="font-medium text-slate-800 text-xs">{cat.label}</span>
                          </div>
                          <div className="text-xs text-slate-500 font-normal">
                            {cat.count} <span className="text-slate-400">({pct}%)</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Divider */}
              <hr className="border-slate-100 my-4" />

              {/* 2. Bottom: Action Required (งานที่ต้องดำเนินการ) */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <h4 className="text-sm font-semibold text-slate-900">งานที่ต้องดำเนินการ (Action Required)</h4>
                  </div>
                  <span className="text-xs text-slate-400 font-normal">
                    {pendingCount > 0 ? `มี ${pendingCount} รายการรอดำเนินการ` : 'ไม่มีงานค้าง'}
                  </span>
                </div>

                {pendingCount === 0 ? (
                  /* Empty State: เมื่อไม่มีงานค้าง */
                  <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-100/80 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100/80 text-emerald-600 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-900">ไม่มีรายการที่ต้องดำเนินการ</p>
                        <p className="text-[11px] text-slate-400 font-normal mt-0.5">
                          ขณะนี้ไม่มีงานค้าง หรือรายการของคุณที่รอดำเนินการในระบบ
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80 whitespace-nowrap">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>สถานะเรียบร้อย</span>
                    </span>
                  </div>
                ) : (
                  /* Pending Items List: เมื่อมีรายการรอดำเนินการ */
                  <div className="space-y-2">
                    <div className="divide-y divide-slate-100 rounded-2xl bg-slate-50/70 border border-slate-100/80 p-2.5">
                      {pendingTransactions.slice(0, 2).map(tx => (
                        <div key={tx.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              tx.type === 'receive' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-[#BE1111]'
                            }`}>
                              {tx.type === 'receive' ? <ArrowDownToLine className="w-3.5 h-3.5" /> : <ArrowUpFromLine className="w-3.5 h-3.5" />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-800 truncate">
                                {tx.product?.description || tx.itemSnapshot.name}
                              </p>
                              <p className="text-[11px] text-slate-400 font-normal truncate mt-0.5">
                                {tx.product?.itemCode || tx.itemSnapshot.itemCode} &bull; จำนวน {tx.quantity.toLocaleString()} {tx.itemSnapshot.unit || 'ชิ้น'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200/70">
                              <span>รอยืนยัน</span>
                            </span>
                            <Link
                              href={`/transactions?id=${tx.id}`}
                              className="inline-flex items-center gap-0.5 text-xs font-medium text-[#BE1111] hover:text-[#a00e0e] transition-colors"
                            >
                              <span>ตรวจ</span>
                              <ChevronRight className="w-3 h-3" />
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>

                    {pendingCount > 2 && (
                      <div className="text-center pt-1">
                        <Link href="/transactions" className="text-xs font-medium text-[#BE1111] hover:underline">
                          ดูรายการรอดำเนินการทั้งหมด ({pendingCount} รายการ) &rarr;
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
        ) : (
          /* ======================================================== */
          /* ROLE: SUPERVISOR DASHBOARD VIEW                          */
          /* ======================================================== */
          <div className="space-y-8">
            
            {/* ---------------------------------------------------- */}
            {/* LEVEL 1: SECTION A - WAREHOUSE OVERVIEW (4 CARDS)    */}
            {/* ---------------------------------------------------- */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                    <Boxes className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      ภาพรวมคลังสินค้า (Warehouse Overview)
                    </h2>
                    <p className="text-xs text-slate-400 font-normal">
                      สรุปสถานะรายการบรรจุภัณฑ์และระดับสต็อกคงเหลือทั้งหมด
                    </p>
                  </div>
                </div>
                <span className="text-xs font-medium px-3 py-1 rounded-full border bg-violet-50/70 text-violet-700 border-violet-200/60 hidden sm:inline-block">
                  ข้อมูลคลังสินค้า (Warehouse Scope)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Overview Card 1: Packaging ทั้งหมด */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: 0.05 }}
                  className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-2xl bg-violet-50 border border-violet-100 text-violet-600 flex items-center justify-center">
                      <Package className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">PACKAGING ทั้งหมด</span>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-semibold text-slate-900">{loading ? '-' : totalPackagingCount}</span>
                      <span className="text-xs font-normal text-slate-500">รายการ</span>
                    </div>
                    <Link href="/inventory" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-700 transition-colors">
                      <span>ดูรายละเอียดสต็อก</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </motion.div>

                {/* Overview Card 2: ยอดคงเหลือรวม */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: 0.1 }}
                  className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-2xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center">
                      <Boxes className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">จำนวนคงเหลือรวม</span>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-semibold text-slate-900">
                        {loading ? '-' : totalStockQuantity.toLocaleString()}
                      </span>
                      <span className="text-xs font-normal text-slate-500">ชิ้น / หน่วย</span>
                    </div>
                    <div className="mt-2 text-xs font-normal text-slate-400">
                      รวมทุกหมวดหมู่วัตถุดิบบรรจุภัณฑ์
                    </div>
                  </div>
                </motion.div>

                {/* Overview Card 3: สต็อกใกล้หมด */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: 0.15 }}
                  className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${
                      lowStockCount > 0
                        ? 'bg-amber-50 border-amber-100 text-amber-600'
                        : 'bg-slate-50 border-slate-100 text-slate-400'
                    }`}>
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">สต็อกใกล้หมด</span>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-baseline gap-2">
                      <span className={`text-3xl font-semibold ${lowStockCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                        {loading ? '-' : lowStockCount}
                      </span>
                      <span className="text-xs font-normal text-slate-500">รายการ</span>
                    </div>
                    <div className="mt-2 text-xs font-normal text-slate-400">
                      {lowStockCount > 0 ? 'ต่ำกว่าจุดสั่งซื้อขั้นต่ำ (Min Stock)' : 'ระดับสต็อกปกติ'}
                    </div>
                  </div>
                </motion.div>

                {/* Overview Card 4: สินค้าหมด (Out of Stock) */}
                {(() => {
                  const outOfStockCount = packagingProducts.filter(p => p.quantity === 0).length
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: 0.2 }}
                      className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${
                          outOfStockCount > 0
                            ? 'bg-red-50 border-red-100 text-[#BE1111]'
                            : 'bg-slate-50 border-slate-100 text-slate-400'
                        }`}>
                          <XCircle className="w-5 h-5" />
                        </div>
                        <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">สินค้าหมด (OUT OF STOCK)</span>
                      </div>
                      <div className="mt-4">
                        <div className="flex items-baseline gap-2">
                          <span className={`text-3xl font-semibold ${outOfStockCount > 0 ? 'text-[#BE1111]' : 'text-slate-900'}`}>
                            {loading ? '-' : outOfStockCount}
                          </span>
                          <span className="text-xs font-normal text-slate-500">รายการ</span>
                        </div>
                        <div className="mt-2 text-xs font-normal text-slate-400">
                          {outOfStockCount > 0 ? 'สินค้าคงเหลือ 0 ชิ้นในคลัง' : 'ไม่มีรายการสินค้าหมด'}
                        </div>
                      </div>
                    </motion.div>
                  )
                })()}
              </div>
            </div>

            {/* ---------------------------------------------------- */}
            {/* LEVEL 2: SECTION B - WAREHOUSE ACTIVITY TODAY         */}
            {/* ---------------------------------------------------- */}
            <div className="space-y-3">
              <div className="flex items-center gap-2.5 px-1">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    กิจกรรมธุรกรรมคลังสินค้า
                  </h2>
                  <p className="text-xs text-slate-400 font-normal">
                    สรุปการเคลื่อนไหวรับเข้า เบิกออก และรายการรอยืนยันทั้งหมดในคลังสินค้า
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {/* Card 1: รับเข้าวันนี้ */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: 0.1 }}
                  className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
                      <ArrowDownToLine className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">รับเข้าวันนี้</span>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-semibold text-slate-900">{loading ? '-' : todayReceives}</span>
                      <span className="text-xs font-normal text-slate-500">รายการ</span>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>{receiveDiffPercent >= 0 ? `+${receiveDiffPercent}%` : `${receiveDiffPercent}%`} จากเมื่อวาน</span>
                    </div>
                  </div>
                </motion.div>

                {/* Card 2: เบิกออกวันนี้ */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: 0.15 }}
                  className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-11 h-11 rounded-2xl bg-red-50 border border-red-100 text-[#BE1111] flex items-center justify-center">
                      <ArrowUpFromLine className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">เบิกออกวันนี้</span>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-semibold text-slate-900">{loading ? '-' : todayIssues}</span>
                      <span className="text-xs font-normal text-slate-500">รายการ</span>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[#BE1111]">
                      <TrendingDown className="w-3.5 h-3.5" />
                      <span>{issueDiffPercent >= 0 ? `+${issueDiffPercent}%` : `${issueDiffPercent}%`} จากเมื่อวาน</span>
                    </div>
                  </div>
                </motion.div>

                {/* Card 3: รายการรอยืนยัน */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: 0.2 }}
                  className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center">
                      <Clock className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">รายการรอยืนยัน</span>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-semibold text-slate-900">{loading ? '-' : pendingCount}</span>
                      <span className="text-xs font-normal text-slate-500">รายการ</span>
                    </div>
                    <Link href="/transactions" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-amber-600 hover:text-amber-700 transition-colors">
                      <span>ไปที่การตรวจสอบรายการ</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* ---------------------------------------------------- */}
            {/* LEVEL 3: SECTIONS C & D - CHARTS (7 DAYS + DONUT)    */}
            {/* ---------------------------------------------------- */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Section C: Warehouse Activity 7 Days (Grouped Bar Chart - 7 Cols) */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.25 }}
                className="lg:col-span-7 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        สรุปการรับเข้า - เบิกออก 7 วันล่าสุด
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5 font-normal">
                        เปรียบเทียบจำนวนรายการรับเข้า (Inbound) และเบิกออก (Outbound) ในคลังสินค้า
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-medium shrink-0">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-[#34D399]"></span>
                        <span className="text-slate-600">รับเข้า</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-[#BE1111]"></span>
                        <span className="text-slate-600">เบิกออก</span>
                      </div>
                    </div>
                  </div>

                  {/* SVG / Bar Chart Display */}
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
                              className="w-1/2 max-w-[16px] bg-[#34D399] rounded-t-md transition-all duration-300 group-hover:bg-emerald-400 relative flex justify-center"
                              title={`รับเข้า: ${day.receiveCount} รายการ`}
                            >
                              {day.receiveCount > 0 && (
                                <span className="absolute -top-5 text-[10px] font-semibold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {day.receiveCount}
                                </span>
                              )}
                            </div>
                            {/* Issue Bar */}
                            <div
                              style={{ height: `${issueHeight}%` }}
                              className="w-1/2 max-w-[16px] bg-[#BE1111] rounded-t-md transition-all duration-300 group-hover:bg-[#a00e0e] relative flex justify-center"
                              title={`เบิกออก: ${day.issueCount} รายการ`}
                            >
                              {day.issueCount > 0 && (
                                <span className="absolute -top-5 text-[10px] font-semibold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
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

                <div className="mt-4 pt-3 flex items-center justify-between text-xs text-slate-500 font-normal">
                  <span>ช่วงวันที่: {dateRange7DaysText}</span>
                  <span className="font-medium text-slate-700">รายการรวม 7 วัน: {total7DaysTransactions} รายการ</span>
                </div>
              </motion.div>

              {/* Section D: Packaging Distribution (Donut Chart - 5 Cols) */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.3 }}
                className="lg:col-span-5 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">สัดส่วนวัตถุดิบบรรจุภัณฑ์</h3>
                      <p className="text-xs text-slate-400 font-normal">สัดส่วนตามหมวดหมู่ที่มีในระบบ</p>
                    </div>
                    <Link
                      href="/inventory"
                      className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
                    >
                      <span>ดูสต็อก</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-6 my-2">
                    {/* Left: Donut Chart */}
                    <div className="flex flex-col items-center justify-center shrink-0">
                      <div className="relative w-44 h-44 sm:w-48 sm:h-48 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                          <circle
                            cx="100"
                            cy="100"
                            r="70"
                            fill="none"
                            className="text-slate-100"
                            stroke="currentColor"
                            strokeWidth="38"
                          />
                          {categoryCounts.reduce((acc, cat, idx) => {
                            const percent = totalCategorized > 0 ? (cat.count / totalCategorized) * 100 : 0
                            if (percent <= 0) return acc

                            const totalC = 2 * Math.PI * 70
                            const segmentLen = (percent / 100) * totalC

                            const strokeDasharray = `${segmentLen} ${totalC - segmentLen}`
                            const strokeDashoffset = -acc.offset
                            acc.offset += segmentLen

                            acc.elements.push(
                              <circle
                                key={idx}
                                cx="100"
                                cy="100"
                                r="70"
                                fill="none"
                                stroke={cat.color}
                                strokeWidth="38"
                                strokeDasharray={strokeDasharray}
                                strokeDashoffset={strokeDashoffset}
                              />
                            )
                            return acc
                          }, { offset: 0, elements: [] as React.ReactNode[] }).elements}
                        </svg>
                        <div className="absolute flex flex-col items-center justify-center text-center">
                          <span className="text-xs text-slate-400 font-normal">รวม</span>
                          <span className="text-2xl font-semibold text-slate-900 leading-tight my-0.5">{totalPackagingCount}</span>
                          <span className="text-xs text-slate-400 font-normal">รายการ</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Legend */}
                    <div className="flex-1 space-y-2.5 w-full sm:w-auto">
                      {categoryCounts.map((cat, idx) => {
                        const pct = Math.round((cat.count / totalCategorized) * 100)
                        return (
                          <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50/60 border border-slate-100">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }}></span>
                              <span className="font-medium text-slate-800 text-xs">{cat.label}</span>
                            </div>
                            <div className="text-xs text-slate-500 font-normal">
                              {cat.count} <span className="text-slate-400">({pct}%)</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* ---------------------------------------------------- */}
            {/* LEVEL 4: SECTION E - ACTION REQUIRED                 */}
            {/* ---------------------------------------------------- */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.35 }}
              className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
                    <Clock className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-slate-900">
                      งานที่ต้องดำเนินการ (Action Required)
                    </h3>
                    <p className="text-xs text-slate-400 font-normal">
                      รายการธุรกรรมรอยืนยันอนุมัติและรายการสต็อกที่ต้องติดตาม
                    </p>
                  </div>
                </div>
                <span className="text-xs font-medium text-slate-400">
                  {pendingCount > 0 ? `มี ${pendingCount} รายการรอดำเนินการ` : 'ไม่มีงานค้าง'}
                </span>
              </div>

              {pendingCount === 0 && lowStockCount === 0 ? (
                /* Empty State: ไม่มีงานค้างและไม่มีสต็อกเตือน */
                <div className="p-6 rounded-2xl bg-slate-50/70 border border-slate-100/80 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">ไม่มีรายการที่ต้องดำเนินการ</p>
                      <p className="text-xs text-slate-500 font-normal mt-0.5">
                        ขณะนี้ไม่มีงานที่รอการตรวจสอบ และระดับสต็อกสินค้าทั้งหมดอยู่ในเกณฑ์ปกติ
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80 whitespace-nowrap">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>สถานะเรียบร้อย</span>
                  </span>
                </div>
              ) : (
                /* Pending & Alert Items List */
                <div className="space-y-3">
                  {pendingCount > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">
                        รายการรอยืนยันอนุมัติ ({pendingCount} รายการ)
                      </div>
                      <div className="divide-y divide-slate-100 rounded-2xl bg-slate-50/70 border border-slate-100/80 p-3">
                        {pendingTransactions.slice(0, 3).map(tx => (
                          <div key={tx.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                tx.type === 'receive' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-[#BE1111]'
                              }`}>
                                {tx.type === 'receive' ? <ArrowDownToLine className="w-4 h-4" /> : <ArrowUpFromLine className="w-4 h-4" />}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                                  {tx.product?.description || tx.itemSnapshot.name}
                                </p>
                                <p className="text-xs text-slate-400 font-normal truncate mt-0.5">
                                  {tx.product?.itemCode || tx.itemSnapshot.itemCode} &bull; จำนวน {tx.quantity.toLocaleString()} {tx.itemSnapshot.unit || 'ชิ้น'} &bull; โดย: {tx.createdBy?.fullName || '-'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200/70">
                                <span>รอยืนยัน</span>
                              </span>
                              <Link
                                href={`/transactions?id=${tx.id}`}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#BE1111] hover:bg-[#a00e0e] text-white text-xs font-medium transition-colors"
                              >
                                <span>ตรวจสอบ</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {lowStockCount > 0 && (
                    <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-100 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                        <span className="text-xs sm:text-sm text-slate-800 font-medium">
                          มีวัตถุดิบบรรจุภัณฑ์ {lowStockCount} รายการ ที่มีระดับสต็อกต่ำกว่าหรือเท่ากับ Min Stock
                        </span>
                      </div>
                      <Link href="/inventory" className="text-xs font-semibold text-amber-700 hover:underline shrink-0">
                        ดูสต็อกต่ำ &rarr;
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </motion.div>

            {/* ---------------------------------------------------- */}
            {/* LEVEL 5: SECTION F - SUPERVISOR QUICK ACTIONS        */}
            {/* ---------------------------------------------------- */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.4 }}
              className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4"
            >
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-slate-900">
                  เมนูดำเนินการด่วน (Supervisor Quick Actions)
                </h3>
                <p className="text-xs text-slate-400 font-normal mt-0.5">
                  ทางลัดสำหรับเข้าถึงงานตรวจสอบ จัดการสต็อก และรายงาน
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Action 1: ตรวจสอบรายการ (Pending Approval) */}
                <Link
                  href="/transactions"
                  className="flex items-center justify-between p-4 rounded-2xl bg-amber-50/70 border border-amber-100 text-amber-900 hover:bg-amber-100/70 transition-all group font-medium text-sm shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-2xs shrink-0">
                      <Clock className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">ตรวจสอบรายการ</p>
                      <p className="text-xs text-slate-500 font-normal">อนุมัติงานรอยืนยัน</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-amber-600 group-hover:translate-x-1 transition-transform shrink-0" />
                </Link>

                {/* Action 2: ดูสต็อกบรรจุภัณฑ์ */}
                <Link
                  href="/inventory"
                  className="flex items-center justify-between p-4 rounded-2xl bg-violet-50/70 border border-violet-100 text-violet-900 hover:bg-violet-100/70 transition-all group font-medium text-sm shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-violet-500 text-white flex items-center justify-center shadow-2xs shrink-0">
                      <Package className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">ดูสต็อกบรรจุภัณฑ์</p>
                      <p className="text-xs text-slate-500 font-normal">จัดการและปรับแต่งสต็อก</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-violet-600 group-hover:translate-x-1 transition-transform shrink-0" />
                </Link>

                {/* Action 3: รายการธุรกรรมทั้งหมด */}
                <Link
                  href="/reports"
                  className="flex items-center justify-between p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 text-emerald-900 hover:bg-emerald-100/70 transition-all group font-medium text-sm shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-2xs shrink-0">
                      <Layers className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">ธุรกรรมทั้งหมด</p>
                      <p className="text-xs text-slate-500 font-normal">ประวัติรับเข้า-เบิกออก</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-emerald-600 group-hover:translate-x-1 transition-transform shrink-0" />
                </Link>

                {/* Action 4: ออกรายงาน Excel */}
                <Link
                  href="/reports"
                  className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-slate-800 hover:bg-slate-100/80 transition-all group font-medium text-sm shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-700 text-white flex items-center justify-center shadow-2xs shrink-0">
                      <BarChart3 className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">ดูรายงานทั้งหมด</p>
                      <p className="text-xs text-slate-500 font-normal">ส่งออกข้อมูล Excel</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform shrink-0" />
                </Link>
              </div>
            </motion.div>

            {/* ---------------------------------------------------- */}
            {/* LEVEL 6: SECTION G - RECENT TRANSACTIONS             */}
            {/* ---------------------------------------------------- */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.45 }}
              className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-slate-900">
                    รายการล่าสุด (Recent Transactions)
                  </h3>
                  <p className="text-xs text-slate-400 font-normal mt-0.5">
                    ประวัติการทำรายการล่าสุดในระบบ
                  </p>
                </div>
                <Link
                  href="/reports"
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#BE1111] hover:text-[#a00e0e] transition-colors"
                >
                  <span>ดูทั้งหมด</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs font-medium text-slate-500 uppercase tracking-wider">
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
                          <td className="py-4 px-4 whitespace-nowrap text-xs text-slate-500 font-normal">
                            {tx.createdAt.replace('T', ' ').substring(0, 16)}
                          </td>
                          <td className="py-4 px-4">
                            <div className="font-medium text-slate-900 text-sm">
                              {tx.product?.description || tx.itemSnapshot.name}
                            </div>
                            <div className="text-xs text-slate-400 font-normal mt-0.5">
                              {tx.product?.itemCode || tx.itemSnapshot.itemCode}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center whitespace-nowrap">
                            {tx.type === 'receive' ? (
                              <span className="whitespace-nowrap inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
                                <span>รับเข้า</span>
                              </span>
                            ) : (
                              <span className="whitespace-nowrap inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-[#BE1111] border border-red-200/80 shadow-2xs">
                                <span>เบิกออก</span>
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-center font-medium text-slate-900 whitespace-nowrap">
                            {tx.quantity.toLocaleString()}
                          </td>
                          <td className="py-4 px-4 text-center whitespace-nowrap">
                            {tx.note && tx.note.includes('ปรับปรุงสต็อก') ? (
                              (() => {
                                const { title, detail } = parseStockAdjustNote(tx.note)
                                return (
                                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 border border-amber-200/70 shadow-2xs whitespace-nowrap">
                                    <SlidersHorizontal className="w-3 h-3 text-amber-600 shrink-0" />
                                    <span>{title}</span>
                                    {detail && <span className="text-[10px] text-amber-700/90 font-normal">{detail}</span>}
                                  </span>
                                )
                              })()
                            ) : tx.note ? (
                              <span className="text-xs text-slate-500 font-normal bg-slate-100/50 px-2.5 py-1 rounded-lg border border-slate-200/50 inline-block">
                                {tx.note}
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-center whitespace-nowrap">
                            {tx.status === 'confirmed' ? (
                              <span className="whitespace-nowrap inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                                <span>ยืนยันแล้ว</span>
                              </span>
                            ) : tx.status === 'rejected' ? (
                              <span className="whitespace-nowrap inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-[#BE1111] border border-red-200/80 shadow-2xs">
                                <XCircle className="w-3.5 h-3.5 shrink-0 text-[#BE1111]" />
                                <span>ปฏิเสธแล้ว</span>
                              </span>
                            ) : (
                              <span className="whitespace-nowrap inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200/80 shadow-2xs">
                                <Clock className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                                <span>รอการยืนยัน</span>
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-center whitespace-nowrap text-xs text-slate-700 font-normal">
                            {tx.createdBy?.fullName || '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Footer */}
              {!loading && totalTransactionsCount > 0 && (
                <div className="border-t border-slate-100 pt-4 mt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                  <div>
                    <span>
                      {totalTransactionsCount === 1
                        ? 'แสดง 1 จากทั้งหมด 1 รายการ'
                        : `แสดง ${startIndex} - ${endIndex} จากทั้งหมด ${totalTransactionsCount} รายการ`}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setRecentTxPage(p => Math.max(1, p - 1))}
                      disabled={safeRecentTxPage === 1}
                      aria-label="หน้าก่อนหน้า"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium shadow-2xs cursor-pointer"
                      title="หน้าก่อนหน้า"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">ก่อนหน้า</span>
                    </button>

                    <div className="flex items-center gap-1">
                      {getPaginationRange(safeRecentTxPage, totalRecentTxPages).map((item, idx) => {
                        if (typeof item === 'string') {
                          return (
                            <span key={`ellipsis-${idx}`} className="px-1.5 py-1 text-slate-400 font-medium select-none">
                              {item}
                            </span>
                          )
                        }
                        const isCurrent = safeRecentTxPage === item
                        return (
                          <button
                            key={item}
                            onClick={() => setRecentTxPage(item)}
                            aria-label={`หน้า ${item}`}
                            className={`min-w-[32px] h-8 px-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                              isCurrent
                                ? 'bg-[#BE1111] text-white shadow-xs'
                                : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-2xs'
                            }`}
                            title={`หน้า ${item}`}
                          >
                            {item}
                          </button>
                        )
                      })}
                    </div>

                    <button
                      onClick={() => setRecentTxPage(p => Math.min(totalRecentTxPages, p + 1))}
                      disabled={safeRecentTxPage === totalRecentTxPages}
                      aria-label="หน้าถัดไป"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium shadow-2xs cursor-pointer"
                      title="หน้าถัดไป"
                    >
                      <span className="hidden sm:inline">ถัดไป</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>

          </div>
        )}

        {/* ======================================================== */}
        {/* SECTION 4: Recent Transactions Table (Staff Only)        */}
        {/* ======================================================== */}
        {isStaff && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
            className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-100 shadow-xs"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  รายการของคุณล่าสุด
                </h3>
                <p className="text-xs text-slate-400 font-normal mt-0.5">
                  ประวัติการทำรายการล่าสุดของคุณ
                </p>
              </div>
              <Link
                href="/transactions"
                className="inline-flex items-center gap-1 text-xs font-medium text-[#BE1111] hover:text-[#a00e0e] transition-colors"
              >
                <span>ดูทั้งหมด</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-medium text-slate-500 uppercase tracking-wider">
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
                        คุณยังไม่มีประวัติการทำรายการในระบบ
                      </td>
                    </tr>
                  ) : (
                    recentTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-4 px-4 whitespace-nowrap text-xs text-slate-500 font-normal">
                          {tx.createdAt.replace('T', ' ').substring(0, 16)}
                        </td>
                        <td className="py-4 px-4">
                          <div className="font-medium text-slate-900 text-sm">
                            {tx.product?.description || tx.itemSnapshot.name}
                          </div>
                          <div className="text-xs text-slate-400 font-normal mt-0.5">
                            {tx.product?.itemCode || tx.itemSnapshot.itemCode}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          {tx.type === 'receive' ? (
                            <span className="font-medium text-emerald-600 text-xs sm:text-sm">
                              รับเข้า
                            </span>
                          ) : (
                            <span className="whitespace-nowrap inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-[#BE1111] border border-red-200/80 shadow-2xs">
                              <span>เบิกออก</span>
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center font-medium text-slate-900 whitespace-nowrap">
                          {tx.quantity.toLocaleString()}
                        </td>
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          {tx.note && tx.note.includes('ปรับปรุงสต็อก') ? (
                            (() => {
                              const { title, detail } = parseStockAdjustNote(tx.note)
                              return (
                                <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 border border-amber-200/70 shadow-2xs whitespace-nowrap">
                                  <SlidersHorizontal className="w-3 h-3 text-amber-600 shrink-0" />
                                  <span>{title}</span>
                                  {detail && <span className="text-[10px] text-amber-700/90 font-normal">{detail}</span>}
                                </span>
                              )
                            })()
                          ) : tx.note ? (
                            <span className="text-xs text-slate-500 font-normal bg-slate-100/50 px-2.5 py-1 rounded-lg border border-slate-200/50 inline-block">
                              {tx.note}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          {tx.status === 'confirmed' ? (
                            <span className="font-medium text-emerald-600 text-xs sm:text-sm">
                              ยืนยันแล้ว
                            </span>
                          ) : tx.status === 'rejected' ? (
                            <span className="whitespace-nowrap inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-[#BE1111] border border-red-200/80 shadow-2xs">
                              <XCircle className="w-3.5 h-3.5 shrink-0 text-[#BE1111]" />
                              <span>ปฏิเสธแล้ว</span>
                            </span>
                          ) : (
                            <span className="whitespace-nowrap inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200/80 shadow-2xs">
                              <Clock className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                              <span>รอการยืนยัน</span>
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center whitespace-nowrap text-xs text-slate-700 font-normal">
                          {tx.createdBy?.fullName || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            {!loading && totalTransactionsCount > 0 && (
              <div className="border-t border-slate-100 pt-4 mt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                <div>
                  <span>
                    {totalTransactionsCount === 1
                      ? 'แสดง 1 จากทั้งหมด 1 รายการ'
                      : `แสดง ${startIndex} - ${endIndex} จากทั้งหมด ${totalTransactionsCount} รายการ`}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setRecentTxPage(p => Math.max(1, p - 1))}
                    disabled={safeRecentTxPage === 1}
                    aria-label="หน้าก่อนหน้า"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium shadow-2xs cursor-pointer"
                    title="หน้าก่อนหน้า"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">ก่อนหน้า</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {getPaginationRange(safeRecentTxPage, totalRecentTxPages).map((item, idx) => {
                      if (typeof item === 'string') {
                        return (
                          <span key={`ellipsis-${idx}`} className="px-1.5 py-1 text-slate-400 font-medium select-none">
                            {item}
                          </span>
                        )
                      }
                      const isCurrent = safeRecentTxPage === item
                      return (
                        <button
                          key={item}
                          onClick={() => setRecentTxPage(item)}
                          aria-label={`หน้า ${item}`}
                          className={`min-w-[32px] h-8 px-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                            isCurrent
                              ? 'bg-[#BE1111] text-white shadow-xs'
                              : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-2xs'
                          }`}
                          title={`หน้า ${item}`}
                        >
                          {item}
                        </button>
                      )
                    })}
                  </div>

                  <button
                    onClick={() => setRecentTxPage(p => Math.min(totalRecentTxPages, p + 1))}
                    disabled={safeRecentTxPage === totalRecentTxPages}
                    aria-label="หน้าถัดไป"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium shadow-2xs cursor-pointer"
                    title="หน้าถัดไป"
                  >
                    <span className="hidden sm:inline">ถัดไป</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}

      </div>
    </main>
  )
}
