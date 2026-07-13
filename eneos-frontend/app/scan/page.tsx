'use client'

import Link from 'next/link'
import { FormEvent, useState, useCallback, useEffect } from 'react'
import { createTransaction, fetchProduct, fetchProductBom, Product, BillOfMaterial } from '@/lib/auth'
import { motion, AnimatePresence } from 'framer-motion'
import QRScanner from '@/components/QRScanner'
import { Layers, FileText, ChevronDown, ChevronUp } from 'lucide-react'

export default function ScanPage() {
  const [itemCode, setItemCode] = useState('')
  const [type, setType] = useState<'receive' | 'issue'>('receive')
  const [quantity, setQuantity] = useState<number | string>(1)
  const [note, setNote] = useState('')
  const [product, setProduct] = useState<Product | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [scanCooldown, setScanCooldown] = useState(false)
  const [user, setUser] = useState<{ fullName: string } | null>(null)

  const [bomList, setBomList] = useState<BillOfMaterial[]>([])
  const [showBom, setShowBom] = useState(false)

  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try {
        setUser(JSON.parse(userStr))
      } catch (e) {}
    }
  }, [])

  const extractItemCode = useCallback((raw: string): string => {
    if (!raw) return ''
    let text = raw.trim()
    if (text.includes('?code=')) {
      const parts = text.split('?code=')
      text = decodeURIComponent(parts[1].split('&')[0])
    } else if (text.startsWith('http://') || text.startsWith('https://')) {
      try {
        const url = new URL(text)
        if (url.searchParams.has('code')) {
          text = url.searchParams.get('code') || text
        } else {
          const segments = url.pathname.split('/')
          text = decodeURIComponent(segments[segments.length - 1] || text)
        }
      } catch (e) {}
    } else if (text.startsWith('{') && text.endsWith('}')) {
      try {
        const parsed = JSON.parse(text)
        if (parsed.itemCode || parsed.code) {
          text = parsed.itemCode || parsed.code
        }
      } catch (e) {}
    }
    return text.trim()
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const codeParam = params.get('code')
      if (codeParam) {
        const cleaned = extractItemCode(codeParam)
        setItemCode(cleaned)
        setLoading(true)
        fetchProduct(cleaned)
          .then(p => {
            setProduct(p)
            setMessage('ดึงข้อมูลสินค้าสำเร็จ!')
            if (p.itemType === 'FG' || p.itemType === 'Bulk') {
              fetchProductBom(p.itemCode).then(boms => setBomList(boms)).catch(() => setBomList([]))
            } else {
              setBomList([])
            }
          })
          .catch(err => {
            setError(err instanceof Error ? err.message : 'ไม่พบสินค้า')
            setBomList([])
          })
          .finally(() => setLoading(false))
      }
    }
  }, [extractItemCode])

  // Handle Scan Success from Camera
  const handleScanSuccess = useCallback(async (decodedText: string) => {
    const cleanedCode = extractItemCode(decodedText)
    setItemCode(cleanedCode)
    setError('')
    setMessage('')
    setProduct(null)
    setLoading(true)

    try {
      const p = await fetchProduct(cleanedCode)
      setProduct(p)
      setMessage('สแกนสำเร็จ!')
      if (p.itemType === 'FG' || p.itemType === 'Bulk') {
        fetchProductBom(p.itemCode).then(boms => setBomList(boms)).catch(() => setBomList([]))
      } else {
        setBomList([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่พบสินค้า')
      setBomList([])
    } finally {
      setLoading(false)
    }
  }, [extractItemCode])

  const lookupProduct = async () => {
    setError('')
    setMessage('')
    setProduct(null)
    const cleanedCode = extractItemCode(itemCode)
    if (!cleanedCode) {
      setError('กรุณากรอก Item Code หรือข้อมูลจาก QR')
      return
    }

    setLoading(true)
    try {
      const p = await fetchProduct(cleanedCode)
      setProduct(p)
      if (p.itemType === 'FG' || p.itemType === 'Bulk') {
        fetchProductBom(p.itemCode).then(boms => setBomList(boms)).catch(() => setBomList([]))
      } else {
        setBomList([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่พบสินค้า')
      setBomList([])
    } finally {
      setLoading(false)
    }
  }

  const closeModalWithCooldown = () => {
    setProduct(null)
    setItemCode('')
    setBomList([])
    setShowBom(false)
    setScanCooldown(true)
    setTimeout(() => {
      setScanCooldown(false)
    }, 2000)
  }

  const submitTransaction = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setMessage('')

    if (!product) {
      setError('กรุณาค้นหาสินค้าก่อนสร้างรายการ')
      return
    }

    const finalQuantity = Number(quantity)
    if (!finalQuantity || finalQuantity <= 0) {
      setError('กรุณาระบุจำนวนสินค้าให้ถูกต้อง (ต้องมากกว่า 0)')
      return
    }

    setLoading(true)
    try {
      const transaction = await createTransaction({
        itemCode: product.itemCode,
        type,
        quantity: finalQuantity,
        note,
      })
      setMessage(`สร้างรายการรอการยืนยัน #${transaction.id} สำเร็จ`)
      setNote('')
      setQuantity(1)
      // ปิดป๊อปอัปทันทีเพื่อให้กลับสู่หน้าสแกนหลักโดยไม่มีดีเลย์ พร้อมหน่วงเวลา 2 วินาทีก่อนสแกนต่อ
      closeModalWithCooldown()
      
      // ซ่อนข้อความแจ้งเตือนสีเขียวบนหน้าหลักอัตโนมัติหลังจาก 4 วินาที
      setTimeout(() => {
        setMessage('')
      }, 4000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'สร้างรายการไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f5f7] px-4 py-8 md:px-6 md:py-12 flex flex-col items-center">
      <div className="w-full max-w-xl">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
            สแกนสินค้า
          </h2>
          <p className="text-sm text-gray-500 mt-2">
            ยินดีต้อนรับกลับมา, {user?.fullName || 'ผู้ใช้งาน'}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full"
        >
          {error && !product && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-600 text-center">
              {error}
            </motion.div>
          )}
          {message && !product && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700 text-center">
              {message}
            </motion.div>
          )}

          <div className="rounded-3xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100/80 overflow-hidden p-5 md:p-8">
            <div className="mb-5 text-center">
              <h3 className="text-lg font-bold text-gray-800">จัดตำแหน่ง QR Code ให้อยู่ในกรอบ</h3>
              <p className="text-xs text-gray-400 mt-1">วางรหัส QR ของสินค้าให้อยู่ในช่องนำสายตาเพื่อสแกนอัตโนมัติ</p>
              {scanCooldown && (
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3.5 py-1 text-xs font-semibold text-[#BE1111] animate-pulse border border-red-100">
                  <span>⏳ กำลังหน่วงเวลา 2 วินาที ก่อนเปิดกล้องสแกนชิ้นถัดไป...</span>
                </div>
              )}
            </div>
            <QRScanner onScanSuccess={handleScanSuccess} isPaused={loading || product !== null || scanCooldown} />
          </div>
        </motion.div>
      </div>

      {/* iOS-Style Bottom Sheet and Backdrop Overlay */}
      <AnimatePresence>
        {product && (
          <>
            {/* Dark Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModalWithCooldown}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            />

            {/* Bottom Sheet Container */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed bottom-[72px] left-3 right-3 md:bottom-0 md:left-1/2 md:right-auto md:-translate-x-1/2 w-[calc(100%-24px)] md:w-full max-w-xl max-h-[calc(100vh-90px)] md:max-h-[85vh] flex flex-col bg-white/95 backdrop-blur-xl rounded-3xl md:rounded-b-none border border-white/40 md:border-b-0 p-5 md:p-6 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.12)] overflow-hidden"
            >
              {/* Drag Handle */}
              <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4 shrink-0" />

              {/* Scrollable Inner Content */}
              <div className="overflow-y-auto overflow-x-hidden flex-1 pr-1 -mr-1">
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                        สแกนพบสินค้า
                      </div>
                      {product.itemType && (
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                          product.itemType === 'FG' ? 'bg-red-50 text-red-700 border-red-200' :
                          product.itemType === 'Bulk' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                          product.itemType === 'Packaging' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-purple-50 text-purple-700 border-purple-200'
                        }`}>
                          {product.itemType}
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mt-2">{product.name}</h3>
                    <p className="text-xs font-mono text-gray-400 mt-0.5">{product.itemCode}</p>
                  </div>
                  <button
                    onClick={closeModalWithCooldown}
                    className="rounded-full bg-gray-100 p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

              {/* Product Metadata Info Board */}
              <div className="grid grid-cols-3 gap-3 mb-4 bg-gray-50/70 p-3.5 rounded-2xl border border-gray-100">
                <div className="text-center md:text-left">
                  <span className="block text-[11px] font-medium text-gray-400 uppercase tracking-wider">หน่วยนับ</span>
                  <span className="text-sm font-semibold text-gray-700 mt-0.5 block">{product.unit}</span>
                </div>
                <div className="text-center md:text-left border-x border-gray-200/50">
                  <span className="block text-[11px] font-medium text-gray-400 uppercase tracking-wider">คลังจัดเก็บ</span>
                  <span className="text-sm font-semibold text-gray-700 mt-0.5 block truncate">{product.warehouse || product.location || 'ไม่มี'}</span>
                </div>
                <div className="text-center md:text-left">
                  <span className="block text-[11px] font-medium text-gray-400 uppercase tracking-wider">ยอดคงเหลือ</span>
                  <span className="text-sm font-bold text-gray-800 mt-0.5 block">{product.quantity}</span>
                </div>
              </div>

              {/* SAP BOM Expandable Section */}
              {bomList.length > 0 && (
                <div className="mb-5 rounded-2xl border border-red-100 bg-red-50/40 p-3.5">
                  <button
                    type="button"
                    onClick={() => setShowBom(!showBom)}
                    className="w-full flex items-center justify-between text-xs font-bold text-[#BE1111]"
                  >
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-4 h-4" />
                      <span>📑 สูตรการผลิต SAP BOM ({bomList.length} รายการส่วนประกอบ)</span>
                    </div>
                    {showBom ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {showBom && (
                    <div className="mt-3 pt-3 border-t border-red-100/80 max-h-48 overflow-y-auto space-y-2">
                      {bomList.map((c) => (
                        <div key={c.id} className="flex items-center justify-between text-xs bg-white p-2 rounded-xl border border-gray-100 shadow-2xs">
                          <div>
                            <span className="font-mono font-bold text-gray-800 mr-1.5">[{c.componentItemCode}]</span>
                            <span className="text-gray-700 font-medium">{c.description}</span>
                          </div>
                          <div className="shrink-0 ml-2 text-right">
                            <span className="font-bold text-[#BE1111]">{c.quantity}</span>
                            <span className="text-[10px] text-gray-400 ml-1 font-mono">{c.uom} ({c.warehouse})</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Status alerts */}
              {error && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-600 text-center">
                  {error}
                </div>
              )}
              {message && (
                <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3 text-xs font-medium text-green-700 text-center">
                  {message}
                </div>
              )}

              {/* Action Form */}
              <form onSubmit={submitTransaction}>
                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div>
                    <label htmlFor="type" className="mb-1.5 block text-xs font-semibold text-gray-500">
                      ประเภทรายการ
                    </label>
                    <div className="relative">
                      <select
                        id="type"
                        value={type}
                        onChange={(event) => setType(event.target.value as 'receive' | 'issue')}
                        className="w-full rounded-xl border border-gray-200 bg-white/70 px-3.5 py-3 text-sm text-gray-800 font-semibold focus:border-gray-900 focus:outline-none focus:ring-4 focus:ring-gray-900/5 transition-all appearance-none cursor-pointer"
                      >
                        <option value="receive">รับเข้า (Receive)</option>
                        <option value="issue">จ่ายออก (Issue)</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="quantity" className="mb-1.5 block text-xs font-semibold text-gray-500">
                      จำนวน
                    </label>
                    <input
                      id="quantity"
                      type="text"
                      inputMode="numeric"
                      value={quantity}
                      onChange={(event) => {
                        const val = event.target.value.replace(/[^0-9]/g, '')
                        setQuantity(val === '' ? '' : Number(val))
                      }}
                      placeholder="ระบุจำนวน"
                      className="w-full rounded-xl border border-gray-200 bg-white/70 px-3.5 py-3 text-sm text-gray-800 font-semibold focus:border-gray-900 focus:outline-none focus:ring-4 focus:ring-gray-900/5 transition-all"
                    />
                  </div>
                </div>

                <div className="mb-6">
                  <label htmlFor="note" className="mb-1.5 block text-xs font-semibold text-gray-500">
                    หมายเหตุ (ถ้ามี)
                  </label>
                  <textarea
                    id="note"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="ใส่หมายเหตุหรือรายละเอียดเพิ่มเติม..."
                    className="min-h-16 w-full resize-none rounded-xl border border-gray-200 bg-white/70 px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-gray-900 focus:outline-none focus:ring-4 focus:ring-gray-900/5 transition-all"
                  />
                </div>

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileTap={{ scale: 0.98 }}
                  className="w-full rounded-xl bg-[#BE1111] hover:bg-[#A00F0F] px-5 py-3.5 font-bold text-white shadow-md shadow-[#BE1111]/15 disabled:bg-gray-300 disabled:text-gray-500 transition-all text-sm flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      กำลังดำเนินการ...
                    </>
                  ) : (
                    'ยืนยันทำรายการ'
                  )}
                </motion.button>
              </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </main>
  )
}
