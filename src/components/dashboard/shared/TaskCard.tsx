'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, Clock, User, Phone, Mail, CheckCircle, FileUp, Loader2 } from 'lucide-react'
import dynamic from 'next/dynamic'
import { api } from '@/lib/api'
import { toast } from '@/hooks/use-toast'
import { Task } from '@/lib/types'
import { StatusBadge } from '@/components/common/StatusBadge'

const MapView = dynamic(() => import('@/components/map-picker').then(mod => mod.MapView), { ssr: false })

export function TaskCard({ task, compact, onUpdate }: { task: Task; compact?: boolean; onUpdate?: (task: Task) => void }) {
  const [updating, setUpdating] = useState(false)
  const [showProofUpload, setShowProofUpload] = useState(false)
  const [proofFile, setProofFile] = useState<string>('')

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

  const handleStatusUpdate = async (newStatus: string) => {
    setUpdating(true)
    try {
      const data = await api('/tasks', {
        method: 'PUT',
        body: JSON.stringify({ id: task.id, status: newStatus, proofDocument: proofFile })
      })
      onUpdate?.(data.task)
      toast({ title: 'Task updated', description: `Status changed to ${newStatus}` })
      setShowProofUpload(false)
      setProofFile('')
    } catch (e) {
      toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' })
    }
    setUpdating(false)
  }

  const handleCompleteWithProof = () => {
    if (!proofFile) {
      toast({ title: 'Proof Required', description: 'Please upload proof of completion', variant: 'destructive' })
      return
    }
    handleStatusUpdate('Completed')
  }

  if (compact) {
    return (
      <div className="p-3 bg-muted/50 rounded-lg mb-2">
        <p className="text-sm font-medium truncate">{task.pickupAddress}</p>
        <p className="text-xs text-muted-foreground">{task.donation?.donor?.name}</p>
        {task.donation?.donor?.phone && (
          <a 
            href={`tel:${task.donation.donor.phone}`}
            className="text-xs text-red-600 hover:underline inline-flex items-center gap-1 mt-0.5"
          >
            <Phone className="w-3 h-3" />
            {task.donation.donor.phone}
          </a>
        )}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Pickup Task</CardTitle>
          <StatusBadge status={task.status} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">Pickup Address</p>
              <p className="text-sm text-muted-foreground">{task.pickupAddress}</p>
            </div>
          </div>

          {task.pickupLat && task.pickupLng && (
            <div className="mt-3">
              <MapView 
                lat={task.pickupLat} 
                lng={task.pickupLng} 
                address={task.pickupAddress}
                height="200px"
              />
            </div>
          )}
          
          {task.pickupTime && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm">{task.pickupTime}</p>
            </div>
          )}

          {/* Donor Contact Info */}
          {task.donation?.donor && (
            <div className="mt-1 p-3 bg-muted/40 rounded-lg border border-border/50">
              <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                <User className="w-4 h-4 text-red-500" />
                Donor Contact Info
              </p>
              <div className="space-y-1.5">
                <p className="text-sm font-medium">{task.donation.donor.name}</p>
                {task.donation.donor.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                    <a 
                      href={`tel:${task.donation.donor.phone}`} 
                      className="text-sm text-red-600 hover:text-red-700 hover:underline font-medium"
                    >
                      {task.donation.donor.phone}
                    </a>
                  </div>
                )}
                {task.donation.donor.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                    <a 
                      href={`mailto:${task.donation.donor.email}`} 
                      className="text-sm text-red-600 hover:text-red-700 hover:underline font-medium truncate"
                    >
                      {task.donation.donor.email}
                    </a>
                  </div>
                )}
                {task.donation.donor.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
                    <p className="text-sm text-muted-foreground">{task.donation.donor.address}</p>
                  </div>
                )}
              </div>
              {task.donation.donor.phone && (
                <div className="flex gap-2 mt-3">
                  <a
                    href={`tel:${task.donation.donor.phone}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    Call Donor
                  </a>
                  <a
                    href={`mailto:${task.donation.donor.email || ''}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-border hover:bg-muted transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    Email Donor
                  </a>
                </div>
              )}
            </div>
          )}

          {task.donation?.items && task.donation.items.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-1">Items to pickup:</p>
              <div className="flex flex-wrap gap-1">
                {task.donation.items.map((item, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {item.itemName} ({item.quantity})
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {task.status === 'Assigned' && !showProofUpload && (
            <div className="flex gap-2 pt-2">
              <Button 
                size="sm" 
                className="bg-red-600 hover:bg-red-700"
                onClick={() => setShowProofUpload(true)}
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Complete
              </Button>
            </div>
          )}

          {task.status === 'Assigned' && showProofUpload && (
            <div className="space-y-3 pt-2 border-t">
              <p className="text-sm font-medium">Upload Proof of Completion</p>
              <div className="border-2 border-dashed border-muted-foreground/25 dark:border-muted-foreground/15 rounded-lg p-4 text-center hover:border-red-400 dark:hover:border-red-600 hover:bg-red-50/50 dark:hover:bg-red-900/10 transition-colors duration-200">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id={`proof-${task.id}`}
                />
                <label htmlFor={`proof-${task.id}`} className="cursor-pointer">
                  {proofFile ? (
                    <div className="space-y-2">
                      <img src={proofFile} alt="Proof" className="max-h-24 mx-auto rounded" />
                      <p className="text-xs text-red-600">Click to change</p>
                    </div>
                  ) : (
                    <div className="text-muted-foreground">
                      <FileUp className="w-6 h-6 mx-auto mb-1" />
                      <p className="text-xs">Upload photo proof</p>
                    </div>
                  )}
                </label>
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => { setShowProofUpload(false); setProofFile('') }}
                  disabled={updating}
                >
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  className="bg-red-600 hover:bg-red-700"
                  onClick={handleCompleteWithProof}
                  disabled={updating || !proofFile}
                >
                  {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                  Submit
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
