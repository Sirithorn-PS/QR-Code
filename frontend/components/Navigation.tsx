'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ScanLine, ClipboardCheck, Package, BarChart3, LogOut, Home, LayoutDashboard, Bell, CheckCheck } from 'lucide-react'
import { useState, useEffect } from 'react'
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

  // Notification state
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0)
  const [showNotifPopover, setShowNotifPopover] = useState<boolean>(false)

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
    if (notif.link) {
      router.push(notif.link)
    }
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

  const navItems = [
    { href: '/', icon: Home, label: 'หน้าหลัก' },
    { href: '/scan', icon: ScanLine, label: 'สแกน' },
    { href: '/transactions', icon: ClipboardCheck, label: 'รายการ' },
    { href: '/inventory', icon: Package, label: 'สต็อก' },
    { href: '/reports', icon: BarChart3, label: 'รายงาน' },
    { href: '/dashboard', icon: LayoutDashboard, label: 'แดชบอร์ด' },
  ]

  const NotificationPopoverContent = (
    <div className="w-80 sm:w-96 rounded-2xl bg-white p-4 shadow-2xl border border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200 text-left">
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
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50">
      {/* Top Navbar (Desktop) */}
      <header className="hidden md:flex items-center justify-between h-20 px-4 xl:px-8 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs z-10 shrink-0">
        <div className="flex items-center gap-3 xl:gap-8">
          <div className="flex items-center gap-3 select-none shrink-0">
            <div className="flex items-center gap-2.5">
              <Package className="w-7 h-7 text-[#BE1111] stroke-[2.2] shrink-0" />
              <h1 className="text-xl xl:text-2xl font-display font-extrabold tracking-tight flex items-center gap-1.5 xl:gap-2 whitespace-nowrap">
                <span className="text-[#0F172A]">WPK</span>
                <span className="text-[#BE1111]">MMS</span>
              </h1>
            </div>
            <p className="hidden xl:block text-[11px] text-slate-400 font-semibold leading-snug border-l border-slate-200 pl-4 select-none">
              <span className="block whitespace-nowrap">Packaging Material</span>
              <span className="block whitespace-nowrap">Warehouse Management System</span>
            </p>
          </div>
          
          <nav className="flex items-center space-x-1 xl:space-x-1.5 overflow-x-auto no-scrollbar">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
              const showBadge = item.href === '/transactions' && pendingCount > 0

              return (
                <Link key={item.href} href={item.href}
                  className={`flex items-center gap-2 px-3 xl:px-4 py-2.5 rounded-xl text-sm xl:text-base whitespace-nowrap shrink-0 transition-all duration-200 ${
                    isActive 
                      ? 'bg-red-50/90 text-[#BE1111] font-extrabold shadow-2xs border border-red-100/80' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-semibold'
                  }`}
                >
                  <item.icon className={`w-4.5 h-4.5 xl:w-5 xl:h-5 stroke-[2.2] shrink-0 transition-colors ${isActive ? 'text-[#BE1111]' : 'text-slate-400 group-hover:text-slate-600'}`} />
                  <span className="whitespace-nowrap">{item.label}</span>
                  {showBadge && (
                    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#BE1111] text-white text-[11px] xl:text-xs font-bold font-display shadow-xs animate-pulse shrink-0">
                      {pendingCount}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3 xl:gap-5 shrink-0">
          {/* Notification Bell Button */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowNotifPopover(!showNotifPopover)}
              className="relative p-2.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 transition-all cursor-pointer border border-transparent hover:border-slate-200/60"
              title="การแจ้งเตือน"
            >
              <Bell className="w-5.5 h-5.5" />
              {unreadNotifCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-[#BE1111] px-1 text-[11px] font-bold font-display text-white shadow-2xs animate-pulse">
                  {unreadNotifCount}
                </span>
              )}
            </button>

            {/* Notification Popover Dropdown */}
            {showNotifPopover && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowNotifPopover(false)}
                />
                <div className="absolute right-0 mt-2 z-50">
                  {NotificationPopoverContent}
                </div>
              </>
            )}
          </div>

          <div className="h-9 w-px bg-slate-200/80 shrink-0"></div>

          <div className="flex items-center gap-2.5 xl:gap-3 shrink-0">
            <div className="w-10 h-10 xl:w-11 xl:h-11 rounded-full bg-slate-100 border border-slate-200 text-slate-800 font-extrabold text-xs xl:text-sm flex items-center justify-center shrink-0 shadow-2xs select-none">
              {getInitials(user.username || user.fullName)}
            </div>
            <div className="text-left shrink-0">
              <p className="text-sm xl:text-base font-bold text-slate-900 leading-tight whitespace-nowrap">{user.username || user.fullName}</p>
              <span className="text-[10px] xl:text-[11px] font-bold text-slate-500 bg-slate-100 border border-slate-200/60 px-1.5 xl:px-2 py-0.5 rounded-md inline-block mt-0.5 leading-none whitespace-nowrap">
                {user.role === 'admin' ? 'ผู้ควบคุมดูแลระบบ (Supervisor)' : user.role === 'warehouse_staff' ? 'พนักงานทั่วไป (Staff)' : user.role}
              </span>
            </div>
          </div>
          <div className="h-9 w-px bg-slate-200/80 shrink-0"></div>
          <button onClick={handleLogout} className="group flex items-center gap-2 px-2.5 xl:px-3 py-2 text-sm font-semibold text-slate-600 rounded-xl hover:bg-red-50 hover:text-[#BE1111] transition-all border border-transparent hover:border-red-100 whitespace-nowrap shrink-0">
            <LogOut className="w-4.5 h-4.5 text-slate-400 group-hover:text-[#BE1111] transition-colors shrink-0" />
            <span className="whitespace-nowrap">ออกจากระบบ</span>
          </button>
        </div>
      </header>

      {/* Mobile Top Header for Notification Bell */}
      <header className="md:hidden flex items-center justify-between h-16 px-4 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs z-10 shrink-0">
        <div className="flex items-center gap-2 select-none">
          <Package className="w-5 h-5 text-[#BE1111] stroke-[2.2] shrink-0" />
          <h1 className="text-base font-display font-extrabold tracking-tight flex items-center gap-1.5">
            <span className="text-[#0F172A]">WPK</span>
            <span className="text-[#BE1111]">MMS</span>
          </h1>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotifPopover(!showNotifPopover)}
            className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
            title="การแจ้งเตือน"
          >
            <Bell className="w-5 h-5" />
            {unreadNotifCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#BE1111] px-1 text-[10px] font-bold font-display text-white shadow-2xs animate-pulse">
                {unreadNotifCount}
              </span>
            )}
          </button>

          {showNotifPopover && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowNotifPopover(false)}
              />
              <div className="absolute right-0 mt-2 z-50">
                {NotificationPopoverContent}
              </div>
            </>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0 relative">
        {children}
      </main>

      {/* Mobile Bottom Tabs */}
      <nav className="md:hidden fixed bottom-0 w-full bg-white border-t border-gray-200 pb-safe z-50 shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
        <div className="flex justify-around items-center h-16 px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
            const showBadge = item.href === '/transactions' && pendingCount > 0

            return (
              <Link key={item.href} href={item.href} className="flex flex-col items-center justify-center w-full h-full space-y-1 tap-highlight-transparent relative">
                <div className="relative">
                  <item.icon className={`w-5 h-5 transition-colors duration-200 ${isActive ? 'text-[#BE1111]' : 'text-gray-400'}`} />
                  {showBadge && (
                    <span className="absolute -top-1.5 -right-3 inline-flex items-center justify-center min-w-[18px] h-4.5 px-1 rounded-full bg-[#BE1111] text-white text-[10px] font-bold font-display shadow-2xs animate-pulse">
                      {pendingCount}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-medium transition-colors duration-200 ${isActive ? 'text-[#BE1111]' : 'text-gray-500'}`}>
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

