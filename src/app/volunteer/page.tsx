'use client'

import { useState, useEffect } from 'react'
import { ThemeContext } from '@/contexts/ThemeContext'
import { SessionContext } from '@/contexts/SessionContext'
import { api } from '@/lib/api'
import type { User } from '@/lib/types'
import { AuthView } from '@/components/auth'
import { VolunteerDashboard } from '@/components/dashboard/VolunteerDashboard'

export default function VolunteerPage() {
  // Track which view should currently be rendered. Start on the volunteer login view.
  const [view, setView] = useState<string>('volunteer-login')
  // Store the currently authenticated user, if any.
  const [user, setUser] = useState<User | null>(null)
  // Flag indicating whether we are still checking the session.
  const [loading, setLoading] = useState(true)
  // Persist and toggle light/dark mode.
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  // Control sidebar state for the volunteer dashboard.
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // On mount, check for an existing session. If a volunteer is already
  // authenticated then immediately show the dashboard.
  useEffect(() => {
    const checkSession = async () => {
      try {
        const data = await api('/auth/session')
        setUser(data.user)
        if (data.user) {
          setView('volunteer-dashboard')
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

  // When a volunteer logs in successfully, update user state and show the dashboard.
  const handleLogin = (userData: User) => {
    setUser(userData)
    setView('volunteer-dashboard')
  }

  // When the volunteer logs out, clear user state and return to login view.
  const handleLogout = async () => {
    try {
      await api('/auth/logout', { method: 'POST' })
    } catch (e) {
      console.error(e)
    }
    setUser(null)
    setView('volunteer-login')
  }

  // While checking the session, display a loading screen matching the root page.
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
          {/* Render the appropriate volunteer view based on current state */}
          {view === 'volunteer-login' && (
            <AuthView
              role="volunteer"
              mode="login"
              onLogin={handleLogin}
              onSwitch={() => setView('volunteer-register')}
              onBack={() => setView('volunteer-login')}
            />
          )}
          {view === 'volunteer-register' && (
            <AuthView
              role="volunteer"
              mode="register"
              onLogin={handleLogin}
              onSwitch={() => setView('volunteer-login')}
              onBack={() => setView('volunteer-login')}
            />
          )}
          {view === 'volunteer-dashboard' && (
            <VolunteerDashboard
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