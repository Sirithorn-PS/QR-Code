'use client'

import { Package } from 'lucide-react'
import { motion } from 'framer-motion'

export default function AuthHeader() {
  return (
    <div className="text-center mb-6 sm:mb-8 flex flex-col items-center select-none">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="mb-2 sm:mb-3 shrink-0 flex items-center justify-center"
      >
        <Package className="w-14 h-14 sm:w-16 sm:h-16 text-[#BE1111] stroke-[2.2]" />
      </motion.div>

      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold tracking-tight flex items-center justify-center gap-2.5 sm:gap-3.5 text-center">
        <span className="text-[#0F172A]">WPK</span>
        <span className="text-[#BE1111]">MMS</span>
      </h1>
      
      <p className="mt-1.5 text-xs sm:text-sm font-medium text-slate-500 text-center tracking-normal">
        Packaging Material Warehouse Management System
      </p>

      {/* Decorative Accent & Thai Subtitle Section */}
      <div className="mt-3 flex flex-col items-center gap-2">
        {/* Top Accent Line: Red left, Gray right */}
        <div className="flex items-center gap-0.5">
          <div className="w-6 sm:w-7 h-1 bg-[#BE1111] rounded-l-full" />
          <div className="w-6 sm:w-7 h-1 bg-slate-200 rounded-r-full" />
        </div>

        <div className="text-xs sm:text-sm font-medium text-slate-600 text-center leading-snug">
          <p>ระบบบริหารจัดการคลังวัตถุดิบบรรจุภัณฑ์</p>
        </div>

        {/* Bottom Accent Line: Two Red Dashes */}
        <div className="flex items-center gap-1.5 mt-0.5">
          <div className="w-5 sm:w-6 h-0.5 bg-[#BE1111] rounded-full" />
          <div className="w-5 sm:w-6 h-0.5 bg-[#BE1111] rounded-full" />
        </div>
      </div>
    </div>
  )
}
