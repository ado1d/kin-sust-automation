'use client'

import { useState, useContext, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { Home, ClipboardList, Package, Mail, User, Clock, CheckCircle } from 'lucide-react'
import { SessionContext } from '@/contexts/SessionContext'
import { api } from '@/lib/api'
import { Task, Message, User as UserType } from '@/lib/types'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { StatsCard, DashboardSkeleton, EmptyState } from '@/components/common'
import { TaskCard } from '@/components/dashboard/shared'
import { AvailableTasksView, ContactForm, ProfileSettings } from '@/components/dashboard/shared'

export function VolunteerDashboard({ onLogout, sidebarOpen, setSidebarOpen }: {
  onLogout: () => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}) {
  const { user } = useContext(SessionContext)
  const [activeView, setActiveView] = useState('overview')
  const [tasks, setTasks] = useState<Task[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)

  const navItems = [
    { id: 'overview', label: 'Overview', icon: <Home className="w-4 h-4" /> },
    { id: 'tasks', label: 'My Tasks', icon: <ClipboardList className="w-4 h-4" /> },
    { id: 'available', label: 'Available Tasks', icon: <Package className="w-4 h-4" /> },
    { id: 'messages', label: 'Contact Us', icon: <Mail className="w-4 h-4" /> },
    { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
  ]

  const fetchData = async () => {
    try {
      const [tasksData, messagesData] = await Promise.all([
        api(`/tasks?volunteerId=${user?.id}`),
        api(`/contact?senderId=${user?.id}`)
      ])
      setTasks(tasksData.tasks || [])
      setMessages(messagesData.messages || [])
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (user?.id) {
      const timeoutId = setTimeout(() => fetchData(), 0)
      // Poll for updates every 15 seconds
      const interval = setInterval(fetchData, 15000)
      return () => {
        clearTimeout(timeoutId)
        clearInterval(interval)
      }
    }
  }, [user?.id])

  // Calculate profile completion
  const profileFields = ['name', 'email', 'phone', 'address', 'institution', 'department', 'skills', 'activities']
  const filledFields = profileFields.filter(field => {
    const value = user?.[field as keyof typeof UserType]
    return value && value.toString().length > 0
  }).length
  const profileCompletion = Math.round((filledFields / profileFields.length) * 100)

  const openTasks = tasks.filter(t => t.status === 'Open')
  const assignedTasks = tasks.filter(t => t.status === 'Assigned')
  const completedTasks = tasks.filter(t => t.status === 'Completed' || t.status === 'Verified')

  // Calculate category counts for COMPLETED tasks (collected items)
  const completedTasksWithItems = completedTasks.filter(t => t.donation?.items && t.donation.items.length > 0)
  const collectedCounts = {
    Food: completedTasksWithItems.reduce((sum, t) => sum + (t.donation?.items?.filter(i => i.category === 'food').reduce((s, i) => s + i.quantity, 0) || 0), 0),
    Cloth: completedTasksWithItems.reduce((sum, t) => sum + (t.donation?.items?.filter(i => i.category === 'cloth').reduce((s, i) => s + i.quantity, 0) || 0), 0),
    Medicine: completedTasksWithItems.reduce((sum, t) => sum + (t.donation?.items?.filter(i => i.category === 'med').reduce((s, i) => s + i.quantity, 0) || 0), 0),
    Others: completedTasksWithItems.reduce((sum, t) => sum + (t.donation?.items?.filter(i => i.category === 'others').reduce((s, i) => s + i.quantity, 0) || 0), 0)
  }

  if (loading) {
    return (
      <DashboardLayout 
        onLogout={onLogout} 
        sidebarOpen={sidebarOpen} 
        setSidebarOpen={setSidebarOpen}
        navItems={navItems}
        activeView={activeView}
        setActiveView={setActiveView}
        userRole="volunteer"
      >
        <DashboardSkeleton />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout 
      onLogout={onLogout} 
      sidebarOpen={sidebarOpen} 
      setSidebarOpen={setSidebarOpen}
      navItems={navItems}
      activeView={activeView}
      setActiveView={setActiveView}
      userRole="volunteer"
    >
      {activeView === 'overview' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold">Welcome, {user?.name}!</h2>
            <p className="text-muted-foreground">Here's your volunteer summary</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard title="Assigned Tasks" value={assignedTasks.length.toString()} icon={<ClipboardList className="w-5 h-5" />} />
            <StatsCard title="Completed" value={completedTasks.length.toString()} icon={<CheckCircle className="w-5 h-5" />} color="text-red-500" />
            <StatsCard title="Open Tasks" value={openTasks.length.toString()} icon={<Package className="w-5 h-5" />} color="text-amber-500" />
            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Profile Completion</span>
                <span className="text-sm font-medium">{profileCompletion}%</span>
              </div>
              <Progress value={profileCompletion} className="h-2" />
            </Card>
          </div>

          {/* Items Collected */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Items You've Collected</CardTitle>
              <CardDescription>Item categories from your completed pickups</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {['Food', 'Cloth', 'Medicine', 'Others'].map(cat => (
                  <div key={cat} className="text-center p-4 rounded-lg bg-muted/50">
                    <Package className="w-8 h-8 mx-auto mb-2 text-red-500" />
                    <p className="text-2xl font-bold">{collectedCounts[cat as keyof typeof collectedCounts]}</p>
                    <p className="text-sm text-muted-foreground">{cat}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Task Status Board */}
          <Card>
            <CardHeader>
              <CardTitle>Task Board</CardTitle>
              <CardDescription>Track your assigned pickups</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-amber-600">
                    <Clock className="w-4 h-4" /> Assigned ({assignedTasks.length})
                  </div>
                  <ScrollArea className="h-48 pr-2">
                    {assignedTasks.map(task => (
                      <TaskCard key={task.id} task={task} compact />
                    ))}
                  </ScrollArea>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-red-600">
                    <CheckCircle className="w-4 h-4" /> Completed ({completedTasks.length})
                  </div>
                  <ScrollArea className="h-48 pr-2">
                    {completedTasks.map(task => (
                      <TaskCard key={task.id} task={task} compact />
                    ))}
                  </ScrollArea>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Package className="w-4 h-4" /> Available ({openTasks.length})
                  </div>
                  <ScrollArea className="h-48 pr-2">
                    {openTasks.map(task => (
                      <TaskCard key={task.id} task={task} compact />
                    ))}
                  </ScrollArea>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeView === 'tasks' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">My Assigned Tasks</h2>
          <div className="grid gap-4">
            {assignedTasks.length === 0 ? (
              <EmptyState
                icon={<ClipboardList className="w-10 h-10" />}
                title="No assigned tasks"
                description="Check available tasks to pick up assignments!"
                actionLabel="Browse Tasks"
                onAction={() => setActiveView('available')}
              />
            ) : (
              assignedTasks.map(task => (
                <TaskCard key={task.id} task={task} onUpdate={(updatedTask) => {
                  setTasks(tasks.map(t => t.id === updatedTask.id ? updatedTask : t))
                }} />
              ))
            )}
          </div>
        </div>
      )}

      {activeView === 'available' && (
        <AvailableTasksView onTaskAssigned={(task) => setTasks([...tasks, task])} />
      )}

      {activeView === 'messages' && (
        <ContactForm 
          userId={user?.id || ''} 
          userType="volunteer"
          userName={user?.name || ''}
          userEmail={user?.email || ''}
          messages={messages}
          onMessageSent={fetchData}
        />
      )}

      {activeView === 'profile' && <ProfileSettings isVolunteer />}
    </DashboardLayout>
  )
}
