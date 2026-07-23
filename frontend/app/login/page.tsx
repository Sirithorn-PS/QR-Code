'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { login, setAuthData } from '@/lib/auth'
import { Package } from 'lucide-react'
import { motion } from 'framer-motion'

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
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 p-4 rounded-2xl text-sm font-medium text-emerald-800 bg-emerald-50/80 backdrop-blur-sm border border-emerald-200/50 flex items-start gap-2 shadow-sm"
    >
      <span>✅ ลงทะเบียนบัญชี <b className="font-bold">{registered}</b> สำเร็จแล้ว กรุณากรอกรหัสผ่านเพื่อเข้าสู่ระบบ</span>
    </motion.div>
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
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-gray-50 via-white to-gray-100/50">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        className="w-full max-w-[420px]"
      >
        {/* Header */}
        <div className="text-center mb-10">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.1 }}
            className="inline-flex items-center justify-center w-16 h-16 bg-white border border-gray-200/60 rounded-3xl shadow-sm mb-6 relative"
          >
            <div className="absolute inset-0 bg-red-500/5 rounded-3xl" />
            <Package className="w-8 h-8 text-[#BE1111] relative z-10" />
          </motion.div>
          <h1 className="text-3xl font-display font-bold text-gray-900 tracking-tight mb-3">
            ยินดีต้อนรับกลับมา
          </h1>
          <p className="text-gray-500 text-sm font-medium">
            เข้าสู่ระบบเพื่อจัดการคลังวัตถุดิบ
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2rem] shadow-[0_8px_40px_rgb(0,0,0,0.04)] border border-gray-100/80">
          <Suspense fallback={null}>
            <LoginAlert onRegistered={(u) => setUsername(prev => prev || u)} />
          </Suspense>

          {/* Error Message */}
          {error && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="mb-6 p-4 rounded-2xl text-sm font-medium text-red-800 bg-red-50/80 backdrop-blur-sm border border-red-100/50"
            >
              <p>{error}</p>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="username" className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
                ชื่อผู้ใช้
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="กรอกชื่อผู้ใช้ของคุณ"
                className="w-full px-4 py-3.5 bg-gray-50/50 backdrop-blur-sm border border-gray-200/80 rounded-2xl text-gray-900 font-semibold placeholder:text-gray-400 placeholder:font-normal focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#BE1111]/10 focus:border-[#BE1111]/30 transition-all sm:text-sm"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
                รหัสผ่าน
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3.5 bg-gray-50/50 backdrop-blur-sm border border-gray-200/80 rounded-2xl text-gray-900 font-semibold placeholder:text-gray-400 placeholder:font-normal focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#BE1111]/10 focus:border-[#BE1111]/30 transition-all sm:text-sm"
                required
                disabled={loading}
              />
            </div>

            <div className="pt-4">
              <motion.button
                type="submit"
                disabled={loading}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-[#BE1111] text-white font-bold py-4 px-4 rounded-2xl transition-all hover:bg-[#A00F0F] focus:outline-none focus:ring-4 focus:ring-[#BE1111]/20 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-900/10 flex justify-center items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    กำลังตรวจสอบ...
                  </>
                ) : 'เข้าสู่ระบบ'}
              </motion.button>
            </div>
          </form>
        </div>

        {/* Link to Register */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-8 text-center"
        >
          <p className="text-sm text-gray-500 font-medium">
            ยังไม่มีบัญชีผู้ใช้?{' '}
            <Link
              href="/register"
              className="font-bold text-[#BE1111] hover:text-[#A00F0F] transition-colors relative after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#BE1111]/30 after:origin-bottom-left after:scale-x-0 hover:after:scale-x-100 after:transition-transform"
            >
              ลงทะเบียนใหม่
            </Link>
          </p>
        </motion.div>
      </motion.div>
    </div>
  )
}
