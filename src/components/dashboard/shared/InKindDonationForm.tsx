'use client'

import { useState, useContext } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Trash2, Plus, Loader2 } from 'lucide-react'
import dynamic from 'next/dynamic'
import { api } from '@/lib/api'
import { toast } from '@/hooks/use-toast'
import { SessionContext } from '@/contexts/SessionContext'
import { Event } from '@/lib/types'

const MapPicker = dynamic(() => import('@/components/map-picker').then(mod => mod.MapPicker), { ssr: false })

export function InKindDonationForm({ events, onSuccess }: {
  events: Event[]
  onSuccess: () => void
}) {
  const { user } = useContext(SessionContext)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState([{ itemName: '', quantity: 1, category: 'others' }])
  const [pickupAddress, setPickupAddress] = useState('')
  const [pickupLat, setPickupLat] = useState<number | null>(null)
  const [pickupLng, setPickupLng] = useState<number | null>(null)
  const [pickupTime, setPickupTime] = useState('')
  const [eventId, setEventId] = useState('none')
  const [note, setNote] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate user is logged in
    if (!user?.id) {
      toast({ title: 'Error', description: 'Please log in to make a donation', variant: 'destructive' })
      return
    }
    
    // Validate items
    const validItems = items.filter(i => i.itemName && i.itemName.trim() !== '')
    if (validItems.length === 0) {
      toast({ title: 'Error', description: 'Please add at least one item to donate', variant: 'destructive' })
      return
    }
    
    // Validate pickup address
    if (!pickupAddress || pickupAddress.trim() === '') {
      toast({ title: 'Error', description: 'Please enter a pickup address', variant: 'destructive' })
      return
    }
    
    setLoading(true)
    try {
      const response = await api('/donations/in-kind', {
        method: 'POST',
        body: JSON.stringify({
          donorId: user.id,
          items: validItems,
          pickupAddress: pickupAddress.trim(),
          pickupLat,
          pickupLng,
          pickupTime: pickupTime || null,
          eventId: eventId === 'none' ? null : eventId,
          note
        })
      })
      toast({ title: 'Donation submitted!', description: response.message || 'We will arrange pickup soon!' })
      setItems([{ itemName: '', quantity: 1, category: 'others' }])
      setPickupAddress('')
      setPickupLat(null)
      setPickupLng(null)
      setPickupTime('')
      setEventId('none')
      setNote('')
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
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold">In-Kind Donation</h2>
        <p className="text-muted-foreground">Donate items such as food, clothes, medicine, etc.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Donation Details</CardTitle>
          <CardDescription>Enter the items you wish to donate</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-4">
              <Label>Items to Donate</Label>
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-5">
                    <Input
                      placeholder="Item name"
                      value={item.itemName}
                      onChange={e => {
                        const newItems = [...items]
                        newItems[i].itemName = e.target.value
                        setItems(newItems)
                      }}
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={e => {
                        const newItems = [...items]
                        newItems[i].quantity = parseInt(e.target.value) || 1
                        setItems(newItems)
                      }}
                      min="1"
                      required
                    />
                  </div>
                  <div className="col-span-4">
                    <Select
                      value={item.category}
                      onValueChange={v => {
                        const newItems = [...items]
                        newItems[i].category = v
                        setItems(newItems)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="food">Food</SelectItem>
                        <SelectItem value="cloth">Cloth</SelectItem>
                        <SelectItem value="med">Medicine</SelectItem>
                        <SelectItem value="others">Others</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-1">
                    {items.length > 1 && (
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon"
                        onClick={() => setItems(items.filter((_, idx) => idx !== i))}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => setItems([...items, { itemName: '', quantity: 1, category: 'others' }])}
              >
                <Plus className="w-4 h-4 mr-2" /> Add Item
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pickupAddress">Pickup Address *</Label>
                <Textarea
                  id="pickupAddress"
                  placeholder="Enter the address where items should be picked up"
                  value={pickupAddress}
                  onChange={e => setPickupAddress(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Pin Exact Location</Label>
                <MapPicker 
                  onLocationSelect={(lat, lng) => { setPickupLat(lat); setPickupLng(lng) }}
                  height="250px"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pickupTime">Preferred Pickup Time *</Label>
              <Input
                id="pickupTime"
                type="datetime-local"
                value={pickupTime}
                onChange={e => setPickupTime(e.target.value)}
                required
              />
            </div>

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
