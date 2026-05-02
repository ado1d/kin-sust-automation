'use client'

import { useState, useContext } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { MapPin, Upload, Loader2 } from 'lucide-react'
import dynamic from 'next/dynamic'
import { api } from '@/lib/api'
import { toast } from '@/hooks/use-toast'
import { SessionContext } from '@/contexts/SessionContext'
import { Event } from '@/lib/types'

const MapPicker = dynamic(() => import('@/components/map-picker').then(mod => mod.MapPicker), { ssr: false })

export function MonetaryDonationForm({ events, onSuccess }: {
  events: Event[]
  onSuccess: () => void
}) {
  const { user } = useContext(SessionContext)
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'Online' | 'Cash Pickup'>('Online')
  const [eventId, setEventId] = useState('none')
  const [note, setNote] = useState('')
  const [proofFile, setProofFile] = useState<string>('')
  const [pickupAddress, setPickupAddress] = useState('')
  const [pickupLat, setPickupLat] = useState<number | null>(null)
  const [pickupLng, setPickupLng] = useState<number | null>(null)

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate user is logged in
    if (!user?.id) {
      toast({ title: 'Error', description: 'Please log in to make a donation', variant: 'destructive' })
      return
    }
    
    // Validate amount
    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast({ title: 'Error', description: 'Please enter a valid donation amount', variant: 'destructive' })
      return
    }
    
    // Validate pickup address for cash pickup
    if (paymentMethod === 'Cash Pickup' && (!pickupAddress || pickupAddress.trim() === '')) {
      toast({ title: 'Error', description: 'Please enter a pickup address for cash collection', variant: 'destructive' })
      return
    }
    
    setLoading(true)
    try {
      const response = await api('/donations/monetary', {
        method: 'POST',
        body: JSON.stringify({
          donorId: user.id,
          amount: parsedAmount,
          paymentMethod,
          eventId: eventId === 'none' ? null : eventId,
          note,
          proofDocument: proofFile,
          pickupAddress: paymentMethod === 'Cash Pickup' ? pickupAddress.trim() : null,
          pickupLat: paymentMethod === 'Cash Pickup' ? pickupLat : null,
          pickupLng: paymentMethod === 'Cash Pickup' ? pickupLng : null
        })
      })
      toast({ title: 'Donation submitted!', description: response.message || 'Thank you for your generosity!' })
      setAmount('')
      setEventId('none')
      setNote('')
      setProofFile('')
      setPickupAddress('')
      setPickupLat(null)
      setPickupLng(null)
      onSuccess()
    } catch (err) {
      const error = err as Error
      toast({ 
        title: 'Donation Failed', 
        description: error.message || 'Failed to process donation. Please try again.', 
        variant: 'destructive' 
      })
    }
    setLoading(false)
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Monetary Donation</h2>
        <p className="text-muted-foreground">Make a monetary contribution</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Donation Details</CardTitle>
          <CardDescription>Enter your donation information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (৳) *</Label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-muted-foreground">৳</span>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  className="pl-8"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  required
                  min="1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method *</Label>
              <Select value={paymentMethod} onValueChange={(v: 'Online' | 'Cash Pickup') => setPaymentMethod(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Online">Online Payment</SelectItem>
                  <SelectItem value="Cash Pickup">Cash Pickup</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {paymentMethod === 'Online' && (
              <div className="space-y-2">
                <Label>Payment Proof/Screenshot</Label>
                <div className="border-2 border-dashed border-muted-foreground/25 dark:border-muted-foreground/15 rounded-lg p-6 text-center hover:border-red-400 dark:hover:border-red-600 hover:bg-red-50/50 dark:hover:bg-red-900/10 transition-colors duration-200">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="payment-proof"
                  />
                  <label htmlFor="payment-proof" className="cursor-pointer">
                    {proofFile ? (
                      <div className="space-y-2">
                        <img src={proofFile} alt="Proof" className="max-h-32 mx-auto rounded" />
                        <p className="text-sm text-red-600">Click to change</p>
                      </div>
                    ) : (
                      <div className="text-muted-foreground">
                        <Upload className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-sm">Upload payment screenshot</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            )}

            {paymentMethod === 'Cash Pickup' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pickupAddress">Pickup Address *</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Textarea
                      id="pickupAddress"
                      placeholder="Enter your full address where we can collect the cash"
                      className="pl-10 min-h-[80px]"
                      value={pickupAddress}
                      onChange={e => setPickupAddress(e.target.value)}
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Our volunteer will come to this address to collect the cash donation
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Pin Exact Location</Label>
                  <MapPicker 
                    onLocationSelect={(lat, lng) => { setPickupLat(lat); setPickupLng(lng) }}
                    height="250px"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="event">Event (Optional)</Label>
              <Select value={eventId} onValueChange={setEventId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an event" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {events.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Note (Optional)</Label>
              <Textarea
                id="note"
                placeholder="Any special instructions or notes"
                value={note}
                onChange={e => setNote(e.target.value)}
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-red-600 to-red-700">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Submit Donation
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
