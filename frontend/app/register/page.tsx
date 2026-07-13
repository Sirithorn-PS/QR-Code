'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { register } from '@/lib/auth'
import { Package } from 'lucide-react'
import { motion } from 'framer-motion'

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
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-gray-50 via-white to-gray-100/50">
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
            สร้างบัญชีใหม่
          </h1>
          <p className="text-gray-500 text-sm font-medium">
            ลงทะเบียนเพื่อใช้งานระบบจัดการคลังสินค้า
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2rem] shadow-[0_8px_40px_rgb(0,0,0,0.04)] border border-gray-100/80">
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
              <label htmlFor="fullName" className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
                ชื่อ-นามสกุล
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="นายตัวอย่าง สมมติ"
                className="w-full px-4 py-3.5 bg-gray-50/50 backdrop-blur-sm border border-gray-200/80 rounded-2xl text-gray-900 font-semibold placeholder:text-gray-400 placeholder:font-normal focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#BE1111]/10 focus:border-[#BE1111]/30 transition-all sm:text-sm"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="username" className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
                ชื่อผู้ใช้
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ตั้งชื่อผู้ใช้"
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
                placeholder="อย่างน้อย 6 ตัวอักษร"
                className="w-full px-4 py-3.5 bg-gray-50/50 backdrop-blur-sm border border-gray-200/80 rounded-2xl text-gray-900 font-semibold placeholder:text-gray-400 placeholder:font-normal focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#BE1111]/10 focus:border-[#BE1111]/30 transition-all sm:text-sm"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
                ยืนยันรหัสผ่าน
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="กรอกรหัสผ่านอีกครั้ง"
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
                className="w-full bg-gray-900 text-white font-bold py-4 px-4 rounded-2xl transition-all hover:bg-black focus:outline-none focus:ring-4 focus:ring-gray-900/20 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-gray-900/10 flex justify-center items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    กำลังตรวจสอบ...
                  </>
                ) : 'ลงทะเบียน'}
              </motion.button>
            </div>
          </form>
        </div>

        {/* Link to Login */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-8 text-center"
        >
          <p className="text-sm text-gray-500 font-medium">
            มีบัญชีผู้ใช้แล้ว?{' '}
            <Link
              href="/login"
              className="font-bold text-[#BE1111] hover:text-[#A00F0F] transition-colors relative after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#BE1111]/30 after:origin-bottom-left after:scale-x-0 hover:after:scale-x-100 after:transition-transform"
            >
              เข้าสู่ระบบ
            </Link>
          </p>
        </motion.div>
      </motion.div>
    </div>
  )
}
