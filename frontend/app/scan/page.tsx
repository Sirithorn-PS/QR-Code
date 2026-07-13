'use client'

import { FormEvent, useState, useCallback, useEffect } from 'react'
import { createTransaction, fetchProduct, fetchProductBom, Product, BillOfMaterial } from '@/lib/auth'
import { motion, AnimatePresence } from 'framer-motion'
import QRScanner from '@/components/QRScanner'
import { FileText, ChevronDown, ChevronUp, Droplets, Box, FlaskConical, ExternalLink } from 'lucide-react'

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
  const [expandedBomSubgroups, setExpandedBomSubgroups] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setUser(JSON.parse(userStr))
      } catch {
        // ignore
      }
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
      } catch {
        // ignore
      }
    } else if (text.startsWith('{') && text.endsWith('}')) {
      try {
        const parsed = JSON.parse(text)
        if (parsed.itemCode || parsed.code) {
          text = parsed.itemCode || parsed.code
        }
      } catch {
        // ignore
      }
    }
    return text.trim()
  }, [])

  const loadProductByCode = useCallback(async (code: string, successMsg = 'สแกนสำเร็จ!') => {
    const cleanedCode = extractItemCode(code)
    if (!cleanedCode) {
      setError('กรุณากรอก Item Code หรือข้อมูลจาก QR')
      return
    }
    setItemCode(cleanedCode)
    setError('')
    setMessage('')
    setProduct(null)
    setLoading(true)

    try {
      const p = await fetchProduct(cleanedCode)
      setProduct(p)
      setMessage(successMsg)
      try {
        const boms = await fetchProductBom(p.itemCode)
        if (boms && boms.length > 0) {
          setBomList(boms)
          setShowBom(true)
        } else {
          setBomList([])
          setShowBom(false)
        }
      } catch {
        setBomList([])
        setShowBom(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่พบสินค้า')
      setBomList([])
      setShowBom(false)
    } finally {
      setLoading(false)
    }
  }, [extractItemCode])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const codeParam = params.get('code')
      if (codeParam) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadProductByCode(codeParam, 'ดึงข้อมูลสินค้าสำเร็จ!')
      }
    }
  }, [loadProductByCode])

  // Handle Scan Success from Camera
  const handleScanSuccess = useCallback(async (decodedText: string) => {
    await loadProductByCode(decodedText, 'สแกนสำเร็จ!')
  }, [loadProductByCode])

  // Removed lookupProduct as it was unused

  const handleSelectBomComponent = (componentItemCode: string) => {
    loadProductByCode(componentItemCode, `สลับไปยังชิ้นส่วน [${componentItemCode}] สำเร็จ`)
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

  const getBomComponentGroup = (c: BillOfMaterial): 'Bulk' | 'Packaging' | 'Raw Material' => {
    const code = c.componentItemCode.toLowerCase()
    const desc = c.description.toLowerCase()
    const uom = (c.uom || '').toUpperCase()

    // 1. Packaging (บรรจุภัณฑ์ / กล่อง / แกลลอน / ป้าย / ฟอยล์ / ถัง)
    if (
      code.startsWith('pk') || code.startsWith('box') || code.startsWith('lbl') || code.startsWith('cap') || code.startsWith('gal') || code.startsWith('foil') || code.startsWith('75') ||
      desc.includes('box') || desc.includes('label') || desc.includes('cap') || desc.includes('pail') || desc.includes('drum') || desc.includes('carton') || desc.includes('gallon') || desc.includes('foil') || desc.includes('sticker') || desc.includes('กล่อง') || desc.includes('ฉลาก') || desc.includes('ฝา') || desc.includes('ถัง') || desc.includes('แกลลอน') || desc.includes('ฟอยล์') ||
      uom.includes('BOX') || uom.includes('GALLON') || uom.includes('PAIL') || uom.includes('DRUM') || uom === 'PC' || uom === 'PCS' || uom === 'EA' || uom === 'SET' || uom === 'RL'
    ) {
      return 'Packaging'
    }

    // 2. Bulk (สารผสม / น้ำมันเบลนด์ / กึ่งสำเร็จรูป)
    if (
      c.bomType === 'Production' || desc.includes('bulk') || desc.includes('premix') || code.startsWith('i-') || code.startsWith('blk-') || code.startsWith('200')
    ) {
      return 'Bulk'
    }

    // 3. Raw Material (วัตถุดิบตั้งต้น / Base oil / Additives)
    return 'Raw Material'
  }

  return (
    <main className="min-h-screen bg-[#f5f5f7] px-4 py-8 md:px-6 md:py-12 flex flex-col items-center">
      <div className="w-full max-w-xl">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <h2 className="text-2xl md:text-3xl font-display font-bold text-gray-900 tracking-tight">
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
              transition={{ type: 'tween', ease: 'easeOut', duration: 0.3 }}
              className="fixed bottom-[72px] left-3 right-3 md:bottom-0 md:left-1/2 md:right-auto md:-translate-x-1/2 w-[calc(100%-24px)] md:w-full max-w-xl max-h-[calc(100vh-90px)] md:max-h-[85vh] flex flex-col bg-white/95 backdrop-blur-xl rounded-3xl md:rounded-b-none border border-white/40 md:border-b-0 p-5 md:p-6 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.06)] overflow-hidden"
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
                    className="rounded-full bg-gray-100 p-2.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
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
                <div className="mb-5 rounded-2xl border border-red-100 bg-red-50/40 p-4 transition-all">
                  <button
                    type="button"
                    onClick={() => setShowBom(!showBom)}
                    className="w-full flex items-center justify-between text-xs sm:text-sm font-bold text-[#BE1111] cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <span>📑 สูตรการผลิต SAP BOM ({bomList.filter(c => c.componentItemCode !== c.parentItemCode).length} รายการส่วนประกอบ)</span>
                    </div>
                    {showBom ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {showBom && (
                    <div className="mt-3 pt-3 border-t border-red-100/80 space-y-3">
                      {(['Bulk', 'Packaging', 'Raw Material'] as const).map((subType) => {
                        const subComponents = bomList.filter(c => c.componentItemCode !== c.parentItemCode && getBomComponentGroup(c) === subType)
                        const subExpanded = expandedBomSubgroups[subType] ?? true
                        const SubIcon = subType === 'Bulk' ? Droplets : subType === 'Packaging' ? Box : FlaskConical
                        const subTitle = subType === 'Bulk' ? 'Bulk (สารผสม/กึ่งสำเร็จรูป)' : subType === 'Packaging' ? 'Packaging (บรรจุภัณฑ์)' : 'Raw Material (วัตถุดิบ)'

                        return (
                          <div key={subType} className="rounded-xl border border-gray-200/80 bg-white/80 overflow-hidden shadow-2xs">
                            <button
                              type="button"
                              onClick={() => setExpandedBomSubgroups(prev => ({ ...prev, [subType]: !subExpanded }))}
                              className="w-full bg-slate-50/90 px-3.5 py-2.5 flex items-center justify-between hover:bg-slate-100/80 transition-colors cursor-pointer border-b border-gray-100"
                            >
                              <div className="flex items-center gap-2">
                                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-700 shadow-2xs">
                                  <SubIcon className="w-3.5 h-3.5" />
                                </div>
                                <span className="text-xs font-bold text-gray-800">{subTitle}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 font-mono">
                                  {subComponents.length} รายการ
                                </span>
                                {subExpanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                              </div>
                            </button>

                            {subExpanded && (
                              <div className="p-2 space-y-1.5 max-h-52 overflow-y-auto">
                                {subComponents.length === 0 ? (
                                  <div className="py-3 text-center text-gray-400 text-[11px]">
                                    ไม่มีรายการในหมวดหมู่นี้
                                  </div>
                                ) : (
                                  subComponents.map((c) => (
                                    <div
                                      key={c.id}
                                      onClick={() => handleSelectBomComponent(c.componentItemCode)}
                                      className="group/item flex items-center justify-between text-xs bg-white hover:bg-red-50/60 p-2.5 rounded-lg border border-gray-200 hover:border-red-200 shadow-2xs transition-all cursor-pointer active:scale-[0.99]"
                                      title={`คลิกเพื่อสลับไปดูและทำรายการรับ/จ่ายสำหรับชิ้นส่วน [${c.componentItemCode}]`}
                                    >
                                      <div className="flex items-center gap-2 overflow-hidden">
                                        <div className="shrink-0 font-mono font-bold text-[#BE1111] bg-red-50 group-hover/item:bg-white px-2 py-0.5 rounded border border-red-100/80">
                                          {c.componentItemCode}
                                        </div>
                                        <div className="truncate text-gray-700 font-medium group-hover/item:text-gray-900">
                                          {c.description}
                                        </div>
                                      </div>
                                      <div className="shrink-0 ml-2 flex items-center gap-2">
                                        <div className="text-right">
                                          <span className="font-bold text-gray-900 group-hover/item:text-[#BE1111]">{c.quantity}</span>
                                          <span className="text-[10px] text-gray-400 ml-1 font-mono">{c.uom}</span>
                                        </div>
                                        <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover/item:text-[#BE1111] transition-colors" />
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
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
                <div className="mb-5">
                  <label className="mb-2 block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    ประเภทรายการ
                  </label>
                  <div className="flex bg-gray-100/70 p-1.5 rounded-2xl relative z-0">
                    {[
                      { id: 'receive', label: 'รับเข้า (Receive)' },
                      { id: 'issue', label: 'จ่ายออก (Issue)' }
                    ].map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setType(t.id as 'receive' | 'issue')}
                        className={`flex-1 py-2.5 text-sm font-bold rounded-xl relative z-10 transition-colors ${type === t.id ? (t.id === 'receive' ? 'text-green-700' : 'text-red-700') : 'text-gray-500 hover:text-gray-700'}`}
                      >
                        {type === t.id && (
                          <motion.div
                            layoutId="activeTabScan"
                            className="absolute inset-0 bg-white rounded-xl shadow-sm -z-10"
                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                          />
                        )}
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-5">
                  <label htmlFor="quantity" className="mb-2 block text-xs font-semibold text-gray-500 uppercase tracking-wider">
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
                    placeholder="ระบุจำนวนที่ต้องการทำรายการ"
                    className="w-full rounded-2xl border border-gray-200/80 bg-gray-50/50 backdrop-blur-sm px-4 py-3.5 text-base text-gray-800 font-bold focus:bg-white focus:border-[#BE1111]/30 focus:outline-none focus:ring-4 focus:ring-[#BE1111]/10 transition-all placeholder:font-normal"
                  />
                </div>

                <div className="mb-6">
                  <label htmlFor="note" className="mb-2 block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    หมายเหตุ (ถ้ามี)
                  </label>
                  <textarea
                    id="note"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="ใส่หมายเหตุหรือรายละเอียดเพิ่มเติม..."
                    className="min-h-[80px] w-full resize-none rounded-2xl border border-gray-200/80 bg-gray-50/50 backdrop-blur-sm px-4 py-3.5 text-sm text-gray-800 focus:bg-white focus:border-[#BE1111]/30 focus:outline-none focus:ring-4 focus:ring-[#BE1111]/10 transition-all placeholder:text-gray-400"
                  />
                </div>

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileTap={{ scale: 0.98 }}
                  className="w-full rounded-2xl bg-gray-900 hover:bg-black px-5 py-4 font-bold text-white shadow-lg shadow-gray-900/20 disabled:bg-gray-200 disabled:text-gray-400 transition-all text-sm flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      กำลังดำเนินการ...
                    </>
                  ) : (
                    type === 'receive' ? 'รับเข้าคลังสินค้า' : 'จ่ายออกสินค้า'
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
