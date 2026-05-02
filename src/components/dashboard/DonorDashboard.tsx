'use client'

import { useState, useContext, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Home, Gift, DollarSign, Package, Calendar, Mail, User, Plus, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { SessionContext } from '@/contexts/SessionContext'
import { api, formatCurrency } from '@/lib/api'
import { Donation, Event, Message } from '@/lib/types'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { StatsCard, DashboardSkeleton, EmptyState } from '@/components/common'
import { DonationCard, EventCard } from '@/components/dashboard/shared'
import { MonetaryDonationForm, InKindDonationForm, DonationModal, ContactForm, ProfileSettings } from '@/components/dashboard/shared'

export function DonorDashboard({ onLogout, sidebarOpen, setSidebarOpen }: {
  onLogout: () => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}) {
  const { user } = useContext(SessionContext)
  const [activeView, setActiveView] = useState('overview')
  const [donations, setDonations] = useState<Donation[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [showDonationModal, setShowDonationModal] = useState(false)

  const navItems = [
    { id: 'overview', label: 'Overview', icon: <Home className="w-4 h-4" /> },
    { id: 'donations', label: 'My Donations', icon: <Gift className="w-4 h-4" /> },
    { id: 'monetary', label: 'Monetary Donation', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'inkind', label: 'In-Kind Donation', icon: <Package className="w-4 h-4" /> },
    { id: 'events', label: 'Events', icon: <Calendar className="w-4 h-4" /> },
    { id: 'messages', label: 'Contact Us', icon: <Mail className="w-4 h-4" /> },
    { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
  ]

  const fetchData = async () => {
    try {
      const [donationsData, eventsData, messagesData] = await Promise.all([
        api(`/donations?donorId=${user?.id}`),
        api('/events?status=Published'),
        api(`/contact?senderId=${user?.id}`)
      ])
      setDonations(donationsData.donations || [])
      setEvents(eventsData.events || [])
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

  const stats = {
    total: donations.length,
    pending: donations.filter(d => d.status === 'Pending').length,
    verified: donations.filter(d => d.status === 'Verified').length,
    rejected: donations.filter(d => d.status === 'Rejected').length,
    totalAmount: donations.filter(d => d.amount && d.status === 'Verified').reduce((sum, d) => sum + (d.amount || 0), 0),
    totalInKindItems: donations.filter(d => d.type === 'in-kind').reduce((sum, d) => sum + (d.items?.reduce((s, i) => s + i.quantity, 0) || 0), 0)
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
        userRole="donor"
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
      userRole="donor"
    >
      {activeView === 'overview' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">Welcome back, {user?.name}!</h2>
              <p className="text-muted-foreground">Here's your donation summary</p>
            </div>
            <Button onClick={() => setShowDonationModal(true)} className="bg-gradient-to-r from-red-600 to-red-700">
              <Plus className="w-4 h-4 mr-2" /> Make a Donation
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard title="Total Donations" value={stats.total.toString()} icon={<Gift className="w-5 h-5" />} trend="+12%" />
            <StatsCard title="Pending" value={stats.pending.toString()} icon={<Clock className="w-5 h-5" />} color="text-amber-500" />
            <StatsCard title="Verified" value={stats.verified.toString()} icon={<CheckCircle className="w-5 h-5" />} color="text-red-500" />
            <StatsCard title="Rejected" value={stats.rejected.toString()} icon={<AlertCircle className="w-5 h-5" />} color="text-red-500" />
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard title="Total Amount (Verified)" value={formatCurrency(stats.totalAmount)} icon={<DollarSign className="w-5 h-5" />} color="text-red-600" />
            <StatsCard title="Total In-Kind Items" value={stats.totalInKindItems.toString()} icon={<Package className="w-5 h-5" />} color="text-violet-500" />
          </div>

          {/* Recent Donations */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Donations</CardTitle>
              <CardDescription>Your latest contribution activities</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-80">
                {donations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="mx-auto w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                      <Gift className="w-8 h-8 text-muted-foreground/40" />
                    </div>
                    <p className="font-medium mb-1">No donations yet</p>
                    <p className="text-sm">Start making a difference!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {donations.slice(0, 5).map(donation => (
                      <DonationCard key={donation.id} donation={donation} />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}

      {activeView === 'donations' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">My Donations</h2>
            <Button onClick={() => setShowDonationModal(true)} className="bg-gradient-to-r from-red-600 to-red-700">
              <Plus className="w-4 h-4 mr-2" /> New Donation
            </Button>
          </div>

          <div className="grid gap-4">
            {donations.length === 0 ? (
              <EmptyState
                icon={<Gift className="w-10 h-10" />}
                title="No donations yet"
                description="Start making a difference today by making your first donation!"
                actionLabel="Make Your First Donation"
                onAction={() => setShowDonationModal(true)}
              />
            ) : (
              donations.map(donation => (
                <DonationCard key={donation.id} donation={donation} detailed />
              ))
            )}
          </div>
        </div>
      )}

      {activeView === 'events' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Active Events</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map(event => (
              <EventCard key={event.id} event={event} onDonate={() => setShowDonationModal(true)} />
            ))}
          </div>
        </div>
      )}

      {activeView === 'monetary' && (
        <MonetaryDonationForm 
          events={events} 
          onSuccess={() => {
            api(`/donations?donorId=${user?.id}`).then(data => setDonations(data.donations || []))
          }} 
        />
      )}

      {activeView === 'inkind' && (
        <InKindDonationForm 
          events={events} 
          onSuccess={() => {
            api(`/donations?donorId=${user?.id}`).then(data => setDonations(data.donations || []))
          }} 
        />
      )}

      {activeView === 'messages' && (
        <ContactForm 
          userId={user?.id || ''} 
          userType="donor"
          userName={user?.name || ''}
          userEmail={user?.email || ''}
          messages={messages}
          onMessageSent={fetchData}
        />
      )}

      {activeView === 'profile' && <ProfileSettings />}

      <DonationModal 
        open={showDonationModal} 
        onClose={() => setShowDonationModal(false)} 
        onNavigateMonetary={() => setActiveView('monetary')}
        onNavigateInKind={() => setActiveView('inkind')}
      />
    </DashboardLayout>
  )
}
