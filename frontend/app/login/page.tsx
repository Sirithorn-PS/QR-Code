'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { login, setAuthData, verifyEmployee, resetPassword } from '@/lib/auth'
import { User, Lock, UserPlus, ArrowRight, X, CheckCircle2, KeyRound, UserCheck, ShieldCheck } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import AuthHeader from '@/components/AuthHeader'

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
      className="mb-6 p-4 rounded-2xl text-sm font-medium text-emerald-800 bg-emerald-50/80 backdrop-blur-sm border border-emerald-200/50 flex items-start gap-2 shadow-xs"
    >
      <span>✅ ลงทะเบียนบัญชี <b className="font-bold">{registered}</b> สำเร็จแล้ว กรุณากรอกรหัสผ่านเพื่อเข้าสู่ระบบ</span>
    </motion.div>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Forgot Password Modal States
  const [showForgotModal, setShowForgotModal] = useState(false)
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1)
  const [forgotUsername, setForgotUsername] = useState('')
  const [forgotEmployeeId, setForgotEmployeeId] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [forgotError, setForgotError] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)

  useEffect(() => {
    const savedUser = localStorage.getItem('wpk_remembered_user')
    if (savedUser) {
      setUsername(savedUser)
      setRememberMe(true)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const data = await login({ username, password })
      if (rememberMe) {
        localStorage.setItem('wpk_remembered_user', username)
      } else {
        localStorage.removeItem('wpk_remembered_user')
      }
      setAuthData(data.token, data.user)
      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด ลองใหม่อีกครั้ง')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const openForgotModal = (e: React.MouseEvent) => {
    e.preventDefault()
    setForgotUsername(username || '')
    setForgotEmployeeId('')
    setNewPassword('')
    setConfirmNewPassword('')
    setForgotError('')
    setForgotStep(1)
    setShowForgotModal(true)
  }

  const handleVerifyEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotError('')
    if (!forgotUsername || !forgotEmployeeId) {
      setForgotError('กรุณากรอกชื่อผู้ใช้และรหัสพนักงานให้ครบถ้วน')
      return
    }
    setForgotLoading(true)
    try {
      await verifyEmployee({ username: forgotUsername, employeeId: forgotEmployeeId })
      setForgotStep(2)
    } catch (err) {
      setForgotError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการยืนยันตัวตน')
    } finally {
      setForgotLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotError('')
    if (!newPassword || !confirmNewPassword) {
      setForgotError('กรุณากรอกรหัสผ่านใหม่ให้ครบถ้วน')
      return
    }
    if (newPassword !== confirmNewPassword) {
      setForgotError('รหัสผ่านใหม่ไม่ตรงกัน')
      return
    }
    if (newPassword.length < 6) {
      setForgotError('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร')
      return
    }
    setForgotLoading(true)
    try {
      await resetPassword({ username: forgotUsername, employeeId: forgotEmployeeId, newPassword })
      setForgotStep(3)
    } catch (err) {
      setForgotError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน')
    } finally {
      setForgotLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-8 sm:py-12 bg-white overflow-hidden font-body">
      {/* Subtle Background Graphics */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px] sm:[background-size:24px_24px] opacity-35 sm:opacity-40" />
        <div className="absolute -top-24 -left-24 w-72 sm:w-96 h-72 sm:h-96 rounded-full bg-red-500/[0.02] blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-72 sm:w-96 h-72 sm:h-96 rounded-full bg-slate-900/[0.02] blur-3xl" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[360px] sm:max-w-[420px] relative z-10 flex flex-col items-center"
      >
        {/* Top Section: Logo & System Identity */}
        <AuthHeader />

        {/* Bottom Section: Login Card */}
        <div className="w-full bg-white p-6 sm:p-8 lg:p-9 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-[0_4px_25px_rgba(0,0,0,0.03)]">
          <Suspense fallback={null}>
            <LoginAlert onRegistered={(u) => setUsername(prev => prev || u)} />
          </Suspense>

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
          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
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
                  placeholder="กรอกชื่อผู้ใช้ของคุณ"
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
                  placeholder="••••••••"
                  className="w-full pl-10 sm:pl-11 pr-4 py-3 sm:py-3.5 bg-white border border-slate-200 rounded-xl sm:rounded-2xl text-slate-900 text-sm font-semibold placeholder:text-slate-400 placeholder:font-normal focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#BE1111]/10 focus:border-[#BE1111] transition-all shadow-2xs"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between text-xs sm:text-sm pt-0.5">
              <label className="flex items-center gap-2 font-medium text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-[#BE1111] focus:ring-[#BE1111]/20 accent-[#BE1111] cursor-pointer"
                />
                <span>จดจำฉันไว้ในระบบ</span>
              </label>

              <button
                type="button"
                onClick={openForgotModal}
                className="font-bold text-[#BE1111] hover:text-[#A00F0F] transition-colors cursor-pointer"
              >
                ลืมรหัสผ่าน?
              </button>
            </div>

            {/* Submit Button */}
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
                ) : (
                  <>
                    เข้าสู่ระบบ
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>

            {/* Divider "หรือ" */}
            <div className="relative my-4 sm:my-5 flex items-center justify-center">
              <div className="w-full border-t border-slate-200" />
              <span className="bg-white px-3 text-xs sm:text-sm text-slate-400 font-medium absolute">หรือ</span>
            </div>

            {/* Register Button */}
            <div>
              <Link
                href="/register"
                className="w-full bg-white border border-[#BE1111] text-[#BE1111] font-bold py-3 sm:py-3.5 px-4 rounded-xl sm:rounded-2xl text-sm sm:text-base transition-all hover:bg-red-50/80 focus:outline-none focus:ring-4 focus:ring-[#BE1111]/10 flex justify-center items-center gap-2 cursor-pointer active:scale-[0.99] min-h-[48px]"
              >
                <UserPlus className="w-5 h-5 text-[#BE1111]" />
                ลงทะเบียนใหม่
              </Link>
            </div>
          </form>
        </div>
      </motion.div>

      {/* Forgot Password Interactive Modal */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xl relative"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-[#BE1111] shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">ลืมรหัสผ่าน</h3>
                  <p className="text-xs text-slate-500">
                    {forgotStep === 1 && 'ขั้นตอนที่ 1: ยืนยันตัวตนด้วยรหัสพนักงาน'}
                    {forgotStep === 2 && 'ขั้นตอนที่ 2: ตั้งรหัสผ่านใหม่'}
                    {forgotStep === 3 && 'รีเซ็ตรหัสผ่านสำเร็จ'}
                  </p>
                </div>
              </div>

              {/* Error Banner */}
              {forgotError && (
                <div className="mb-5 p-3.5 rounded-2xl text-xs font-medium text-red-800 bg-red-50 border border-red-100">
                  {forgotError}
                </div>
              )}

              {/* STEP 1: Verify Username & Employee ID */}
              {forgotStep === 1 && (
                <form onSubmit={handleVerifyEmployee} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">
                      ชื่อผู้ใช้ (Username)
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={forgotUsername}
                        onChange={(e) => setForgotUsername(e.target.value)}
                        placeholder="กรอกชื่อผู้ใช้ของคุณ"
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm font-semibold focus:outline-none focus:border-[#BE1111]"
                        required
                        disabled={forgotLoading}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">
                      รหัสพนักงาน (Employee ID)
                    </label>
                    <div className="relative">
                      <UserCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={forgotEmployeeId}
                        onChange={(e) => setForgotEmployeeId(e.target.value)}
                        placeholder="เช่น EMP-001"
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm font-semibold focus:outline-none focus:border-[#BE1111]"
                        required
                        disabled={forgotLoading}
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      className="w-1/2 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-50 cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="w-1/2 py-3 bg-[#BE1111] text-white font-bold rounded-xl text-sm hover:bg-[#A00F0F] disabled:opacity-50 flex items-center justify-center gap-1 cursor-pointer"
                    >
                      {forgotLoading ? 'กำลังตรวจสอบ...' : 'ตรวจสอบข้อมูล'}
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 2: Enter New Password */}
              {forgotStep === 2 && (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">
                      รหัสผ่านใหม่ (New Password)
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="อย่างน้อย 6 ตัวอักษร"
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm font-semibold focus:outline-none focus:border-[#BE1111]"
                        required
                        disabled={forgotLoading}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">
                      ยืนยันรหัสผ่านใหม่ (Confirm New Password)
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm font-semibold focus:outline-none focus:border-[#BE1111]"
                        required
                        disabled={forgotLoading}
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setForgotStep(1)}
                      className="w-1/2 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-50 cursor-pointer"
                    >
                      ย้อนกลับ
                    </button>
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="w-1/2 py-3 bg-[#BE1111] text-white font-bold rounded-xl text-sm hover:bg-[#A00F0F] disabled:opacity-50 flex items-center justify-center gap-1 cursor-pointer"
                    >
                      {forgotLoading ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่านใหม่'}
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 3: Success */}
              {forgotStep === 3 && (
                <div className="text-center py-4 space-y-4">
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900">เปลี่ยนรหัสผ่านสำเร็จแล้ว!</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      คุณสามารถใช้รหัสผ่านใหม่ในการเข้าสู่ระบบได้ทันที
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotModal(false)
                      setUsername(forgotUsername)
                      setPassword('')
                    }}
                    className="w-full py-3 bg-[#BE1111] text-white font-bold rounded-xl text-sm hover:bg-[#A00F0F] cursor-pointer mt-2"
                  >
                    เข้าสู่ระบบด้วยรหัสผ่านใหม่
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

