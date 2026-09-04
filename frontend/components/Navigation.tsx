'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ScanLine, ClipboardCheck, Package, BarChart3, LogOut, Home, LayoutDashboard, Bell, CheckCheck, UserCheck, Menu } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { fetchTransactions, fetchNotifications, markNotificationAsRead, markAllNotificationsAsRead, NotificationItem } from '@/lib/auth'

function getInitials(name: string): string {
  if (!name) return 'U'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

export function Navigation({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<{ id: number; username?: string; fullName: string; role: string } | null>(null)
  const [mounted, setMounted] = useState(false)
  const [pendingCount, setPendingCount] = useState<number>(0)
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true)

  // Notification state
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0)
  const [showNotifPopover, setShowNotifPopover] = useState<boolean>(false)

  // Refs for outside click detection
  const notifDesktopRef = useRef<HTMLDivElement>(null)
  const notifMobileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showNotifPopover) return

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node
      const isOutsideDesktop = notifDesktopRef.current ? !notifDesktopRef.current.contains(target) : true
      const isOutsideMobile = notifMobileRef.current ? !notifMobileRef.current.contains(target) : true

      if (isOutsideDesktop && isOutsideMobile) {
        setShowNotifPopover(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [showNotifPopover])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
    const userStr = localStorage.getItem('user')
    const token = localStorage.getItem('token')
    if (userStr && token && token !== 'undefined' && token !== 'null') {
      try {
        setUser(JSON.parse(userStr))
      } catch (e) {
        console.error(e)
      }
    } else if (pathname !== '/login' && pathname !== '/register') {
      router.push('/login')
    }
  }, [pathname, router])

  // ดึงจำนวนรายการรออนุมัติสำหรับแสดง Badge บนเมนู "รายการ"
  useEffect(() => {
    if (!user) {
      setPendingCount(0)
      return
    }

    let isMounted = true

    async function loadPendingCount() {
      try {
        const pendingList = await fetchTransactions('pending')
        if (isMounted) {
          setPendingCount(pendingList.length)
        }
      } catch (e) {
        console.error('Failed to fetch pending count for badge:', e)
      }
    }

    void loadPendingCount()

    const handleUpdate = () => {
      void loadPendingCount()
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('transactionUpdated', handleUpdate)
    }

    const intervalId = setInterval(() => {
      void loadPendingCount()
    }, 5000)

    return () => {
      isMounted = false
      if (typeof window !== 'undefined') {
        window.removeEventListener('transactionUpdated', handleUpdate)
      }
      clearInterval(intervalId)
    }
  }, [user, pathname])

  // ดึงรายการ Notification และ Unread Count
  useEffect(() => {
    if (!user) return

    let isMounted = true

    async function loadNotifications() {
      try {
        const res = await fetchNotifications()
        if (isMounted) {
          setNotifications(res.notifications)
          setUnreadNotifCount(res.unreadCount)
        }
      } catch (e) {
        console.error('Failed to fetch notifications:', e)
      }
    }

    void loadNotifications()

    const handleUpdate = () => {
      void loadNotifications()
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('transactionUpdated', handleUpdate)
    }

    const intervalId = setInterval(() => {
      void loadNotifications()
    }, 5000)

    return () => {
      isMounted = false
      if (typeof window !== 'undefined') {
        window.removeEventListener('transactionUpdated', handleUpdate)
      }
      clearInterval(intervalId)
    }
  }, [user, pathname])

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.isRead) {
      try {
        await markNotificationAsRead(notif.id)
        setNotifications((prev) =>
          prev.map((item) => (item.id === notif.id ? { ...item, isRead: true } : item))
        )
        setUnreadNotifCount((prev) => Math.max(0, prev - 1))
      } catch (e) {
        console.error('Failed to mark notification read:', e)
      }
    }
    setShowNotifPopover(false)

    let targetLink = notif.link || '/transactions'
    if (notif.transactionId && !targetLink.includes('?id=')) {
      targetLink = `${targetLink}${targetLink.includes('?') ? '&' : '?'}id=${notif.transactionId}`
    }
    router.push(targetLink)
  }

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead()
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })))
      setUnreadNotifCount(0)
    } catch (e) {
      console.error('Failed to mark all notifications read:', e)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    router.push('/login')
  }

  const isAuthPage = pathname === '/login' || pathname === '/register'
  
  if (!mounted) {
    return <div className="min-h-screen bg-gray-50"></div> // Placeholder
  }

  if (isAuthPage || !user) {
    return <div className="min-h-screen bg-gray-50">{children}</div>
  }

  const getNavItems = () => {
    if (user.role === 'admin') {
      return [
        { href: '/', icon: Home, label: 'หน้าหลัก' },
        { href: '/users', icon: UserCheck, label: 'จัดการผู้ใช้งาน' },
      ]
    }
    return [
      { href: '/', icon: Home, label: 'หน้าหลัก' },
      { href: '/scan', icon: ScanLine, label: 'สแกน' },
      { href: '/transactions', icon: ClipboardCheck, label: 'รายการ' },
      { href: '/inventory', icon: Package, label: 'สต็อก' },
      { href: '/reports', icon: BarChart3, label: 'รายงาน' },
      { href: '/dashboard', icon: LayoutDashboard, label: 'แดชบอร์ด' },
    ]
  }

  const navItems = getNavItems()

  const NotificationPopoverContent = (
    <div className="w-full sm:w-96 rounded-2xl bg-white p-4 shadow-2xl border border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200 text-left max-w-full">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-[#BE1111]" />
          <h3 className="font-display font-bold text-gray-900 text-sm">การแจ้งเตือน</h3>
          {unreadNotifCount > 0 && (
            <span className="bg-red-50 text-[#BE1111] text-[11px] font-bold px-2 py-0.5 rounded-full">
              {unreadNotifCount} ใหม่
            </span>
          )}
        </div>
        {unreadNotifCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="text-xs font-semibold text-gray-500 hover:text-[#BE1111] transition-colors inline-flex items-center gap-1 cursor-pointer"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>อ่านทั้งหมด</span>
          </button>
        )}
      </div>

      <div className="mt-2 max-h-80 overflow-y-auto space-y-2 pr-1">
        {notifications.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-400">
            ไม่มีการแจ้งเตือน
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className={`p-3 rounded-xl transition-all cursor-pointer border ${
                notif.isRead
                  ? 'bg-white border-gray-100 hover:bg-gray-50'
                  : 'bg-red-50/40 border-red-100/80 hover:bg-red-50'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                  notif.type === 'pending_approval'
                    ? 'bg-amber-100 text-amber-800'
                    : notif.type === 'approval_result'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {notif.type === 'pending_approval'
                    ? 'รออนุมัติ'
                    : notif.type === 'approval_result'
                    ? 'ผลการอนุมัติ'
                    : 'วัตถุดิบใกล้หมด'}
                </span>
                <span className="text-[10px] text-gray-400">
                  {new Date(notif.createdAt).toLocaleDateString('th-TH', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <h4 className="mt-1.5 text-xs font-bold text-gray-900 leading-tight flex items-center">
                {!notif.isRead && (
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#BE1111] mr-1.5 shrink-0"></span>
                )}
                <span>{notif.title}</span>
              </h4>
              <p className="mt-1 text-[11px] text-gray-600 whitespace-pre-line leading-relaxed">
                {notif.message}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 flex-col md:flex-row">
      {/* Left Sidebar (Desktop & Tablet: md:flex) */}
      <aside
        className={`hidden md:flex flex-col bg-white border-r border-slate-200/80 shrink-0 z-30 select-none shadow-[1px_0_10px_rgba(0,0,0,0.02)] transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'w-64 lg:w-72 opacity-100' : 'w-0 border-r-0 overflow-hidden opacity-0 pointer-events-none'
        }`}
      >
        {/* Brand Logo Header */}
        <div className="h-16 lg:h-18 flex items-center px-5 lg:px-6 border-b border-slate-100 gap-3 shrink-0">
          <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0 shadow-2xs">
            <Package className="w-5.5 h-5.5 lg:w-6 lg:h-6 text-[#BE1111] stroke-[2.2]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg lg:text-xl font-display font-bold tracking-tight flex items-center gap-1 leading-none">
              <span className="text-[#0F172A]">WPK</span>
              <span className="text-[#BE1111]">MMS</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-normal leading-tight mt-1 truncate">
              Warehouse Management System
            </p>
          </div>
        </div>

        {/* Sidebar Navigation Items */}
        <div className="flex-1 px-3.5 lg:px-4 py-5 overflow-y-auto space-y-1.5">
          <div className="px-3 pb-2 text-[10.5px] font-medium tracking-wider text-slate-400 uppercase select-none">
            เมนูนำทาง (Navigation)
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
              const showBadge = item.href === '/transactions' && pendingCount > 0

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs lg:text-sm font-normal transition-all duration-200 ${
                    isActive
                      ? 'bg-red-50/90 text-[#BE1111] shadow-2xs border border-red-100/90'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <item.icon
                      className={`w-4.5 h-4.5 lg:w-5 lg:h-5 stroke-[2] shrink-0 transition-colors ${
                        isActive ? 'text-[#BE1111]' : 'text-slate-400 group-hover:text-slate-600'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {showBadge && (
                    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#BE1111] text-white text-[10.5px] font-medium font-display shadow-xs animate-pulse shrink-0">
                      {pendingCount}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Bottom User Profile Section in Sidebar */}
        <div className="p-3.5 lg:p-4 border-t border-slate-100 bg-slate-50/60 shrink-0">
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white border border-slate-200/70 shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8.5 h-8.5 lg:w-9 lg:h-9 rounded-full bg-slate-100 border border-slate-200 text-slate-800 font-semibold text-xs lg:text-sm flex items-center justify-center shrink-0 shadow-2xs select-none">
                {getInitials(user.username || user.fullName)}
              </div>
              <div className="min-w-0 text-left">
                <p className="text-xs lg:text-[13px] font-normal text-slate-900 truncate leading-tight">
                  {user.username || user.fullName}
                </p>
                <span className="inline-block text-[10px] font-normal text-slate-500 capitalize leading-none mt-0.5">
                  {user.role === 'admin' ? 'System Admin' : user.role === 'supervisor' ? 'Supervisor' : 'Staff'}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 lg:p-2 text-slate-400 hover:text-[#BE1111] hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
              title="ออกจากระบบ"
            >
              <LogOut className="w-4 h-4 lg:w-4.5 lg:h-4.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area Container (Header + Main) */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        {/* Desktop Slim Top Bar (Notification Bell & Status) */}
        <header className="hidden md:flex items-center justify-between h-14 lg:h-16 px-6 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs z-20 shrink-0">
          <div className="flex items-center gap-3">
            {/* Single Toggle Sidebar Button with 3-line hamburger design */}
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`p-2 rounded-xl text-slate-600 hover:text-slate-900 transition-all cursor-pointer border border-slate-200/70 shadow-2xs flex items-center justify-center ${
                !sidebarOpen ? 'bg-red-50 text-[#BE1111] border-red-100/90 hover:bg-red-100/80' : 'bg-white hover:bg-slate-100'
              }`}
              title={sidebarOpen ? 'ปิดแถบเมนูด้านข้าง' : 'เปิดแถบเมนูด้านข้าง'}
            >
              <Menu className="w-5 h-5 stroke-[2]" />
            </button>

            <div className="h-5 w-px bg-slate-200/80 shrink-0"></div>

            {(() => {
              const activeItem = navItems.find((i) => pathname === i.href || (i.href !== '/' && pathname.startsWith(i.href)))
              if (activeItem) {
                return (
                  <div className="flex items-center gap-2">
                    <activeItem.icon className="w-4 h-4 lg:w-4.5 lg:h-4.5 text-slate-500 stroke-[2] shrink-0" />
                    <span className="text-xs lg:text-sm font-medium text-slate-800">
                      {activeItem.label}
                    </span>
                  </div>
                )
              }
              return (
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 lg:w-4.5 lg:h-4.5 text-slate-500 stroke-[2] shrink-0" />
                  <span className="text-xs lg:text-sm font-medium text-slate-700">
                    ระบบคลังสินค้า
                  </span>
                </div>
              )
            })()}
          </div>

          <div className="flex items-center gap-3">
            {/* Notification Bell Button */}
            <div ref={notifDesktopRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => setShowNotifPopover(!showNotifPopover)}
                className="relative p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 transition-all cursor-pointer border border-transparent hover:border-slate-200/60"
                title="การแจ้งเตือน"
              >
                <Bell className="w-5 h-5" />
                {unreadNotifCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#BE1111] px-1 text-[10px] font-medium font-display text-white shadow-2xs animate-pulse">
                    {unreadNotifCount}
                  </span>
                )}
              </button>

              {/* Notification Popover Dropdown */}
              {showNotifPopover && (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-transparent cursor-default"
                    onClick={() => setShowNotifPopover(false)}
                    onTouchEnd={() => setShowNotifPopover(false)}
                  />
                  <div className="absolute right-0 mt-2 z-50">
                    {NotificationPopoverContent}
                  </div>
                </>
              )}
            </div>

            <div className="h-5 w-px bg-slate-200/80 shrink-0"></div>

            <div className="flex items-center gap-2 text-xs text-slate-500 select-none">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              <span className="font-normal text-slate-600">พร้อมใช้งาน</span>
            </div>
          </div>
        </header>

        {/* Mobile Top Header (<= md) */}
        <header className="md:hidden flex items-center justify-between h-16 px-4 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs z-10 shrink-0">
          <div className="flex items-center gap-2 select-none">
            <Package className="w-5.5 h-5.5 text-[#BE1111] stroke-[2.2] shrink-0" />
            <h1 className="text-lg font-display font-bold tracking-tight flex items-center gap-1">
              <span className="text-[#0F172A]">WPK</span>
              <span className="text-[#BE1111]">MMS</span>
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Notification Bell */}
            <div ref={notifMobileRef} className="relative">
              <button
                type="button"
                onClick={() => setShowNotifPopover(!showNotifPopover)}
                className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                title="การแจ้งเตือน"
              >
                <Bell className="w-5 h-5" />
                {unreadNotifCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#BE1111] px-1 text-[10px] font-medium font-display text-white shadow-2xs animate-pulse">
                    {unreadNotifCount}
                  </span>
                )}
              </button>

              {showNotifPopover && (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-transparent cursor-default"
                    onClick={() => setShowNotifPopover(false)}
                    onTouchEnd={() => setShowNotifPopover(false)}
                  />
                  <div className="fixed top-16 left-3 right-3 z-50 sm:absolute sm:top-full sm:right-0 sm:left-auto sm:mt-2 sm:w-auto">
                    {NotificationPopoverContent}
                  </div>
                </>
              )}
            </div>

            <div className="h-5 w-px bg-slate-200"></div>

            {/* User Avatar Circle */}
            <div
              className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-800 font-semibold text-xs flex items-center justify-center shrink-0 select-none"
              title={user.username || user.fullName}
            >
              {getInitials(user.username || user.fullName)}
            </div>

            {/* Logout Icon */}
            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-500 hover:text-[#BE1111] hover:bg-red-50 rounded-lg transition-all cursor-pointer"
              title="ออกจากระบบ"
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0 relative">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Tabs */}
      <nav className="md:hidden fixed bottom-0 w-full bg-white border-t border-gray-200 pb-safe z-40 shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
        <div className="flex justify-around items-center h-16 px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
            const showBadge = item.href === '/transactions' && pendingCount > 0

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center w-full h-full space-y-1 tap-highlight-transparent relative"
              >
                <div className="relative">
                  <item.icon
                    className={`w-5 h-5 transition-colors duration-200 ${
                      isActive ? 'text-[#BE1111]' : 'text-gray-400'
                    }`}
                  />
                  {showBadge && (
                    <span className="absolute -top-1.5 -right-3 inline-flex items-center justify-center min-w-[18px] h-4.5 px-1 rounded-full bg-[#BE1111] text-white text-[10px] font-medium font-display shadow-2xs animate-pulse">
                      {pendingCount}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[10px] font-normal transition-colors duration-200 ${
                    isActive ? 'text-[#BE1111]' : 'text-gray-500'
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
