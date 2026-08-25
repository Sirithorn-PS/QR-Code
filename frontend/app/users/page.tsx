'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { 
  getUsers, 
  createUser, 
  updateUserRole, 
  updateUserInfo,
  updateUserStatus,
  resetUserPassword, 
  deleteUser, 
  getUser,
  UserItem 
} from '@/lib/auth'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  UserPlus, 
  Search, 
  ShieldCheck, 
  User, 
  Shield, 
  KeyRound, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  X, 
  BadgeCheck,
  Users,
  Edit,
  Power,
  Check,
  Ban,
  ChevronDown,
  Filter,
  SlidersHorizontal
} from 'lucide-react'

export default function UserManagementPage() {
  const router = useRouter()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [currentUser, setCurrentUser] = useState<UserItem | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [users, setUsers] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Dropdown filter states
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'supervisor' | 'warehouse_staff'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'disabled'>('all')
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false)
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false)
  
  const roleDropdownRef = useRef<HTMLDivElement>(null)
  const statusDropdownRef = useRef<HTMLDivElement>(null)

  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModalUser, setShowEditModalUser] = useState<UserItem | null>(null)
  const [showRoleModalUser, setShowRoleModalUser] = useState<UserItem | null>(null)
  const [showResetModalUser, setShowResetModalUser] = useState<UserItem | null>(null)

  // Create Form states
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newFullName, setNewFullName] = useState('')
  const [newEmployeeId, setNewEmployeeId] = useState('')
  const [newRole, setNewRole] = useState<'admin' | 'supervisor' | 'warehouse_staff'>('warehouse_staff')
  const [createFormError, setCreateFormError] = useState('')

  // Edit User state
  const [editFullName, setEditFullName] = useState('')
  const [editEmployeeId, setEditEmployeeId] = useState('')
  const [editFormError, setEditFormError] = useState('')

  // Edit Role state
  const [selectedRole, setSelectedRole] = useState<'admin' | 'supervisor' | 'warehouse_staff'>('warehouse_staff')

  // Reset Password state
  const [resetPassInput, setResetPassInput] = useState('')

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target as Node)) {
        setIsRoleDropdownOpen(false)
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setIsStatusDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

  // Check authentication & Role admin
  useEffect(() => {
    const loggedInUser = getUser()
    if (!loggedInUser) {
      router.push('/login')
      return
    }
    if (loggedInUser.role !== 'admin') {
      router.push('/')
      return
    }
    setCurrentUser(loggedInUser)
    setAuthChecked(true)
    fetchUserList()
  }, [router, fetchUserList])

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateFormError('')
    if (!newUsername || !newPassword || !newFullName) {
      setCreateFormError('กรุณากรอก Username, Password และชื่อ-นามสกุลให้ครบถ้วน')
      return
    }
    if (newPassword.length < 6) {
      setCreateFormError('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร')
      return
    }

    setActionLoadingId(-1)
    try {
      const res = await createUser({
        username: newUsername,
        password: newPassword,
        fullName: newFullName,
        employeeId: newEmployeeId || undefined,
        role: newRole,
      })
      setToastMessage({ type: 'success', text: res.message || 'สร้างบัญชีผู้ใช้งานเรียบร้อยแล้ว' })
      setShowCreateModal(false)
      setNewUsername('')
      setNewPassword('')
      setNewFullName('')
      setNewEmployeeId('')
      setNewRole('warehouse_staff')
      await fetchUserList()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการสร้างบัญชี'
      setCreateFormError(msg)
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!showEditModalUser) return
    setEditFormError('')
    if (!editFullName.trim()) {
      setEditFormError('กรุณากรอกชื่อ-นามสกุล')
      return
    }

    setActionLoadingId(showEditModalUser.id)
    try {
      const res = await updateUserInfo(showEditModalUser.id, {
        fullName: editFullName,
        employeeId: editEmployeeId || undefined,
      })
      setToastMessage({ type: 'success', text: res.message || 'แก้ไขข้อมูลผู้ใช้งานเรียบร้อยแล้ว' })
      setShowEditModalUser(null)
      await fetchUserList()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการแก้ไขข้อมูล'
      setEditFormError(msg)
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleToggleUserStatus = async (targetUser: UserItem) => {
    const isCurrentlyActive = targetUser.status !== 'disabled'
    const nextStatus = isCurrentlyActive ? 'disabled' : 'approved'
    const confirmText = isCurrentlyActive 
      ? `คุณต้องการระงับการใช้งานบัญชี "${targetUser.fullName}" ใช่หรือไม่?` 
      : `คุณต้องการเปิดใช้งานบัญชี "${targetUser.fullName}" ใช่หรือไม่?`

    if (!confirm(confirmText)) return

    setActionLoadingId(targetUser.id)
    try {
      const res = await updateUserStatus(targetUser.id, nextStatus)
      setToastMessage({ type: 'success', text: res.message || 'ปรับสถานะผู้ใช้งานสำเร็จ' })
      await fetchUserList()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการปรับสถานะ'
      setToastMessage({ type: 'error', text: msg })
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleUpdateRoleSubmit = async () => {
    if (!showRoleModalUser) return
    setActionLoadingId(showRoleModalUser.id)
    try {
      const res = await updateUserRole(showRoleModalUser.id, selectedRole)
      setToastMessage({ type: 'success', text: res.message || 'เปลี่ยนสิทธิ์การใช้งานสำเร็จ' })
      setShowRoleModalUser(null)
      await fetchUserList()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเปลี่ยนสิทธิ์'
      setToastMessage({ type: 'error', text: msg })
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleResetPasswordSubmit = async () => {
    if (!showResetModalUser) return
    if (!resetPassInput || resetPassInput.length < 6) {
      setToastMessage({ type: 'error', text: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร' })
      return
    }
    setActionLoadingId(showResetModalUser.id)
    try {
      const res = await resetUserPassword(showResetModalUser.id, resetPassInput)
      setToastMessage({ type: 'success', text: res.message || 'รีเซ็ตรหัสผ่านเรียบร้อยแล้ว' })
      setShowResetModalUser(null)
      setResetPassInput('')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน'
      setToastMessage({ type: 'error', text: msg })
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleDeleteUser = async (targetUser: UserItem) => {
    if (!confirm(`คุณต้องการลบบัญชีผู้ใช้งาน "${targetUser.fullName}" (${targetUser.username}) อย่างถาวรใช่หรือไม่?`)) return
    setActionLoadingId(targetUser.id)
    try {
      const res = await deleteUser(targetUser.id)
      setToastMessage({ type: 'success', text: res.message || 'ลบบัญชีผู้ใช้งานเรียบร้อยแล้ว' })
      await fetchUserList()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการลบบัญชี'
      setToastMessage({ type: 'error', text: msg })
    } finally {
      setActionLoadingId(null)
    }
  }

  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.employeeId && u.employeeId.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesRole = roleFilter === 'all' || u.role === roleFilter
    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'disabled' ? u.status === 'disabled' : u.status !== 'disabled')

    return matchesSearch && matchesRole && matchesStatus
  })

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#BE1111]/10 text-[#BE1111] border border-[#BE1111]/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            แอดมินระบบ (Admin)
          </span>
        )
      case 'supervisor':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Shield className="w-3.5 h-3.5" />
            หัวหน้างาน (Supervisor)
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <User className="w-3.5 h-3.5" />
            พนักงานทั่วไป (Staff)
          </span>
        )
    }
  }

  const getStatusBadge = (status?: string) => {
    if (status === 'disabled') {
      return (
        <div className="inline-flex items-center gap-2 whitespace-nowrap">
          <span className="w-2 h-2 rounded-full bg-red-500 ring-4 ring-red-500/20 shrink-0"></span>
          <span className="text-xs font-normal text-slate-500">ระงับใช้งาน</span>
        </div>
      )
    }
    return (
      <div className="inline-flex items-center gap-2 whitespace-nowrap">
        <span className="w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20 shrink-0"></span>
        <span className="text-xs font-normal text-slate-700">ใช้งานอยู่</span>
      </div>
    )
  }

  const roleOptions = [
    { value: 'all', label: 'หมวดบทบาท: ทั้งหมด', count: users.length },
    { value: 'admin', label: 'แอดมินระบบ (System Admin)', count: users.filter(u => u.role === 'admin').length },
    { value: 'supervisor', label: 'หัวหน้างาน (Supervisor)', count: users.filter(u => u.role === 'supervisor').length },
    { value: 'warehouse_staff', label: 'พนักงานทั่วไป (Staff)', count: users.filter(u => u.role === 'warehouse_staff').length },
  ]

  const statusOptions = [
    { value: 'all', label: 'สถานะ: ทั้งหมด', count: users.length },
    { value: 'approved', label: 'ใช้งานอยู่ (Active)', count: users.filter(u => u.status !== 'disabled').length },
    { value: 'disabled', label: 'ระงับใช้งาน (Disabled)', count: users.filter(u => u.status === 'disabled').length },
  ]

  const currentRoleOption = roleOptions.find(opt => opt.value === roleFilter) || roleOptions[0]
  const currentStatusOption = statusOptions.find(opt => opt.value === statusFilter) || statusOptions[0]

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <RefreshCw className="w-6 h-6 animate-spin text-[#BE1111]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50/60 p-4 sm:p-6 lg:p-8 font-body">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 sm:gap-2.5 mb-1.5">
              <div className="p-2 sm:p-2.5 bg-red-50 text-[#BE1111] rounded-2xl shrink-0">
                <Users className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <h1 className="text-[14px] xs:text-[15px] sm:text-xl lg:text-2xl font-display font-bold text-slate-900 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
                จัดการผู้ใช้งานระบบ (User Management)
              </h1>
            </div>
            <p className="text-[11px] sm:text-sm text-slate-500 font-normal leading-relaxed">
              สร้างบัญชีใหม่ แก้ไขข้อมูล กำหนดสิทธิ์บทบาท (Role) เปิด/ปิดบัญชี และรีเซ็ตรหัสผ่านสำหรับพนักงาน
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#BE1111] hover:bg-[#A00F0F] text-white font-bold text-sm rounded-2xl shadow-md shadow-[#BE1111]/20 transition-all cursor-pointer active:scale-95 shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>สร้างผู้ใช้งานใหม่</span>
          </button>
        </div>

        {/* Toast Alert */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-4 rounded-2xl text-sm font-semibold flex items-center justify-between shadow-sm border ${
                toastMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-red-50 text-red-800 border-red-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {toastMessage.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
                <span>{toastMessage.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setToastMessage(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filters Bar: Role Dropdown + Status Dropdown + Search Input + Refresh */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row gap-3 sm:gap-4 justify-between items-stretch lg:items-center">
          
          {/* Dropdown Filters Group */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            
            {/* 1. Role Filter Dropdown */}
            <div className="relative" ref={roleDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  setIsRoleDropdownOpen(!isRoleDropdownOpen)
                  setIsStatusDropdownOpen(false)
                }}
                className={`w-full sm:w-auto inline-flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl border text-xs sm:text-sm font-normal transition-all cursor-pointer ${
                  roleFilter !== 'all'
                    ? 'bg-red-50/40 border-[#BE1111]/30 text-[#BE1111]'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>{currentRoleOption.label}</span>
                  <span className="px-2 py-0.5 text-[11px] rounded-full bg-white border border-slate-200 text-slate-500 font-normal">
                    {currentRoleOption.count}
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isRoleDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isRoleDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute left-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-30 space-y-1"
                  >
                    <div className="px-3 py-1.5 text-[11px] font-normal text-slate-400">
                      แยกตามบทบาท (Role)
                    </div>
                    {roleOptions.map((opt) => {
                      const isSelected = roleFilter === opt.value
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setRoleFilter(opt.value as 'all' | 'admin' | 'supervisor' | 'warehouse_staff')
                            setIsRoleDropdownOpen(false)
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-normal transition-all cursor-pointer text-left ${
                            isSelected
                              ? 'bg-red-50 text-[#BE1111]'
                              : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span>{opt.label}</span>
                          <span className={`px-2 py-0.5 text-xs rounded-full font-normal ${
                            isSelected ? 'bg-[#BE1111] text-white' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {opt.count}
                          </span>
                        </button>
                      )
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 2. Status Filter Dropdown */}
            <div className="relative" ref={statusDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  setIsStatusDropdownOpen(!isStatusDropdownOpen)
                  setIsRoleDropdownOpen(false)
                }}
                className={`w-full sm:w-auto inline-flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl border text-xs sm:text-sm font-normal transition-all cursor-pointer ${
                  statusFilter !== 'all'
                    ? 'bg-red-50/40 border-[#BE1111]/30 text-[#BE1111]'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>{currentStatusOption.label}</span>
                  <span className="px-2 py-0.5 text-[11px] rounded-full bg-white border border-slate-200 text-slate-500 font-normal">
                    {currentStatusOption.count}
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isStatusDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isStatusDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute left-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-30 space-y-1"
                  >
                    <div className="px-3 py-1.5 text-[11px] font-normal text-slate-400">
                      แยกตามสถานะบัญชี
                    </div>
                    {statusOptions.map((opt) => {
                      const isSelected = statusFilter === opt.value
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setStatusFilter(opt.value as 'all' | 'approved' | 'disabled')
                            setIsStatusDropdownOpen(false)
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-normal transition-all cursor-pointer text-left ${
                            isSelected
                              ? 'bg-red-50 text-[#BE1111]'
                              : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span>{opt.label}</span>
                          <span className={`px-2 py-0.5 text-xs rounded-full font-normal ${
                            isSelected ? 'bg-[#BE1111] text-white' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {opt.count}
                          </span>
                        </button>
                      )
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Search Box & Refresh */}
          <div className="flex items-center gap-2 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหาชื่อ, username หรือรหัสพนักงาน..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#BE1111]/20 focus:border-[#BE1111]"
              />
            </div>
            <button
              type="button"
              onClick={fetchUserList}
              disabled={loading}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl transition-all cursor-pointer shrink-0"
              title="รีเฟรชรายชื่อ"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#BE1111]' : ''}`} />
            </button>
          </div>
        </div>

        {/* User Table / List */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-[#BE1111]" />
              <p className="text-sm font-semibold">กำลังโหลดข้อมูลผู้ใช้งาน...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-bold text-slate-600">ไม่พบรายชื่อผู้ใช้งานที่ตรงกับเงื่อนไข</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 border-b border-slate-200/80 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">ผู้ใช้งาน</th>
                    <th className="px-6 py-4">Username</th>
                    <th className="px-6 py-4">รหัสพนักงาน</th>
                    <th className="px-6 py-4">บทบาท (Role)</th>
                    <th className="px-6 py-4">สถานะ</th>
                    <th className="px-6 py-4 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className={`hover:bg-slate-50/50 transition-colors ${u.status === 'disabled' ? 'opacity-60 bg-slate-50/30' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
                            {u.fullName ? u.fullName.slice(0, 2).toUpperCase() : u.username.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm leading-tight">{u.fullName}</p>
                            <p className="text-xs text-slate-400">ID: #{u.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono font-semibold text-slate-700">{u.username}</td>
                      <td className="px-6 py-4 text-slate-600 font-medium">
                        {u.employeeId ? (
                          <span className="inline-flex items-center gap-1">
                            <BadgeCheck className="w-3.5 h-3.5 text-slate-400" />
                            {u.employeeId}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">{getRoleBadge(u.role)}</td>
                      <td className="px-6 py-4">{getStatusBadge(u.status)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          
                          {/* Button 1: Edit User Details */}
                          <button
                            type="button"
                            onClick={() => {
                              setShowEditModalUser(u)
                              setEditFullName(u.fullName)
                              setEditEmployeeId(u.employeeId || '')
                              setEditFormError('')
                            }}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer"
                            title="แก้ไขชื่อและรหัสพนักงาน"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Button 2: Change Role */}
                          <button
                            type="button"
                            onClick={() => {
                              setShowRoleModalUser(u)
                              setSelectedRole((u.role as 'admin' | 'supervisor' | 'warehouse_staff') || 'warehouse_staff')
                            }}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                            title="เปลี่ยน Role"
                          >
                            Role
                          </button>

                          {/* Button 3: Toggle Active / Disabled Status */}
                          <button
                            type="button"
                            onClick={() => handleToggleUserStatus(u)}
                            disabled={actionLoadingId === u.id}
                            className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                              u.status === 'disabled'
                                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                                : 'bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700'
                            }`}
                            title={u.status === 'disabled' ? 'เปิดใช้งานบัญชี' : 'ระงับการใช้งานบัญชี'}
                          >
                            <Power className="w-4 h-4" />
                          </button>

                          {/* Button 4: Reset Password */}
                          <button
                            type="button"
                            onClick={() => {
                              setShowResetModalUser(u)
                              setResetPassInput('')
                            }}
                            className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl transition-all cursor-pointer"
                            title="รีเซ็ตรหัสผ่าน"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>

                          {/* Button 5: Delete User */}
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u)}
                            disabled={actionLoadingId === u.id}
                            className="p-1.5 bg-red-50 hover:bg-red-100 text-[#BE1111] rounded-xl transition-all cursor-pointer disabled:opacity-50"
                            title="ลบบัญชีผู้ใช้ถาวร"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal 1: Create New User */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 relative text-left"
            >
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="absolute right-5 top-5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2.5 mb-4">
                <div className="p-2.5 bg-red-50 text-[#BE1111] rounded-2xl">
                  <UserPlus className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-display font-bold text-slate-900">
                  สร้างผู้ใช้งานใหม่
                </h3>
              </div>

              {createFormError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs font-semibold">
                  {createFormError}
                </div>
              )}

              <form onSubmit={handleCreateUserSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">ชื่อผู้ใช้ (Username) *</label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="เช่น employee01"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#BE1111]/20 focus:border-[#BE1111]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">รหัสผ่าน (Password) *</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="อย่างน้อย 6 ตัวอักษร"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#BE1111]/20 focus:border-[#BE1111]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">ชื่อ-นามสกุล *</label>
                  <input
                    type="text"
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    placeholder="เช่น สมชาย ใจดี"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#BE1111]/20 focus:border-[#BE1111]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">รหัสพนักงาน (ถ้ามี)</label>
                  <input
                    type="text"
                    value={newEmployeeId}
                    onChange={(e) => setNewEmployeeId(e.target.value)}
                    placeholder="เช่น EMP-1002"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#BE1111]/20 focus:border-[#BE1111]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">บทบาทสิทธิ์การใช้งาน (Role) *</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as 'admin' | 'supervisor' | 'warehouse_staff')}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#BE1111]/20 focus:border-[#BE1111]"
                  >
                    <option value="warehouse_staff">พนักงานทั่วไป (Staff - สแกนรับ/จ่าย)</option>
                    <option value="supervisor">หัวหน้างาน (Supervisor - อนุมัติคลังสินค้า)</option>
                    <option value="admin">แอดมินระบบ (System Admin - จัดการผู้ใช้)</option>
                  </select>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-2xl cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoadingId === -1}
                    className="px-5 py-2.5 bg-[#BE1111] hover:bg-[#A00F0F] text-white font-bold text-sm rounded-2xl shadow-md shadow-[#BE1111]/20 disabled:opacity-50 cursor-pointer"
                  >
                    สร้างบัญชี
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal 2: Edit User Details */}
      <AnimatePresence>
        {showEditModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-100 relative text-left"
            >
              <button
                type="button"
                onClick={() => setShowEditModalUser(null)}
                className="absolute right-5 top-5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-2 text-slate-900">
                <Edit className="w-5 h-5 text-[#BE1111]" />
                <h3 className="text-base font-display font-bold">
                  แก้ไขข้อมูลผู้ใช้งาน
                </h3>
              </div>
              <p className="text-xs text-slate-500 mb-4">Username: @{showEditModalUser.username}</p>

              {editFormError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs font-semibold">
                  {editFormError}
                </div>
              )}

              <form onSubmit={handleEditUserSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">ชื่อ-นามสกุล *</label>
                  <input
                    type="text"
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    placeholder="เช่น สมชาย ใจดี"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#BE1111]/20 focus:border-[#BE1111]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">รหัสพนักงาน</label>
                  <input
                    type="text"
                    value={editEmployeeId}
                    onChange={(e) => setEditEmployeeId(e.target.value)}
                    placeholder="เช่น EMP-1001"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#BE1111]/20 focus:border-[#BE1111]"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEditModalUser(null)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoadingId === showEditModalUser.id}
                    className="px-4 py-2.5 bg-[#BE1111] hover:bg-[#A00F0F] text-white font-bold text-xs rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    บันทึกการแก้ไข
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal 3: Edit Role */}
      <AnimatePresence>
        {showRoleModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-100 relative text-left"
            >
              <button
                type="button"
                onClick={() => setShowRoleModalUser(null)}
                className="absolute right-5 top-5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-base font-display font-bold text-slate-900 mb-1">
                เปลี่ยน Role ของ {showRoleModalUser.fullName}
              </h3>
              <p className="text-xs text-slate-500 mb-4">Username: @{showRoleModalUser.username}</p>

              <div className="space-y-3 mb-6">
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as 'admin' | 'supervisor' | 'warehouse_staff')}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#BE1111]/20 focus:border-[#BE1111]"
                >
                  <option value="warehouse_staff">พนักงานทั่วไป (Staff)</option>
                  <option value="supervisor">หัวหน้างาน (Supervisor)</option>
                  <option value="admin">แอดมินระบบ (System Admin)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRoleModalUser(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleUpdateRoleSubmit}
                  disabled={actionLoadingId === showRoleModalUser.id}
                  className="px-4 py-2 bg-[#BE1111] hover:bg-[#A00F0F] text-white font-bold text-xs rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  บันทึกการเปลี่ยน Role
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal 4: Reset Password */}
      <AnimatePresence>
        {showResetModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-100 relative text-left"
            >
              <button
                type="button"
                onClick={() => setShowResetModalUser(null)}
                className="absolute right-5 top-5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-2 text-amber-600">
                <KeyRound className="w-5 h-5" />
                <h3 className="text-base font-display font-bold text-slate-900">
                  รีเซ็ตรหัสผ่านผู้ใช้งาน
                </h3>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                ตั้งรหัสผ่านใหม่ให้แก่ <span className="font-bold text-slate-800">{showResetModalUser.fullName}</span> (@{showResetModalUser.username})
              </p>

              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-600 mb-1">รหัสผ่านใหม่ *</label>
                <input
                  type="password"
                  value={resetPassInput}
                  onChange={(e) => setResetPassInput(e.target.value)}
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#BE1111]/20 focus:border-[#BE1111]"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowResetModalUser(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleResetPasswordSubmit}
                  disabled={actionLoadingId === showResetModalUser.id}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  ยืนยันการตั้งรหัสผ่านใหม่
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
