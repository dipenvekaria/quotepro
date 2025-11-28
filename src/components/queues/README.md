# Queue Component Library

Reusable components for all queue pages in QuotePro 2.0. These components provide consistent UI/UX across Leads, Quotes, Work, and Pay sections.

## Components

### QueueHeader
Standard header for queue pages with title, description, count badge, and action button.

```tsx
import { QueueHeader } from '@/components/queues'
import { Button } from '@/components/ui/button'

<QueueHeader
  title="Leads"
  description="New customer calls and inquiries"
  count={12}
  action={
    <Button>
      <Plus className="w-4 h-4 mr-2" />
      New Lead
    </Button>
  }
/>
```

### QueueSearch
Search bar component with search icon and clear button.

```tsx
import { QueueSearch } from '@/components/queues'

const [searchTerm, setSearchTerm] = useState('')

<QueueSearch
  value={searchTerm}
  onChange={setSearchTerm}
  placeholder="Search by customer name..."
/>
```

### QueueFilters
Dropdown filter component with count badges.

```tsx
import { QueueFilters } from '@/components/queues'

const filterOptions = [
  { label: 'All', value: 'all', count: 25 },
  { label: 'New', value: 'new', count: 12 },
  { label: 'Contacted', value: 'contacted', count: 13 }
]

const [filter, setFilter] = useState('all')

<QueueFilters
  label="Status"
  options={filterOptions}
  value={filter}
  onChange={setFilter}
/>
```

### QueueCard
Generic card component for displaying queue items with customer info, address, amount, dates, and actions.

```tsx
import { QueueCard } from '@/components/queues'
import { QuoteStatusBadge } from '@/components/quote-status-badge'
import { Button } from '@/components/ui/button'

<QueueCard
  data={{
    id: quote.id,
    customer_name: quote.customer_name,
    customer_address: quote.customer_address,
    total: quote.total,
    created_at: quote.created_at,
    status: quote.status
  }}
  badge={<QuoteStatusBadge status={quote.status} />}
  actions={
    <Button size="sm">
      Schedule Visit
    </Button>
  }
  onClick={() => router.push(`/quotes/new?id=${quote.id}`)}
  showAmount={true}
  showDate={true}
  dateLabel="Created"
/>
```

### EmptyQueue
Empty state component for when queue has no items.

```tsx
import { EmptyQueue } from '@/components/queues'
import { Button } from '@/components/ui/button'

<EmptyQueue
  title="No leads yet"
  description="New customer calls will appear here. Click the button below to add your first lead."
  icon="users"
  action={
    <Button>
      <Plus className="w-4 h-4 mr-2" />
      Add First Lead
    </Button>
  }
/>
```

## Design Features

- **Dark Mode Support**: All components fully support dark mode
- **Orange Brand Color**: Uses #FF6200 for active states and primary actions
- **Consistent Spacing**: Follows Tailwind spacing scale
- **Responsive**: Works on mobile and desktop
- **Accessible**: Proper ARIA labels and keyboard navigation
- **Type Safe**: Full TypeScript support with exported interfaces

## Usage in Queue Pages

All 6 queue pages use these components:

1. **Leads Queue** (`/leads-and-quotes/leads`)
2. **Quotes Queue** (`/leads-and-quotes/quotes`)
3. **To be Scheduled** (`/work/to-be-scheduled`)
4. **Scheduled** (`/work/scheduled`)
5. **Invoice** (`/pay/invoice`)
6. **Paid** (`/pay/paid`)

### Example Queue Page Structure

```tsx
'use client'

import { useState, useMemo } from 'react'
import { useDashboard } from '@/lib/dashboard-context'
import { 
  QueueHeader, 
  QueueSearch, 
  QueueFilters, 
  QueueCard, 
  EmptyQueue 
} from '@/components/queues'

export default function LeadsQueuePage() {
  const { quotes } = useDashboard()
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState('all')

  // Filter data
  const filteredData = useMemo(() => {
    let filtered = quotes.filter(q => q.lead_status === 'new' || q.lead_status === 'contacted')
    
    if (searchTerm) {
      filtered = filtered.filter(q => 
        q.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    if (filter !== 'all') {
      filtered = filtered.filter(q => q.lead_status === filter)
    }
    
    return filtered
  }, [quotes, searchTerm, filter])

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200/50 dark:border-gray-800/50 px-6 py-6">
        <QueueHeader
          title="Leads"
          description="New customer calls and inquiries"
          count={filteredData.length}
        />
      </header>

      {/* Filters & Search */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <QueueSearch
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search by customer name..."
            className="flex-1"
          />
          <QueueFilters
            label="Status"
            options={filterOptions}
            value={filter}
            onChange={setFilter}
          />
        </div>

        {/* Queue Items */}
        {filteredData.length === 0 ? (
          <EmptyQueue
            title="No leads found"
            description="Try adjusting your search or filters"
            icon="users"
          />
        ) : (
          <div className="space-y-3">
            {filteredData.map(item => (
              <QueueCard
                key={item.id}
                data={item}
                // ... additional props
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

## Styling

All components use:
- Tailwind CSS utility classes
- Custom `cn()` utility for conditional classes
- shadcn/ui components where appropriate
- Consistent color palette matching QuotePro brand
