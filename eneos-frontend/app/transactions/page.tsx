'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { confirmTransaction, fetchTransactions, rejectTransaction, StockTransaction } from '@/lib/auth'
import { ArrowLeft } from 'lucide-react'

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<StockTransaction[]>([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  const loadTransactions = async () => {
    setError('')
    setLoading(true)
    try {
      setTransactions(await fetchTransactions('pending'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'โหลดรายการไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
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

  const updateStatus = async (id: number, action: 'confirm' | 'reject') => {
    setError('')
    setMessage('')
    try {
      if (action === 'confirm') {
        await confirmTransaction(id)
        setMessage(`อนุมัติรายการ #${id} สำเร็จ`)
      } else {
        await rejectTransaction(id)
        setMessage(`ปฏิเสธรายการ #${id} สำเร็จ`)
      }
      await loadTransactions()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'อัปเดตรายการไม่สำเร็จ')
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

        {error && <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>}
        {message && (
          <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">{message}</div>
        )}

        <div className="mt-6 grid gap-4">
          {loading ? (
            <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">
              กำลังโหลดรายการ
            </div>
          ) : transactions.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">
              ไม่มีรายการรอการยืนยัน
            </div>
          ) : (
            transactions.map((transaction) => (
              <div key={transaction.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
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
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateStatus(transaction.id, 'confirm')}
                      className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700"
                    >
                      อนุมัติ
                    </button>
                    <button
                      onClick={() => updateStatus(transaction.id, 'reject')}
                      className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700"
                    >
                      ปฏิเสธ
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  )
}
