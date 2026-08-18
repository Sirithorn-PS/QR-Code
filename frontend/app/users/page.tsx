'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getUsers, approveUser, rejectUser, UserItem } from '@/lib/auth'
import { useAuth } from '@/app/providers'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  UserCheck, 
  UserX, 
  Search, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  User, 
  BadgeCheck, 
  Filter, 
  RefreshCw,
  Sparkles,
  AlertCircle
} from 'lucide-react'

export default function UserApprovalPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const [users, setUsers] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Redirect non-admin users
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/login')
      } else if (user?.role !== 'admin') {
        router.push('/')
      }
    }
  }, [authLoading, isAuthenticated, user, router])

  const fetchUserList = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getUsers()
      setUsers(data)
    } catch (err) {
      console.error('Failed to fetch users:', err)
      setToastMessage({ type: 'error', text: 'ไม่สามารถดึงข้อมูลรายชื่อผู้ใช้งานได้' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
      fetchUserList()
    }
  }, [isAuthenticated, user, fetchUserList])

  const handleApprove = async (userId: number, name: string) => {
    setActionLoadingId(userId)
    setToastMessage(null)
    try {
      const res = await approveUser(userId)
      setToastMessage({ type: 'success', text: res.message || `อนุมัติบัญชีของ ${name} เรียบร้อยแล้ว` })
      await fetchUserList()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการอนุมัติ'
      setToastMessage({ type: 'error', text: message })
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleReject = async (userId: number, name: string) => {
    if (!confirm(`คุณต้องการปฏิเสธการเข้าใช้งานของ ${name} ใช่หรือไม่?`)) return
    setActionLoadingId(userId)
    setToastMessage(null)
    try {
      const res = await rejectUser(userId)
      setToastMessage({ type: 'success', text: res.message || `ปฏิเสธบัญชีของ ${name} เรียบร้อยแล้ว` })
      await fetchUserList()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการปฏิเสธ'
      setToastMessage({ type: 'error', text: message })
    } finally {
      setActionLoadingId(null)
    }
  }

  // Filter users based on search & activeTab
  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.employeeId && u.employeeId.toLowerCase().includes(searchTerm.toLowerCase()))

    const userStatus = u.status || 'approved'
    if (activeTab === 'all') return matchesSearch
    return matchesSearch && userStatus === activeTab
  })

  const pendingCount = users.filter(u => (u.status || 'approved') === 'pending').length
  const approvedCount = users.filter(u => (u.status || 'approved') === 'approved').length
  const rejectedCount = users.filter(u => (u.status || 'approved') === 'rejected').length

  if (authLoading || (isAuthenticated && user?.role !== 'admin')) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-body">
        <div className="flex items-center gap-3 text-slate-500 font-medium">
          <RefreshCw className="w-5 h-5 animate-spin text-[#BE1111]" />
          <span>กำลังตรวจสอบสิทธิ์การใช้งาน...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50/60 font-body text-slate-800 pb-16">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10">
        {/* Header Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#BE1111] uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Supervisor Admin Control</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              อนุมัติและจัดการผู้ใช้งาน
              {pendingCount > 0 && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-white shadow-xs animate-pulse">
                  {pendingCount} รออนุมัติ
                </span>
              )}
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              ตรวจสอบและอนุมัติการสมัครสมาชิกใหม่ของพนักงานก่อนอนุญาตให้เข้าใช้งานระบบ
            </p>
          </div>

          <button
            onClick={fetchUserList}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-xs sm:text-sm hover:bg-slate-50 active:scale-98 transition shadow-xs disabled:opacity-50 self-start md:self-auto"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            <span>รีเฟรชข้อมูล</span>
          </button>
        </div>

        {/* Toast Alert Notification */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`mb-6 p-4 rounded-2xl border flex items-center justify-between text-xs sm:text-sm font-medium shadow-xs ${
                toastMessage.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {toastMessage.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                )}
                <span>{toastMessage.text}</span>
              </div>
              <button
                onClick={() => setToastMessage(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filter Tabs & Search Bar */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs mb-6 space-y-4 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'pending'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-4 h-4 text-amber-500" />
              <span>รอการอนุมัติ</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeTab === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-600'
              }`}>
                {pendingCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('approved')}
              className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'approved'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>อนุมัติแล้ว</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeTab === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
              }`}>
                {approvedCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('rejected')}
              className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'rejected'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <XCircle className="w-4 h-4 text-red-500" />
              <span>ถูกปฏิเสธ</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeTab === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-slate-200 text-slate-600'
              }`}>
                {rejectedCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>ทั้งหมด</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeTab === 'all' ? 'bg-slate-200 text-slate-800' : 'bg-slate-200 text-slate-600'
              }`}>
                {users.length}
              </span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาชื่อ, username, รหัส..."
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#BE1111] focus:ring-1 focus:ring-[#BE1111] transition outline-hidden"
            />
          </div>
        </div>

        {/* User Cards / List Table */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-[#BE1111] mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-500">กำลังโหลดข้อมูลผู้ใช้งาน...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center">
            <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">ไม่พบข้อมูลผู้ใช้งาน</h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {activeTab === 'pending'
                ? 'ไม่มีรายการผู้สมัครใหม่ที่รอการอนุมัติในขณะนี้'
                : 'ไม่มีรายการผู้ใช้งานตรงตามเงื่อนไขที่ค้นหา'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {filteredUsers.map((u) => {
              const currentStatus = u.status || 'approved'
              const isLoadingThis = actionLoadingId === u.id

              return (
                <motion.div
                  key={u.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`bg-white rounded-2xl border p-5 transition-all shadow-xs flex flex-col justify-between ${
                    currentStatus === 'pending'
                      ? 'border-amber-200/90 ring-2 ring-amber-400/10'
                      : currentStatus === 'approved'
                      ? 'border-slate-200/80'
                      : 'border-red-200/80 opacity-75'
                  }`}
                >
                  <div>
                    {/* Top Row: User Avatar & Status Badge */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-base shadow-2xs ${
                          u.role === 'admin'
                            ? 'bg-rose-100 text-[#BE1111]'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {u.fullName ? u.fullName.charAt(0).toUpperCase() : u.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">
                            {u.fullName}
                          </h3>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">@{u.username}</p>
                        </div>
                      </div>

                      {/* Status Badge */}
                      {currentStatus === 'pending' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>รออนุมัติ</span>
                        </span>
                      )}
                      {currentStatus === 'approved' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                          <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>อนุมัติแล้ว</span>
                        </span>
                      )}
                      {currentStatus === 'rejected' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-800 border border-red-200 shrink-0">
                          <XCircle className="w-3.5 h-3.5 text-red-600" />
                          <span>ถูกปฏิเสธ</span>
                        </span>
                      )}
                    </div>

                    {/* Details Box */}
                    <div className="space-y-2 text-xs bg-slate-50/80 p-3.5 rounded-xl border border-slate-100 mb-4">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-medium">รหัสพนักงาน:</span>
                        <span className="font-bold text-slate-800 font-mono">{u.employeeId || '-'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-medium">บทบาท (Role):</span>
                        <span className="font-semibold text-slate-700">
                          {u.role === 'admin' ? 'Supervisor (หัวหน้างาน)' : 'พนักงานทั่วไป (Staff)'}
                        </span>
                      </div>
                      {u.createdAt && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400 font-medium">วันที่สมัคร:</span>
                          <span className="text-slate-600">
                            {new Date(u.createdAt).toLocaleDateString('th-TH', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions for Pending or Rejected Users */}
                  <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                    {currentStatus === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(u.id, u.fullName)}
                          disabled={isLoadingThis}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition active:scale-98 disabled:opacity-50 shadow-xs"
                        >
                          {isLoadingThis ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <UserCheck className="w-3.5 h-3.5" />
                          )}
                          <span>อนุมัติ</span>
                        </button>

                        <button
                          onClick={() => handleReject(u.id, u.fullName)}
                          disabled={isLoadingThis}
                          className="px-3 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs transition active:scale-98 disabled:opacity-50"
                        >
                          <UserX className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}

                    {currentStatus === 'approved' && u.role !== 'admin' && (
                      <button
                        onClick={() => handleReject(u.id, u.fullName)}
                        disabled={isLoadingThis}
                        className="w-full py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 transition border border-transparent hover:border-red-200"
                      >
                        ยกเลิกสิทธิ์อนุมัติ (Reject)
                      </button>
                    )}

                    {currentStatus === 'rejected' && (
                      <button
                        onClick={() => handleApprove(u.id, u.fullName)}
                        disabled={isLoadingThis}
                        className="w-full py-2.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 transition flex items-center justify-center gap-1.5"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>เปลี่ยนเป็นอนุมัติ (Approve)</span>
                      </button>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
