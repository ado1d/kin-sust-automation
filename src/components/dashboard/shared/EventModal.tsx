'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import { Loader2, Upload } from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from '@/hooks/use-toast'
import { Event } from '@/lib/types'

export function EventModal({ open, onClose, event, onSuccess }: {
  open: boolean
  onClose: () => void
  event: Event | null
  onSuccess: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    location: '',
    status: 'Published',
    needs: '',
    image: ''
  })

  // Reset form when event changes or modal opens - using a ref to track previous event
  const prevEventRef = useRef<Event | null | undefined>(undefined)

  useEffect(() => {
    // Only reset if the modal just opened or event changed
    if (open && (prevEventRef.current !== event || !prevEventRef.current)) {
      const timer = setTimeout(() => {
        setFormData({
          name: event?.name || '',
          description: event?.description || '',
          startDate: event?.startDate ? event.startDate.slice(0, 10) : '',
          endDate: event?.endDate ? event.endDate.slice(0, 10) : '',
          location: event?.location || '',
          status: event?.status || 'Published',
          needs: event?.needs || '',
          image: event?.image || ''
        })
      }, 0)
      prevEventRef.current = event
      return () => clearTimeout(timer)
    }
  }, [open, event])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (event) {
        await api('/events', {
          method: 'PUT',
          body: JSON.stringify({ id: event.id, ...formData })
        })
      } else {
        await api('/events', {
          method: 'POST',
          body: JSON.stringify(formData)
        })
      }
      toast({ title: event ? 'Event updated' : 'Event created' })
      onSuccess()
    } catch (e) {
      toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' })
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{event ? 'Edit Event' : 'Create Event'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Location</Label>
            <Input value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Needs</Label>
            <Input value={formData.needs} onChange={e => setFormData({ ...formData, needs: e.target.value })} placeholder="e.g., Warm clothes, food, medicine" />
          </div>
          <div className="space-y-2">
            <Label>Event Image</Label>
            <div className="border-2 border-dashed border-muted-foreground/25 dark:border-muted-foreground/15 rounded-lg p-3 text-center hover:border-red-400 dark:hover:border-red-600 hover:bg-red-50/50 dark:hover:bg-red-900/10 transition-colors duration-200">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    const reader = new FileReader()
                    reader.onloadend = () => {
                      setFormData({ ...formData, image: reader.result as string })
                    }
                    reader.readAsDataURL(file)
                  }
                }}
                className="hidden"
                id="event-image-upload"
              />
              <label htmlFor="event-image-upload" className="cursor-pointer">
                {formData.image ? (
                  <div className="space-y-2">
                    <img src={formData.image} alt="Event preview" className="max-h-32 mx-auto rounded-lg shadow-md" />
                    <p className="text-xs text-red-600">Click to change image</p>
                  </div>
                ) : (
                  <div className="text-muted-foreground">
                    <Upload className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">Upload event image</p>
                  </div>
                )}
              </label>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={formData.status} onValueChange={v => setFormData({ ...formData, status: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Published">Published</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-gradient-to-r from-red-600 to-red-700">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (event ? 'Update' : 'Create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
