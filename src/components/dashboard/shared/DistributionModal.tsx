'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Upload, FileText } from 'lucide-react'
import { api, formatDate, formatCurrency } from '@/lib/api'
import { toast } from '@/hooks/use-toast'
import { Donation, Event } from '@/lib/types'

export function DistributionModal({ donation, events, onClose, onSuccess }: {
  donation: Donation | null
  events: Event[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState('')
  const [beneficiary, setBeneficiary] = useState('')
  const [notes, setNotes] = useState('')
  const [proofFile, setProofFile] = useState<string>('')
  const [selectedItem, setSelectedItem] = useState<string>('')
  const [itemQuantity, setItemQuantity] = useState<number>(0)
  const [eventId, setEventId] = useState<string>('')

  const resetForm = () => {
    setAmount('')
    setBeneficiary('')
    setNotes('')
    setProofFile('')
    setSelectedItem('')
    setItemQuantity(0)
    setEventId('')
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setProofFile(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async () => {
    if (!donation) return

    if (donation.type === 'monetary') {
      const parsedAmount = parseFloat(amount)
      if (!parsedAmount || parsedAmount <= 0) {
        toast({ title: 'Error', description: 'Please enter a valid amount', variant: 'destructive' })
        return
      }
      if (parsedAmount > (donation.remainingAmount ?? donation.amount ?? 0)) {
        toast({ title: 'Error', description: 'Amount exceeds remaining balance', variant: 'destructive' })
        return
      }
    } else {
      if (!selectedItem) {
        toast({ title: 'Error', description: 'Please select an item to distribute', variant: 'destructive' })
        return
      }
      if (!itemQuantity || itemQuantity <= 0) {
        toast({ title: 'Error', description: 'Please enter a valid quantity', variant: 'destructive' })
        return
      }
    }

    setLoading(true)
    try {
      const body: Record<string, unknown> = {
        beneficiary: beneficiary.trim() || null,
        notes: notes.trim() || null,
        proofPath: proofFile || null,
        eventId: eventId && eventId !== 'none' ? eventId : null
      }

      if (donation.type === 'monetary') {
        body.amount = parseFloat(amount)
      } else {
        body.itemName = selectedItem
        body.quantity = itemQuantity
      }

      await api(`/donations/${donation.id}/distribute`, {
        method: 'POST',
        body: JSON.stringify(body)
      })

      toast({ title: 'Distribution recorded', description: 'The distribution has been logged successfully.' })
      onSuccess()
    } catch (e) {
      toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' })
    }
    setLoading(false)
  }

  if (!donation) return null

  const remainingAmount = donation.remainingAmount ?? donation.amount ?? 0
  const totalDistributed = donation.type === 'monetary'
    ? (donation.amount ?? 0) - remainingAmount
    : 0

  return (
    <Dialog open={!!donation} onOpenChange={(open) => { if (!open) { resetForm(); onClose() } }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Distribute Donation</DialogTitle>
          <DialogDescription>
            {donation.type === 'monetary'
              ? 'Record distribution of monetary funds'
              : 'Record distribution of in-kind items'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Summary */}
          <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
            <p><strong>Donor:</strong> {donation.donor?.name || 'Anonymous'}</p>
            {donation.type === 'monetary' ? (
              <>
                <p><strong>Total Amount:</strong> {formatCurrency(donation.amount ?? 0)}</p>
                <p><strong>Distributed:</strong> {formatCurrency(totalDistributed)}</p>
                <p><strong>Remaining:</strong> <span className="text-red-600 font-medium">{formatCurrency(remainingAmount)}</span></p>
              </>
            ) : (
              <div>
                <strong>Items:</strong>
                <div className="flex flex-wrap gap-1 mt-1">
                  {donation.items?.map((item, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {item.itemName}: {item.remainingQuantity ?? item.quantity} remaining
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Distribution History */}
          {donation.distributions && donation.distributions.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Previous Distributions</Label>
              <ScrollArea className="max-h-32">
                <div className="space-y-1">
                  {donation.distributions.map(dist => (
                    <div key={dist.id} className="text-xs bg-muted/30 rounded p-2 flex justify-between">
                      <span>
                        {dist.beneficiary && <strong>{dist.beneficiary}: </strong>}
                        {donation.type === 'monetary'
                          ? formatCurrency(dist.amount ?? 0)
                          : `${dist.itemName} x${dist.quantity}`}
                      </span>
                      <span className="text-muted-foreground">{formatDate(dist.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Event Selector */}
          <div className="space-y-2">
            <Label>Event (Optional)</Label>
            <Select value={eventId} onValueChange={setEventId}>
              <SelectTrigger>
                <SelectValue placeholder="Select an event (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Event</SelectItem>
                {events.map(event => (
                  <SelectItem key={event.id} value={event.id}>{event.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Associate this distribution with an event</p>
          </div>

          {donation.type === 'monetary' ? (
            <div className="space-y-2">
              <Label>Amount to Distribute *</Label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-muted-foreground">৳</span>
                <Input
                  type="number"
                  placeholder="0.00"
                  className="pl-8"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  max={remainingAmount}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Maximum: {formatCurrency(remainingAmount)}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <Label>Select Item to Distribute *</Label>
              <Select value={selectedItem} onValueChange={v => { setSelectedItem(v); setItemQuantity(0) }}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an item" />
                </SelectTrigger>
                <SelectContent>
                  {donation.items?.filter(item => (item.remainingQuantity ?? item.quantity) > 0).map(item => (
                    <SelectItem key={item.id} value={item.itemName}>
                      {item.itemName} ({item.remainingQuantity ?? item.quantity} remaining)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedItem && (
                <div className="space-y-2">
                  <Label>Quantity *</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    min={1}
                    max={donation.items?.find(i => i.itemName === selectedItem)?.remainingQuantity
                      ?? donation.items?.find(i => i.itemName === selectedItem)?.quantity
                      ?? 0}
                    value={itemQuantity || ''}
                    onChange={e => setItemQuantity(parseInt(e.target.value) || 0)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Available: {donation.items?.find(i => i.itemName === selectedItem)?.remainingQuantity
                      ?? donation.items?.find(i => i.itemName === selectedItem)?.quantity ?? 0}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Beneficiary Name</Label>
            <Input
              placeholder="Name of person/organization receiving"
              value={beneficiary}
              onChange={e => setBeneficiary(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Textarea
              placeholder="Any notes about this distribution"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Proof Document</Label>
            <div className="border-2 border-dashed border-muted-foreground/25 dark:border-muted-foreground/15 rounded-lg p-4 text-center hover:border-red-400 dark:hover:border-red-600 hover:bg-red-50/50 dark:hover:bg-red-900/10 transition-colors duration-200">
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                className="hidden"
                id="distribution-proof"
              />
              <label htmlFor="distribution-proof" className="cursor-pointer">
                {proofFile ? (
                  <div className="space-y-2">
                    {proofFile.startsWith('data:image') ? (
                      <img src={proofFile} alt="Proof preview" className="max-h-24 mx-auto rounded" />
                    ) : (
                      <div className="flex items-center justify-center gap-2 text-red-600">
                        <FileText className="w-6 h-6" />
                        <span>File uploaded</span>
                      </div>
                    )}
                    <p className="text-xs text-red-600">Click to change</p>
                  </div>
                ) : (
                  <div className="text-muted-foreground">
                    <Upload className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">Upload proof document</p>
                    <p className="text-xs">(Image or PDF)</p>
                  </div>
                )}
              </label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-gradient-to-r from-red-600 to-red-700"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Record Distribution'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
