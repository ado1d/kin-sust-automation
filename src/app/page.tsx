'use client'

import { useState, useEffect } from 'react'
import { ThemeContext } from '@/contexts/ThemeContext'
import { SessionContext } from '@/contexts/SessionContext'
import { api } from '@/lib/api'
import type { User } from '@/lib/types'
import { LandingView } from '@/components/landing'
import { AuthView } from '@/components/auth'
import { DonorDashboard } from '@/components/dashboard/DonorDashboard'
import { VolunteerDashboard } from '@/components/dashboard/VolunteerDashboard'
import { AdminDashboard } from '@/components/dashboard/AdminDashboard'

export default function KINAutomation() {
  const [view, setView] = useState<string>('landing')
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Check session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const data = await api('/auth/session')
        setUser(data.user)
        if (data.user) {
          setView(data.user.role === 'admin' ? 'admin-dashboard' : 
                  data.user.role === 'donor' ? 'donor-dashboard' : 'volunteer-dashboard')
        }
      } catch {
        setUser(null)
      }
      setLoading(false)
    }
    checkSession()
  }, [])

  // Theme effect
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light')

  const handleLogin = (userData: User) => {
    setUser(userData)
    setView(userData.role === 'admin' ? 'admin-dashboard' : 
            userData.role === 'donor' ? 'donor-dashboard' : 'volunteer-dashboard')
  }

  const handleLogout = async () => {
    try {
      await api('/auth/logout', { method: 'POST' })
    } catch (e) {
      console.error(e)
    }
    setUser(null)
    setView('landing')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-rose-50 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-red-500 to-red-600 animate-pulse" />
          <p className="text-muted-foreground">Loading KIN Automation...</p>
        </div>
      </div>
    )
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <SessionContext.Provider value={{ user, setUser, loading }}>
        <div className="min-h-screen bg-background">
          {view === 'landing' && <LandingView onRoleSelect={(role) => setView(`${role}-login`)} />}
          {view === 'donor-login' && <AuthView role="donor" mode="login" onLogin={handleLogin} onSwitch={() => setView('donor-register')} onBack={() => setView('landing')} />}
          {view === 'donor-register' && <AuthView role="donor" mode="register" onLogin={handleLogin} onSwitch={() => setView('donor-login')} onBack={() => setView('landing')} />}
          {view === 'volunteer-login' && <AuthView role="volunteer" mode="login" onLogin={handleLogin} onSwitch={() => setView('volunteer-register')} onBack={() => setView('landing')} />}
          {view === 'volunteer-register' && <AuthView role="volunteer" mode="register" onLogin={handleLogin} onSwitch={() => setView('volunteer-login')} onBack={() => setView('landing')} />}
          {view === 'admin-login' && <AuthView role="admin" mode="login" onLogin={handleLogin} onBack={() => setView('landing')} />}
          {view === 'donor-dashboard' && <DonorDashboard onLogout={handleLogout} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />}
          {view === 'volunteer-dashboard' && <VolunteerDashboard onLogout={handleLogout} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />}
          {view === 'admin-dashboard' && <AdminDashboard onLogout={handleLogout} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />}
        </div>
      </SessionContext.Provider>
    </ThemeContext.Provider>
  )
}

