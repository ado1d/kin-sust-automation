'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DollarSign, Package, Gift, TrendingUp, Download, Truck, Eye, ChevronRight,
  CheckCircle, Filter, Calendar, Loader2
} from 'lucide-react'
import { api, formatDate, formatCurrency } from '@/lib/api'
import { toast } from '@/hooks/use-toast'
import { Donation, Event } from '@/lib/types'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { DistributionModal } from '@/components/dashboard/shared/DistributionModal'
import { BulkDistributionModal } from '@/components/dashboard/shared/BulkDistributionModal'

export function VerifiedDonationsView() {
  const [donations, setDonations] = useState<Donation[]>([])
  const [activeDonationIds, setActiveDonationIds] = useState<string[]>([])
  const [summary, setSummary] = useState<{
    totalMonetaryDonated: number
    totalMonetaryDistributed: number
    totalMonetaryRemaining: number
    totalInKindItems: number
    totalInKindRemaining: number
    totalDonations: number
    activeDonationsCount: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [distributingDonation, setDistributingDonation] = useState<Donation | null>(null)
  const [expandedDonation, setExpandedDonation] = useState<string | null>(null)
  const [proofImage, setProofImage] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('active')
  const [eventFilter, setEventFilter] = useState<string>('all')
  const [events, setEvents] = useState<Event[]>([])
  const [bulkModalOpen, setBulkModalOpen] = useState(false)

  const fetchVerifiedDonations = async () => {
    try {
      const data = await api('/donations/verified')
      setDonations(data.donations || [])
      setActiveDonationIds(data.activeDonations || [])
      setSummary(data.summary || null)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const fetchEvents = async () => {
    try {
      const data = await api('/events')
      setEvents(data.events || data || [])
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchVerifiedDonations()
      fetchEvents()
    }, 0)
    return () => clearTimeout(timeoutId)
  }, [])

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>
  }

  // Use summary from API for accurate totals
  const totalMonetaryDonated = summary?.totalMonetaryDonated ?? 0
  const totalMonetaryDistributed = summary?.totalMonetaryDistributed ?? 0
  const totalMonetaryRemaining = summary?.totalMonetaryRemaining ?? 0
  const totalInKindItems = summary?.totalInKindItems ?? 0
  const totalInKindRemaining = summary?.totalInKindRemaining ?? 0
  const distributionPercent = totalMonetaryDonated > 0 ? (totalMonetaryDistributed / totalMonetaryDonated) * 100 : 0

  // Filter donations based on tab and event
  const filteredDonations = donations.filter(d => {
    // Tab filter
    if (activeTab === 'active' && !activeDonationIds.includes(d.id)) return false
    // Event filter
    if (eventFilter !== 'all') {
      if (eventFilter === 'none') {
        if (d.event) return false
      } else {
        // Match by event name since the donation event only has { name }
        if (!d.event || d.event.name !== events.find(e => e.id === eventFilter)?.name) return false
      }
    }
    return true
  })

  // CSV Export for distributions
  const exportDistributionsCSV = () => {
    const allDistributions = donations.flatMap(d =>
      (d.distributions || []).map(dist => ({
        donationId: d.id,
        donorName: d.donor?.name || 'Anonymous',
        donationType: d.type,
        beneficiary: dist.beneficiary || '',
        eventName: d.event?.name || '',
        itemName: dist.itemName || '',
        quantity: dist.quantity || '',
        amount: dist.amount || '',
        notes: dist.notes || '',
        date: formatDate(dist.createdAt),
        hasProof: dist.proofPath ? 'Yes' : 'No'
      }))
    )
    if (allDistributions.length === 0) {
      toast({ title: 'No distributions', description: 'There are no distributions to export.', variant: 'destructive' })
      return
    }
    const headers = ['Donation ID', 'Donor', 'Type', 'Event', 'Beneficiary', 'Item', 'Quantity', 'Amount', 'Notes', 'Date', 'Has Proof']
    const rows = allDistributions.map(d => [d.donationId, d.donorName, d.donationType, d.eventName, d.beneficiary, d.itemName, d.quantity, d.amount, d.notes, d.date, d.hasProof])
    const csvContent = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `distributions-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: 'Export complete', description: 'Distributions CSV downloaded.' })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Verified Donations</h2>
          <p className="text-muted-foreground">Donations ready for distribution</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {donations.length > 0 && (
            <Button variant="outline" size="sm" onClick={exportDistributionsCSV}>
              <Download className="w-4 h-4 mr-2" /> Export CSV
            </Button>
          )}
          <Button
            size="sm"
            className="bg-gradient-to-r from-red-600 to-red-700"
            onClick={() => setBulkModalOpen(true)}
            disabled={activeDonationIds.length === 0}
          >
            <Truck className="w-4 h-4 mr-2" /> Bulk Distribute
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      {donations.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="text-center">
                <DollarSign className="w-7 h-7 mx-auto mb-2 text-red-500" />
                <p className="text-xl sm:text-2xl font-bold">{formatCurrency(totalMonetaryDonated)}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Total Donated</p>
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-center">
                <TrendingUp className="w-7 h-7 mx-auto mb-2 text-amber-500" />
                <p className="text-xl sm:text-2xl font-bold">{formatCurrency(totalMonetaryDistributed)}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Distributed</p>
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-center">
                <Package className="w-7 h-7 mx-auto mb-2 text-red-400" />
                <p className="text-xl sm:text-2xl font-bold">{formatCurrency(totalMonetaryRemaining)}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Remaining</p>
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-center">
                <Gift className="w-7 h-7 mx-auto mb-2 text-emerald-500" />
                <p className="text-xl sm:text-2xl font-bold">{totalInKindItems}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">In-Kind Items ({totalInKindRemaining} left)</p>
              </div>
            </Card>
          </div>

          {/* Overall Distribution Progress */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Monetary Distribution Progress</p>
              <p className="text-sm text-muted-foreground">{distributionPercent.toFixed(1)}% distributed</p>
            </div>
            <Progress value={distributionPercent} className="h-3" />
            <div className="flex justify-between mt-1 text-xs text-muted-foreground">
              <span>{formatCurrency(totalMonetaryDistributed)} distributed</span>
              <span>{formatCurrency(totalMonetaryRemaining)} remaining</span>
            </div>
          </Card>
        </>
      )}

      {/* Tabs + Event Filter */}
      {donations.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
            <TabsList>
              <TabsTrigger value="active">
                Active Donations
                <Badge variant="secondary" className="ml-2 text-xs">{activeDonationIds.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="all">
                All Donations
                <Badge variant="secondary" className="ml-2 text-xs">{donations.length}</Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={eventFilter} onValueChange={setEventFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by event" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="none">No Event</SelectItem>
                {events.map(event => (
                  <SelectItem key={event.id} value={event.id}>{event.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {donations.length === 0 ? (
        <EmptyState
          icon={<CheckCircle className="w-10 h-10" />}
          title="No verified donations"
          description="Verified donations will appear here for distribution"
        />
      ) : filteredDonations.length === 0 ? (
        <EmptyState
          icon={<Filter className="w-10 h-10" />}
          title="No matching donations"
          description="No donations match the current filter. Try changing the tab or event filter."
        />
      ) : (
        <div className="grid gap-4">
          {filteredDonations.map(donation => {
            const isExpanded = expandedDonation === donation.id
            const isActive = activeDonationIds.includes(donation.id)
            const donationDistributed = donation.type === 'monetary'
              ? (donation.amount ?? 0) - (donation.remainingAmount ?? donation.amount ?? 0)
              : 0
            const donationRemaining = donation.remainingAmount ?? donation.amount ?? 0

            return (
              <Card key={donation.id} className={!isActive ? 'opacity-70' : ''}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {isActive ? (
                          <StatusBadge status="Verified" />
                        ) : (
                          <StatusBadge status="Released" />
                        )}
                        <span className="text-sm text-muted-foreground capitalize">{donation.type}</span>
                        {donation.event && (
                          <Badge variant="outline" className="text-xs">
                            <Calendar className="w-3 h-3 mr-1" />
                            {donation.event.name}
                          </Badge>
                        )}
                      </div>
                      <p className="font-medium">{donation.donor?.name || 'Anonymous'}</p>

                      {donation.type === 'monetary' ? (
                        <div className="mt-2">
                          <div className="flex items-center gap-4 text-sm flex-wrap">
                            <span>Total: <strong>{formatCurrency(donation.amount ?? 0)}</strong></span>
                            <span>Distributed: <strong className="text-amber-600">{formatCurrency(donationDistributed)}</strong></span>
                            <span>Remaining: <strong className="text-red-600">{formatCurrency(donationRemaining)}</strong></span>
                          </div>
                          <Progress
                            value={(donationDistributed / (donation.amount || 1)) * 100}
                            className="mt-2 h-2"
                          />
                        </div>
                      ) : (
                        <div className="mt-2">
                          <div className="flex flex-wrap gap-1">
                            {donation.items?.map((item, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {item.itemName}: {item.remainingQuantity ?? item.quantity}/{item.quantity}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Distribution history toggle */}
                      {donation.distributions && donation.distributions.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2 text-xs"
                          onClick={() => setExpandedDonation(isExpanded ? null : donation.id)}
                        >
                          {donation._count?.distributions || donation.distributions.length} distribution(s)
                          <ChevronRight className={`w-3 h-3 ml-1 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        </Button>
                      )}
                    </div>
                    <Button
                      onClick={() => setDistributingDonation(donation)}
                      className="bg-gradient-to-r from-red-600 to-red-700"
                      disabled={!isActive}
                    >
                      <Truck className="w-4 h-4 mr-2" /> Distribute
                    </Button>
                  </div>

                  {/* Distribution History */}
                  {isExpanded && donation.distributions && donation.distributions.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm font-medium mb-2">Distribution History</p>
                      <ScrollArea className="max-h-48">
                        <div className="space-y-2">
                          {donation.distributions.map(dist => (
                            <div key={dist.id} className="flex items-center justify-between text-sm bg-muted/30 rounded p-2">
                              <div className="flex-1">
                                {dist.beneficiary && <span className="font-medium">{dist.beneficiary}: </span>}
                                {donation.type === 'monetary'
                                  ? formatCurrency(dist.amount ?? 0)
                                  : `${dist.itemName} x${dist.quantity}`}
                                {dist.notes && <span className="text-muted-foreground ml-2">- {dist.notes}</span>}
                              </div>
                              <div className="flex items-center gap-2">
                                {dist.proofPath && (
                                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setProofImage(dist.proofPath!)}>
                                    <Eye className="w-3 h-3 mr-1" /> Proof
                                  </Button>
                                )}
                                <span className="text-xs text-muted-foreground">{formatDate(dist.createdAt)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Proof Image Dialog */}
      <Dialog open={!!proofImage} onOpenChange={(open) => { if (!open) setProofImage(null) }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Distribution Proof</DialogTitle>
            <DialogDescription>Proof document for this distribution</DialogDescription>
          </DialogHeader>
          {proofImage && (
            <div className="rounded-lg overflow-hidden border bg-muted">
              <img
                src={proofImage}
                alt="Distribution proof"
                className="w-full h-auto max-h-[60vh] object-contain"
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setProofImage(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DistributionModal
        donation={distributingDonation}
        events={events}
        onClose={() => setDistributingDonation(null)}
        onSuccess={() => {
          setDistributingDonation(null)
          fetchVerifiedDonations()
        }}
      />

      <BulkDistributionModal
        open={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        events={events}
        donations={donations.filter(d => activeDonationIds.includes(d.id))}
        onSuccess={() => {
          setBulkModalOpen(false)
          fetchVerifiedDonations()
        }}
      />
    </div>
  )
}
