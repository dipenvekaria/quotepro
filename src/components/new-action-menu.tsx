// @ts-nocheck - New lead_status column pending database migration
'use client'

import { useState } from 'react'
import { Plus, Phone, Calendar, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NewLeadDialog } from './new-lead-dialog'
import { useRouter } from 'next/navigation'

interface NewActionMenuProps {
  companyId: string
}

export function NewActionMenu({ companyId }: NewActionMenuProps) {
  const router = useRouter()
  const [showNewLeadDialog, setShowNewLeadDialog] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="lg"
            className="fixed bottom-20 right-4 z-50 h-14 w-14 rounded-full bg-[#FF6200] hover:bg-[#FF6200]/90 shadow-lg lg:hidden"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Create New</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowNewLeadDialog(true)}>
            <Phone className="mr-2 h-4 w-4" />
            <span>New Lead</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/quotes/new?schedule_visit=true')}>
            <Calendar className="mr-2 h-4 w-4" />
            <span>Schedule Quote Visit</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/quotes/new')}>
            <FileText className="mr-2 h-4 w-4" />
            <span>Create Quote Directly</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Desktop version */}
      <div className="hidden lg:block">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="w-full bg-[#FF6200] hover:bg-[#FF6200]/90 text-white">
              <Plus className="h-4 w-4 mr-2" />
              New...
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Create New</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowNewLeadDialog(true)}>
              <Phone className="mr-2 h-4 w-4" />
              <span>New Lead</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/quotes/new?schedule_visit=true')}>
              <Calendar className="mr-2 h-4 w-4" />
              <span>Schedule Quote Visit</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/quotes/new')}>
              <FileText className="mr-2 h-4 w-4" />
              <span>Create Quote Directly</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <NewLeadDialog 
        open={showNewLeadDialog} 
        onOpenChange={setShowNewLeadDialog}
        companyId={companyId}
      />
    </>
  )
}
