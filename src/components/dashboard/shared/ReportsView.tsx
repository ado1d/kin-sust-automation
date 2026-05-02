'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { DollarSign, Package, Gift, Download, Loader2 } from 'lucide-react'
import { api, formatCurrency } from '@/lib/api'
import { toast } from '@/hooks/use-toast'

export function ReportsView() {
  const [reports, setReports] = useState<{
    totalMonetary: number
    totalInKindItems: number
    remainingItems: number
    monetaryByEvent: { eventName: string; amount: number }[]
    inKindByEvent: { eventName: string; count: number }[]
    remainingByCategory: { category: string; quantity: number }[]
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const data = await api('/admin/reports')
        setReports(data)
      } catch (e) {
        console.error(e)
      }
      setLoading(false)
    }
    fetchReports()
  }, [])

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>
  }

  if (!reports) {
    return <Card className="p-8 text-center"><p>Failed to load reports</p></Card>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Reports</h2>
        <Button onClick={async () => {
          try {
            const response = await fetch('/api/admin/audit?format=csv')
            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'audit-report.csv'
            a.click()
            window.URL.revokeObjectURL(url)
            toast({ title: 'Download started' })
          } catch (e) {
            toast({ title: 'Error', description: 'Failed to download', variant: 'destructive' })
          }
        }} variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" /> Export Audit CSV
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="text-center">
            <DollarSign className="w-10 h-10 mx-auto mb-2 text-red-500" />
            <p className="text-3xl font-bold">{formatCurrency(reports.totalMonetary)}</p>
            <p className="text-sm text-muted-foreground">Total Monetary Donations</p>
          </div>
        </Card>
        <Card className="p-6">
          <div className="text-center">
            <Package className="w-10 h-10 mx-auto mb-2 text-amber-500" />
            <p className="text-3xl font-bold">{reports.totalInKindItems}</p>
            <p className="text-sm text-muted-foreground">Total In-Kind Items</p>
          </div>
        </Card>
        <Card className="p-6">
          <div className="text-center">
            <Gift className="w-10 h-10 mx-auto mb-2 text-violet-500" />
            <p className="text-3xl font-bold">{reports.remainingItems}</p>
            <p className="text-sm text-muted-foreground">Remaining Items</p>
          </div>
        </Card>
      </div>

      {/* Tables */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monetary Donations by Event/Drive</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              {reports.monetaryByEvent.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No data available</p>
              ) : (
                <table className="w-full">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left p-2 text-sm">Event/Drive</th>
                      <th className="text-right p-2 text-sm">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.monetaryByEvent.map((item, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2 text-sm">{item.eventName || 'General'}</td>
                        <td className="p-2 text-sm text-right font-medium">{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">In-Kind Items by Event/Drive</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              {reports.inKindByEvent.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No data available</p>
              ) : (
                <table className="w-full">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left p-2 text-sm">Event/Drive</th>
                      <th className="text-right p-2 text-sm">Items</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.inKindByEvent.map((item, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2 text-sm">{item.eventName || 'General'}</td>
                        <td className="p-2 text-sm text-right font-medium">{item.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Remaining Items by Category */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Remaining Items by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {['Food', 'Cloth', 'Medicine', 'Others'].map(cat => {
              const catData = reports.remainingByCategory.find(
                (item: { category: string; quantity: number }) =>
                  item.category.toLowerCase() === cat.toLowerCase() ||
                  (cat === 'Medicine' && item.category.toLowerCase() === 'med')
              )
              return (
                <div key={cat} className="text-center p-4 rounded-lg bg-muted/50">
                  <Package className="w-8 h-8 mx-auto mb-2 text-red-500" />
                  <p className="text-2xl font-bold">{catData?.quantity || 0}</p>
                  <p className="text-sm text-muted-foreground">{cat}</p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
