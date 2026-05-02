'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  DollarSign, Package, TrendingUp, Download, Loader2, Calendar, Eye, FileText
} from 'lucide-react'
import { api, formatDate, formatCurrency } from '@/lib/api'
import { toast } from '@/hooks/use-toast'
import { EmptyState } from '@/components/common/EmptyState'

export function DistributionHistoryView() {
  const [distributions, setDistributions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<{id: string; name: string}[]>([])
  const [selectedEvent, setSelectedEvent] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [summary, setSummary] = useState({ totalMonetaryDistributed: 0, totalItemsDistributed: 0, totalDistributions: 0 })

  const fetchDistributions = async () => {
    try {
      const params = new URLSearchParams()
      if (selectedEvent !== 'all') params.set('eventId', selectedEvent)
      if (selectedType !== 'all') params.set('type', selectedType)
      params.set('page', page.toString())
      params.set('limit', '20')
      const data = await api(`/distributions?${params.toString()}`)
      setDistributions(data.distributions || [])
      setTotalPages(data.totalPages || 1)
      setEvents(data.events || [])
      setSummary(data.summary || { totalMonetaryDistributed: 0, totalItemsDistributed: 0, totalDistributions: 0 })
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  useEffect(() => {
    const load = async () => { await fetchDistributions() }
    const timeoutId = setTimeout(() => { load() }, 0)
    return () => clearTimeout(timeoutId)
  }, [selectedEvent, selectedType, page])

  const exportCSV = () => {
    if (distributions.length === 0) {
      toast({ title: 'No data', description: 'No distributions to export.', variant: 'destructive' })
      return
    }
    const headers = ['Date', 'Donor', 'Type', 'Beneficiary', 'Item', 'Quantity', 'Amount', 'Event', 'Notes']
    const rows = distributions.map(d => [
      formatDate(d.createdAt),
      d.donation?.donor?.name || 'Anonymous',
      d.donation?.type || '',
      d.beneficiary || '',
      d.itemName || '',
      d.quantity || '',
      d.amount || '',
      d.event?.name || 'No Event',
      d.notes || ''
    ])
    const csvContent = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `distribution-history-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: 'Export complete', description: 'Distribution history CSV downloaded.' })
  }

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Distribution History</h2>
          <p className="text-muted-foreground">All past distributions across donations and events</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} disabled={distributions.length === 0}>
          <Download className="w-4 h-4 mr-2" /> Export CSV
        </Button>
      </div>

      {/* Summary */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-center">
            <DollarSign className="w-8 h-8 mx-auto mb-2 text-red-500" />
            <p className="text-2xl font-bold">{formatCurrency(summary.totalMonetaryDistributed)}</p>
            <p className="text-sm text-muted-foreground">Total Money Distributed</p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <Package className="w-8 h-8 mx-auto mb-2 text-amber-500" />
            <p className="text-2xl font-bold">{summary.totalItemsDistributed}</p>
            <p className="text-sm text-muted-foreground">Total Items Distributed</p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <TrendingUp className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
            <p className="text-2xl font-bold">{summary.totalDistributions}</p>
            <p className="text-sm text-muted-foreground">Total Distribution Records</p>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground mb-1">Filter by Event</Label>
            <Select value={selectedEvent} onValueChange={(v) => { setSelectedEvent(v); setPage(1) }}>
              <SelectTrigger><SelectValue placeholder="All Events" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="none">No Event (General)</SelectItem>
                {events.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground mb-1">Filter by Type</Label>
            <Select value={selectedType} onValueChange={(v) => { setSelectedType(v); setPage(1) }}>
              <SelectTrigger><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="monetary">Monetary</SelectItem>
                <SelectItem value="in-kind">In-Kind</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Distribution List */}
      {distributions.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-10 h-10" />}
          title="No distributions yet"
          description="Distribution history will appear here once you start distributing"
        />
      ) : (
        <>
          <div className="space-y-3">
            {distributions.map((dist) => (
              <Card key={dist.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="capitalize text-xs">
                          {dist.donation?.type === 'monetary' ? '💰 Monetary' : '📦 In-Kind'}
                        </Badge>
                        {dist.event && (
                          <Badge variant="outline" className="text-xs">
                            <Calendar className="w-3 h-3 mr-1" /> {dist.event.name}
                          </Badge>
                        )}
                        {!dist.event && (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            General
                          </Badge>
                        )}
                      </div>
                      <p className="font-medium text-sm">
                        {dist.donation?.donor?.name || 'Anonymous'}
                        {dist.beneficiary && (
                          <span className="text-muted-foreground"> → {dist.beneficiary}</span>
                        )}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-sm">
                        {dist.donation?.type === 'monetary' ? (
                          <span className="font-semibold text-emerald-600">{formatCurrency(dist.amount ?? 0)}</span>
                        ) : (
                          <span className="font-semibold text-amber-600">{dist.itemName} × {dist.quantity}</span>
                        )}
                        {dist.notes && <span className="text-muted-foreground text-xs">• {dist.notes}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">{formatDate(dist.createdAt)}</p>
                      {dist.proofPath && (
                        <Badge variant="secondary" className="text-xs mt-1">
                          <Eye className="w-3 h-3 mr-1" /> Has Proof
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
