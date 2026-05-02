'use client'

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, MapPin } from 'lucide-react'
import { formatDate } from '@/lib/api'
import { Event } from '@/lib/types'

export function EventCard({ event, onDonate }: { event: Event; onDonate?: () => void }) {
  return (
    <Card className="overflow-hidden group">
      <div className="h-32 bg-gradient-to-br from-red-500 to-red-600 relative">
        {event.image ? (
          <img src={event.image} alt={event.name} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Calendar className="w-12 h-12 text-white/50" />
          </div>
        )}
        <Badge className="absolute top-2 right-2" variant={event.status === 'Published' ? 'default' : 'secondary'}>
          {event.status}
        </Badge>
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{event.name}</CardTitle>
        <CardDescription className="line-clamp-2">{event.description}</CardDescription>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {formatDate(event.startDate)}
            {event.endDate && ` - ${formatDate(event.endDate)}`}
          </div>
          {event.location && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {event.location}
            </div>
          )}
        </div>
        {onDonate && (
          <Button className="w-full mt-4 bg-gradient-to-r from-red-600 to-red-700" onClick={onDonate}>
            Donate Now
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
