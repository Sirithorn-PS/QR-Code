'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { login, setAuthData } from '@/lib/auth'
import { Package } from 'lucide-react'

function LoginAlert({ onRegistered }: { onRegistered: (u: string) => void }) {
  const searchParams = useSearchParams()
  const registered = searchParams.get('registered')

  useEffect(() => {
    if (registered) {
      onRegistered(registered)
    }
  }, [registered, onRegistered])

  if (!registered) return null

  return (
    <div className="mb-6 p-4 rounded-xl text-sm font-medium text-green-800 bg-green-50 border border-green-200 flex items-start gap-2 shadow-sm">
      <span>✅ ลงทะเบียนบัญชี <b>{registered}</b> สำเร็จแล้ว กรุณากรอกรหัสผ่านเพื่อเข้าสู่ระบบได้เลยครับ</span>
    </div>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const data = await login({ username, password })
      setAuthData(data.token, data.user)
      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด ลองใหม่อีกครั้ง')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="w-full max-w-[400px]">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white border border-gray-200 rounded-2xl shadow-sm mb-6">
            <Package className="w-7 h-7 text-[#BE1111]" />
          </div>
          <h1 className="text-3xl font-display font-bold text-gray-900 tracking-tight mb-2">
            ยินดีต้อนรับกลับมา
          </h1>
          <p className="text-gray-500 text-sm">
            เข้าสู่ระบบเพื่อจัดการคลังสินค้า
          </p>
        </div>

        {/* Card */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
          <Suspense fallback={null}>
            <LoginAlert onRegistered={(u) => setUsername(prev => prev || u)} />
          </Suspense>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-xl text-sm font-medium text-red-800 bg-red-50 border border-red-100">
              <p>{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1.5">
                ชื่อผู้ใช้
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="กรอกชื่อผู้ใช้ของคุณ"
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
                placeholder="••••••••"
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
                {loading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}
              </button>
            </div>
          </form>
        </div>

        {/* Link to Register */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            ยังไม่มีบัญชีผู้ใช้?{' '}
            <Link
              href="/register"
              className="font-semibold text-[#BE1111] hover:underline"
            >
              ลงทะเบียนใหม่
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
