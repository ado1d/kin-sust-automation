'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DollarSign, Package } from 'lucide-react'

export function DonationModal({ open, onClose, onNavigateMonetary, onNavigateInKind }: {
  open: boolean
  onClose: () => void
  onNavigateMonetary: () => void
  onNavigateInKind: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Make a Donation</DialogTitle>
          <DialogDescription>Choose how you'd like to contribute</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
          <Card
            className="cursor-pointer hover:border-red-500 hover:shadow-md transition-all p-6 text-center"
            onClick={() => { onClose(); onNavigateMonetary() }}
          >
            <div className="mx-auto w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-3">
              <DollarSign className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="font-semibold mb-1">Monetary</h3>
            <p className="text-sm text-muted-foreground">Donate money online or via cash pickup</p>
          </Card>

          <Card
            className="cursor-pointer hover:border-red-500 hover:shadow-md transition-all p-6 text-center"
            onClick={() => { onClose(); onNavigateInKind() }}
          >
            <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-3">
              <Package className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="font-semibold mb-1">In-Kind</h3>
            <p className="text-sm text-muted-foreground">Donate items like food, clothes, medicine</p>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
