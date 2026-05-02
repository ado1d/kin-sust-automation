'use client'

import { useState, useEffect } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { StatusBadge } from '@/components/common/StatusBadge'

export function PaymentProofSection({ donationId }: { donationId: string }) {
  const [payment, setPayment] = useState<{proofPath: string | null; status: string; method: string} | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPayment = async () => {
      try {
        const data = await api(`/payments?donationId=${donationId}`)
        if (data.payments && data.payments.length > 0) {
          setPayment(data.payments[0])
        }
      } catch (e) {
        console.error('Failed to fetch payment:', e)
      }
      setLoading(false)
    }
    fetchPayment()
  }, [donationId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!payment || !payment.proofPath) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <AlertCircle className="w-12 h-12 mx-auto mb-2" />
        <p>No payment proof uploaded</p>
        <p className="text-sm">The donor needs to upload proof of payment</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg overflow-hidden border bg-muted">
        <img
          src={payment.proofPath}
          alt="Payment proof"
          className="w-full h-auto max-h-[50vh] object-contain"
        />
      </div>
      <StatusBadge status={payment.status} />
    </div>
  )
}
