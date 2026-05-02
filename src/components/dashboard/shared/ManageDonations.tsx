'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Eye, CheckCircle, X, Loader2, Clock } from 'lucide-react'
import { api, formatDate, formatCurrency } from '@/lib/api'
import { toast } from '@/hooks/use-toast'
import { Donation } from '@/lib/types'
import { StatusBadge } from '@/components/common/StatusBadge'
import { PaymentProofSection } from '@/components/dashboard/shared/PaymentProofSection'

export function ManageDonations({ donations, onRefresh }: { donations: Donation[]; onRefresh: () => void }) {
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedDonation, setSelectedDonation] = useState<Donation | null>(null)
  const [showProofModal, setShowProofModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectingDonationId, setRejectingDonationId] = useState<string | null>(null)
  const [verifying, setVerifying] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<string | null>(null)

  const filtered = donations.filter(d => statusFilter === 'all' || d.status === statusFilter)

  const handleVerify = async (donationId: string, forceVerify = false) => {
    setVerifying(donationId)
    try {
      await api(`/donations/${donationId}/verify`, {
        method: 'POST',
        body: JSON.stringify({ forceVerify })
      })
      toast({ title: 'Donation verified', description: 'The donation has been verified successfully.' })
      onRefresh()
    } catch (e) {
      toast({ title: 'Verification Failed', description: (e as Error).message, variant: 'destructive' })
    }
    setVerifying(null)
  }

  const handleReject = async () => {
    if (!rejectingDonationId) return
    setRejecting(rejectingDonationId)
    try {
      await api(`/donations/${rejectingDonationId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectReason })
      })
      toast({ title: 'Donation rejected', description: 'The donation has been rejected.' })
      onRefresh()
    } catch (e) {
      toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' })
    }
    setRejecting(null)
    setRejectingDonationId(null)
    setRejectReason('')
    setShowRejectModal(false)
  }

  // Check if donation can be verified
  const canVerify = (donation: Donation): { canVerify: boolean; reason: string; forceVerify?: boolean } => {
    if (donation.status !== 'Pending') {
      return { canVerify: false, reason: `Donation is already ${donation.status}` }
    }

    // For online monetary donations - admin can verify directly (with forceVerify)
    if (donation.type === 'monetary' && donation.paymentMethod === 'online') {
      return {
        canVerify: true,
        reason: 'Online payment - verify after checking payment proof',
        forceVerify: donation.paymentStatus !== 'Paid'
      }
    }

    // For cash or in-kind donations - check if task is verified
    if (donation.type === 'in-kind' || (donation.type === 'monetary' && donation.paymentMethod === 'cash')) {
      const tasks = donation.tasks
      if (!tasks || tasks.length === 0) {
        return { canVerify: false, reason: 'Waiting for volunteer assignment' }
      }
      const task = tasks[0]
      if (task.status === 'Verified') {
        return { canVerify: true, reason: 'Pickup task has been verified' }
      }
      if (task.status === 'Completed') {
        return { canVerify: false, reason: 'Pickup task is completed but not yet verified by admin' }
      }
      if (task.status === 'Assigned') {
        return { canVerify: false, reason: `Volunteer ${task.volunteer?.name || ''} is working on pickup` }
      }
      return { canVerify: false, reason: 'Waiting for volunteer to complete pickup' }
    }

    return { canVerify: false, reason: 'Unknown donation type' }
  }

  const handleViewPaymentProof = (donation: Donation) => {
    setSelectedDonation(donation)
    setShowProofModal(true)
  }

  const openRejectDialog = (donationId: string) => {
    setRejectingDonationId(donationId)
    setRejectReason('')
    setShowRejectModal(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Manage Donations</h2>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Verified">Verified</SelectItem>
            <SelectItem value="Rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        {filtered.map(donation => {
        const verifyInfo = canVerify(donation)

        return (
          <Card key={donation.id}>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarFallback className="bg-red-100 text-red-700">
                      {donation.donor?.name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{donation.donor?.name || 'Unknown'}</p>
                    <p className="text-sm text-muted-foreground">
                      {donation.type === 'monetary' ? formatCurrency(donation.amount || 0) : 'In-kind donation'}
                      {' • '}{formatDate(donation.createdAt)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {donation.type === 'monetary' ? '💰 Monetary' : '📦 In-Kind'}
                      </Badge>
                      {donation.type === 'monetary' && donation.paymentMethod && (
                        <Badge variant="secondary" className="text-xs">
                          {donation.paymentMethod === 'online' ? 'Online Payment' : 'Cash Pickup'}
                        </Badge>
                      )}
                    </div>
                    {/* Show items for in-kind */}
                    {donation.type === 'in-kind' && donation.items && donation.items.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {donation.items.map((item, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {item.itemName} ({item.quantity})
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StatusBadge status={donation.status} />

                  {donation.status === 'Pending' && (
                    <p className="text-xs text-muted-foreground text-right max-w-[200px]">
                      {verifyInfo.reason}
                    </p>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 mt-2">
                    {donation.type === 'monetary' && donation.paymentMethod === 'online' && donation.status === 'Pending' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewPaymentProof(donation)}
                      >
                        <Eye className="w-4 h-4 mr-1" /> Proof
                      </Button>
                    )}

                    {donation.status === 'Pending' && (
                      <>
                        {verifyInfo.canVerify ? (
                          <Button
                            size="sm"
                            className="bg-red-600 hover:bg-red-700"
                            disabled={verifying === donation.id}
                            onClick={() => handleVerify(donation.id, verifyInfo.forceVerify)}
                          >
                            {verifying === donation.id ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                            Verify
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" disabled className="opacity-50 cursor-not-allowed">
                            <Clock className="w-4 h-4 mr-1" /> Waiting...
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={rejecting === donation.id}
                          onClick={() => openRejectDialog(donation.id)}
                        >
                          {rejecting === donation.id ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <X className="w-4 h-4 mr-1" />}
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
      </div>

      {/* Payment Proof Modal */}
      <Dialog open={showProofModal} onOpenChange={setShowProofModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payment Proof</DialogTitle>
            <DialogDescription>
              Review the payment proof submitted by the donor
            </DialogDescription>
          </DialogHeader>
          {selectedDonation && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Donor</p>
                    <p className="font-medium">{selectedDonation.donor?.name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Amount</p>
                    <p className="font-medium">{formatCurrency(selectedDonation.amount || 0)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Payment Method</p>
                    <p className="font-medium capitalize">{selectedDonation.paymentMethod}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Date</p>
                    <p className="font-medium">{formatDate(selectedDonation.createdAt)}</p>
                  </div>
                </div>
              </div>

              <PaymentProofSection donationId={selectedDonation.id} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProofModal(false)}>Close</Button>
            {selectedDonation?.status === 'Pending' && (
              <Button
                className="bg-red-600 hover:bg-red-700"
                onClick={() => {
                  const info = canVerify(selectedDonation)
                  handleVerify(selectedDonation.id, info.forceVerify)
                  setShowProofModal(false)
                }}
              >
                <CheckCircle className="w-4 h-4 mr-1" /> Verify Payment
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Reason Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Donation</DialogTitle>
            <DialogDescription>Please provide a reason for rejecting this donation.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Enter rejection reason..."
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowRejectModal(false); setRejectReason('') }}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectReason.trim()}>
              Reject Donation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
