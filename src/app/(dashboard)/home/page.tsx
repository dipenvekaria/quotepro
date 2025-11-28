// @ts-nocheck - Supabase type generation pending
'use client'

import { QueueHeader, EmptyQueue } from '@/components/queues'
import { Construction } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <QueueHeader
        title="Home"
        description="Your personalized dashboard"
      />

      {/* TBD Placeholder */}
      <EmptyQueue
        icon={Construction}
        title="Coming Soon"
        message="Your personalized home dashboard with daily tasks, priorities, and quick stats will be built here."
      />
    </div>
  )
}
