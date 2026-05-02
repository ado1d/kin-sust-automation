'use client'

import { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { TrendingUp } from 'lucide-react'

export function StatsCard({ title, value, icon, trend, color }: {
  title: string
  value: string
  icon: ReactNode
  trend?: string
  color?: string
}) {
  return (
    <Card className="p-4 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className={`text-2xl font-bold mt-1 ${color || ''}`}>{value}</p>
          {trend && (
            <p className="text-xs text-red-500 flex items-center mt-1">
              <TrendingUp className="w-3 h-3 mr-1" />{trend}
            </p>
          )}
        </div>
        <div className={`p-2.5 rounded-xl bg-muted/80 ${color || ''}`}>
          {icon}
        </div>
      </div>
    </Card>
  )
}
