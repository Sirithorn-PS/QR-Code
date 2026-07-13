'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ScanLine, ClipboardCheck, Package, BarChart3, LogOut, LayoutDashboard } from 'lucide-react'
import { useState, useEffect } from 'react'

export function Navigation({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<{ id: number, fullName: string, role: string } | null>(null)
  const [mounted, setMounted] = useState(false)

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
    { href: '/', icon: LayoutDashboard, label: 'หน้าหลัก' },
    { href: '/scan', icon: ScanLine, label: 'สแกน' },
    { href: '/transactions', icon: ClipboardCheck, label: 'รายการ' },
    { href: '/inventory', icon: Package, label: 'สต็อก' },
    { href: '/reports', icon: BarChart3, label: 'รายงาน' },
  ]

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50">
      {/* Top Navbar (Desktop) */}
      <header className="hidden md:flex items-center justify-between h-16 px-6 bg-white border-b border-gray-200 shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-display font-bold text-gray-900 tracking-tight">QR Webapp</h1>
          
          <nav className="flex items-center space-x-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
              return (
                <Link key={item.href} href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive 
                      ? 'bg-[#BE1111]/10 text-[#BE1111]' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon className={`w-4 h-4 transition-colors ${isActive ? 'text-[#BE1111]' : 'text-gray-400 group-hover:text-gray-600'}`} />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="flex items-center gap-5">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">{user.fullName}</p>
            <p className="text-xs text-[#BE1111] font-medium">{user.role === 'warehouse_staff' ? 'เจ้าหน้าที่คลัง' : user.role}</p>
          </div>
          <div className="h-8 w-px bg-gray-200"></div>
          <button onClick={handleLogout} className="group flex items-center gap-2 px-2 py-2 text-sm font-medium text-gray-600 rounded-xl hover:bg-red-50 hover:text-red-700 transition-colors">
            <LogOut className="w-4 h-4 text-gray-400 group-hover:text-red-500 transition-colors" />
            ออกจากระบบ
          </button>
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
            return (
              <Link key={item.href} href={item.href} className="flex flex-col items-center justify-center w-full h-full space-y-1.5 tap-highlight-transparent">
                <item.icon className={`w-5 h-5 transition-colors duration-200 ${isActive ? 'text-[#BE1111]' : 'text-gray-400'}`} />
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
