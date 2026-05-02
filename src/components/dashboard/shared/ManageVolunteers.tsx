'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Search, Eye, CheckCircle, X, AlertCircle, User, Loader2, ClipboardList
} from 'lucide-react'
import { api, formatDate } from '@/lib/api'
import { toast } from '@/hooks/use-toast'
import { Volunteer, Task } from '@/lib/types'
import { StatusBadge } from '@/components/common/StatusBadge'

export function ManageVolunteers({ volunteers, onRefresh }: { volunteers: Volunteer[]; onRefresh: () => void }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedVolunteer, setSelectedVolunteer] = useState<Volunteer | null>(null)
  const [volunteerTasks, setVolunteerTasks] = useState<Task[]>([])
  const [tasksLoading, setTasksLoading] = useState(false)

  const [showDetails, setShowDetails] = useState(false)

  // Fetch volunteer tasks when a volunteer is selected
  const fetchVolunteerTasks = async (volunteerId: string) => {
    setTasksLoading(true)
    try {
      const data = await api(`/tasks?volunteerId=${volunteerId}`)
      setVolunteerTasks(data.tasks || [])
    } catch (e) {
      console.error(e)
      setVolunteerTasks([])
    }
    setTasksLoading(false)
  }

  const filtered = volunteers.filter(v => {
    const matchSearch = v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.email.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || v.status === statusFilter
    return matchSearch && matchStatus
  })

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await api('/volunteers', {
        method: 'PUT',
        body: JSON.stringify({ id, status })
      })

      // Update the selected volunteer status immediately
      if (selectedVolunteer && selectedVolunteer.id === id) {
        setSelectedVolunteer({ ...selectedVolunteer, status })
      }

      // Show success message
      toast({
        title: status === 'Active' ? 'Volunteer Approved!' : 'Volunteer Rejected',
        description: status === 'Active'
          ? 'The volunteer has been approved and can now access their dashboard.'
          : 'The volunteer application has been rejected.',
        variant: status === 'Active' ? 'default' : 'destructive'
      })

      // Refresh the volunteer list
      onRefresh()
    } catch (e) {
      toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' })
    }
  }

  const getActivityLabel = (activityId: string) => {
    const labels: Record<string, string> = {
      'blood_donation': 'Blood donation',
      'education_program': 'Education program for underprivileged children',
      'winter_help': 'Help winter affected people',
      'charity_programs': 'Arranging charity programs',
      'social_awareness': 'Social awareness activities',
      'emergency_response': 'Responding to national/international emergencies'
    }
    return labels[activityId] || activityId
  }

  const getSkillLabel = (skillId: string) => {
    const labels: Record<string, string> = {
      'singing': 'Singing',
      'dancing': 'Dancing',
      'recitation': 'Recitation',
      'programming': 'Programming',
      'drawing': 'Drawing',
      'digital_art': 'Digital Art',
      'sports': 'Sports',
      'photography': 'Photography',
      'content_writing': 'Content Writing'
    }
    return labels[skillId] || skillId
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">Manage Volunteers</h2>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Pending Requests Alert */}
      {filtered.filter(v => v.status === 'Pending').length > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  {filtered.filter(v => v.status === 'Pending').length} pending volunteer request(s) awaiting approval
                </p>
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  Click on "View" to see details and approve or reject
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <ScrollArea className="h-[calc(100vh-16rem)]">
              <table className="w-full min-w-[600px]">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Volunteer</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground hidden md:table-cell">Email</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground hidden lg:table-cell">Phone</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="text-right p-4 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
              <tbody>
                {filtered.map((vol, i) => (
                  <tr key={vol.id} className={`border-t hover:bg-red-50/50 dark:hover:bg-red-900/10 transition-colors ${i % 2 === 1 ? 'bg-muted/20' : ''}`}>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          {vol.photo ? (
                            <AvatarImage src={vol.photo} alt={vol.name} />
                          ) : (
                            <AvatarFallback className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">{vol.name.charAt(0)}</AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                          <p className="font-medium">{vol.name}</p>
                          <p className="text-sm text-muted-foreground md:hidden">{vol.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground hidden md:table-cell">{vol.email}</td>
                    <td className="p-4 text-muted-foreground hidden lg:table-cell">{vol.phone || '-'}</td>
                    <td className="p-4">
                      <StatusBadge status={vol.status} />
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setSelectedVolunteer(vol); setShowDetails(true); fetchVolunteerTasks(vol.id); }}>
                          <Eye className="w-4 h-4 mr-1" /> View
                        </Button>
                        {vol.status === 'Pending' && (
                          <>
                            <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleStatusUpdate(vol.id, 'Active')}>
                              <CheckCircle className="w-4 h-4 mr-1" /> Approve
                            </Button>
                            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleStatusUpdate(vol.id, 'Rejected')}>
                              <X className="w-4 h-4 mr-1" /> Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
          </div>
        </CardContent>
      </Card>

      {/* Volunteer Details Modal */}
      <Dialog open={showDetails} onOpenChange={(open) => { if (!open) setShowDetails(false) }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedVolunteer?.photo && (
                <Avatar className="w-12 h-12">
                  <AvatarImage src={selectedVolunteer.photo} alt={selectedVolunteer.name} />
                </Avatar>
              )}
              Volunteer Details
            </DialogTitle>
            <DialogDescription>
              Review volunteer application and approve or reject
            </DialogDescription>
          </DialogHeader>

          {selectedVolunteer && (
            <div className="space-y-6 py-4">
              {/* Photo Section - Show prominently at top */}
              <div className="flex flex-col items-center gap-4">
                {selectedVolunteer.photo ? (
                  <div className="relative">
                    <img
                      src={selectedVolunteer.photo}
                      alt={selectedVolunteer.name}
                      className="w-40 h-40 rounded-full object-cover border-4 border-red-500 shadow-lg"
                    />
                    <div className="absolute bottom-1 right-1 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                  </div>
                ) : (
                  <div className="w-40 h-40 rounded-full bg-muted flex items-center justify-center border-4 border-muted">
                    <User className="w-16 h-16 text-muted-foreground" />
                  </div>
                )}
                <div className="text-center">
                  <h3 className="text-xl font-bold">{selectedVolunteer.name}</h3>
                  <StatusBadge status={selectedVolunteer.status} />
                </div>
              </div>

              {/* Basic Info */}
              <Card className="bg-muted/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="font-medium break-all">{selectedVolunteer.email}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Phone</p>
                    <p className="font-medium">{selectedVolunteer.phone || 'Not provided'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Address</p>
                    <p className="font-medium">{selectedVolunteer.address || 'Not provided'}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Personal Info */}
              <Card className="bg-muted/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Father's Name</p>
                    <p className="font-medium">{selectedVolunteer.fatherName || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Mother's Name</p>
                    <p className="font-medium">{selectedVolunteer.motherName || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Date of Birth</p>
                    <p className="font-medium">{selectedVolunteer.dateOfBirth || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Blood Group</p>
                    <p className="font-medium">{selectedVolunteer.bloodGroup || 'Not provided'}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Education Info */}
              <Card className="bg-muted/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Education</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Institution</p>
                    <p className="font-medium">{selectedVolunteer.institution || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Department</p>
                    <p className="font-medium">{selectedVolunteer.department || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Session</p>
                    <p className="font-medium">{selectedVolunteer.session || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Reg. No.</p>
                    <p className="font-medium">{selectedVolunteer.regNo || 'Not provided'}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Activities & Skills */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedVolunteer.activities && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Activities</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedVolunteer.activities.split(',').filter(Boolean).map((activity, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {getActivityLabel(activity)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {selectedVolunteer.skills && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Skills & Interests</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedVolunteer.skills.split(',').filter(Boolean).map((skill, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {getSkillLabel(skill)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Registration Date */}
              {selectedVolunteer.createdAt && (
                <p className="text-sm text-muted-foreground text-center">
                  Registered on {formatDate(selectedVolunteer.createdAt)}
                </p>
              )}

              {/* Task History & Completion Rate */}
              <Card className="bg-muted/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ClipboardList className="w-4 h-4" />
                    Task History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {tasksLoading ? (
                    <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin" /></div>
                  ) : volunteerTasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2">No tasks assigned yet</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-3 mb-3">
                        <div className="text-center">
                          <p className="text-lg font-bold">{volunteerTasks.length}</p>
                          <p className="text-xs text-muted-foreground">Total</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-red-600">{volunteerTasks.filter(t => t.status === 'Completed' || t.status === 'Verified').length}</p>
                          <p className="text-xs text-muted-foreground">Completed</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-amber-600">
                            {volunteerTasks.length > 0 ? Math.round((volunteerTasks.filter(t => t.status === 'Completed' || t.status === 'Verified').length / volunteerTasks.length) * 100) : 0}%
                          </p>
                          <p className="text-xs text-muted-foreground">Rate</p>
                        </div>
                      </div>
                      <Progress
                        value={(volunteerTasks.filter(t => t.status === 'Completed' || t.status === 'Verified').length / volunteerTasks.length) * 100}
                        className="h-2 mb-3"
                      />
                      <ScrollArea className="max-h-32">
                        <div className="space-y-1">
                          {volunteerTasks.slice(0, 5).map(task => (
                            <div key={task.id} className="flex items-center justify-between text-xs bg-muted/50 rounded p-2">
                              <span className="truncate flex-1">Pickup from {task.donation?.donor?.name || 'Unknown'}</span>
                              <StatusBadge status={task.status} />
                            </div>
                          ))}
                          {volunteerTasks.length > 5 && (
                            <p className="text-xs text-muted-foreground text-center mt-1">
                              +{volunteerTasks.length - 5} more tasks
                            </p>
                          )}
                        </div>
                      </ScrollArea>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter className="flex justify-between sm:justify-end gap-2">
            <Button variant="outline" onClick={() => setShowDetails(false)}>
              Close
            </Button>
            {selectedVolunteer?.status === 'Pending' && (
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={() => handleStatusUpdate(selectedVolunteer.id, 'Rejected')}
                >
                  <X className="w-4 h-4 mr-1" /> Reject
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => handleStatusUpdate(selectedVolunteer.id, 'Active')}
                >
                  <CheckCircle className="w-4 h-4 mr-1" /> Approve
                </Button>
              </div>
            )}
            {selectedVolunteer?.status === 'Active' && (
              <Badge className="bg-red-600 text-white px-4 py-2 text-sm">
                <CheckCircle className="w-4 h-4 mr-2" /> Approved
              </Badge>
            )}
            {selectedVolunteer?.status === 'Rejected' && (
              <Badge variant="destructive" className="px-4 py-2 text-sm">
                <X className="w-4 h-4 mr-2" /> Rejected
              </Badge>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
