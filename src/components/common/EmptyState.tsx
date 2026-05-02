'use client'

import { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function EmptyState({ icon, title, description, actionLabel, onAction }: {
  icon: ReactNode
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <Card className="p-8 text-center border-dashed">
      <div className="mx-auto w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
        <div className="text-muted-foreground/40">{icon}</div>
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6 max-w-sm mx-auto">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="bg-gradient-to-r from-red-600 to-red-700">
          {actionLabel}
        </Button>
      )}
    </Card>
  )
}
