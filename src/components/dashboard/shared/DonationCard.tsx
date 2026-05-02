'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatCurrency } from '@/lib/api'
import { Donation } from '@/lib/types'
import { StatusBadge } from '@/components/common/StatusBadge'

export function DonationCard({ donation, detailed }: { donation: Donation; detailed?: boolean }) {
  return (
    <Card className={`${detailed ? '' : 'p-4'} hover:shadow-md transition-shadow duration-200`}>
      {detailed && <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span>{donation.type === 'monetary' ? 'Monetary Donation' : 'In-Kind Donation'}</span>
          <StatusBadge status={donation.status} />
        </CardTitle>
      </CardHeader>}
      <CardContent className={detailed ? '' : 'p-0'}>
        <div className="flex items-start justify-between">
          <div>
            {detailed && donation.donor && (
              <p className="font-medium">{donation.donor.name}</p>
            )}
            <p className="text-lg font-semibold">
              {donation.type === 'monetary' 
                ? formatCurrency(donation.amount || 0) 
                : `${donation.items?.length || 0} items`}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatDate(donation.createdAt)}
              {donation.event && ` • ${donation.event.name}`}
            </p>
          </div>
          {!detailed && (
            <StatusBadge status={donation.status} />
          )}
        </div>
        {detailed && donation.items && donation.items.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium mb-2">Items:</p>
            <div className="flex flex-wrap gap-2">
              {donation.items.map((item, i) => (
                <Badge key={i} variant="secondary">
                  {item.itemName} ({item.quantity})
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
