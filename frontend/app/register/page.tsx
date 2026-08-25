'use client'

import Link from 'next/link'
import { ShieldAlert, ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import AuthHeader from '@/components/AuthHeader'

export default function RegisterPage() {
  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-8 sm:py-12 bg-white overflow-hidden font-body">
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px] sm:[background-size:24px_24px] opacity-35 sm:opacity-40" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-[360px] sm:max-w-[420px] relative z-10 flex flex-col items-center"
      >
        <AuthHeader />

        <div className="w-full bg-white p-6 sm:p-8 lg:p-9 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-[0_4px_25px_rgba(0,0,0,0.03)] text-center">
          <div className="w-14 h-14 bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-center mx-auto mb-4 text-amber-600">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <h2 className="text-lg sm:text-xl font-display font-bold text-slate-900 mb-2">
            ปิดรับสมัครสมาชิกสาธารณะ
          </h2>

          <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed mb-6">
            ระบบได้เปลี่ยนรูปแบบการเข้าใช้งาน โดยมีเพียง <span className="font-bold text-slate-900">แอดมินระบบ (System Admin)</span> เท่านั้นที่เป็นผู้สร้างบัญชีเข้าใช้งานให้กับพนักงาน
          </p>

          <Link
            href="/login"
            className="w-full bg-[#BE1111] text-white font-bold py-3.5 px-4 rounded-xl sm:rounded-2xl text-sm transition-all hover:bg-[#A00F0F] flex justify-center items-center gap-2 shadow-md shadow-[#BE1111]/15 active:scale-[0.99] min-h-[48px]"
          >
            <ArrowLeft className="w-4 h-4" />
            กลับสู่หน้าเข้าสู่ระบบ
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
