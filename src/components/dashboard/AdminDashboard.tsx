'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Home, BarChart3, CheckCircle, FileText, Heart, Users, Calendar, Gift, DollarSign, ClipboardList, Mail, Clock, Package, AlertCircle, Download } from 'lucide-react'
import { api, formatCurrency, formatDate } from '@/lib/api'
import { toast } from '@/hooks/use-toast'
import { Donation, Task, Event, Donor, Volunteer, Message } from '@/lib/types'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { StatsCard, DashboardSkeleton, StatusBadge } from '@/components/common'
import { ReportsView, VerifiedDonationsView, DistributionHistoryView, ManageDonors, ManageVolunteers, ManageEvents, ManageDonations, ManagePayments, ManageTasks, ManageMessages } from '@/components/dashboard/shared'

export function AdminDashboard({ onLogout, sidebarOpen, setSidebarOpen }: {
  onLogout: () => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}) {
  const [activeView, setActiveView] = useState('overview')
  const [dashboardData, setDashboardData] = useState<{
    counts: Record<string, number>
    charts: {
      donationsByType: { type: string; count: number }[]
      itemsByCategory: { category: string; quantity: number }[]
      monthlyDonations: { month: string; count: number; amount: number }[]
      taskStatusDistribution: { status: string; count: number }[]
      donationStatusDistribution: { status: string; count: number }[]
    }
    recent: {
      donations: Donation[]
      tasks: Task[]
    }
  } | null>(null)
  const [donors, setDonors] = useState<Donor[]>([])
  const [volunteers, setVolunteers] = useState<Volunteer[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [donations, setDonations] = useState<Donation[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)

  const navItems = [
    { id: 'overview', label: 'Overview', icon: <Home className="w-4 h-4" /> },
    { id: 'reports', label: 'Reports', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'verified', label: 'Verified Donations', icon: <CheckCircle className="w-4 h-4" /> },
    { id: 'distribution-history', label: 'Distribution History', icon: <FileText className="w-4 h-4" /> },
    { id: 'donors', label: 'Donors', icon: <Heart className="w-4 h-4" /> },
    { id: 'volunteers', label: 'Volunteers', icon: <Users className="w-4 h-4" /> },
    { id: 'events', label: 'Events', icon: <Calendar className="w-4 h-4" /> },
    { id: 'donations', label: 'Donations', icon: <Gift className="w-4 h-4" /> },
    { id: 'payments', label: 'Payments', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'tasks', label: 'Tasks', icon: <ClipboardList className="w-4 h-4" /> },
    { id: 'messages', label: 'Messages', icon: <Mail className="w-4 h-4" /> },
  ]

  const fetchData = async () => {
    try {
      const [dashData, donorsData, volunteersData, eventsData, donationsData, tasksData, messagesData] = await Promise.all([
        api('/dashboard'),
        api('/donors'),
        api('/volunteers'),
        api('/events'),
        api('/donations'),
        api('/tasks'),
        api('/contact')
      ])
      setDashboardData(dashData)
      setDonors(donorsData.donors || [])
      setVolunteers(volunteersData.volunteers || [])
      setEvents(eventsData.events || [])
      setDonations(donationsData.donations || [])
      setTasks(tasksData.tasks || [])
      setMessages(messagesData.messages || [])
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => fetchData(), 0)
    // Poll for updates every 15 seconds
    const interval = setInterval(fetchData, 15000)
    return () => {
      clearTimeout(timeoutId)
      clearInterval(interval)
    }
  }, [])

  if (loading) {
    return (
      <DashboardLayout 
        onLogout={onLogout} 
        sidebarOpen={sidebarOpen} 
        setSidebarOpen={setSidebarOpen}
        navItems={navItems}
        activeView={activeView}
        setActiveView={setActiveView}
        userRole="admin"
        navBadgeCounts={{ messages: messages.filter(m => m.status === 'unread').length }}
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
      userRole="admin"
      navBadgeCounts={{ messages: messages.filter(m => m.status === 'unread').length }}
    >
      {activeView === 'overview' && dashboardData && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">Admin Dashboard</h2>
              <p className="text-muted-foreground">Overview of all activities</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={() => setActiveView('reports')} variant="outline" size="sm">
                <BarChart3 className="w-4 h-4 mr-2" /> View Reports
              </Button>
              <Button onClick={() => setActiveView('verified')} variant="outline" size="sm">
                <CheckCircle className="w-4 h-4 mr-2" /> Verified Donations
              </Button>
              <Button onClick={async () => {
                try {
                  const response = await fetch('/api/admin/audit?format=csv')
                  const blob = await response.blob()
                  const url = window.URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = 'audit-report.csv'
                  a.click()
                  window.URL.revokeObjectURL(url)
                  toast({ title: 'Download started', description: 'Audit CSV is being downloaded' })
                } catch (e) {
                  toast({ title: 'Error', description: 'Failed to download audit report', variant: 'destructive' })
                }
              }} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" /> Download Audit CSV
              </Button>
            </div>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Button variant="outline" className="h-auto py-3 flex flex-col items-center gap-2 hover:bg-amber-50 dark:hover:bg-amber-950/20" onClick={() => setActiveView('donations')}>
                  <Clock className="w-5 h-5 text-amber-500" />
                  <span className="text-xs">Verify Pending</span>
                  <span className="text-xs text-muted-foreground">Donations ({dashboardData.counts.pendingDonations})</span>
                </Button>
                <Button variant="outline" className="h-auto py-3 flex flex-col items-center gap-2 hover:bg-amber-50 dark:hover:bg-amber-950/20" onClick={() => setActiveView('volunteers')}>
                  <Users className="w-5 h-5 text-amber-500" />
                  <span className="text-xs">Approve</span>
                  <span className="text-xs text-muted-foreground">Volunteers ({dashboardData.counts.pendingVolunteers})</span>
                </Button>
                <Button variant="outline" className="h-auto py-3 flex flex-col items-center gap-2 hover:bg-red-50 dark:hover:bg-red-950/20" onClick={() => setActiveView('reports')}>
                  <BarChart3 className="w-5 h-5 text-red-500" />
                  <span className="text-xs">View</span>
                  <span className="text-xs text-muted-foreground">Reports</span>
                </Button>
                <Button variant="outline" className="h-auto py-3 flex flex-col items-center gap-2 hover:bg-red-50 dark:hover:bg-red-950/20" onClick={() => setActiveView('payments')}>
                  <DollarSign className="w-5 h-5 text-red-500" />
                  <span className="text-xs">Manage</span>
                  <span className="text-xs text-muted-foreground">Payments</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Pending Approvals Card */}
          {(dashboardData.counts.pendingDonations > 0 || dashboardData.counts.pendingVolunteers > 0) && (
            <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/10 dark:border-amber-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  Pending Approvals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  {dashboardData.counts.pendingDonations > 0 && (
                    <div className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-lg px-4 py-3 border border-amber-200 dark:border-amber-800">
                      <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                        <Gift className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-amber-700 dark:text-amber-300">{dashboardData.counts.pendingDonations}</p>
                        <p className="text-xs text-muted-foreground">Pending Donations</p>
                      </div>
                      <Button size="sm" variant="outline" className="ml-2" onClick={() => setActiveView('donations')}>Review</Button>
                    </div>
                  )}
                  {dashboardData.counts.pendingVolunteers > 0 && (
                    <div className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-lg px-4 py-3 border border-amber-200 dark:border-amber-800">
                      <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                        <Users className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-amber-700 dark:text-amber-300">{dashboardData.counts.pendingVolunteers}</p>
                        <p className="text-xs text-muted-foreground">Pending Volunteers</p>
                      </div>
                      <Button size="sm" variant="outline" className="ml-2" onClick={() => setActiveView('volunteers')}>Review</Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats Overview */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard title="Total Donors" value={dashboardData.counts.donors.toString()} icon={<Heart className="w-5 h-5" />} />
            <StatsCard title="Active Volunteers" value={dashboardData.counts.activeVolunteers.toString()} icon={<Users className="w-5 h-5" />} />
            <StatsCard title="Total Donations" value={dashboardData.counts.donations.toString()} icon={<Gift className="w-5 h-5" />} />
            <StatsCard title="Total Amount" value={formatCurrency(dashboardData.counts.totalMonetary)} icon={<DollarSign className="w-5 h-5" />} color="text-red-600" />
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard title="Pending Donations" value={dashboardData.counts.pendingDonations.toString()} icon={<Clock className="w-5 h-5" />} color="text-amber-500" />
            <StatsCard title="Verified Donations" value={dashboardData.counts.verifiedDonations.toString()} icon={<CheckCircle className="w-5 h-5" />} color="text-red-500" />
            <StatsCard title="Open Tasks" value={dashboardData.counts.openTasks.toString()} icon={<Package className="w-5 h-5" />} />
            <StatsCard title="Pending Volunteers" value={dashboardData.counts.pendingVolunteers.toString()} icon={<Users className="w-5 h-5" />} color="text-amber-500" />
          </div>

          {/* Donation Trends Mini Chart + Stats Charts */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Monthly Donation Trend (CSS bars) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Donation Trend</CardTitle>
                <CardDescription>Monthly donation volume</CardDescription>
              </CardHeader>
              <CardContent>
                {dashboardData.charts.monthlyDonations.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No monthly data available</p>
                ) : (
                  <div className="flex items-end justify-around h-40 gap-1">
                    {dashboardData.charts.monthlyDonations.slice(-6).map((item, i) => {
                      const maxCount = Math.max(...dashboardData.charts.monthlyDonations.slice(-6).map(m => m.count), 1)
                      const heightPercent = (item.count / maxCount) * 100
                      return (
                        <div key={i} className="flex flex-col items-center gap-1 flex-1">
                          <span className="text-xs font-medium text-red-600">{item.count}</span>
                          <div className="w-full max-w-[40px] relative" style={{ height: '100px' }}>
                            <div
                              className="absolute bottom-0 w-full rounded-t-md bg-gradient-to-t from-red-500 to-red-400 transition-all duration-500"
                              style={{ height: `${Math.max(heightPercent, 4)}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground truncate max-w-[50px]">{item.month}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Donations by Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-around h-40">
                  {dashboardData.charts.donationsByType.map((item, i) => (
                    <div key={i} className="text-center">
                      <div className="text-3xl font-bold text-red-600">{item.count}</div>
                      <div className="text-sm text-muted-foreground capitalize">{item.type}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Task Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {dashboardData.charts.taskStatusDistribution.map((item, i) => (
                    <StatusBadge key={i} status={item.status} />
                  ))}
                  <span className="text-sm text-muted-foreground ml-1">
                    {dashboardData.charts.taskStatusDistribution.map(item => `${item.status}: ${item.count}`).join(' • ')}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Donation Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {dashboardData.charts.donationStatusDistribution.map((item, i) => (
                    <StatusBadge key={i} status={item.status} />
                  ))}
                  <span className="text-sm text-muted-foreground ml-1">
                    {dashboardData.charts.donationStatusDistribution.map(item => `${item.status}: ${item.count}`).join(' • ')}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-72">
                <div className="relative pl-6">
                  {/* Timeline line */}
                  <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-border" />
                  
                  {/* Combine donations and tasks, sort by date */}
                  {[
                    ...dashboardData.recent.donations.map(d => ({
                      type: 'donation' as const,
                      date: d.createdAt,
                      title: d.type === 'monetary' ? `${formatCurrency(d.amount || 0)} donation` : 'In-kind donation',
                      subtitle: `by ${d.donor?.name || 'Anonymous'}`,
                      status: d.status
                    })),
                    ...dashboardData.recent.tasks.map(t => ({
                      type: 'task' as const,
                      date: t.createdAt || t.pickupTime || '',
                      title: `Pickup task ${t.status === 'Completed' ? 'completed' : t.status === 'Assigned' ? 'assigned' : 'created'}`,
                      subtitle: `${t.volunteer?.name || 'Unassigned'} • ${t.donation?.donor?.name || 'Unknown'}`,
                      status: t.status
                    }))
                  ]
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .slice(0, 10)
                  .map((item, i) => (
                    <div key={i} className="relative mb-4 last:mb-0">
                      {/* Timeline dot */}
                      <div className={`absolute -left-4 top-1.5 w-3 h-3 rounded-full border-2 ${
                        item.type === 'donation'
                          ? 'bg-red-600 border-red-300'
                          : 'bg-sky-500 border-sky-300'
                      }`} />
                      <div className="ml-2">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{item.title}</p>
                          <StatusBadge status={item.status} />
                        </div>
                        <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{formatDate(item.date)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}

      {activeView === 'reports' && <ReportsView />}
      
      {activeView === 'verified' && <VerifiedDonationsView />}
      {activeView === 'distribution-history' && <DistributionHistoryView />}

      {activeView === 'donors' && (
        <ManageDonors donors={donors} onRefresh={() => api('/donors').then(data => setDonors(data.donors || []))} />
      )}

      {activeView === 'volunteers' && (
        <ManageVolunteers volunteers={volunteers} onRefresh={() => api('/volunteers').then(data => setVolunteers(data.volunteers || []))} />
      )}

      {activeView === 'events' && (
        <ManageEvents events={events} onRefresh={() => api('/events').then(data => setEvents(data.events || []))} />
      )}

      {activeView === 'donations' && (
        <ManageDonations donations={donations} onRefresh={() => api('/donations').then(data => setDonations(data.donations || []))} />
      )}

      {activeView === 'payments' && (
        <ManagePayments />
      )}

      {activeView === 'tasks' && (
        <ManageTasks tasks={tasks} volunteers={volunteers} onRefresh={() => api('/tasks').then(data => setTasks(data.tasks || []))} />
      )}

      {activeView === 'messages' && (
        <ManageMessages messages={messages} onRefresh={fetchData} />
      )}
    </DashboardLayout>
  )
}
