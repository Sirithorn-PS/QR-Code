'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ScanLine, ArrowRight, ShieldCheck, CheckCircle2, Package } from 'lucide-react'
import { motion } from 'framer-motion'
import { QuickGuideCarousel } from '@/components/QuickGuideCarousel'

interface User {
  id: number
  username: string
  fullName: string
  role: string
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try {
        setUser(JSON.parse(userStr))
      } catch (e) {
        console.error('Failed to parse user from localStorage', e)
      }
    }
  }, [])

  if (!mounted) return null

  return (
    <div className="w-full pt-3 pb-8 sm:pt-6 md:pt-8 md:pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {/* Brand Logo Header */}
          <motion.div variants={itemVariants} className="mb-3 sm:mb-4 flex flex-col items-center select-none text-center">
            <div className="mb-1.5 sm:mb-2 shrink-0 flex items-center justify-center">
              <Package className="w-9 h-9 sm:w-11 sm:h-11 md:w-13 md:h-13 text-[#BE1111] stroke-[2.2]" />
            </div>

            <h1 className="text-xl sm:text-3xl lg:text-4xl font-display font-extrabold tracking-tight flex items-center justify-center gap-2 sm:gap-3 text-center">
              <span className="text-[#0F172A]">WPK</span>
              <span className="text-[#BE1111]">MMS</span>
            </h1>

            <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-sm font-display font-normal text-slate-500 text-center tracking-normal">
              Packaging Material Warehouse Management System
            </p>

            {/* Accent Line: Red left, Gray right */}
            <div className="mt-1.5 sm:mt-2 flex items-center gap-0.5">
              <div className="w-4 sm:w-6 h-1 bg-[#BE1111] rounded-l-full" />
              <div className="w-4 sm:w-6 h-1 bg-slate-200 rounded-r-full" />
            </div>
          </motion.div>

          {/* Welcome Header */}
          <motion.div variants={itemVariants} className="mb-6 md:mb-10 text-center">
            <h2 className="text-xl sm:text-3xl md:text-4xl font-display font-extrabold text-[#0F172A] tracking-tight">
              หน้าหลัก
            </h2>
            <p className="text-slate-500 mt-1 sm:mt-2 text-xs sm:text-base font-display font-normal">
              ยินดีต้อนรับกลับมา, <span className="text-[#0F172A] font-bold">{user?.username || 'ผู้ใช้งาน'}</span>
            </p>
          </motion.div>

          {/* Quick Action */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mb-8 md:mb-12">
            {/* Scan Action Card */}
            <Link href="/scan" className="group block focus:outline-none">
              <div className="h-full bg-white/80 backdrop-blur-md border border-red-100/60 p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl shadow-xs hover:shadow-xl hover:bg-white transition-all duration-500 relative overflow-hidden flex flex-col justify-between">
                <div className="absolute inset-0 bg-gradient-to-br from-red-50/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                {/* Mobile Layout (< md) */}
                <div className="flex items-center gap-3.5 md:hidden relative z-10">
                  <div className="w-12 h-12 bg-red-50 text-[#BE1111] rounded-2xl flex items-center justify-center shrink-0 border border-red-100/60 shadow-xs">
                    <ScanLine className="w-6 h-6 stroke-[2.2]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-display font-extrabold text-slate-900 leading-tight">สแกนสินค้า</h3>
                    <p className="text-xs text-slate-500 font-display font-normal mt-0.5">สแกน QR Code เพื่อรับเข้า-เบิกออกสินค้า</p>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-[#BE1111] text-white flex items-center justify-center shrink-0 shadow-md shadow-red-500/20 group-active:scale-95 transition-transform">
                    <ArrowRight className="w-4.5 h-4.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* Desktop Layout (>= md) */}
                <div className="hidden md:flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-red-50 text-[#BE1111] rounded-full flex items-center justify-center mb-6 group-hover:scale-110 group-active:scale-95 transition-transform duration-500 relative z-10 shadow-xs border border-red-100/60">
                    <ScanLine className="w-9 h-9 stroke-[2.2]" />
                  </div>
                  <h3 className="text-2xl font-display font-extrabold text-slate-900 mb-2.5 relative z-10">สแกนสินค้า</h3>
                  <p className="text-slate-500 mb-8 text-sm leading-relaxed relative z-10 font-display font-normal">
                    <span className="block whitespace-nowrap">สแกน QR Code</span>
                    <span className="block whitespace-nowrap">เพื่อรับเข้า-เบิกออกสินค้า</span>
                  </p>
                  
                  <div className="mt-auto inline-flex items-center justify-center w-full px-6 py-3 bg-[#BE1111] text-white text-base font-semibold rounded-2xl group-hover:bg-[#A00F0F] group-active:scale-95 transition-all duration-300 relative z-10 shadow-md shadow-red-500/20">
                    <span>เริ่มสแกน</span>
                    <ArrowRight className="w-4.5 h-4.5 ml-2 group-hover:translate-x-1.5 transition-transform duration-300" />
                  </div>
                </div>

                {/* Decorative Dot Grid (Desktop Only) */}
                <div className="absolute bottom-4 right-4 grid grid-cols-4 gap-1.5 opacity-30 pointer-events-none hidden md:grid">
                  {[...Array(12)].map((_, i) => (
                    <div key={i} className="w-1 h-1 rounded-full bg-red-400" />
                  ))}
                </div>
              </div>
            </Link>

            {/* Inventory Action Card */}
            <Link href="/inventory" className="group block focus:outline-none">
              <div className="h-full bg-white/80 backdrop-blur-md border border-gray-200/60 p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl shadow-xs hover:shadow-xl hover:bg-white transition-all duration-500 relative overflow-hidden flex flex-col justify-between">
                <div className="absolute inset-0 bg-gradient-to-br from-gray-50/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                {/* Mobile Layout (< md) */}
                <div className="flex items-center gap-3.5 md:hidden relative z-10">
                  <div className="w-12 h-12 bg-red-50 text-[#BE1111] rounded-2xl flex items-center justify-center shrink-0 border border-red-100/60 shadow-xs">
                    <Package className="w-6 h-6 stroke-[2.2]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-display font-extrabold text-slate-900 leading-tight">จัดการสต็อก</h3>
                    <p className="text-xs text-slate-500 font-display font-normal mt-0.5">ตรวจสอบสถานะสต็อกและอัปเดตข้อมูล</p>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-[#0F172A] text-white flex items-center justify-center shrink-0 shadow-md shadow-slate-900/10 group-active:scale-95 transition-transform">
                    <ArrowRight className="w-4.5 h-4.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* Desktop Layout (>= md) */}
                <div className="hidden md:flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-red-50 text-[#BE1111] rounded-full flex items-center justify-center mb-6 group-hover:scale-110 group-active:scale-95 transition-transform duration-500 relative z-10 shadow-xs border border-red-100/60">
                    <Package className="w-9 h-9 stroke-[2.2]" />
                  </div>
                  <h3 className="text-2xl font-display font-extrabold text-slate-900 mb-2.5 relative z-10">จัดการสต็อก</h3>
                  <p className="text-slate-500 mb-8 text-sm leading-relaxed relative z-10 font-display font-normal">
                    <span className="block whitespace-nowrap">ตรวจสอบสถานะสต็อกและอัปเดต</span>
                    <span className="block whitespace-nowrap">ข้อมูลรายการสินค้า</span>
                  </p>
                  
                  <div className="mt-auto inline-flex items-center justify-center w-full px-6 py-3 bg-[#0F172A] text-white text-base font-semibold rounded-2xl group-hover:bg-slate-800 group-active:scale-95 transition-all duration-300 relative z-10 shadow-md shadow-slate-900/10">
                    <span>ดูสต็อกสินค้า</span>
                    <ArrowRight className="w-4.5 h-4.5 ml-2 group-hover:translate-x-1.5 transition-transform duration-300" />
                  </div>
                </div>

                {/* Decorative Dot Grid (Desktop Only) */}
                <div className="absolute bottom-4 right-4 grid grid-cols-4 gap-1.5 opacity-30 pointer-events-none hidden md:grid">
                  {[...Array(12)].map((_, i) => (
                    <div key={i} className="w-1 h-1 rounded-full bg-red-400" />
                  ))}
                </div>
              </div>
            </Link>
          </motion.div>

          {/* System Status / Overview */}
          <motion.div variants={itemVariants} className="max-w-3xl mx-auto">
            <div className="mb-3 sm:mb-4 text-center">
              <h3 className="text-base sm:text-lg font-display font-bold text-gray-900">ภาพรวมระบบ</h3>
              <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1 font-display font-normal">สถานะการทำงานและสิทธิ์ผู้ใช้งานปัจจุบัน</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-5">
              <div className="flex items-center p-3.5 sm:p-5 bg-white/70 backdrop-blur-md rounded-2xl border border-gray-200/60 shadow-xs transition-all hover:bg-white hover:shadow-md">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gray-50 border border-gray-100 text-gray-700 flex items-center justify-center shrink-0 mr-3.5 sm:mr-4 shadow-xs">
                  <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-[#BE1111]" />
                </div>
                <div>
                  <p className="text-[10px] sm:text-[11px] text-gray-500 font-display font-normal mb-0.5 uppercase tracking-wider">บทบาทของคุณ</p>
                  <p className="font-bold text-gray-900 text-xs sm:text-base tracking-tight">
                    {user?.role === 'admin' ? 'ผู้ควบคุมดูแลระบบ (Supervisor)' : user?.role === 'warehouse_staff' ? 'พนักงานทั่วไป (Staff)' : user?.role || 'Guest'}
                  </p>
                </div>
              </div>

              <div className="flex items-center p-3.5 sm:p-5 bg-white/70 backdrop-blur-md rounded-2xl border border-gray-200/60 shadow-xs transition-all hover:bg-white hover:shadow-md">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-50 border border-emerald-100/50 text-emerald-600 flex items-center justify-center shrink-0 mr-3.5 sm:mr-4 shadow-xs">
                  <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <p className="text-[10px] sm:text-[11px] text-gray-500 font-display font-normal mb-0.5 uppercase tracking-wider">อัปเดตล่าสุด</p>
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <p className="font-bold text-gray-900 text-xs sm:text-base tracking-tight">ระบบพร้อมใช้งาน</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* QUICK GUIDE Carousel Section */}
          <motion.div variants={itemVariants} className="mt-8 sm:mt-12">
            <QuickGuideCarousel />
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
