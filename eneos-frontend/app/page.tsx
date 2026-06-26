'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ScanLine, PackageOpen, ArrowRight } from 'lucide-react'

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
        <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm transition-shadow hover:shadow-md flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-red-50 text-[#BE1111] rounded-xl flex items-center justify-center mb-6">
            <ScanLine className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-display font-bold text-gray-900 mb-2">สแกนสินค้า</h3>
          <p className="text-gray-500 mb-8 text-sm">สแกน QR Code เพื่อรับเข้าหรือจ่ายออกสินค้าอย่างรวดเร็ว</p>
          <Link
            href="/scan"
            className="inline-flex items-center justify-center w-full md:w-auto px-6 py-2.5 bg-[#BE1111] text-white font-semibold rounded-xl hover:bg-[#A00F0F] transition-colors group"
          >
            เริ่มสแกน
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm transition-shadow hover:shadow-md flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-gray-50 text-gray-700 rounded-xl flex items-center justify-center mb-6">
            <PackageOpen className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-display font-bold text-gray-900 mb-2">จัดการสต็อก</h3>
          <p className="text-gray-500 mb-8 text-sm">ตรวจสอบสถานะสต็อกและอัปเดตข้อมูลรายการสินค้า</p>
          <Link
            href="/inventory"
            className="inline-flex items-center justify-center w-full md:w-auto px-6 py-2.5 bg-gray-100 text-gray-900 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
          >
            ดูสต็อกสินค้า
          </Link>
        </div>
      </div>

      {/* System Status / Overview */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-display font-bold text-gray-900 mb-4">ภาพรวมระบบ</h3>
        <div className="flex flex-col md:flex-row gap-6 md:gap-12">
          <div>
            <p className="text-sm text-gray-500 mb-1">บทบาทของคุณ</p>
            <p className="font-semibold text-gray-900">{user?.role === 'warehouse_staff' ? 'เจ้าหน้าที่คลังสินค้า' : user?.role || 'Guest'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">อัปเดตล่าสุด</p>
            <p className="font-semibold text-gray-900 text-sm">พร้อมใช้งาน</p>
          </div>
        </div>
      </div>
    </div>
  )
}
