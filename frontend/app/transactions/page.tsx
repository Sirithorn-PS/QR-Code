'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { confirmTransaction, fetchTransactions, rejectTransaction, StockTransaction } from '@/lib/auth'
import { ArrowLeft, Loader2, CheckCircle2, AlertCircle, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function TransactionsPage() {
  const [user, setUser] = useState<{ id: number; fullName: string; role: string } | null>(null)
  const [transactions, setTransactions] = useState<StockTransaction[]>([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  // เก็บ ID ของรายการที่กำลังกดอนุมัติหรือปฏิเสธ เพื่อแสดงสถานะหมุน (Spinner) บนปุ่ม
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [processingAction, setProcessingAction] = useState<'confirm' | 'reject' | null>(null)

  // สำหรับจัดการหน้าต่าง Popup (Modal) ปฏิเสธรายการ
  const [rejectModalTxId, setRejectModalTxId] = useState<number | null>(null)
  const [rejectNote, setRejectNote] = useState('')

  // ฟังก์ชันแสดงข้อความแจ้งเตือน และตั้งเวลาให้หายไปเองภายใน 3.5 วินาที
  const showNotification = (msgText: string, isError = false) => {
    if (isError) {
      setError(msgText)
      setMessage('')
    } else {
      setMessage(msgText)
      setError('')
    }

    setTimeout(() => {
      setMessage('')
      setError('')
    }, 3500)
  }

  useEffect(() => {
    let isMounted = true

    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        setUser(JSON.parse(storedUser))
      }
    }

    async function loadInitialTransactions() {
      try {
        const initialTransactions = await fetchTransactions('pending')
        if (isMounted) setTransactions(initialTransactions)
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : 'โหลดรายการไม่สำเร็จ')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    void loadInitialTransactions()

    // Background Auto-Polling ทุกๆ 5 วินาที
    const intervalId = setInterval(async () => {
      try {
        const freshTransactions = await fetchTransactions('pending')
        if (isMounted) {
          setTransactions(freshTransactions)
        }
      } catch (err) {
        // ไม่ต้องแจ้งเตือน Error บนหน้าจอเพื่อไม่ให้รบกวนผู้ใช้ ปล่อยผ่านไป
        console.error('Background poll failed:', err)
      }
    }, 5000)

    return () => {
      isMounted = false
      clearInterval(intervalId)
    }
  }, [])

  // ฟังก์ชันอนุมัติรายการทันที (กดแล้วแสดง Spinner แล้วลบรายการออกจากหน้าจอโดยไม่ต้องรีโหลดทั้งหน้า)
  const handleConfirm = async (id: number) => {
    setProcessingId(id)
    setProcessingAction('confirm')
    try {
      await confirmTransaction(id)
      // ลบรายการที่อนุมัติแล้วออกจากรายการหน้าจอทันที ไม่ต้องรีโหลดทั้งเพจ
      setTransactions((prev) => prev.filter((item) => item.id !== id))
      showNotification(`อนุมัติรายการ #${id} สำเร็จเรียบร้อย`)
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'อนุมัติรายการไม่สำเร็จ', true)
    } finally {
      setProcessingId(null)
      setProcessingAction(null)
    }
  }

  // เปิด Popup ปฏิเสธรายการ
  const openRejectModal = (id: number) => {
    setRejectModalTxId(id)
    setRejectNote('')
  }

  // ปิด Popup ปฏิเสธรายการ
  const closeRejectModal = () => {
    setRejectModalTxId(null)
    setRejectNote('')
  }

  // ยืนยันการปฏิเสธรายการจากใน Popup
  const handleConfirmReject = async () => {
    if (rejectModalTxId === null) return

    const id = rejectModalTxId
    setProcessingId(id)
    setProcessingAction('reject')
    try {
      await rejectTransaction(id, rejectNote.trim() || undefined)
      // ลบรายการออกจากหน้าจอทันที
      setTransactions((prev) => prev.filter((item) => item.id !== id))
      closeRejectModal()
      showNotification(`ปฏิเสธรายการ #${id} เรียบร้อยแล้ว`)
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'ปฏิเสธรายการไม่สำเร็จ', true)
    } finally {
      setProcessingId(null)
      setProcessingAction(null)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-[#BE1111] transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>กลับหน้าหลัก</span>
        </Link>
        <h1 className="mt-2 text-3xl font-display font-bold text-slate-900 tracking-tight">รายการรอการยืนยัน</h1>

        {/* แถบแจ้งเตือนข้อความ (หายไปเองใน 3.5 วินาที) */}
        {error && (
          <div className="mt-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 shadow-sm transition-all">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}
        {message && (
          <div className="mt-6 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800 shadow-sm transition-all">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-green-600" />
            <span>{message}</span>
          </div>
        )}

        <div className="mt-6 grid gap-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-white p-12 text-center text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin text-[#BE1111] mb-2" />
              <span>กำลังโหลดรายการ...</span>
            </div>
          ) : transactions.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white p-12 text-center text-slate-500">
              ไม่มีรายการรอการยืนยัน
            </div>
          ) : (
            transactions.map((transaction) => {
              const isConfirming = processingId === transaction.id && processingAction === 'confirm'
              const isRejecting = processingId === transaction.id && processingAction === 'reject'
              const isBusy = processingId === transaction.id

              return (
                <div
                  key={transaction.id}
                  className="rounded-2xl border border-slate-100 bg-white p-5 md:p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)] transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)]"
                >
                  <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-display font-bold text-slate-400 bg-slate-50 px-2.5 py-0.5 rounded-md border border-slate-100">#{transaction.id}</span>
                        {transaction.type === 'receive' ? (
                          <span className="inline-flex items-center justify-center rounded-full bg-green-50 border border-green-100 px-2.5 py-0.5 text-xs font-bold text-green-700">
                            รับเข้า
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center rounded-full bg-red-50 border border-red-100 px-2.5 py-0.5 text-xs font-bold text-[#BE1111]">
                            เบิกออก
                          </span>
                        )}
                      </div>
                      <h2 className="text-xl font-bold text-slate-900 mt-1">
                        {transaction.product?.description || transaction.itemSnapshot.name}
                      </h2>
                      <div className="mt-3 grid gap-x-6 gap-y-2 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-3 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                        <div><span className="text-slate-400 text-[11px] uppercase tracking-wider block mb-0.5">Item Code</span> <span className="font-semibold text-slate-700">{transaction.product?.itemCode || transaction.itemSnapshot.itemCode}</span></div>
                        <div><span className="text-slate-400 text-[11px] uppercase tracking-wider block mb-0.5">จำนวน</span> <span className="font-bold text-slate-900 text-base">{transaction.quantity}</span></div>
                        <div><span className="text-slate-400 text-[11px] uppercase tracking-wider block mb-0.5">ผู้สร้างรายการ</span> <span className="font-medium text-slate-700">{transaction.createdBy?.fullName || '-'}</span></div>
                      </div>
                    </div>

                    {user?.role === 'admin' ? (
                      <div className="flex gap-2 self-start md:self-center">
                        <button
                          onClick={() => handleConfirm(transaction.id)}
                          disabled={isBusy}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-[#10b981] px-5 py-2.5 font-bold text-white shadow-md shadow-[#10b981]/20 transition-all hover:bg-[#059669] hover:shadow-lg hover:shadow-[#10b981]/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:bg-slate-300 disabled:shadow-none disabled:transform-none disabled:cursor-not-allowed"
                        >
                          {isConfirming ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>กำลังอนุมัติ...</span>
                            </>
                          ) : (
                            <span>อนุมัติ</span>
                          )}
                        </button>

                        <button
                          onClick={() => openRejectModal(transaction.id)}
                          disabled={isBusy}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-[#ef4444] px-5 py-2.5 font-bold text-white shadow-md shadow-[#ef4444]/20 transition-all hover:bg-[#dc2626] hover:shadow-lg hover:shadow-[#ef4444]/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:bg-slate-300 disabled:shadow-none disabled:transform-none disabled:cursor-not-allowed"
                        >
                          {isRejecting ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>กำลังปฏิเสธ...</span>
                            </>
                          ) : (
                            <span>ปฏิเสธ</span>
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 text-xs font-bold text-amber-600 self-start md:self-center shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                        รอการอนุมัติจาก Supervisor
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* หน้าต่าง Popup (Modal) สำหรับยืนยันการปฏิเสธและระบุหมายเหตุ */}
      <AnimatePresence>
        {rejectModalTxId !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeRejectModal}
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'tween', ease: 'easeOut', duration: 0.2 }}
              className="relative w-full max-w-md rounded-3xl bg-white/95 backdrop-blur-xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.1)] border border-white/40"
            >
              <h3 className="text-xl font-display font-bold text-slate-900 tracking-tight">ยืนยันการปฏิเสธรายการ <span className="text-slate-400 font-display text-lg ml-1">#{rejectModalTxId}</span></h3>
              <p className="mt-2 text-sm text-slate-500">
                กรุณาระบุหมายเหตุหรือเหตุผลในการปฏิเสธรายการนี้ (ถ้ามี) เพื่อแจ้งให้ผู้สร้างรายการทราบ
              </p>

              <div className="mt-6">
                <label htmlFor="rejectNote" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  หมายเหตุ / เหตุผล
                </label>
                <textarea
                  id="rejectNote"
                  rows={3}
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  placeholder="เช่น ข้อมูลไม่ถูกต้อง หรือสินค้าชำรุด..."
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 text-sm text-slate-800 placeholder-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all"
                />
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeRejectModal}
                  disabled={processingId !== null}
                  className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 active:scale-95 transition-all disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  disabled={processingId !== null}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#BE1111] px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-[#BE1111]/20 hover:bg-[#A00F0F] hover:shadow-lg hover:shadow-[#BE1111]/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all disabled:bg-slate-300 disabled:shadow-none disabled:transform-none"
                >
                  {processingId === rejectModalTxId ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>กำลังปฏิเสธ...</span>
                    </>
                  ) : (
                    <span>ยืนยันปฏิเสธ</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  )
}

