'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ScanLine, PackageOpen, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react'

interface User {
  id: number
  username: string
  fullName: string
  role: string
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
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
    <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
      {/* Welcome Header */}
      <div className="mb-10 text-center">
        <h2 className="text-3xl md:text-4xl font-display font-bold text-slate-900 tracking-tight">
          หน้าหลัก
        </h2>
        <p className="text-gray-500 mt-3 text-lg font-medium">
          ยินดีต้อนรับกลับมา, {user?.fullName || 'ผู้ใช้งาน'}
        </p>
      </div>

      {/* Quick Action */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div className="bg-white border border-gray-200/80 rounded-2xl p-6 md:p-8 shadow-sm hover:shadow-xl hover:border-[#BE1111]/30 transition-all duration-300 flex flex-col items-center text-center group">
          <div className="w-14 h-14 bg-gradient-to-br from-red-50 to-red-100/50 text-[#BE1111] rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform duration-300">
            <ScanLine className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-display font-bold text-gray-900 mb-2 group-hover:text-[#BE1111] transition-colors">สแกนสินค้า</h3>
          <p className="text-gray-500 mb-8 text-sm max-w-xs">สแกน QR Code เพื่อรับเข้าหรือจ่ายออกสินค้าอย่างรวดเร็ว</p>
          <Link
            href="/scan"
            className="inline-flex items-center justify-center w-full md:w-auto px-6 py-3 bg-[#BE1111] text-white font-semibold rounded-xl shadow-sm hover:bg-[#A00F0F] hover:shadow-md transition-all duration-200 group/btn"
          >
            <span>เริ่มสแกน</span>
            <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="bg-white border border-gray-200/80 rounded-2xl p-6 md:p-8 shadow-sm hover:shadow-xl hover:border-[#BE1111]/30 transition-all duration-300 flex flex-col items-center text-center group">
          <div className="w-14 h-14 bg-gradient-to-br from-red-50 to-red-100/50 text-[#BE1111] rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform duration-300">
            <PackageOpen className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-display font-bold text-gray-900 mb-2 group-hover:text-[#BE1111] transition-colors">จัดการสต็อก</h3>
          <p className="text-gray-500 mb-8 text-sm max-w-xs">ตรวจสอบสถานะสต็อกและอัปเดตข้อมูลรายการสินค้า</p>
          <Link
            href="/inventory"
            className="inline-flex items-center justify-center w-full md:w-auto px-6 py-3 bg-[#BE1111] text-white font-semibold rounded-xl shadow-sm hover:bg-[#A00F0F] hover:shadow-md transition-all duration-200 group/btn"
          >
            <span>ดูสต็อกสินค้า</span>
            <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>

      {/* System Status / Overview */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-6 md:p-8 shadow-sm hover:shadow-xl hover:border-[#BE1111]/30 transition-all duration-300 group">
        <div className="mb-6">
          <h3 className="text-xl font-display font-bold text-gray-900 group-hover:text-[#BE1111] transition-colors">ภาพรวมระบบ</h3>
          <p className="text-xs text-gray-500 mt-1">สถานะการทำงานและสิทธิ์ผู้ใช้งานปัจจุบัน</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-3.5 p-4 rounded-xl bg-gray-50/80 border border-gray-100/80 hover:border-[#BE1111]/20 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-white text-[#BE1111] flex items-center justify-center shadow-sm shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium mb-0.5">บทบาทของคุณ</p>
              <p className="font-bold text-gray-900 text-sm capitalize">{user?.role === 'warehouse_staff' ? 'เจ้าหน้าที่คลังสินค้า' : user?.role || 'Guest'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-4 rounded-xl bg-gray-50/80 border border-gray-100/80 hover:border-green-500/20 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-white text-green-600 flex items-center justify-center shadow-sm shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium mb-0.5">อัปเดตล่าสุด</p>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                <p className="font-bold text-gray-900 text-sm">พร้อมใช้งาน</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
