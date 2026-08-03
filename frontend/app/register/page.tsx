'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { register } from '@/lib/auth'
import { Package, Warehouse, Boxes, Layers, User, Lock, UserCheck, KeyRound } from 'lucide-react'
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
    <div className="min-h-screen relative flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-8 sm:py-12 bg-white overflow-hidden font-body">
      {/* Subtle Background Graphics - Warehouse & Racks (Transparent & Non-intrusive) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        {/* Subtle grid background pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px] sm:[background-size:24px_24px] opacity-35 sm:opacity-40" />
        
        {/* Decorative Warehouse Line Graphics (Top-left & Bottom-right) */}
        <div className="absolute -top-24 -left-24 w-72 sm:w-96 h-72 sm:h-96 rounded-full bg-red-500/[0.02] blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-72 sm:w-96 h-72 sm:h-96 rounded-full bg-slate-900/[0.02] blur-3xl" />
        
        {/* Ultra-subtle Warehouse Racks / Boxes Icons */}
        <Warehouse className="absolute top-6 sm:top-12 left-6 sm:left-12 w-32 sm:w-48 h-32 sm:h-48 text-slate-900/[0.03] stroke-[1]" />
        <Boxes className="absolute bottom-6 sm:bottom-12 right-6 sm:right-12 w-40 sm:w-56 h-40 sm:h-56 text-slate-900/[0.03] stroke-[1]" />
        <Layers className="absolute bottom-1/3 left-4 sm:left-8 w-24 sm:w-32 h-24 sm:h-32 text-slate-900/[0.02] stroke-[1]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[360px] sm:max-w-[420px] relative z-10 flex flex-col items-center"
      >
        {/* Top Section: Logo & System Identity */}
        <div className="text-center mb-6 sm:mb-8 flex flex-col items-center">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl bg-red-50/80 border border-red-100/80 flex items-center justify-center mb-3 sm:mb-4 shadow-xs shrink-0"
          >
            <Package className="w-7 h-7 sm:w-8 sm:h-8 text-[#BE1111]" />
          </motion.div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-extrabold text-slate-900 tracking-tight">
            WPK MMS
          </h1>
          
          <p className="mt-1.5 text-[10px] min-[360px]:text-[11px] sm:text-xs md:text-sm font-bold text-slate-600 uppercase tracking-wider text-center whitespace-nowrap">
            Packaging Material Warehouse Management System
          </p>

          <p className="mt-1 text-xs sm:text-sm font-medium text-slate-500 text-center">
            ระบบบริหารจัดการคลังวัตถุดิบบรรจุภัณฑ์
          </p>
        </div>

        {/* Bottom Section: Register Card */}
        <div className="w-full bg-white p-6 sm:p-8 lg:p-9 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-[0_4px_25px_rgba(0,0,0,0.03)]">
          {/* Error Message */}
          {error && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="mb-5 sm:mb-6 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-medium text-red-800 bg-red-50/80 border border-red-100"
            >
              <p>{error}</p>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <div>
              <label htmlFor="fullName" className="block text-[11px] sm:text-xs font-bold text-slate-500 mb-1.5 sm:mb-2 uppercase tracking-wider">
                ชื่อ-นามสกุล
              </label>
              <div className="relative">
                <UserCheck className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="นายตัวอย่าง สมมติ"
                  className="w-full pl-10 sm:pl-11 pr-4 py-3 sm:py-3.5 bg-white border border-slate-200 rounded-xl sm:rounded-2xl text-slate-900 text-sm font-semibold placeholder:text-slate-400 placeholder:font-normal focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#BE1111]/10 focus:border-[#BE1111] transition-all shadow-2xs"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="username" className="block text-[11px] sm:text-xs font-bold text-slate-500 mb-1.5 sm:mb-2 uppercase tracking-wider">
                ชื่อผู้ใช้
              </label>
              <div className="relative">
                <User className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ตั้งชื่อผู้ใช้"
                  className="w-full pl-10 sm:pl-11 pr-4 py-3 sm:py-3.5 bg-white border border-slate-200 rounded-xl sm:rounded-2xl text-slate-900 text-sm font-semibold placeholder:text-slate-400 placeholder:font-normal focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#BE1111]/10 focus:border-[#BE1111] transition-all shadow-2xs"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-[11px] sm:text-xs font-bold text-slate-500 mb-1.5 sm:mb-2 uppercase tracking-wider">
                รหัสผ่าน
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                  className="w-full pl-10 sm:pl-11 pr-4 py-3 sm:py-3.5 bg-white border border-slate-200 rounded-xl sm:rounded-2xl text-slate-900 text-sm font-semibold placeholder:text-slate-400 placeholder:font-normal focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#BE1111]/10 focus:border-[#BE1111] transition-all shadow-2xs"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-[11px] sm:text-xs font-bold text-slate-500 mb-1.5 sm:mb-2 uppercase tracking-wider">
                ยืนยันรหัสผ่าน
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="กรอกรหัสผ่านอีกครั้ง"
                  className="w-full pl-10 sm:pl-11 pr-4 py-3 sm:py-3.5 bg-white border border-slate-200 rounded-xl sm:rounded-2xl text-slate-900 text-sm font-semibold placeholder:text-slate-400 placeholder:font-normal focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#BE1111]/10 focus:border-[#BE1111] transition-all shadow-2xs"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#BE1111] text-white font-bold py-3.5 sm:py-4 px-4 rounded-xl sm:rounded-2xl text-sm sm:text-base transition-all hover:bg-[#A00F0F] focus:outline-none focus:ring-4 focus:ring-[#BE1111]/20 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-[#BE1111]/15 hover:shadow-lg hover:shadow-[#BE1111]/25 flex justify-center items-center gap-2 cursor-pointer active:scale-[0.99] min-h-[48px]"
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
              </button>
            </div>
          </form>
        </div>

        {/* Link to Login */}
        <div className="mt-6 sm:mt-8 text-center">
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            มีบัญชีผู้ใช้แล้ว?{' '}
            <Link
              href="/login"
              className="font-bold text-[#BE1111] hover:text-[#A00F0F] transition-colors relative after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#BE1111]/30 after:origin-bottom-left after:scale-x-0 hover:after:scale-x-100 after:transition-transform"
            >
              เข้าสู่ระบบ
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}

