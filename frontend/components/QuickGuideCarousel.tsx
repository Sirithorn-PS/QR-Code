'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, PanInfo } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  LogIn,
  Home,
  ScanLine,
  Clock,
  Package,
  FileSpreadsheet,
  UserCheck,
  ShieldCheck,
  Shield,
  Users,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  FileText
} from 'lucide-react'

interface GuideStep {
  id: number
  stepNumber: string
  title: string
  shortTitle: string
  shortDescription: string
  icon: React.ElementType
  image: string
}

const guideSteps: GuideStep[] = [
  {
    id: 1,
    stepNumber: '01',
    title: 'LOGIN',
    shortTitle: 'เข้าสู่ระบบ',
    shortDescription: 'กรอก Username และ Password เพื่อเข้าสู่ระบบบริหารจัดการคลัง',
    icon: LogIn,
    image: '/images/guide-login.jpg'
  },
  {
    id: 2,
    stepNumber: '02',
    title: 'HOME',
    shortTitle: 'หน้าหลัก',
    shortDescription: 'ตรวจสอบภาพรวมระบบ เข้าถึงเมนูด่วน และดูสถานะสิทธิ์การใช้งาน',
    icon: Home,
    image: '/images/guide-home.png'
  },
  {
    id: 3,
    stepNumber: '03',
    title: 'SCAN',
    shortTitle: 'รับเข้า - เบิกออก',
    shortDescription: 'เลือกประเภททำรายการ สแกน QR Code และระบุจำนวนสินค้าเพื่อทำรายการ',
    icon: ScanLine,
    image: '/images/guide-scan.jpg'
  },
  {
    id: 4,
    stepNumber: '04',
    title: 'PENDING TRANSACTIONS',
    shortTitle: 'รายการรอการยืนยัน',
    shortDescription: 'ตรวจสอบและยืนยันอนุมัติรายการเบิกจ่ายโดย Supervisor',
    icon: Clock,
    image: '/images/guide-pending.jpg'
  },
  {
    id: 5,
    stepNumber: '05',
    title: 'STOCK / INVENTORY',
    shortTitle: 'สต็อกสินค้า',
    shortDescription: 'ตรวจสอบจำนวนสินค้าคงเหลือแบบ Real-time และตำแหน่งจัดเก็บ',
    icon: Package,
    image: '/images/guide-inventory.jpg'
  },
  {
    id: 6,
    stepNumber: '06',
    title: 'REPORTS',
    shortTitle: 'รายงานธุรกรรม',
    shortDescription: 'ตรวจสอบประวัติการทำรายการย้อนหลังและสถิติรับเข้า-เบิกออก',
    icon: FileSpreadsheet,
    image: '/images/guide-reports.jpg'
  }
]

