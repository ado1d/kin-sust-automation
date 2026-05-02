'use client'

import { useState, useEffect } from 'react'
import { ThemeContext } from '@/contexts/ThemeContext'
import { SessionContext } from '@/contexts/SessionContext'
import { api } from '@/lib/api'
import type { User } from '@/lib/types'
import { AuthView } from '@/components/auth'
import { AdminDashboard } from '@/components/dashboard/AdminDashboard'

export default function AdminPage() {
  // Track which view to render. Start on the admin login screen by default.
  const [view, setView] = useState<string>('admin-login')
  // Store the currently authenticated user, if any.
  const [user, setUser] = useState<User | null>(null)
  // Flag indicating whether we are still checking the session.
  const [loading, setLoading] = useState(true)
  // Persist and toggle light/dark mode.
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  // Control sidebar state for the dashboard.
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // On mount, attempt to resume any existing session. If the user is
  // authenticated as an admin then immediately show the dashboard.
  useEffect(() => {
    const checkSession = async () => {
      try {
        const data = await api('/auth/session')
        setUser(data.user)
        if (data.user) {
          setView('admin-dashboard')
        }
      } catch {
        setUser(null)
      }
      setLoading(false)
    }
    checkSession()
  }, [])

  // Apply the current theme to the document root.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  // Helper to toggle between light and dark mode.
  const toggleTheme = () => setTheme(t => (t === 'light' ? 'dark' : 'light'))

  // When the user logs in successfully, update user state and show dashboard.
  const handleLogin = (userData: User) => {
    setUser(userData)
    setView('admin-dashboard')
  }

  // When the user logs out, clear user state and return to login view.
  const handleLogout = async () => {
    try {
      await api('/auth/logout', { method: 'POST' })
    } catch (e) {
      console.error(e)
    }
    setUser(null)
    setView('admin-login')
  }

  // While the session check runs, display a simple loading screen. We reuse
  // the same styling from the root page for consistency.
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
          {/* Render either the admin login view or the admin dashboard depending on state */}
          {view === 'admin-login' && (
            <AuthView
              role="admin"
              mode="login"
              onLogin={handleLogin}
              onBack={() => setView('admin-login')}
            />
          )}
          {view === 'admin-dashboard' && (
            <AdminDashboard
              onLogout={handleLogout}
              sidebarOpen={sidebarOpen}
              setSidebarOpen={setSidebarOpen}
            />
          )}
        </div>
      </SessionContext.Provider>
    </ThemeContext.Provider>
  )
}