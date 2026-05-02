'use client'

import { useState, useContext } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowRight, Mail, Lock, Heart, Users, Shield, Phone, MapPin, Upload, Loader2, Moon, Sun } from 'lucide-react'
import { ThemeContext } from '@/contexts/ThemeContext'
import { api } from '@/lib/api'
import { toast } from '@/hooks/use-toast'
import type { User } from '@/lib/types'

export function AuthView({ role, mode, onLogin, onSwitch, onBack }: {
  role: 'donor' | 'volunteer' | 'admin'
  mode: 'login' | 'register'
  onLogin: (user: User) => void
  onSwitch?: () => void
  onBack: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const { theme, toggleTheme } = useContext(ThemeContext)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'login') {
        const data = await api('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ ...formData, role })
        })
        if (data.success) {
          onLogin(data.user)
          toast({ title: 'Welcome back!', description: `Logged in as ${data.user.name}` })
        }
      } else {
        const data = await api('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ ...formData, role })
        })
        if (data.success) {
          toast({ title: 'Registration successful!', description: data.message || 'Please login now.' })
          if (onSwitch) onSwitch()
        }
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: (err as Error).message,
        variant: 'destructive'
      })
    }
    setLoading(false)
  }

  const roleColors = {
    donor: 'from-rose-500 to-pink-600',
    volunteer: 'from-amber-500 to-orange-600',
    admin: 'from-violet-500 to-purple-600'
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img
              src="/kin-logo.png"
              alt="KIN Logo"
              className="h-12 w-auto"
            />
          </div>

          <button onClick={onBack} className="flex items-center text-muted-foreground hover:text-foreground mb-8 transition-colors">
            <ArrowRight className="w-4 h-4 mr-2 rotate-180" /> Back to Home
          </button>

          <div className="mb-8">
            <div className={`inline-flex w-14 h-14 rounded-xl bg-gradient-to-br ${roleColors[role]} items-center justify-center text-white shadow-lg mb-4`}>
              {role === 'donor' && <Heart className="w-7 h-7" />}
              {role === 'volunteer' && <Users className="w-7 h-7" />}
              {role === 'admin' && <Shield className="w-7 h-7" />}
            </div>
            <h1 className="text-3xl font-bold">
              {mode === 'login' ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="text-muted-foreground mt-2">
              {mode === 'login'
                ? `Sign in to your ${role} account`
                : `Register as a ${role}`}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={formData.name || ''}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className="pl-10"
                  value={formData.email || ''}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10"
                  value={formData.password || ''}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>
            </div>

            {mode === 'register' && role !== 'admin' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone {role === 'volunteer' && '*'}</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+880 1XXX-XXXXXX"
                      className="pl-10"
                      value={formData.phone || ''}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      required={role === 'volunteer'}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address {role === 'volunteer' && '*'}</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="address"
                      placeholder="123 Main St, City"
                      className="pl-10"
                      value={formData.address || ''}
                      onChange={e => setFormData({ ...formData, address: e.target.value })}
                      required={role === 'volunteer'}
                    />
                  </div>
                </div>

                {role === 'volunteer' && (
                  <>
                    {/* Additional Volunteer Fields */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fatherName">Father's Name</Label>
                        <Input
                          id="fatherName"
                          placeholder="Father's name"
                          value={formData.fatherName || ''}
                          onChange={e => setFormData({ ...formData, fatherName: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="motherName">Mother's Name</Label>
                        <Input
                          id="motherName"
                          placeholder="Mother's name"
                          value={formData.motherName || ''}
                          onChange={e => setFormData({ ...formData, motherName: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="dateOfBirth">Date of Birth</Label>
                        <Input
                          id="dateOfBirth"
                          type="date"
                          value={formData.dateOfBirth || ''}
                          onChange={e => setFormData({ ...formData, dateOfBirth: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bloodGroup">Blood Group</Label>
                        <Select
                          value={formData.bloodGroup || ''}
                          onValueChange={v => setFormData({ ...formData, bloodGroup: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
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
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="permanentAddress">Permanent Address</Label>
                      <Textarea
                        id="permanentAddress"
                        placeholder="Enter your permanent address"
                        value={formData.permanentAddress || ''}
                        onChange={e => setFormData({ ...formData, permanentAddress: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="institution">Institution</Label>
                        <Input
                          id="institution"
                          placeholder="University/College"
                          value={formData.institution || ''}
                          onChange={e => setFormData({ ...formData, institution: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="department">Department</Label>
                        <Input
                          id="department"
                          placeholder="Department"
                          value={formData.department || ''}
                          onChange={e => setFormData({ ...formData, department: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="session">Session</Label>
                        <Input
                          id="session"
                          placeholder="e.g., 2020-2021"
                          value={formData.session || ''}
                          onChange={e => setFormData({ ...formData, session: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="regNo">Registration No.</Label>
                        <Input
                          id="regNo"
                          placeholder="Reg. Number"
                          value={formData.regNo || ''}
                          onChange={e => setFormData({ ...formData, regNo: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="donatedBlood">Have you donated blood before?</Label>
                      <Select
                        value={formData.donatedBlood || ''}
                        onValueChange={v => setFormData({ ...formData, donatedBlood: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Yes">Yes</SelectItem>
                          <SelectItem value="No">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Activities Checkboxes */}
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
                              id={activity.id}
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
                            <Label htmlFor={activity.id} className="text-sm font-normal cursor-pointer">
                              {activity.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Skills/Interests Checkboxes */}
                    <div className="space-y-2">
                      <Label>Interests/Skills (Select all that apply)</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 border rounded-lg max-h-48 overflow-y-auto">
                        {[
                          { id: 'singing', label: 'Singing' },
                          { id: 'dancing', label: 'Dancing' },
                          { id: 'recitation', label: 'Recitation' },
                          { id: 'programming', label: 'Programming' },
                          { id: 'drawing', label: 'Drawing' },
                          { id: 'digital_art', label: 'Digital Art' },
                          { id: 'sports', label: 'Sports' },
                          { id: 'photography', label: 'Photography' },
                          { id: 'content_writing', label: 'Content Writing' }
                        ].map(skill => (
                          <div key={skill.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={skill.id}
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
                            <Label htmlFor={skill.id} className="text-sm font-normal cursor-pointer">
                              {skill.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Photo Upload */}
                    <div className="space-y-2">
                      <Label htmlFor="photo">Photo *</Label>
                      <div className="border-2 border-dashed border-muted-foreground/25 dark:border-muted-foreground/15 rounded-lg p-4 text-center hover:border-red-400 dark:hover:border-red-600 hover:bg-red-50/50 dark:hover:bg-red-900/10 transition-colors duration-200">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              const reader = new FileReader()
                              reader.onloadend = () => {
                                setFormData({ ...formData, photo: reader.result as string })
                              }
                              reader.readAsDataURL(file)
                            }
                          }}
                          className="hidden"
                          id="volunteer-photo"
                        />
                        <label htmlFor="volunteer-photo" className="cursor-pointer">
                          {formData.photo ? (
                            <div className="space-y-2">
                              <img src={formData.photo} alt="Preview" className="max-h-32 mx-auto rounded-lg shadow-md" />
                              <p className="text-xs text-red-600">Click to change photo</p>
                            </div>
                          ) : (
                            <div className="text-muted-foreground">
                              <Upload className="w-8 h-8 mx-auto mb-2" />
                              <p className="text-sm">Upload your photo</p>
                              <p className="text-xs mt-1">JPG, PNG (Max 5MB)</p>
                            </div>
                          )}
                        </label>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            {role === 'admin' && mode === 'login' && (
              <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                <strong>Demo credentials:</strong><br />
                Email: admin@kin.org<br />
                Password: admin123
              </p>
            )}

            <Button type="submit" className="w-full h-11 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (mode === 'login' ? 'Sign In' : 'Create Account')}
            </Button>
          </form>

          {role !== 'admin' && onSwitch && (
            <p className="text-center mt-6 text-muted-foreground">
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button onClick={onSwitch} className="text-red-600 hover:underline font-medium">
                {mode === 'login' ? 'Register' : 'Sign In'}
              </button>
            </p>
          )}
        </div>
      </div>

      {/* Right side - Visual */}
      <div className={`hidden lg:flex flex-1 bg-gradient-to-br ${roleColors[role]} items-center justify-center p-12 relative overflow-hidden`}>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
        </div>
        <div className="relative text-white text-center">
          <h2 className="text-4xl font-bold mb-4">
            {role === 'donor' && 'Make a Difference'}
            {role === 'volunteer' && 'Join Our Team'}
            {role === 'admin' && 'Manage & Monitor'}
          </h2>
          <p className="text-xl text-white/90 max-w-md">
            {role === 'donor' && 'Your generosity helps us create positive change in communities around the world.'}
            {role === 'volunteer' && 'Be part of something bigger. Help us deliver hope to those who need it most.'}
            {role === 'admin' && 'Oversee operations and ensure every donation reaches its destination.'}
          </p>
        </div>

        <button
          onClick={toggleTheme}
          className="absolute top-4 right-4 p-3 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all"
        >
          {theme === 'light' ? <Moon className="w-5 h-5 text-white" /> : <Sun className="w-5 h-5 text-white" />}
        </button>
      </div>
    </div>
  )
}
