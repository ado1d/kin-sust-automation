'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Upload, FileText, DollarSign, Package } from 'lucide-react'
import { api, formatCurrency } from '@/lib/api'
import { toast } from '@/hooks/use-toast'
import { Donation, Event } from '@/lib/types'

export function BulkDistributionModal({ open, onClose, events, donations, onSuccess }: {
  open: boolean
  onClose: () => void
  events: Event[]
  donations: Donation[]
  onSuccess: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [bulkType, setBulkType] = useState<'monetary' | 'in-kind'>('monetary')
  const [totalAmount, setTotalAmount] = useState('')
  const [eventId, setEventId] = useState<string>('')
  const [beneficiary, setBeneficiary] = useState('')
  const [notes, setNotes] = useState('')
  const [proofFile, setProofFile] = useState<string>('')
  const [itemDistributions, setItemDistributions] = useState<Record<string, number>>({})

  const resetForm = () => {
    setBulkType('monetary')
    setTotalAmount('')
    setEventId('')
    setBeneficiary('')
    setNotes('')
    setProofFile('')
    setItemDistributions({})
  }

  // Get all unique in-kind items across donations
  const allInKindItems = donations
    .filter(d => d.type === 'in-kind')
    .flatMap(d => d.items || [])
    .reduce((acc, item) => {
      const existing = acc.find(a => a.itemName === item.itemName)
      if (existing) {
        existing.totalQuantity += item.quantity
        existing.totalRemaining += item.remainingQuantity ?? item.quantity
      } else {
        acc.push({
          itemName: item.itemName,
          totalQuantity: item.quantity,
          totalRemaining: item.remainingQuantity ?? item.quantity
        })
      }
      return acc
    }, [] as { itemName: string; totalQuantity: number; totalRemaining: number }[])

  const monetaryDonations = donations.filter(d => d.type === 'monetary')
  const totalMonetaryRemaining = monetaryDonations.reduce((sum, d) => sum + (d.remainingAmount ?? d.amount ?? 0), 0)

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
    if (bulkType === 'monetary') {
      const parsedAmount = parseFloat(totalAmount)
      if (!parsedAmount || parsedAmount <= 0) {
        toast({ title: 'Error', description: 'Please enter a valid total amount', variant: 'destructive' })
        return
      }
      if (parsedAmount > totalMonetaryRemaining) {
        toast({ title: 'Error', description: `Amount exceeds total remaining (${formatCurrency(totalMonetaryRemaining)})`, variant: 'destructive' })
        return
      }
    } else {
      const items = Object.entries(itemDistributions).filter(([, qty]) => qty > 0)
      if (items.length === 0) {
        toast({ title: 'Error', description: 'Please enter at least one item quantity', variant: 'destructive' })
        return
      }
      // Validate quantities don't exceed available
      for (const [itemName, qty] of items) {
        const available = allInKindItems.find(i => i.itemName === itemName)?.totalRemaining ?? 0
        if (qty > available) {
          toast({ title: 'Error', description: `${itemName}: quantity (${qty}) exceeds available (${available})`, variant: 'destructive' })
          return
        }
      }
    }

    setLoading(true)
    try {
      const body: Record<string, unknown> = {
        type: bulkType,
        eventId: eventId && eventId !== 'none' ? eventId : null,
        beneficiary: beneficiary.trim() || null,
        notes: notes.trim() || null,
        proofPath: proofFile || null
      }

      if (bulkType === 'monetary') {
        body.amount = parseFloat(totalAmount)
      } else {
        body.itemDistributions = Object.entries(itemDistributions)
          .filter(([, qty]) => qty > 0)
          .map(([itemName, quantity]) => ({ itemName, quantity }))
      }

      await api('/distributions/bulk', {
        method: 'POST',
        body: JSON.stringify(body)
      })

      toast({ title: 'Bulk distribution recorded', description: 'The bulk distribution has been logged successfully.' })
      resetForm()
      onSuccess()
    } catch (e) {
      toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' })
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) { resetForm(); onClose() } }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Distribution</DialogTitle>
          <DialogDescription>
            Distribute across multiple donors proportionally
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Distribution Type */}
          <div className="space-y-2">
            <Label>Distribution Type</Label>
            <Tabs value={bulkType} onValueChange={v => setBulkType(v as 'monetary' | 'in-kind')}>
              <TabsList className="w-full">
                <TabsTrigger value="monetary" className="flex-1">
                  <DollarSign className="w-4 h-4 mr-1" /> Monetary
                </TabsTrigger>
                <TabsTrigger value="in-kind" className="flex-1">
                  <Package className="w-4 h-4 mr-1" /> In-Kind
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Summary info */}
          <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
            {bulkType === 'monetary' ? (
              <>
                <p><strong>Active monetary donations:</strong> {monetaryDonations.length}</p>
                <p><strong>Total remaining:</strong> <span className="text-red-600 font-medium">{formatCurrency(totalMonetaryRemaining)}</span></p>
                <p className="text-xs text-muted-foreground">The amount will be distributed proportionally across all donors based on their remaining amounts.</p>
              </>
            ) : (
              <>
                <p><strong>Available item types:</strong> {allInKindItems.length}</p>
                <p className="text-xs text-muted-foreground">Quantities will be distributed proportionally across donors who have those items.</p>
              </>
            )}
          </div>

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
            <p className="text-xs text-muted-foreground">Optionally associate this distribution with an event</p>
          </div>

          {bulkType === 'monetary' ? (
            <div className="space-y-2">
              <Label>Total Amount to Distribute *</Label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-muted-foreground">৳</span>
                <Input
                  type="number"
                  placeholder="0.00"
                  className="pl-8"
                  value={totalAmount}
                  onChange={e => setTotalAmount(e.target.value)}
                  max={totalMonetaryRemaining}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Maximum: {formatCurrency(totalMonetaryRemaining)}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <Label>Item Quantities to Distribute</Label>
              {allInKindItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">No in-kind items available</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {allInKindItems.map(item => (
                    <div key={item.itemName} className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.itemName}</p>
                        <p className="text-xs text-muted-foreground">Available: {item.totalRemaining}/{item.totalQuantity}</p>
                      </div>
                      <Input
                        type="number"
                        placeholder="0"
                        min={0}
                        max={item.totalRemaining}
                        className="w-24"
                        value={itemDistributions[item.itemName] || ''}
                        onChange={e => setItemDistributions({
                          ...itemDistributions,
                          [item.itemName]: parseInt(e.target.value) || 0
                        })}
                      />
                    </div>
                  ))}
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
              placeholder="Any notes about this bulk distribution"
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
                id="bulk-distribution-proof"
              />
              <label htmlFor="bulk-distribution-proof" className="cursor-pointer">
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
            disabled={loading || (bulkType === 'in-kind' && allInKindItems.length === 0)}
            className="bg-gradient-to-r from-red-600 to-red-700"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Bulk Distribute'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
