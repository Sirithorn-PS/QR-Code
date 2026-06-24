'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface User {
  id: number
  username: string
  fullName: string
  role: string
}

export default function Home() {
  const router = useRouter()
  const [user] = useState<User | null>(() => {
    if (typeof window === 'undefined') return null
    const userStr = localStorage.getItem('user')
    return userStr ? JSON.parse(userStr) : null
  })

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-indigo-600">QR Code Webapp</h1>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <span className="text-gray-700">
                  ยินดีต้อนรับ <span className="font-semibold">{user.fullName}</span>
                </span>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition"
                >
                  ออกจากระบบ
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
                >
                  เข้าสู่ระบบ
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h2 className="text-5xl font-bold text-gray-900 mb-4">ระบบสแกน QR</h2>
          <p className="text-xl text-gray-600 mb-8">สำหรับรับ/จ่ายสินค้าอัตโนมัติ</p>
        </div>

        {user ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Scan Card */}
            <div className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-gray-900">สแกนสินค้า</h3>
                <div className="text-4xl">📱</div>
              </div>
              <p className="text-gray-600 mb-6">สแกน QR Code เพื่อบันทึกรับเข้า/จ่ายออก</p>
              <Link
                href="/scan"
                className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-semibold"
              >
                เริ่มสแกน →
              </Link>
            </div>

            {/* Transactions Card */}
            <div className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-gray-900">รายการรอการยืนยัน</h3>
                <div className="text-4xl">📋</div>
              </div>
              <p className="text-gray-600 mb-6">ดูรายการที่รอการยืนยันจากผู้จัดการ</p>
              <Link
                href="/transactions"
                className="inline-block px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-semibold"
              >
                ดูรายการ →
              </Link>
            </div>

            {/* Stock Card */}
            <div className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-gray-900">สต็อกสินค้า</h3>
                <div className="text-4xl">📦</div>
              </div>
              <p className="text-gray-600 mb-6">ดูสต็อกสินค้าปัจจุบัน</p>
              <Link
                href="/inventory"
                className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition font-semibold"
              >
                ดูสต็อก →
              </Link>
            </div>

            {/* Reports Card */}
            <div className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-gray-900">รายงาน</h3>
                <div className="text-4xl">📊</div>
              </div>
              <p className="text-gray-600 mb-6">ดูรายงานและประวัติการทำงาน</p>
              <Link
                href="/reports"
                className="inline-block px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition font-semibold"
              >
                ดูรายงาน →
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">ยังไม่ได้เข้าสู่ระบบ</h3>
            <p className="text-gray-600 mb-8">กรุณาเข้าสู่ระบบหรือลงทะเบียนเพื่อเข้าใช้ระบบสแกน QR</p>
            <div className="flex justify-center gap-4">
              <Link
                href="/login"
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition font-semibold"
              >
                เข้าสู่ระบบ
              </Link>
              <Link
                href="/register"
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-semibold"
              >
                ลงทะเบียน
              </Link>
            </div>
          </div>
        )}

        {/* User Info */}
        {user && (
          <div className="mt-12 bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">ข้อมูลบัญชี</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-gray-600 text-sm">ID</p>
                <p className="text-lg font-semibold">{user.id}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">ชื่อผู้ใช้</p>
                <p className="text-lg font-semibold">{user.username}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">ชื่อ-นามสกุล</p>
                <p className="text-lg font-semibold">{user.fullName}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">บทบาท</p>
                <p className="text-lg font-semibold">{user.role === 'warehouse_staff' ? 'เจ้าหน้าที่คลัง' : user.role}</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
