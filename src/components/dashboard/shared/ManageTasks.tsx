'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Phone, Eye, CheckCircle, Loader2, AlertCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from '@/hooks/use-toast'
import { Task, Volunteer } from '@/lib/types'
import { StatusBadge } from '@/components/common/StatusBadge'

export function ManageTasks({ tasks, volunteers, onRefresh }: { tasks: Task[]; volunteers: Volunteer[]; onRefresh: () => void }) {
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showProofModal, setShowProofModal] = useState(false)
  const [verifying, setVerifying] = useState<string | null>(null)

  const filtered = tasks.filter(t => statusFilter === 'all' || t.status === statusFilter)

  const handleAssign = async (taskId: string, volunteerId: string) => {
    try {
      await api('/tasks', {
        method: 'PUT',
        body: JSON.stringify({ id: taskId, volunteerId })
      })
      toast({ title: 'Task assigned' })
      onRefresh()
    } catch (e) {
      toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' })
    }
  }

  const handleVerifyTask = async (taskId: string) => {
    setVerifying(taskId)
    try {
      await api(`/tasks/${taskId}/verify`, {
        method: 'POST'
      })
      toast({ title: 'Task verified', description: 'The task and related donation have been verified.' })
      onRefresh()
    } catch (e) {
      toast({ title: 'Verification Failed', description: (e as Error).message, variant: 'destructive' })
    }
    setVerifying(null)
  }

  const handleViewProof = (task: Task) => {
    setSelectedTask(task)
    setShowProofModal(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Manage Tasks</h2>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="Open">Open</SelectItem>
            <SelectItem value="Assigned">Assigned</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="Verified">Verified</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Kanban-style board */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {['Open', 'Assigned', 'Completed', 'Verified'].map(status => (
          <div key={status} className="space-y-3">
            <div className="flex items-center gap-2 font-medium">
              <StatusBadge status={status} />
              <span className="text-muted-foreground text-sm">
                ({filtered.filter(t => t.status === status).length})
              </span>
            </div>
            <ScrollArea className="h-[calc(100vh-20rem)] pr-2">
              <div className="space-y-3">
                {filtered.filter(t => t.status === status).map(task => (
                  <Card key={task.id} className="p-3">
                    <p className="font-medium text-sm mb-2 line-clamp-2">{task.pickupAddress}</p>
                    <p className="text-xs text-muted-foreground mb-1">
                      From: {task.donation?.donor?.name}
                    </p>
                    {task.donation?.donor?.phone && (
                      <a href={`tel:${task.donation.donor.phone}`} className="text-xs text-red-600 hover:underline inline-flex items-center gap-1 mb-2">
                        <Phone className="w-3 h-3" />
                        {task.donation.donor.phone}
                      </a>
                    )}
                    {task.volunteer ? (
                      <p className="text-xs text-muted-foreground mb-2">
                        Volunteer: {task.volunteer.name}
                      </p>
                    ) : status === 'Open' && (
                      <Select onValueChange={v => handleAssign(task.id, v)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Assign volunteer" />
                        </SelectTrigger>
                        <SelectContent>
                          {volunteers.filter(v => v.status === 'Active').map(v => (
                            <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {/* Show proof button for Completed/Verified tasks with proof */}
                    {(status === 'Completed' || status === 'Verified') && task.proofPath && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mt-2"
                        onClick={() => handleViewProof(task)}
                      >
                        <Eye className="w-4 h-4 mr-1" /> View Proof
                      </Button>
                    )}
                    {status === 'Completed' && (
                      <Button
                        size="sm"
                        className="w-full mt-2 bg-red-600 hover:bg-red-700"
                        disabled={verifying === task.id}
                        onClick={() => handleVerifyTask(task.id)}
                      >
                        {verifying === task.id ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                        Verify Task
                      </Button>
                    )}
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        ))}
      </div>

      {/* Proof Viewing Modal */}
      <Dialog open={showProofModal} onOpenChange={setShowProofModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Proof of Completion</DialogTitle>
            <DialogDescription>
              Submitted by {selectedTask?.volunteer?.name || 'Volunteer'}
            </DialogDescription>
          </DialogHeader>
          {selectedTask?.proofPath ? (
            <div className="space-y-4">
              <div className="rounded-lg overflow-hidden border bg-muted">
                <img
                  src={selectedTask.proofPath}
                  alt="Proof of completion"
                  className="w-full h-auto max-h-[60vh] object-contain"
                />
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <p><strong>Pickup Address:</strong> {selectedTask.pickupAddress}</p>
                <p><strong>From:</strong> {selectedTask.donation?.donor?.name}</p>
                <p><strong>Status:</strong> {selectedTask.status}</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-2" />
              <p>No proof uploaded for this task</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProofModal(false)}>Close</Button>
            {selectedTask?.status === 'Completed' && (
              <Button
                className="bg-red-600 hover:bg-red-700"
                disabled={verifying === selectedTask.id}
                onClick={() => {
                  handleVerifyTask(selectedTask.id)
                  setShowProofModal(false)
                }}
              >
                <CheckCircle className="w-4 h-4 mr-1" /> Verify Task
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
