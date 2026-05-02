'use client'

import { useState, useEffect, useContext } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, Phone, Package, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from '@/hooks/use-toast'
import { SessionContext } from '@/contexts/SessionContext'
import { Task } from '@/lib/types'
import { EmptyState } from '@/components/common/EmptyState'

export function AvailableTasksView({ onTaskAssigned }: { onTaskAssigned: (task: Task) => void }) {
  const { user } = useContext(SessionContext)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const data = await api('/tasks?status=Open')
        setTasks(data.tasks || [])
      } catch (e) {
        console.error(e)
      }
      setLoading(false)
    }
    fetchTasks()
  }, [])

  const handleAssign = async (taskId: string) => {
    try {
      const data = await api('/tasks', {
        method: 'PUT',
        body: JSON.stringify({ id: taskId, volunteerId: user?.id })
      })
      setTasks(tasks.filter(t => t.id !== taskId))
      onTaskAssigned(data.task)
      toast({ title: 'Task assigned!', description: 'You can now see this task in your dashboard.' })
    } catch (e) {
      toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' })
    }
  }

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Available Tasks</h2>
      {tasks.length === 0 ? (
        <EmptyState
          icon={<Package className="w-10 h-10" />}
          title="No available tasks"
          description="All pickup tasks have been assigned. Check back later!"
        />
      ) : (
        <div className="grid gap-4">
          {tasks.map(task => (
            <Card key={task.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Pickup Task</CardTitle>
                  <Badge variant="outline">{task.priority} Priority</Badge>
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
                  
                  {task.donation?.donor && (
                    <div className="p-2.5 bg-muted/40 rounded-lg border border-border/50">
                      <p className="text-sm">From: <span className="font-medium">{task.donation.donor.name}</span></p>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        Contact info will be available after you accept this task
                      </p>
                    </div>
                  )}

                  {task.donation?.items && task.donation.items.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-1">Items:</p>
                      <div className="flex flex-wrap gap-1">
                        {task.donation.items.map((item, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {item.itemName} ({item.quantity})
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button onClick={() => handleAssign(task.id)} className="bg-gradient-to-r from-amber-500 to-orange-600">
                    Assign to Me
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
