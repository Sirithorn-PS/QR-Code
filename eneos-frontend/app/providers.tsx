'use client'

import React, { createContext, useContext, useState } from 'react'
import { getUser, logout } from '@/lib/auth'

interface User {
  id: number
  username: string
  fullName: string
  role: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  logout: () => void
  setUser: (user: User | null) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  React.useEffect(() => {
    setUser(getUser())
    setIsLoading(false)
  }, [])

  const handleLogout = () => {
    logout()
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        logout: handleLogout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
