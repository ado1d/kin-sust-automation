'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Plus, Edit, Trash2, AlertCircle, Calendar, MapPin } from 'lucide-react'
import { api, formatDate, formatCurrency } from '@/lib/api'
import { toast } from '@/hooks/use-toast'
import { Donation, Event } from '@/lib/types'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EventModal } from '@/components/dashboard/shared/EventModal'

export function ManageEvents({ events, onRefresh }: { events: Event[]; onRefresh: () => void }) {
  const [showModal, setShowModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [eventStats, setEventStats] = useState<Record<string, { donationCount: number; totalAmount: number }>>({})

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return
    try {
      await api(`/events?id=${id}`, { method: 'DELETE' })
      toast({ title: 'Event deleted' })
      onRefresh()
    } catch (e) {
      toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' })
    }
  }

  const handleCloseEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to close this event? No more donations will be accepted.')) return
    try {
      await api('/events', {
        method: 'PUT',
        body: JSON.stringify({ id: eventId, status: 'Closed' })
      })
      toast({ title: 'Event closed', description: 'The event has been closed.' })
      onRefresh()
    } catch (e) {
      toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' })
    }
  }

  // Fetch event stats
  useEffect(() => {
    const fetchStats = async () => {
      const statsMap: Record<string, { donationCount: number; totalAmount: number }> = {}
      for (const event of events) {
        try {
          const data = await api(`/donations?eventId=${event.id}`)
          const eventDonations = data.donations || []
          statsMap[event.id] = {
            donationCount: eventDonations.length,
            totalAmount: eventDonations.reduce((sum: number, d: Donation) => sum + (d.amount || 0), 0)
          }
        } catch {
          statsMap[event.id] = { donationCount: 0, totalAmount: 0 }
        }
      }
      setEventStats(statsMap)
    }
    if (events.length > 0) {
      fetchStats()
    }
  }, [events.length])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Manage Events</h2>
        <Button onClick={() => { setEditingEvent(null); setShowModal(true); }} className="bg-gradient-to-r from-red-600 to-red-700">
          <Plus className="w-4 h-4 mr-2" /> New Event
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {events.map(event => {
          const stats = eventStats[event.id]
          return (
            <Card key={event.id} className="overflow-hidden">
              {/* Event Image */}
              {event.image ? (
                <div className="h-32 overflow-hidden">
                  <img src={event.image} alt={event.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="h-32 bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                  <Calendar className="w-12 h-12 text-white/70" />
                </div>
              )}
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{event.name}</CardTitle>
                  <StatusBadge status={event.status} />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{event.description}</p>
                <div className="text-sm text-muted-foreground mb-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {formatDate(event.startDate)}
                    {event.endDate && ` - ${formatDate(event.endDate)}`}
                  </div>
                  {event.location && (
                    <div className="flex items-center gap-2 mt-1">
                      <MapPin className="w-4 h-4" />
                      {event.location}
                    </div>
                  )}
                </div>

                {/* Event Donation Stats */}
                {stats && (
                  <div className="bg-muted/50 rounded-lg p-2 mb-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Donations: <strong>{stats.donationCount}</strong></span>
                      <span className="text-muted-foreground">Amount: <strong className="text-red-600">{formatCurrency(stats.totalAmount)}</strong></span>
                    </div>
                    {event.needs && (
                      <div className="mt-1">
                        <Progress value={Math.min((stats.totalAmount / 100000) * 100, 100)} className="h-1.5" />
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">Needs: {event.needs}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setEditingEvent(event); setShowModal(true); }}>
                    <Edit className="w-4 h-4 mr-1" /> Edit
                  </Button>
                  {event.status === 'Published' && (
                    <Button variant="outline" size="sm" className="text-amber-600" onClick={() => handleCloseEvent(event.id)}>
                      <AlertCircle className="w-4 h-4 mr-1" /> Close
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(event.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <EventModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditingEvent(null); }}
        event={editingEvent}
        onSuccess={() => { setShowModal(false); onRefresh(); }}
      />
    </div>
  )
}
