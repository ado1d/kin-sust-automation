'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader2, Mail } from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from '@/hooks/use-toast'
import { Message } from '@/lib/types'
import { StatusBadge } from '@/components/common/StatusBadge'

export function ManageMessages({ messages, onRefresh }: { messages: Message[]; onRefresh: () => void }) {
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [reply, setReply] = useState('')
  const [replying, setReplying] = useState(false)

  const handleReply = async () => {
    if (!selectedMessage || !reply.trim()) return

    setReplying(true)
    try {
      await api('/contact', {
        method: 'PUT',
        body: JSON.stringify({
          id: selectedMessage.id,
          reply,
          repliedBy: 'admin'
        })
      })
      toast({ title: 'Reply Sent!', description: 'Your reply has been sent to the user.' })
      setSelectedMessage(null)
      setReply('')
      onRefresh()
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to send reply', variant: 'destructive' })
    }
    setReplying(false)
  }

  const handleMarkAsRead = async (messageId: string) => {
    try {
      await api('/contact', {
        method: 'PUT',
        body: JSON.stringify({ id: messageId, status: 'read' })
      })
      onRefresh()
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  const unreadCount = messages.filter(m => m.status === 'unread').length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Messages</h2>
          <p className="text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread message${unreadCount > 1 ? 's' : ''}` : 'All messages read'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Messages List */}
        <div className="lg:col-span-1">
          <Card className="h-fit">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Inbox</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[500px] overflow-y-auto">
                {messages.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    No messages
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-3 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                        selectedMessage?.id === msg.id ? 'bg-muted/50' : ''
                      } ${msg.status === 'unread' ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                      onClick={() => {
                        setSelectedMessage(msg)
                        if (msg.status === 'unread') {
                          handleMarkAsRead(msg.id)
                        }
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{msg.senderName}</p>
                            {msg.status === 'unread' && (
                              <span className="w-2 h-2 bg-blue-500 rounded-full" />
                            )}
                          </div>
                          <p className="text-sm font-medium truncate">{msg.subject}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{msg.message}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs capitalize">{msg.senderType}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(msg.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <StatusBadge status={msg.status} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Message Detail */}
        <div className="lg:col-span-2">
          {selectedMessage ? (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{selectedMessage.subject}</CardTitle>
                    <CardDescription>
                      From: {selectedMessage.senderName} ({selectedMessage.senderEmail})
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="capitalize">{selectedMessage.senderType}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Message</Label>
                  <p className="mt-1 p-3 bg-muted/30 dark:bg-muted/20 rounded-lg">{selectedMessage.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Sent on {new Date(selectedMessage.createdAt).toLocaleString()}
                  </p>
                </div>

                {selectedMessage.reply ? (
                  <div>
                    <Label className="text-sm text-muted-foreground">Your Reply</Label>
                    <p className="mt-1 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      {selectedMessage.reply}
                    </p>
                    {selectedMessage.repliedAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Replied on {new Date(selectedMessage.repliedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="reply">Reply</Label>
                    <Textarea
                      id="reply"
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder="Type your reply..."
                      rows={4}
                      className="focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                    />
                    <Button
                      onClick={handleReply}
                      disabled={replying || !reply.trim()}
                      className="mt-2 bg-gradient-to-r from-red-600 to-red-700"
                    >
                      {replying ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...
                        </>
                      ) : (
                        <>
                          <Mail className="w-4 h-4 mr-2" /> Send Reply
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full flex items-center justify-center border-dashed">
              <div className="text-center text-muted-foreground p-8">
                <div className="mx-auto w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                  <Mail className="w-8 h-8 text-muted-foreground/40" />
                </div>
                <p className="font-medium">Select a message</p>
                <p className="text-sm mt-1">Choose a message from the inbox to view details</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
