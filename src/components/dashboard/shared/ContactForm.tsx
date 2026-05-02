'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Mail, Loader2, CheckCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from '@/hooks/use-toast'
import { Message } from '@/lib/types'
import { StatusBadge } from '@/components/common/StatusBadge'

export function ContactForm({ 
  userId, 
  userType, 
  userName, 
  userEmail, 
  messages,
  onMessageSent 
}: { 
  userId: string
  userType: 'donor' | 'volunteer'
  userName: string
  userEmail: string
  messages: Message[]
  onMessageSent: () => void
}) {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim() || !message.trim()) {
      toast({ title: 'Error', description: 'Please fill in all fields', variant: 'destructive' })
      return
    }

    setSending(true)
    try {
      const res = await api('/contact', {
        method: 'POST',
        body: JSON.stringify({
          senderId: userId,
          senderType: userType,
          senderName: userName,
          senderEmail: userEmail,
          subject,
          message
        })
      })

      if (res.message) {
        toast({ title: 'Message Sent!', description: 'We will get back to you soon.' })
        setSubject('')
        setMessage('')
        onMessageSent()
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to send message', variant: 'destructive' })
    }
    setSending(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Contact Us</h2>
          <p className="text-muted-foreground">Send us a message or view your conversations</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Send Message Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Send a Message</CardTitle>
            <CardDescription>Have a question or feedback? We're here to help!</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="What is this about?"
                  required
                />
              </div>
              <div>
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write your message here..."
                  rows={5}
                  required
                />
              </div>
              <Button type="submit" disabled={sending} className="w-full bg-gradient-to-r from-red-600 to-red-700">
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" /> Send Message
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Messages List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Messages</CardTitle>
            <CardDescription>View your conversation history</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="mx-auto w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                    <Mail className="w-8 h-8 text-muted-foreground/40" />
                  </div>
                  <p className="font-medium mb-1">No messages yet</p>
                  <p className="text-sm">Start a conversation!</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${
                      selectedMessage?.id === msg.id ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : ''
                    }`}
                    onClick={() => setSelectedMessage(msg)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{msg.subject}</p>
                        <p className="text-sm text-muted-foreground line-clamp-1">{msg.message}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <StatusBadge status={msg.status} />
                          <span className="text-xs text-muted-foreground">
                            {new Date(msg.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      {msg.status === 'replied' && (
                        <CheckCircle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Message Detail Modal */}
      {selectedMessage && (
        <Dialog open={!!selectedMessage} onOpenChange={() => setSelectedMessage(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{selectedMessage.subject}</DialogTitle>
              <DialogDescription>
                Sent on {new Date(selectedMessage.createdAt).toLocaleString()}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground">Your Message</Label>
                <p className="mt-1 p-3 bg-muted/30 rounded-lg">{selectedMessage.message}</p>
              </div>
              {selectedMessage.reply && (
                <div>
                  <Label className="text-sm text-muted-foreground">Admin Reply</Label>
                  <p className="mt-1 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    {selectedMessage.reply}
                  </p>
                  {selectedMessage.repliedAt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Replied on {new Date(selectedMessage.repliedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedMessage(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
