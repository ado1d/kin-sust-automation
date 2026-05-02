'use client'

import { useState, useContext } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  User, Mail, Phone, MapPin, Camera, Heart, Users, Key, Lock, Eye, EyeOff,
  Save, Loader2, GraduationCap, Building, Droplet
} from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from '@/hooks/use-toast'
import { SessionContext } from '@/contexts/SessionContext'

export function ProfileSettings({ isVolunteer }: { isVolunteer?: boolean }) {
  const { user, setUser } = useContext(SessionContext)
  const [loading, setLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('personal')
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)

  const [formData, setFormData] = useState<Record<string, string>>({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
    // Volunteer fields
    fatherName: user?.fatherName || '',
    motherName: user?.motherName || '',
    dateOfBirth: user?.dateOfBirth || '',
    bloodGroup: user?.bloodGroup || '',
    institution: user?.institution || '',
    department: user?.department || '',
    session: user?.session || '',
    regNo: user?.regNo || '',
    donatedBlood: user?.donatedBlood || '',
    activities: user?.activities || '',
    skills: user?.skills || '',
    // Donor fields
    notes: user?.notes || '',
  })

  // Profile picture source
  const currentAvatar = photoPreview || user?.avatar || user?.photo

  // Calculate profile completion
  const getProfileFields = () => {
    const baseFields = ['name', 'phone', 'address']
    const volunteerFields = ['fatherName', 'motherName', 'dateOfBirth', 'bloodGroup', 'institution', 'department', 'activities', 'skills']
    const allFields = isVolunteer ? [...baseFields, ...volunteerFields] : [...baseFields, 'notes']
    const filled = allFields.filter(field => {
      const value = formData[field]
      return value && value.length > 0
    })
    return { total: allFields.length, filled: filled.length }
  }
  const profileStats = getProfileFields()
  const profileCompletion = Math.round((profileStats.filled / profileStats.total) * 100)

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: 'File too large', description: 'Please select an image under 5MB', variant: 'destructive' })
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const endpoint = isVolunteer ? '/volunteers' : '/donors'
      const submitData: Record<string, string> = {
        id: user?.id || '',
        name: formData.name,
        phone: formData.phone || '',
        address: formData.address || '',
      }

      if (isVolunteer) {
        submitData.fatherName = formData.fatherName || ''
        submitData.motherName = formData.motherName || ''
        submitData.dateOfBirth = formData.dateOfBirth || ''
        submitData.bloodGroup = formData.bloodGroup || ''
        submitData.institution = formData.institution || ''
        submitData.department = formData.department || ''
        submitData.session = formData.session || ''
        submitData.regNo = formData.regNo || ''
        submitData.donatedBlood = formData.donatedBlood || ''
        submitData.activities = formData.activities || ''
        submitData.skills = formData.skills || ''
        if (photoPreview) {
          submitData.photo = photoPreview
        }
      } else {
        submitData.notes = formData.notes || ''
        if (photoPreview) {
          submitData.avatar = photoPreview
        }
      }

      const data = await api(endpoint, {
        method: 'PUT',
        body: JSON.stringify(submitData)
      })

      // Update user context with new data
      const updatedUser = { ...user!, name: formData.name, phone: formData.phone, address: formData.address }
      if (isVolunteer && photoPreview) {
        updatedUser.photo = photoPreview
      } else if (photoPreview) {
        updatedUser.avatar = photoPreview
      }
      if (isVolunteer) {
        Object.assign(updatedUser, {
          fatherName: formData.fatherName,
          motherName: formData.motherName,
          dateOfBirth: formData.dateOfBirth,
          bloodGroup: formData.bloodGroup,
          institution: formData.institution,
          department: formData.department,
          session: formData.session,
          regNo: formData.regNo,
          activities: formData.activities,
          skills: formData.skills,
        })
      } else {
        updatedUser.notes = formData.notes
      }
      setUser?.(updatedUser)
      setPhotoPreview(null)
      toast({ title: 'Profile updated!', description: 'Your profile has been saved successfully.' })
    } catch (e) {
      toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' })
    }
    setLoading(false)
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({ title: 'Passwords don\'t match', description: 'Please make sure both passwords are the same.', variant: 'destructive' })
      return
    }
    if (passwordData.newPassword.length < 6) {
      toast({ title: 'Password too short', description: 'Password must be at least 6 characters.', variant: 'destructive' })
      return
    }
    setPasswordLoading(true)
    try {
      const endpoint = isVolunteer ? '/volunteers' : '/donors'
      await api(endpoint, {
        method: 'PUT',
        body: JSON.stringify({ id: user?.id, currentPassword: passwordData.currentPassword, password: passwordData.newPassword })
      })
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      toast({ title: 'Password changed!', description: 'Your password has been updated successfully.' })
    } catch (e) {
      toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' })
    }
    setPasswordLoading(false)
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Profile Settings</h2>
          <p className="text-muted-foreground">Manage your account information</p>
        </div>
        <Badge variant="outline" className="text-sm">
          {profileCompletion}% Complete
        </Badge>
      </div>

      {/* Profile Completion Bar */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Profile Completion</span>
          <span className="text-sm text-muted-foreground">{profileStats.filled} of {profileStats.total} fields filled</span>
        </div>
        <Progress value={profileCompletion} className="h-2" />
        {profileCompletion < 100 && (
          <p className="text-xs text-muted-foreground mt-2">Complete your profile to unlock all features</p>
        )}
      </Card>

      {/* Profile Picture Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile Picture</CardTitle>
          <CardDescription>Upload a photo to personalize your account</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="relative group">
              <Avatar className="w-24 h-24 ring-2 ring-offset-2 ring-red-200 dark:ring-red-900">
                <AvatarImage src={currentAvatar} alt="Profile" />
                <AvatarFallback className="text-2xl bg-gradient-to-br from-red-600 to-red-700 text-white">
                  {user?.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <label
                htmlFor="profile-photo-upload"
                className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <Camera className="w-6 h-6 text-white" />
                <input
                  id="profile-photo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </label>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">{user?.name}</h3>
              <p className="text-sm text-muted-foreground capitalize flex items-center gap-1.5">
                {user?.role === 'donor' ? <Heart className="w-3.5 h-3.5 text-rose-500" /> : <Users className="w-3.5 h-3.5 text-amber-500" />}
                {user?.role}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('profile-photo-upload')?.click()}
                >
                  <Camera className="w-3.5 h-3.5 mr-1.5" /> Change Photo
                </Button>
                {currentAvatar && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    onClick={() => {
                      setPhotoPreview(null)
                      // Clear avatar/photo in form data
                      if (isVolunteer) {
                        api('/volunteers', {
                          method: 'PUT',
                          body: JSON.stringify({ id: user?.id, photo: '' })
                        }).then(() => {
                          setUser?.({ ...user!, photo: '' })
                        })
                      } else {
                        api('/donors', {
                          method: 'PUT',
                          body: JSON.stringify({ id: user?.id, avatar: '' })
                        }).then(() => {
                          setUser?.({ ...user!, avatar: '' })
                        })
                      }
                    }}
                  >
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">JPG, PNG or GIF. Max 5MB.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
        <button
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'personal'
              ? 'bg-card shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('personal')}
        >
          <User className="w-4 h-4 inline mr-1.5" /> Personal Info
        </button>
        {isVolunteer && (
          <button
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'education'
                ? 'bg-card shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('education')}
          >
            <GraduationCap className="w-4 h-4 inline mr-1.5" /> Education & Activities
          </button>
        )}
        <button
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'security'
              ? 'bg-card shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('security')}
        >
          <Key className="w-4 h-4 inline mr-1.5" /> Security
        </button>
      </div>

      {/* Personal Info Tab */}
      {activeTab === 'personal' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Personal Information</CardTitle>
            <CardDescription>Update your personal details</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input id="name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="pl-10" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input id="email" type="email" value={formData.email} disabled className="pl-10 bg-muted" />
                  </div>
                  <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input id="phone" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="+880 1XXX-XXXXXX" className="pl-10" />
                  </div>
                </div>

                {isVolunteer && (
                  <div className="space-y-2">
                    <Label htmlFor="bloodGroup">Blood Group</Label>
                    <Select value={formData.bloodGroup || ''} onValueChange={v => setFormData({ ...formData, bloodGroup: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select blood group" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A+">A+</SelectItem>
                        <SelectItem value="A-">A-</SelectItem>
                        <SelectItem value="B+">B+</SelectItem>
                        <SelectItem value="B-">B-</SelectItem>
                        <SelectItem value="O+">O+</SelectItem>
                        <SelectItem value="O-">O-</SelectItem>
                        <SelectItem value="AB+">AB+</SelectItem>
                        <SelectItem value="AB-">AB-</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {isVolunteer && (
                  <div className="space-y-2">
                    <Label htmlFor="fatherName">Father's Name</Label>
                    <Input id="fatherName" value={formData.fatherName} onChange={e => setFormData({ ...formData, fatherName: e.target.value })} placeholder="Father's name" />
                  </div>
                )}
                {isVolunteer && (
                  <div className="space-y-2">
                    <Label htmlFor="motherName">Mother's Name</Label>
                    <Input id="motherName" value={formData.motherName} onChange={e => setFormData({ ...formData, motherName: e.target.value })} placeholder="Mother's name" />
                  </div>
                )}
              </div>

              {isVolunteer && (
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input id="dateOfBirth" type="date" value={formData.dateOfBirth} onChange={e => setFormData({ ...formData, dateOfBirth: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="donatedBlood">Have you donated blood?</Label>
                    <Select value={formData.donatedBlood || ''} onValueChange={v => setFormData({ ...formData, donatedBlood: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Textarea id="address" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="Enter your address" className="pl-10 min-h-[80px]" />
                </div>
              </div>

              {!isVolunteer && (
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Any notes about yourself" className="min-h-[80px]" />
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <Button type="submit" disabled={loading} className="bg-gradient-to-r from-red-600 to-red-700">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Changes
                </Button>
                {photoPreview && (
                  <Badge variant="outline" className="text-amber-600 border-amber-300">
                    Unsaved photo changes
                  </Badge>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Education & Activities Tab (Volunteer only) */}
      {activeTab === 'education' && isVolunteer && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Education & Activities</CardTitle>
            <CardDescription>Update your educational and volunteer activity details</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="institution">Institution</Label>
                  <div className="relative">
                    <Building className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input id="institution" value={formData.institution} onChange={e => setFormData({ ...formData, institution: e.target.value })} placeholder="University/College" className="pl-10" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input id="department" value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} placeholder="Department" />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="session">Session</Label>
                  <Input id="session" value={formData.session} onChange={e => setFormData({ ...formData, session: e.target.value })} placeholder="e.g., 2020-2021" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="regNo">Registration No.</Label>
                  <Input id="regNo" value={formData.regNo} onChange={e => setFormData({ ...formData, regNo: e.target.value })} placeholder="Registration number" />
                </div>
              </div>

              {/* Activities */}
              <div className="space-y-2">
                <Label>Activities (Select all that apply)</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 border rounded-lg max-h-48 overflow-y-auto">
                  {[
                    { id: 'blood_donation', label: 'Blood donation' },
                    { id: 'education_program', label: 'Education program for underprivileged children' },
                    { id: 'winter_help', label: 'Help winter affected people' },
                    { id: 'charity_programs', label: 'Arranging charity programs' },
                    { id: 'social_awareness', label: 'Social awareness activities' },
                    { id: 'emergency_response', label: 'Responding to national/international emergencies' }
                  ].map(activity => (
                    <div key={activity.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`profile-activity-${activity.id}`}
                        checked={formData.activities?.includes(activity.id) || false}
                        onCheckedChange={(checked) => {
                          const currentActivities = formData.activities ? formData.activities.split(',').filter(Boolean) : []
                          if (checked) {
                            currentActivities.push(activity.id)
                          } else {
                            const index = currentActivities.indexOf(activity.id)
                            if (index > -1) currentActivities.splice(index, 1)
                          }
                          setFormData({ ...formData, activities: currentActivities.join(',') })
                        }}
                      />
                      <Label htmlFor={`profile-activity-${activity.id}`} className="text-sm font-normal cursor-pointer">
                        {activity.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Skills */}
              <div className="space-y-2">
                <Label>Skills & Interests (Select all that apply)</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 border rounded-lg max-h-48 overflow-y-auto">
                  {[
                    { id: 'teaching', label: 'Teaching & Tutoring' },
                    { id: 'medical', label: 'Medical Assistance' },
                    { id: 'event_management', label: 'Event Management' },
                    { id: 'photography', label: 'Photography & Media' },
                    { id: 'logistics', label: 'Logistics & Transport' },
                    { id: 'counseling', label: 'Counseling & Support' },
                    { id: 'fundraising', label: 'Fundraising' },
                    { id: 'it_technology', label: 'IT & Technology' }
                  ].map(skill => (
                    <div key={skill.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`profile-skill-${skill.id}`}
                        checked={formData.skills?.includes(skill.id) || false}
                        onCheckedChange={(checked) => {
                          const currentSkills = formData.skills ? formData.skills.split(',').filter(Boolean) : []
                          if (checked) {
                            currentSkills.push(skill.id)
                          } else {
                            const index = currentSkills.indexOf(skill.id)
                            if (index > -1) currentSkills.splice(index, 1)
                          }
                          setFormData({ ...formData, skills: currentSkills.join(',') })
                        }}
                      />
                      <Label htmlFor={`profile-skill-${skill.id}`} className="text-sm font-normal cursor-pointer">
                        {skill.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button type="submit" disabled={loading} className="bg-gradient-to-r from-red-600 to-red-700">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Change Password</CardTitle>
            <CardDescription>Update your account password for security</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={e => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="pl-10 pr-10"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">Must be at least 6 characters</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="pl-10"
                    required
                    minLength={6}
                  />
                </div>
                {passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                  <p className="text-xs text-red-500">Passwords don't match</p>
                )}
              </div>

              <Button type="submit" disabled={passwordLoading} className="bg-gradient-to-r from-red-600 to-red-700">
                {passwordLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Key className="w-4 h-4 mr-2" />}
                Change Password
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Account Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Email</p>
                <p className="font-medium">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Role</p>
                <p className="font-medium capitalize">{user?.role}</p>
              </div>
            </div>
            {user?.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Phone</p>
                  <p className="font-medium">{user.phone}</p>
                </div>
              </div>
            )}
            {isVolunteer && user?.bloodGroup && (
              <div className="flex items-center gap-2">
                <Droplet className="w-4 h-4 text-red-500" />
                <div>
                  <p className="text-muted-foreground">Blood Group</p>
                  <p className="font-medium">{user.bloodGroup}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
