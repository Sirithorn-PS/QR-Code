'use client'

import { useEffect, useState, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { confirmTransaction, fetchTransactions, rejectTransaction, StockTransaction } from '@/lib/auth'
import { Loader2, CheckCircle2, AlertCircle, XCircle, Clock, Filter, Layers, ChevronDown, ChevronUp } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

function TransactionsContent() {
  const searchParams = useSearchParams()
  const highlightParam = searchParams.get('id')
  const highlightId = highlightParam ? Number(highlightParam) : null

  const [user, setUser] = useState<{ id: number; fullName: string; role: string } | null>(null)
  const [transactions, setTransactions] = useState<StockTransaction[]>([])
  const [statusFilter, setStatusFilter] = useState<'pending' | 'all' | 'confirmed' | 'rejected'>('pending')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeHighlightId, setActiveHighlightId] = useState<number | null>(null)

  // เก็บ ID ของรายการที่เปิดดูรายละเอียด FIFO Lot Allocation
  const [expandedTxIds, setExpandedTxIds] = useState<Record<number, boolean>>({})
  const toggleExpand = (id: number) => {
    setExpandedTxIds((prev) => ({ ...prev, [id]: !prev[id] }))
  }

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

  // หากมีการกดแจ้งเตือนเข้ามาโดยมี ?id=123 ให้ปรับไปแท็บ "ทั้งหมด" และเคลียร์ URL เพื่อให้รีเฟรชกลับสู่ค่าปกติ
  useEffect(() => {
    if (highlightId && Number.isInteger(highlightId)) {
      setStatusFilter('all')
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', '/transactions')
      }
    }
  }, [highlightId])

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
        const data = await fetchTransactions('')
        if (isMounted) setTransactions(data)
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
        const freshData = await fetchTransactions('')
        if (isMounted) {
          setTransactions(freshData)
        }
      } catch (err) {
        console.error('Background poll failed:', err)
      }
    }, 5000)

    return () => {
      isMounted = false
      clearInterval(intervalId)
    }
  }, [])

  // เมื่อโหลดข้อมูลเสร็จและมี highlightId ให้สโครลไปยังรายการนั้นโดยตรง
  useEffect(() => {
    if (!loading && highlightId) {
      const element = document.getElementById(`tx-${highlightId}`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [loading, highlightId])

  // คำนวณจำนวนรายการรออนุมัติ และจำนวนของแต่ละสถานะตามข้อมูลจริง
  const pendingCount = useMemo(() => transactions.filter((t) => t.status === 'pending').length, [transactions])
  const confirmedCount = useMemo(() => transactions.filter((t) => t.status === 'confirmed').length, [transactions])
  const rejectedCount = useMemo(() => transactions.filter((t) => t.status === 'rejected').length, [transactions])
  const totalCount = transactions.length

  // กรองรายการตามแท็บสถานะที่เลือก
  const filteredTransactions = useMemo(() => {
    if (statusFilter === 'all') return transactions
    return transactions.filter((t) => t.status === statusFilter)
  }, [transactions, statusFilter])

  // ฟังก์ชันอนุมัติรายการทันที
  const handleConfirm = async (id: number) => {
    setProcessingId(id)
    setProcessingAction('confirm')
    try {
      await confirmTransaction(id)
      setTransactions((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: 'confirmed' } : item))
      )
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('transactionUpdated'))
      }
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
      setTransactions((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: 'rejected', note: rejectNote.trim() || item.note } : item))
      )
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('transactionUpdated'))
      }
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
        <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">รายการรอการยืนยัน</h1>

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

        {/* ตัวกรองเลือกสถานะรายการ (Dropdown) */}
        <div className="mt-6 border-b border-slate-200/80 pb-4">
          <div className="flex items-center gap-2.5 bg-white backdrop-blur-sm rounded-2xl border border-slate-200/90 px-4 py-2.5 shadow-xs hover:border-slate-300 transition-all max-w-xs sm:max-w-sm">
            <Filter className="w-4.5 h-4.5 text-[#BE1111] shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'pending' | 'all' | 'confirmed' | 'rejected')}
              className="w-full text-xs sm:text-sm font-bold text-slate-900 focus:outline-none bg-transparent cursor-pointer"
            >
              <option value="pending">รออนุมัติ ({pendingCount})</option>
              <option value="all">ทั้งหมด ({totalCount})</option>
              <option value="confirmed">อนุมัติแล้ว ({confirmedCount})</option>
              <option value="rejected">ปฏิเสธ ({rejectedCount})</option>
            </select>
          </div>
        </div>

        <div className="mt-6 grid gap-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-white p-12 text-center text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin text-[#BE1111] mb-2" />
              <span>กำลังโหลดรายการ...</span>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white p-12 text-center text-slate-500">
              {statusFilter === 'pending'
                ? 'ไม่มีรายการรอการยืนยัน'
                : statusFilter === 'confirmed'
                ? 'ไม่มีรายการที่ได้รับการอนุมัติ'
                : statusFilter === 'rejected'
                ? 'ไม่มีรายการที่ถูกปฏิเสธ'
                : 'ไม่มีรายการข้อมูลในระบบ'}
            </div>
          ) : (
            filteredTransactions.map((transaction) => {
              const isConfirming = processingId === transaction.id && processingAction === 'confirm'
              const isRejecting = processingId === transaction.id && processingAction === 'reject'
              const isBusy = processingId === transaction.id

              return (
                <div
                  key={transaction.id}
                  id={`tx-${transaction.id}`}
                  className="rounded-2xl border border-slate-100 bg-white p-5 md:p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)] transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)]"
                >

                  <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5 mb-2">
                        <span className="text-xs sm:text-sm font-display font-bold text-slate-400 bg-slate-50 px-2.5 py-0.5 rounded-md border border-slate-200/80">
                          #{transaction.id}
                        </span>
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

                      {(() => {
                        const fullDesc = transaction.product?.description || transaction.itemSnapshot.name || ''
                        const openParenIndex = fullDesc.indexOf('(')
                        let mainTitle = fullDesc
                        let subDetail = ''
                        if (openParenIndex !== -1) {
                          mainTitle = fullDesc.substring(0, openParenIndex).trim()
                          subDetail = fullDesc.substring(openParenIndex).trim()
                        }

                        return (
                          <div>
                            <h2 className="text-base sm:text-lg md:text-xl font-display font-extrabold text-slate-900 leading-snug tracking-tight">
                              {mainTitle}
                            </h2>
                            {subDetail && (
                              <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-0.5 leading-snug">
                                {subDetail}
                              </p>
                            )}
                          </div>
                        )
                      })()}
                      <div className="mt-3 grid gap-x-6 gap-y-2 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-3 bg-slate-50/60 p-3.5 rounded-xl border border-slate-200/60">
                        <div><span className="text-slate-400 text-[11px] uppercase tracking-wider block mb-0.5">Item Code</span> <span className="font-semibold text-slate-800">{transaction.product?.itemCode || transaction.itemSnapshot.itemCode}</span></div>
                        <div><span className="text-slate-400 text-[11px] uppercase tracking-wider block mb-0.5">จำนวน</span> <span className="font-extrabold text-slate-900 text-base">{transaction.quantity}</span></div>
                        <div><span className="text-slate-400 text-[11px] uppercase tracking-wider block mb-0.5">ผู้สร้างรายการ</span> <span className="font-medium text-slate-700">{transaction.createdBy?.fullName || '-'}</span></div>
                      </div>
                    </div>

                    {transaction.status === 'pending' ? (
                      (user?.role === 'admin' || user?.role === 'supervisor') ? (
                        <div className="flex gap-2 self-start md:self-center">
                          <button
                            onClick={() => handleConfirm(transaction.id)}
                            disabled={isBusy}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-[#10b981] px-5 py-2.5 font-bold text-white shadow-md shadow-[#10b981]/20 transition-all hover:bg-[#059669] hover:shadow-lg hover:shadow-[#10b981]/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:bg-slate-300 disabled:shadow-none disabled:transform-none disabled:cursor-not-allowed cursor-pointer"
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
                            className="inline-flex items-center gap-1.5 rounded-xl bg-[#ef4444] px-5 py-2.5 font-bold text-white shadow-md shadow-[#ef4444]/20 transition-all hover:bg-[#dc2626] hover:shadow-lg hover:shadow-[#ef4444]/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:bg-slate-300 disabled:shadow-none disabled:transform-none disabled:cursor-not-allowed cursor-pointer"
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
                      )
                    ) : transaction.status === 'confirmed' ? (
                      <div className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-xs font-bold text-emerald-700 self-start md:self-center shadow-2xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>อนุมัติแล้ว</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-xs font-bold text-[#BE1111] self-start md:self-center shadow-2xs">
                        <XCircle className="w-4 h-4 text-[#BE1111]" />
                        <span>ปฏิเสธแล้ว</span>
                        {transaction.note && (
                          <span className="text-[11px] font-normal text-red-600 ml-1">({transaction.note})</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* FIFO Lot Allocation Section (Visible to Supervisor/Admin for Confirmed Packaging Issue) */}
                  {(() => {
                    const isSupervisorOrAdmin = user?.role === 'supervisor' || user?.role === 'admin'
                    const isPackagingIssueConfirmed =
                      transaction.type === 'issue' &&
                      transaction.status === 'confirmed' &&
                      (transaction.product?.itemType === 'Packaging' || transaction.itemSnapshot?.itemType === 'Packaging')

                    if (!isSupervisorOrAdmin || !isPackagingIssueConfirmed || !transaction.allocations || transaction.allocations.length === 0) {
                      return null
                    }

                    const isExpanded = expandedTxIds[transaction.id] ?? false
                    const totalAllocated = transaction.allocations.reduce((acc, a) => acc + (Number(a.quantity) || 0), 0)
                    const unit = transaction.product?.unit || transaction.itemSnapshot?.unit || ''

                    return (
                      <div className="mt-4 pt-4 border-t border-slate-100 font-display">
                        <div className="rounded-2xl border border-blue-100 bg-blue-50/40 overflow-hidden transition-all">
                          {/* Header / Toggle Button */}
                          <button
                            type="button"
                            onClick={() => toggleExpand(transaction.id)}
                            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-blue-50/80 transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="flex items-center gap-1.5 font-bold text-xs text-blue-900">
                                <Layers className="w-4 h-4 text-blue-600 shrink-0" />
                                <span>ตัดสต็อกตามลำดับ FIFO</span>
                              </div>
                              <span className="text-[11px] font-semibold text-blue-700 bg-blue-100/90 px-2.5 py-0.5 rounded-full border border-blue-200/70">
                                {transaction.allocations.length} Lot{transaction.allocations.length > 1 ? 's' : ''}
                              </span>
                              <span className="text-xs font-semibold text-slate-500">
                                (รวม {totalAllocated.toLocaleString()} {unit})
                              </span>
                            </div>

                            <div className="flex items-center gap-1 text-xs font-bold text-blue-700">
                              <span>{isExpanded ? 'ซ่อนรายละเอียด' : 'ดูรายละเอียด'}</span>
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </div>
                          </button>

                          {/* Collapsible Content */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="border-t border-blue-100/80 bg-white/90 px-4 py-3.5 overflow-hidden"
                              >
                                <div className="space-y-2">
                                  {transaction.allocations.map((alloc, idx) => {
                                    const lot = alloc.productLot
                                    const receivedDateStr = lot?.receivedDate
                                      ? new Date(lot.receivedDate).toLocaleDateString('th-TH', {
                                          year: 'numeric',
                                          month: 'short',
                                          day: 'numeric',
                                        })
                                      : '-'

                                    return (
                                      <div
                                        key={alloc.id || idx}
                                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl border border-slate-200/80 bg-white shadow-2xs text-xs"
                                      >
                                        <div className="flex items-start gap-2.5 min-w-0">
                                          <span className="shrink-0 font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 text-[11px]">
                                            #{idx + 1}
                                          </span>
                                          <div className="space-y-0.5 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <span className="font-extrabold text-slate-900 tracking-tight text-xs sm:text-sm">
                                                {lot?.lotNumber || `Lot ID: ${alloc.productLotId}`}
                                              </span>
                                              {lot?.status && (
                                                <span
                                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                                    lot.status === 'Active'
                                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                      : 'bg-slate-100 text-slate-500 border-slate-200'
                                                  }`}
                                                >
                                                  {lot.status}
                                                </span>
                                              )}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-3 text-[11px] text-slate-500">
                                              <span>วันที่รับเข้า: <strong className="text-slate-700 font-semibold">{receivedDateStr}</strong></span>
                                              <span>•</span>
                                              <span>Supplier Lot: <strong className="text-slate-700 font-semibold">{lot?.supplierLot || '-'}</strong></span>
                                            </div>
                                          </div>
                                        </div>

                                        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                                          <span className="text-[11px] text-slate-500 font-medium">ตัดออก:</span>
                                          <span className="font-black text-blue-700 text-xs sm:text-sm bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">
                                            {alloc.quantity.toLocaleString()} {unit}
                                          </span>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>

                                {/* Total allocation summary footer */}
                                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                                  <span className="font-semibold">รวมยอดตัดสต็อกตาม FIFO ทั้งหมด:</span>
                                  <span className="font-black text-slate-900 text-sm">
                                    {totalAllocated.toLocaleString()} {unit}
                                  </span>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    )
                  })()}
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
                  className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  disabled={processingId !== null}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#BE1111] px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-[#BE1111]/20 hover:bg-[#A00F0F] hover:shadow-lg hover:shadow-[#BE1111]/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all disabled:bg-slate-300 disabled:shadow-none disabled:transform-none cursor-pointer"
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

export default function TransactionsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-50 px-6 py-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#BE1111]" />
        </main>
      }
    >
      <TransactionsContent />
    </Suspense>
  )
}

