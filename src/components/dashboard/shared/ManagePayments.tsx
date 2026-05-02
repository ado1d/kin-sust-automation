'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CheckCircle, X, Loader2, AlertCircle, Eye, DollarSign } from 'lucide-react'
import { api, formatDate, formatCurrency } from '@/lib/api'
import { toast } from '@/hooks/use-toast'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EmptyState } from '@/components/common/EmptyState'

export function ManagePayments() {
  interface PaymentRecord {
    id: string
    donationId: string
    donorId: string
    method: string
    amount: number
    transactionId: string | null
    status: string
    proofPath: string | null
    createdAt: string
    donor: { id: string; name: string; email: string; phone?: string }
    donation?: { id: string; type: string; amount: number; status: string; paymentStatus: string; paymentMethod: string }
  }

  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null)
  const [showProofModal, setShowProofModal] = useState(false)
  const [updating, setUpdating] = useState<string | null>(null)

  const fetchPayments = async () => {
    try {
      const data = await api('/payments')
      setPayments(data.payments || [])
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => fetchPayments(), 0)
    return () => clearTimeout(timeoutId)
  }, [])

  const filtered = payments.filter(p => statusFilter === 'all' || p.status === statusFilter)

  const handleUpdateStatus = async (paymentId: string, status: string) => {
    setUpdating(paymentId)
    try {
      await api(`/payments/${paymentId}`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      })
      toast({
        title: `Payment ${status === 'Completed' ? 'approved' : 'rejected'}`,
        description: status === 'Completed'
          ? 'Payment approved. The related donation payment status has been updated.'
          : 'Payment has been marked as failed.'
      })
      fetchPayments()
    } catch (e) {
      toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' })
    }
    setUpdating(null)
    setShowProofModal(false)
  }

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Manage Payments</h2>
          <p className="text-muted-foreground">Review and approve payment proofs</p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="Failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<DollarSign className="w-10 h-10" />}
          title="No payments found"
          description={statusFilter !== 'all' ? 'No payments with the selected status.' : 'Payments will appear here when donors submit proof.'}
        />
      ) : (
        <div className="grid gap-4">
          {filtered.map(payment => (
            <Card key={payment.id}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarFallback className="bg-red-100 text-red-700">
                        {payment.donor?.name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{payment.donor?.name || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(payment.amount)} • {payment.method}
                        {' • '}{formatDate(payment.createdAt)}
                      </p>
                      {payment.transactionId && (
                        <p className="text-xs text-muted-foreground">
                          Transaction: {payment.transactionId}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <StatusBadge status={payment.status} />
                    <div className="flex items-center gap-2">
                      {payment.proofPath && (
                        <Button size="sm" variant="outline" onClick={() => { setSelectedPayment(payment); setShowProofModal(true) }}>
                          <Eye className="w-4 h-4 mr-1" /> View Proof
                        </Button>
                      )}
                      {payment.status === 'Pending' && (
                        <>
                          <Button
                            size="sm"
                            className="bg-red-600 hover:bg-red-700"
                            disabled={updating === payment.id}
                            onClick={() => handleUpdateStatus(payment.id, 'Completed')}
                          >
                            {updating === payment.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={updating === payment.id}
                            onClick={() => handleUpdateStatus(payment.id, 'Failed')}
                          >
                            <X className="w-4 h-4 mr-1" /> Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Payment Proof Modal */}
      <Dialog open={showProofModal} onOpenChange={setShowProofModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payment Proof</DialogTitle>
            <DialogDescription>Review the payment proof submitted by {selectedPayment?.donor?.name}</DialogDescription>
          </DialogHeader>
          {selectedPayment?.proofPath ? (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Donor</p>
                    <p className="font-medium">{selectedPayment.donor?.name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Amount</p>
                    <p className="font-medium">{formatCurrency(selectedPayment.amount)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Method</p>
                    <p className="font-medium capitalize">{selectedPayment.method}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <StatusBadge status={selectedPayment.status} />
                  </div>
                </div>
              </div>
              <div className="rounded-lg overflow-hidden border bg-muted">
                <img
                  src={selectedPayment.proofPath}
                  alt="Payment proof"
                  className="w-full h-auto max-h-[50vh] object-contain"
                />
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-2" />
              <p>No proof uploaded</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProofModal(false)}>Close</Button>
            {selectedPayment?.status === 'Pending' && (
              <>
                <Button
                  className="bg-red-600 hover:bg-red-700"
                  disabled={updating === selectedPayment.id}
                  onClick={() => handleUpdateStatus(selectedPayment.id, 'Completed')}
                >
                  <CheckCircle className="w-4 h-4 mr-1" /> Approve
                </Button>
                <Button
                  variant="destructive"
                  disabled={updating === selectedPayment.id}
                  onClick={() => handleUpdateStatus(selectedPayment.id, 'Failed')}
                >
                  <X className="w-4 h-4 mr-1" /> Reject
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
