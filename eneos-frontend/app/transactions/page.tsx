'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { confirmTransaction, fetchTransactions, rejectTransaction, StockTransaction } from '@/lib/auth'
import { ArrowLeft, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

export default function TransactionsPage() {
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

    return () => {
      isMounted = false
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
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-[#BE1111] transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>กลับหน้าหลัก</span>
        </Link>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">รายการรอการยืนยัน</h1>

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
                  className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="text-sm font-medium text-slate-500">#{transaction.id}</div>
                      <h2 className="mt-1 text-xl font-bold text-slate-900">
                        {transaction.product?.description || transaction.itemSnapshot.name}
                      </h2>
                      <div className="mt-2 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                        <div>Item Code: {transaction.product?.itemCode || transaction.itemSnapshot.itemCode}</div>
                        <div>ประเภท: {transaction.type === 'receive' ? 'รับเข้า' : 'จ่ายออก'}</div>
                        <div>จำนวน: {transaction.quantity}</div>
                        <div>ผู้สร้าง: {transaction.createdBy?.fullName || '-'}</div>
                      </div>
                    </div>

                    <div className="flex gap-2 self-start md:self-center">
                      <button
                        onClick={() => handleConfirm(transaction.id)}
                        disabled={isBusy}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2.5 font-semibold text-white shadow-sm transition-colors hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
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
                        className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2.5 font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
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
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* หน้าต่าง Popup (Modal) สำหรับยืนยันการปฏิเสธและระบุหมายเหตุ */}
      {rejectModalTxId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">ยืนยันการปฏิเสธรายการ #{rejectModalTxId}</h3>
            <p className="mt-1 text-sm text-slate-600">
              กรุณาระบุหมายเหตุหรือเหตุผลในการปฏิเสธรายการนี้ (ถ้ามี)
            </p>

            <div className="mt-4">
              <label htmlFor="rejectNote" className="block text-sm font-medium text-slate-700">
                หมายเหตุ / เหตุผล
              </label>
              <textarea
                id="rejectNote"
                rows={3}
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="เช่น ข้อมูลไม่ถูกต้อง หรือสินค้าชำรุด..."
                className="mt-1.5 w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-900 focus:border-[#BE1111] focus:outline-none focus:ring-1 focus:ring-[#BE1111]"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeRejectModal}
                disabled={processingId !== null}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={processingId !== null}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:bg-slate-300"
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
          </div>
        </div>
      )}
    </main>
  )
}

