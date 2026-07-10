'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { register, setAuthData } from '@/lib/auth'
import { Package } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!username || !password || !confirmPassword || !fullName) {
      setError('กรุณากรอกข้อมูลให้ครบถ้วน')
      return
    }

    if (password !== confirmPassword) {
      setError('รหัสผ่านไม่ตรงกัน')
      return
    }

    if (password.length < 6) {
      setError('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร')
      return
    }

    setLoading(true)

    try {
      await register({ username, password, fullName })
      // หลังจากลงทะเบียนเสร็จสิ้น ให้ไปที่หน้า login เพื่อให้ผู้ใช้ทำการเข้าสู่ระบบด้วยตนเองตามที่กำหนด
      router.push(`/login?registered=${encodeURIComponent(username)}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด ลองใหม่อีกครั้ง')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gray-50">
      <div className="w-full max-w-[400px]">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white border border-gray-200 rounded-2xl shadow-sm mb-6">
            <Package className="w-7 h-7 text-[#BE1111]" />
          </div>
          <h1 className="text-3xl font-display font-bold text-gray-900 tracking-tight mb-2">
            สร้างบัญชีใหม่
          </h1>
          <p className="text-gray-500 text-sm">
            ลงทะเบียนเพื่อใช้งานระบบจัดการคลังสินค้า
          </p>
        </div>

        {/* Card */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-xl text-sm font-medium text-red-800 bg-red-50 border border-red-100">
              <p>{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1.5">
                ชื่อ-นามสกุล
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="นายตัวอย่าง สมมติ"
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#BE1111] focus:border-transparent transition-shadow sm:text-sm"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1.5">
                ชื่อผู้ใช้
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ตั้งชื่อผู้ใช้"
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#BE1111] focus:border-transparent transition-shadow sm:text-sm"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                รหัสผ่าน
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="อย่างน้อย 6 ตัวอักษร"
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#BE1111] focus:border-transparent transition-shadow sm:text-sm"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
                ยืนยันรหัสผ่าน
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="กรอกรหัสผ่านอีกครั้ง"
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#BE1111] focus:border-transparent transition-shadow sm:text-sm"
                required
                disabled={loading}
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#BE1111] text-white font-semibold py-3 px-4 rounded-xl transition-colors hover:bg-[#A00F0F] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#BE1111] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'กำลังตรวจสอบ...' : 'ลงทะเบียน'}
              </button>
            </div>
          </form>
        </div>

        {/* Link to Login */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            มีบัญชีผู้ใช้แล้ว?{' '}
            <Link
              href="/login"
              className="font-semibold text-[#BE1111] hover:underline"
            >
              เข้าสู่ระบบ
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
