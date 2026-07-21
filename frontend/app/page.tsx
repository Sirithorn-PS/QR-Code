'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ScanLine, PackageOpen, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'

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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-20 pb-16 md:pt-28 md:pb-24">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {/* Welcome Header */}
        <motion.div variants={itemVariants} className="mb-16 text-center">
          <h2 className="text-4xl md:text-5xl font-display font-bold text-gray-900 tracking-tight">
            หน้าหลัก
          </h2>
          <p className="text-gray-500 mt-5 text-lg font-medium">
            ยินดีต้อนรับกลับมา, <span className="text-gray-900 font-semibold">{user?.fullName || 'ผู้ใช้งาน'}</span>
          </p>
        </motion.div>

        {/* Quick Action */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
          {/* Scan Action */}
          <Link href="/scan" className="group block focus:outline-none">
            <div className="h-full flex flex-col items-center text-center bg-white/60 backdrop-blur-md border border-red-100/50 p-10 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:bg-white transition-all duration-500 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-red-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <div className="w-24 h-24 bg-red-50 text-[#BE1111] rounded-full flex items-center justify-center mb-8 group-hover:scale-110 group-active:scale-95 transition-transform duration-500 relative z-10 shadow-sm border border-red-100/50">
                <ScanLine className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-display font-bold text-gray-900 mb-4 relative z-10">สแกนสินค้า</h3>
              <p className="text-gray-500 mb-10 text-base max-w-[16rem] leading-relaxed relative z-10">สแกน QR Code เพื่อรับเข้าหรือจ่ายออกสินค้าอย่างรวดเร็ว</p>
              
              <div className="mt-auto inline-flex items-center justify-center w-full px-8 py-4 bg-[#BE1111] text-white font-semibold rounded-2xl group-hover:bg-[#A00F0F] group-active:scale-95 transition-all duration-300 relative z-10 shadow-md shadow-red-500/20">
                <span>เริ่มสแกน</span>
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1.5 transition-transform duration-300" />
              </div>
            </div>
          </Link>

          {/* Inventory Action */}
          <Link href="/inventory" className="group block focus:outline-none">
            <div className="h-full flex flex-col items-center text-center bg-white/60 backdrop-blur-md border border-gray-200/50 p-10 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:bg-white transition-all duration-500 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-gray-50/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <div className="w-24 h-24 bg-gray-100/80 text-gray-800 rounded-full flex items-center justify-center mb-8 group-hover:scale-110 group-active:scale-95 transition-transform duration-500 relative z-10 shadow-sm border border-gray-200/50">
                <PackageOpen className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-display font-bold text-gray-900 mb-4 relative z-10">จัดการสต็อก</h3>
              <p className="text-gray-500 mb-10 text-base max-w-[16rem] leading-relaxed relative z-10">ตรวจสอบสถานะสต็อกและอัปเดตข้อมูลรายการสินค้า</p>
              
              <div className="mt-auto inline-flex items-center justify-center w-full px-8 py-4 bg-gray-900 text-white font-semibold rounded-2xl group-hover:bg-gray-800 group-active:scale-95 transition-all duration-300 relative z-10 shadow-md shadow-gray-900/10">
                <span>ดูสต็อกสินค้า</span>
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1.5 transition-transform duration-300" />
              </div>
            </div>
          </Link>
        </motion.div>

        {/* System Status / Overview */}
        <motion.div variants={itemVariants} className="max-w-3xl mx-auto">
          <div className="mb-8 text-center">
            <h3 className="text-xl font-display font-bold text-gray-900">ภาพรวมระบบ</h3>
            <p className="text-sm text-gray-500 mt-2">สถานะการทำงานและสิทธิ์ผู้ใช้งานปัจจุบัน</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center p-6 bg-white/60 backdrop-blur-md rounded-3xl border border-gray-200/50 shadow-sm transition-all hover:bg-white hover:shadow-md">
              <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 text-gray-700 flex items-center justify-center shrink-0 mr-5 shadow-sm">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1 uppercase tracking-wider">บทบาทของคุณ</p>
                <p className="font-bold text-gray-900 text-lg capitalize tracking-tight">{user?.role === 'admin' ? 'ผู้ควบคุมดูแลระบบ (Supervisor)' : user?.role === 'warehouse_staff' ? 'พนักงานทั่วไป (Staff)' : user?.role || 'Guest'}</p>
              </div>
            </div>

            <div className="flex items-center p-6 bg-white/60 backdrop-blur-md rounded-3xl border border-gray-200/50 shadow-sm transition-all hover:bg-white hover:shadow-md">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100/50 text-emerald-600 flex items-center justify-center shrink-0 mr-5 shadow-sm">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1.5 uppercase tracking-wider">อัปเดตล่าสุด</p>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <p className="font-bold text-gray-900 text-lg tracking-tight">ระบบพร้อมใช้งาน</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
