'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import { Search, Eye, Trash2, Edit, CheckCircle, X, Loader2 } from 'lucide-react'
import { api, formatDate, formatCurrency } from '@/lib/api'
import { toast } from '@/hooks/use-toast'
import { Donor, Donation } from '@/lib/types'
import { StatusBadge } from '@/components/common/StatusBadge'

export function ManageDonors({ donors, onRefresh }: { donors: Donor[]; onRefresh: () => void }) {
  const [search, setSearch] = useState('')
  const [selectedDonor, setSelectedDonor] = useState<Donor | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [donorDonations, setDonorDonations] = useState<Donation[]>([])
  const [donationsLoading, setDonationsLoading] = useState(false)
  const [editingDonor, setEditingDonor] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', status: '' })

  const filtered = donors.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.email.toLowerCase().includes(search.toLowerCase())
  )

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this donor?')) return
    try {
      await api(`/donors?id=${id}`, { method: 'DELETE' })
      toast({ title: 'Donor deleted' })
      onRefresh()
    } catch (e) {
      toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' })
    }
  }

  const fetchDonorDonations = async (donorId: string) => {
    setDonationsLoading(true)
    try {
      const data = await api(`/donations?donorId=${donorId}`)
      setDonorDonations(data.donations || [])
    } catch (e) {
      console.error(e)
      setDonorDonations([])
    }
    setDonationsLoading(false)
  }

  const openDonorDetails = (donor: Donor) => {
    setSelectedDonor(donor)
    setEditForm({ name: donor.name, email: donor.email, phone: donor.phone || '', status: donor.status })
    setEditingDonor(false)
    setShowDetails(true)
    fetchDonorDonations(donor.id)
  }

  const handleUpdateDonor = async () => {
    if (!selectedDonor) return
    try {
      await api('/donors', {
        method: 'PUT',
        body: JSON.stringify({ id: selectedDonor.id, ...editForm })
      })
      toast({ title: 'Donor updated', description: 'Donor information has been updated.' })
      setEditingDonor(false)
      onRefresh()
    } catch (e) {
      toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' })
    }
  }

  const handleToggleStatus = async () => {
    if (!selectedDonor) return
    const newStatus = selectedDonor.status === 'Active' ? 'Inactive' : 'Active'
    try {
      await api('/donors', {
        method: 'PUT',
        body: JSON.stringify({ id: selectedDonor.id, status: newStatus })
      })
      toast({ title: `Donor ${newStatus === 'Active' ? 'activated' : 'deactivated'}` })
      setSelectedDonor({ ...selectedDonor, status: newStatus })
      onRefresh()
    } catch (e) {
      toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' })
    }
  }

  // Donation stats
  const totalDonated = donorDonations.reduce((sum, d) => sum + (d.amount || 0), 0)
  const verifiedCount = donorDonations.filter(d => d.status === 'Verified').length
  const totalItems = donorDonations.filter(d => d.type === 'in-kind').reduce((sum, d) => sum + (d.items?.reduce((s, i) => s + i.quantity, 0) || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">Manage Donors</h2>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search donors..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <ScrollArea className="h-[calc(100vh-16rem)]">
              <table className="w-full min-w-[600px]">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Name</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Email</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Phone</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="text-right p-4 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
              <tbody>
                {filtered.map((donor, i) => (
                  <tr key={donor.id} className={`border-t hover:bg-red-50/50 dark:hover:bg-red-900/10 transition-colors cursor-pointer ${i % 2 === 1 ? 'bg-muted/20' : ''}`} onClick={() => openDonorDetails(donor)}>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm">{donor.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        {donor.name}
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">{donor.email}</td>
                    <td className="p-4 text-muted-foreground">{donor.phone || '-'}</td>
                    <td className="p-4">
                      <StatusBadge status={donor.status} />
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openDonorDetails(donor) }}>
                          <Eye className="w-4 h-4 mr-1" /> View
                        </Button>
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDelete(donor.id) }}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
          </div>
        </CardContent>
      </Card>

      {/* Donor Detail Dialog */}
      <Dialog open={showDetails} onOpenChange={(open) => { if (!open) setShowDetails(false) }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-red-100 text-red-700">{selectedDonor?.name.charAt(0)}</AvatarFallback>
              </Avatar>
              Donor Details
            </DialogTitle>
            <DialogDescription>View and manage donor information</DialogDescription>
          </DialogHeader>

          {selectedDonor && (
            <div className="space-y-6 py-4">
              {/* Status + Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusBadge status={selectedDonor.status} />
                  <span className="text-sm text-muted-foreground">{selectedDonor.email}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleStatus}
                  className={selectedDonor.status === 'Active' ? 'text-red-600' : 'text-red-600'}
                >
                  {selectedDonor.status === 'Active' ? (
                    <><X className="w-4 h-4 mr-1" /> Deactivate</>
                  ) : (
                    <><CheckCircle className="w-4 h-4 mr-1" /> Activate</>
                  )}
                </Button>
              </div>

              {/* Editable Info */}
              {editingDonor ? (
                <Card className="bg-muted/30 p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Name</Label>
                      <Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Email</Label>
                      <Input value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Phone</Label>
                      <Input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-red-600 hover:bg-red-700" onClick={handleUpdateDonor}>Save</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingDonor(false)}>Cancel</Button>
                  </div>
                </Card>
              ) : (
                <Card className="bg-muted/30 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium">Contact Information</p>
                    <Button variant="ghost" size="sm" onClick={() => setEditingDonor(true)}>
                      <Edit className="w-4 h-4 mr-1" /> Edit
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Name</p>
                      <p className="font-medium">{selectedDonor.name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Email</p>
                      <p className="font-medium break-all">{selectedDonor.email}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Phone</p>
                      <p className="font-medium">{selectedDonor.phone || 'Not provided'}</p>
                    </div>
                  </div>
                </Card>
              )}

              {/* Donation Stats */}
              <Card className="bg-muted/30 p-4">
                <p className="text-sm font-medium mb-3">Donation Statistics</p>
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div>
                    <p className="text-xl font-bold">{donorDonations.length}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-red-600">{formatCurrency(totalDonated)}</p>
                    <p className="text-xs text-muted-foreground">Amount</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-amber-600">{totalItems}</p>
                    <p className="text-xs text-muted-foreground">Items</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold">{donorDonations.length > 0 ? Math.round((verifiedCount / donorDonations.length) * 100) : 0}%</p>
                    <p className="text-xs text-muted-foreground">Verified</p>
                  </div>
                </div>
              </Card>

              {/* Donation History */}
              <Card className="bg-muted/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Donation History</CardTitle>
                </CardHeader>
                <CardContent>
                  {donationsLoading ? (
                    <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin" /></div>
                  ) : donorDonations.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2">No donations yet</p>
                  ) : (
                    <ScrollArea className="max-h-40">
                      <div className="space-y-1">
                        {donorDonations.slice(0, 10).map(d => (
                          <div key={d.id} className="flex items-center justify-between text-xs bg-muted/50 rounded p-2">
                            <div className="flex items-center gap-2">
                              <span className="capitalize">{d.type}</span>
                              {d.type === 'monetary' ? formatCurrency(d.amount || 0) : `In-kind`}
                            </div>
                            <div className="flex items-center gap-2">
                              <StatusBadge status={d.status} />
                              <span className="text-muted-foreground">{formatDate(d.createdAt)}</span>
                            </div>
                          </div>
                        ))}
                        {donorDonations.length > 10 && (
                          <p className="text-xs text-muted-foreground text-center mt-1">
                            +{donorDonations.length - 10} more
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetails(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