export function QuickGuideCarousel() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [breakpoint, setBreakpoint] = useState<'mobile' | 'tablet' | 'desktop'>('desktop')

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setBreakpoint('mobile')
      } else if (window.innerWidth < 1280) {
        setBreakpoint('tablet')
      } else {
        setBreakpoint('desktop')
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handlePrev = useCallback(() => {
    setActiveIndex((prev) => (prev === 0 ? guideSteps.length - 1 : prev - 1))
  }, [])

  const handleNext = useCallback(() => {
    setActiveIndex((prev) => (prev === guideSteps.length - 1 ? 0 : prev + 1))
  }, [])

  // Auto-play timer: slides to next step every 4s, resets on manual navigation, pauses on hover/touch
  useEffect(() => {
    if (isPaused) return

    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev === guideSteps.length - 1 ? 0 : prev + 1))
    }, 4000)

    return () => clearInterval(timer)
  }, [activeIndex, isPaused])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrev()
      else if (e.key === 'ArrowRight') handleNext()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleNext, handlePrev])

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const swipeThreshold = 40
    if (info.offset.x < -swipeThreshold) handleNext()
    else if (info.offset.x > swipeThreshold) handlePrev()
  }

  // Dimensions based on Breakpoint Specification
  const isMobile = breakpoint === 'mobile'
  const isTablet = breakpoint === 'tablet'

  const activeWidth = isMobile ? 220 : isTablet ? 280 : 320
  const activeHeight = isMobile ? 320 : isTablet ? 380 : 420
  const normalWidth = isMobile ? 140 : isTablet ? 175 : 200
  const normalHeight = isMobile ? 220 : isTablet ? 260 : 300
  
  const viewportWidth = isMobile ? '100%' : isTablet ? 960 : 1280
  const viewportHeight = isMobile ? 360 : isTablet ? 360 : 420

  const getXOffset = (distance: number) => {
    if (distance === 0) return 0
    const gap = 24
    const sign = Math.sign(distance)
    const absDist = Math.abs(distance)
    
    // Distance 1 offset
    let offset = (activeWidth / 2) + gap + (normalWidth / 2)
    
    // Additional distance
    if (absDist > 1) {
      offset += (absDist - 1) * (normalWidth + gap)
    }
    
    return sign * offset
  }

  return (
    <section id="quick-guide" className="w-full mx-auto my-10 select-none overflow-hidden sm:overflow-visible scroll-mt-6">
      {/* Section Header */}
      <div className="text-center mb-10 select-none px-4">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-extrabold text-slate-900 tracking-tight">
          ขั้นตอนการใช้งานระบบ
        </h2>
        <p className="text-sm sm:text-base text-slate-500 font-display font-normal mt-1.5">
          “เรียนรู้การใช้งาน WPK MMS ทีละขั้นตอน”
        </p>
      </div>

      {/* Viewport Frame */}
      <div className="relative mx-auto px-4 sm:px-0 w-full flex flex-col items-center">
        <div 
          className="relative"
          style={{ width: viewportWidth, maxWidth: '100%' }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          {/* Navigation Arrow Left (48x48) - Placed outside the overflow-hidden frame */}
          <button
            onClick={handlePrev}
            type="button"
            className="absolute -left-3 sm:-left-6 top-1/2 -translate-y-1/2 z-[60] w-12 h-12 rounded-full bg-white text-[#0F172A] flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer border border-slate-100/50"
            aria-label="Previous Step"
          >
            <ChevronLeft className="w-6 h-6 stroke-[3]" />
          </button>

          {/* Navigation Arrow Right (48x48) - Placed outside the overflow-hidden frame */}
          <button
            onClick={handleNext}
            type="button"
            className="absolute -right-3 sm:-right-6 top-1/2 -translate-y-1/2 z-[60] w-12 h-12 rounded-full bg-white text-[#0F172A] flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer border border-slate-100/50"
            aria-label="Next Step"
          >
            <ChevronRight className="w-6 h-6 stroke-[3]" />
          </button>

          {/* The Overflow-Hidden Gray Frame */}
          <div 
            className="relative w-full bg-[#F4F6F8] rounded-[2rem] flex items-center justify-center overflow-hidden touch-pan-y"
            style={{ height: viewportHeight }}
          >
            {/* Carousel Cards */}
            <div className="relative flex items-center justify-center w-full h-full">
              <AnimatePresence mode="popLayout" initial={false}>
                {guideSteps.map((step, index) => {
                  const getDistance = (idx: number, activeIdx: number, length: number) => {
                    let dist = idx - activeIdx
                    if (dist > length / 2) dist -= length
                    if (dist < -length / 2) dist += length
                    return dist
                  }
                  
                  const distance = getDistance(index, activeIndex, guideSteps.length)
                  const isActive = distance === 0
                  const isVisible = Math.abs(distance) <= 2

                  if (!isVisible) return null

                  return (
                    <motion.div
                      key={step.id}
                      onClick={() => setActiveIndex(index)}
                      drag={isActive ? 'x' : false}
                      dragConstraints={{ left: 0, right: 0 }}
                      dragSnapToOrigin
                      onDragEnd={handleDragEnd}
                      initial={{
                        width: normalWidth,
                        height: normalHeight,
                        opacity: 0,
                        x: getXOffset(distance)
                      }}
                      animate={{
                        width: isActive ? activeWidth : normalWidth,
                        height: isActive ? activeHeight : normalHeight,
                        opacity: isActive ? 1 : 0.5,
                        x: getXOffset(distance),
                        zIndex: 50 - Math.abs(distance),
                      }}
                      exit={{
                        width: normalWidth,
                        height: normalHeight,
                        opacity: 0,
                        x: getXOffset(distance)
                      }}
                      transition={{
                        type: 'spring',
                        stiffness: 350,
                        damping: 35,
                        mass: 1
                      }}
                      className={`absolute bg-white rounded-2xl flex flex-col overflow-hidden transition-shadow duration-500 ${
                        isActive
                          ? 'shadow-[0_12px_30px_rgba(0,0,0,0.08)] cursor-default'
                          : 'cursor-pointer hover:shadow-lg'
                      }`}
                    >
                      {/* Card Header (Text) */}
                      <div className="flex flex-col items-center justify-center text-center pt-5 sm:pt-6 pb-2 px-3">
                        <span className="text-[13px] sm:text-base font-bold text-[#BE1111] mb-0.5 sm:mb-1">{step.stepNumber}</span>
                        <h3 className="text-sm sm:text-lg font-display font-black text-slate-900 tracking-wide mb-0.5 uppercase leading-tight">
                          {step.title}
                        </h3>
                        <p className="text-[11px] sm:text-[13px] font-display font-normal text-slate-500">
                          {step.shortTitle}
                        </p>
                      </div>

                      {/* Card Body (Image) */}
                      <div className="flex-1 w-full p-2 sm:p-4 pt-0 flex justify-center items-center relative pointer-events-none min-h-0">
                        <img
                          src={step.image}
                          alt={step.title}
                          className={`w-full h-full object-contain ${
                            step.id === 1 || step.id === 3 || step.id === 4 || step.id === 6 ? 'border border-slate-200/80 rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.04)]' : ''
                          }`}
                        />
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Active Step Description Box */}
        <div className="mt-6 min-h-[56px] flex flex-col items-center justify-center text-center px-4 max-w-xl mx-auto z-20">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIndex}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col items-center gap-1.5"
            >
              <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-display font-bold text-slate-800 bg-white px-3.5 py-1 rounded-full border border-slate-200/80 shadow-xs">
                <span className="text-[#BE1111] font-bold">{guideSteps[activeIndex].stepNumber}</span>
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                <span>{guideSteps[activeIndex].shortTitle}</span>
              </div>
              <p className="text-xs sm:text-sm font-display font-normal text-slate-600 max-w-lg leading-relaxed">
                {guideSteps[activeIndex].shortDescription}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Indicators: Dots */}
        <div className="flex items-center justify-center gap-2.5 mt-6 z-20">
          {guideSteps.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveIndex(index)}
              type="button"
              className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                index === activeIndex
                  ? 'w-8 bg-[#BE1111]'
                  : 'w-2.5 bg-slate-300 hover:bg-slate-400'
              }`}
              title={`ไปยังขั้นตอนที่ ${index + 1}`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* User Role Summary Section */}
      <div className="mt-16 pt-8 border-t border-slate-200/60 text-left max-w-[1280px] mx-auto px-4 sm:px-6">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-bold mb-1.5">
            <UserCheck className="w-3.5 h-3.5 text-[#BE1111]" />
            <span>USER ROLES</span>
          </div>
          <h3 className="text-lg sm:text-xl font-display font-extrabold text-slate-900">
            บทบาทผู้ใช้งาน (User Role)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4 lg:gap-5">
          {/* 1. Warehouse Staff */}
          <div className="p-3.5 sm:p-4 lg:p-5 rounded-2xl bg-white border border-slate-200/70 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 sm:gap-3 mb-3 sm:mb-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
                  <UserCheck className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-display font-extrabold text-slate-900 text-xs sm:text-base leading-tight truncate">
                    Staff
                  </h4>
                  <p className="text-[10px] sm:text-xs font-display font-normal text-slate-500 truncate">พนักงานทั่วไป</p>
                </div>
              </div>
              <ul className="space-y-2 text-[11px] sm:text-[11.5px] lg:text-xs xl:text-[13px] font-display font-normal text-slate-700">
                <li className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap">
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 shrink-0" />
                  <span className="truncate">สแกนรับเข้า - เบิกออกสินค้า</span>
                </li>
                <li className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap">
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 shrink-0" />
                  <span className="truncate">ตรวจสอบประวัติรายการของตนเอง</span>
                </li>
                <li className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap text-slate-400">
                  <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400 shrink-0" />
                  <span className="truncate">ไม่มีสิทธิ์อนุมัติหรือสร้างบัญชี</span>
                </li>
              </ul>
            </div>
          </div>

          {/* 2. Supervisor */}
          <div className="p-3.5 sm:p-4 lg:p-5 rounded-2xl bg-white border border-amber-100 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 sm:gap-3 mb-3 sm:mb-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-display font-extrabold text-slate-900 text-xs sm:text-base leading-tight truncate">
                    Supervisor
                  </h4>
                  <p className="text-[10px] sm:text-xs font-display font-normal text-slate-500 truncate">ผู้ควบคุมดูแลระบบคลัง</p>
                </div>
              </div>
              <ul className="space-y-2 text-[11px] sm:text-[11.5px] lg:text-xs xl:text-[13px] font-display font-normal text-slate-700">
                <li className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap">
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 shrink-0" />
                  <span className="truncate">อนุมัติ / ปฏิเสธการรับ-จ่ายสินค้า</span>
                </li>
                <li className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap">
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 shrink-0" />
                  <span className="truncate">จัดการสต็อก และสร้างสูตร BOM</span>
                </li>
                <li className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap">
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 shrink-0" />
                  <span className="truncate">เข้าถึงรายงานและแดชบอร์ดทั้งหมด</span>
                </li>
              </ul>
            </div>
          </div>

          {/* 3. System Admin */}
          <div className="p-3.5 sm:p-4 lg:p-5 rounded-2xl bg-white border border-red-100 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 sm:gap-3 mb-3 sm:mb-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-red-50 text-[#BE1111] flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-[#BE1111]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-display font-extrabold text-slate-900 text-xs sm:text-base leading-tight truncate">
                    System Admin
                  </h4>
                  <p className="text-[10px] sm:text-xs font-display font-normal text-slate-500 truncate">แอดมินผู้ดูแลระบบ</p>
                </div>
              </div>
              <ul className="space-y-2 text-[11px] sm:text-[11.5px] lg:text-xs xl:text-[13px] font-display font-normal text-slate-700">
                <li className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap">
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 shrink-0" />
                  <span className="truncate">สร้างบัญชีผู้ใช้ใหม่ และกำหนด Role</span>
                </li>
                <li className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap">
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 shrink-0" />
                  <span className="truncate">เปิด/ปิด ระงับบัญชี และรีเซ็ตรหัสผ่าน</span>
                </li>
                <li className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap">
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 shrink-0" />
                  <span className="truncate">จัดการข้อมูลและรายชื่อผู้ใช้งาน</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Manual & Guide Buttons (Role-Card Style) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4 lg:gap-5 mt-8 select-none">
          {/* Button 1: Quick Guide */}
          <a
            href={encodeURI('/docs/คู่มือแบบย่อ (Quick Guide).pdf')}
            target="_blank"
            rel="noopener noreferrer"
            download="คู่มือแบบย่อ (Quick Guide).pdf"
            className="group p-3.5 sm:p-4 rounded-2xl bg-white border border-red-100 shadow-xs hover:shadow-md hover:border-red-200 transition-all duration-300 flex items-center gap-3 text-left cursor-pointer active:scale-[0.99]"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-red-50 text-[#BE1111] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform border border-red-100/60">
              <BookOpen className="w-4.5 h-4.5 sm:w-5 sm:h-5 stroke-[2.2]" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-display font-extrabold text-slate-900 text-xs sm:text-[13px] md:text-xs lg:text-[13px] xl:text-sm leading-tight tracking-tight group-hover:text-[#BE1111] transition-colors whitespace-nowrap">
                คู่มือแบบย่อ (Quick Guide)
              </h4>
              <p className="text-[10px] sm:text-[11px] font-display font-normal text-slate-500 mt-0.5 tracking-tight whitespace-nowrap">
                เปิดดูเอกสารคู่มือการใช้งานแบบย่อ (PDF)
              </p>
            </div>
            <ChevronRight className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-slate-400 group-hover:text-[#BE1111] group-hover:translate-x-1 transition-all shrink-0 ml-auto" />
          </a>

          {/* Button 2: Work Instruction - WI */}
          <a
            href="/docs/work-instruction.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="group p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/70 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-300 flex items-center gap-3 text-left cursor-pointer active:scale-[0.99]"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform border border-slate-200/60">
              <FileText className="w-4.5 h-4.5 sm:w-5 sm:h-5 stroke-[2.2]" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-display font-extrabold text-slate-900 text-xs sm:text-[13px] md:text-xs lg:text-[13px] xl:text-sm leading-tight tracking-tight group-hover:text-slate-800 transition-colors whitespace-nowrap">
                คู่มือแบบรายละเอียด (Work Instruction - WI)
              </h4>
              <p className="text-[10px] sm:text-[11px] font-display font-normal text-slate-500 mt-0.5 tracking-tight whitespace-nowrap">
                ข้อกำหนดและขั้นตอนปฏิบัติงานอย่างเป็นทางการ (WI)
              </p>
            </div>
            <ChevronRight className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-1 transition-all shrink-0 ml-auto" />
          </a>
        </div>
      </div>
    </section>
  )
}
