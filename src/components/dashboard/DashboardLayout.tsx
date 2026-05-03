'use client'

import { useState, useContext, useEffect, useRef, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Menu, X, Moon, Sun, Bell, LogOut } from 'lucide-react'
import { ThemeContext } from '@/contexts/ThemeContext'
import { SessionContext } from '@/contexts/SessionContext'
import type { User, Notification } from '@/lib/types'

export function DashboardLayout({
  children,
  onLogout,
  sidebarOpen,
  setSidebarOpen,
  navItems,
  activeView,
  setActiveView,
  userRole,
  navBadgeCounts
}: {
  children: ReactNode
  onLogout: () => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  navItems: { id: string; label: string; icon: ReactNode }[]
  activeView: string
  setActiveView: (view: string) => void
  userRole: 'donor' | 'volunteer' | 'admin'
  navBadgeCounts?: Record<string, number>
}) {
  const { user } = useContext(SessionContext)
  const { theme, toggleTheme } = useContext(ThemeContext)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  const notificationRef = useRef<HTMLDivElement>(null)

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!user?.id) return
    try {
      const res = await fetch(`/api/notifications?userId=${user.id}&userType=${user.role}`)
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    }
  }

  // Mark all as read
  const markAllAsRead = async () => {
    if (!user?.id) return
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, userType: user.role, markAllRead: true })
      })
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Failed to mark notifications as read:', error)
    }
  }

  // Mark single as read
  const markAsRead = async (notificationId: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId })
      })
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  // Fetch notifications on mount and periodically
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchNotifications()
    }, 0)
    const interval = setInterval(fetchNotifications, 30000) // Poll every 30 seconds
    return () => {
      clearTimeout(timeoutId)
      clearInterval(interval)
    }
  }, [user?.id, user?.role])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const roleColors = {
    donor: 'from-rose-500 to-pink-600',
    volunteer: 'from-amber-500 to-orange-600',
    admin: 'from-violet-500 to-purple-600'
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top navbar */}
      <header className="h-16 border-b bg-card/95 dark:bg-gray-900/95 backdrop-blur-sm sticky top-0 z-40 flex items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden">
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
          <div className="flex items-center gap-3">
            <img
              src="/kin-logo.png"
              alt="KIN Logo"
              className="h-10 w-auto"
            />
            <div className="hidden sm:block">
              <p className="text-xs text-muted-foreground capitalize">{userRole} Portal</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </Button>

          {/* Notification Dropdown */}
          <div className="relative" ref={notificationRef}>
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>

            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-card border rounded-lg shadow-lg z-50">
                <div className="flex items-center justify-between p-3 border-b">
                  <h3 className="font-semibold">Notifications</h3>
                  {unreadCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs">
                      Mark all as read
                    </Button>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      No notifications
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-3 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                          !notification.read ? 'bg-muted/30' : ''
                        }`}
                        onClick={() => markAsRead(notification.id)}
                      >
                        <div className="flex items-start gap-2">
                          <div className={`w-2 h-2 rounded-full mt-2 ${
                            notification.type === 'success' ? 'bg-green-500' :
                            notification.type === 'warning' ? 'bg-yellow-500' :
                            notification.type === 'error' ? 'bg-red-500' :
                            'bg-blue-500'
                          }`} />
                          <div className="flex-1">
                            <p className="font-medium text-sm">{notification.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(notification.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <Separator orientation="vertical" className="h-8 mx-2" />

          <DropdownMenu user={user} onLogout={onLogout} />
        </div>
      </header>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:sticky top-16 left-0 z-30 h-[calc(100vh-4rem)] w-64 bg-card border-r transition-transform duration-300 ease-in-out flex flex-col shadow-lg lg:shadow-none`}>
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {navItems.map(item => (
              <button
                key={item.id}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 min-h-[44px] ${
                  activeView === item.id
                    ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 shadow-sm'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                }`}
                onClick={() => {
                  setActiveView(item.id)
                  if (window.innerWidth < 1024) setSidebarOpen(false)
                }}
              >
                {item.icon}
                <span className="truncate">{item.label}</span>
                {navBadgeCounts && navBadgeCounts[item.id] && navBadgeCounts[item.id] > 0 && (
                  <span className="ml-auto w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center shrink-0">
                    {navBadgeCounts[item.id]}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="p-3 border-t">
            <button
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200 min-h-[44px]"
              onClick={onLogout}
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto min-w-0">
          {children}
        </main>
      </div>

      {/* Footer */}
      <footer className="mt-auto h-12 border-t bg-card dark:bg-gray-900 flex items-center justify-center px-4 text-sm text-muted-foreground">
        &copy; 2026 KIN-SUST, made by  <a href="https://github.com/ado1d"  text-underline="true" bg-red-900="true"> Ayman</a>
      </footer>
    </div>
  )
}

export function DropdownMenu({ user, onLogout }: { user: User | null; onLogout: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <Avatar className="h-8 w-8">
        <AvatarImage src={user?.avatar || user?.photo} />
        <AvatarFallback className="bg-gradient-to-br from-red-600 to-red-700 text-white text-sm">
          {user?.name?.charAt(0) || 'U'}
        </AvatarFallback>
      </Avatar>
      <div className="hidden md:block text-sm">
        <p className="font-medium">{user?.name}</p>
        <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
      </div>
    </div>
  )
}
