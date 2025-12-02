/**
 * Example: Using the new Theme Management System
 * This shows how to build components using the centralized theme config
 */

import { theme, getButtonClasses, getBadgeClasses, getCardClasses, cn } from '@/config/theme';
import { FileText, DollarSign, TrendingUp, Plus } from 'lucide-react';

export function ThemeExampleComponent() {
  return (
    <div className="p-8 space-y-8">
      
      {/* Page Header using Typography config */}
      <div className="space-y-2">
        <h1 className={cn(
          theme.typography.h1.size,
          theme.typography.h1.weight,
          theme.typography.h1.tracking,
          theme.colors.primary.text
        )}>
          Executive Dashboard
        </h1>
        <p className={cn(
          theme.typography.body.size,
          theme.typography.body.weight,
          theme.colors.secondary.text
        )}>
          Monitor your business performance in real-time
        </p>
      </div>

      {/* Stats Cards using theme colors and spacing */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1 - Using helper function */}
        <div className={getCardClasses(true)}>
          <div className="flex items-center justify-between">
            <div>
              <p className={cn(
                theme.typography.small.size,
                theme.colors.secondary.text,
                'uppercase tracking-wider'
              )}>
                Total Revenue
              </p>
              <p className={cn(
                theme.typography.h1.size,
                theme.typography.h1.weight,
                theme.colors.primary.text
              )}>
                $127K
              </p>
            </div>
            <div className={cn(
              theme.colors.accent.bg,
              'w-12 h-12 rounded-lg flex items-center justify-center'
            )}>
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Card 2 - Manual theme.components usage */}
        <div className={theme.components.card.hover}>
          <div className="flex items-center justify-between">
            <div>
              <p className={cn(
                theme.typography.small.size,
                theme.colors.secondary.text,
                'uppercase tracking-wider'
              )}>
                Active Quotes
              </p>
              <p className={cn(
                theme.typography.h1.size,
                theme.typography.h1.weight,
                theme.colors.primary.text
              )}>
                89
              </p>
            </div>
            <div className={cn(
              theme.colors.accent.bg,
              'w-12 h-12 rounded-lg flex items-center justify-center'
            )}>
              <FileText className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Card 3 - Using colors directly */}
        <div className={getCardClasses(true)}>
          <div className="flex items-center justify-between">
            <div>
              <p className={cn(
                theme.typography.small.size,
                theme.colors.secondary.text,
                'uppercase tracking-wider'
              )}>
                Win Rate
              </p>
              <p className={cn(
                theme.typography.h1.size,
                theme.typography.h1.weight,
                theme.colors.success.text
              )}>
                64%
              </p>
            </div>
            <div className={cn(
              theme.colors.success.bg,
              'w-12 h-12 rounded-lg flex items-center justify-center'
            )}>
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Buttons using helper functions */}
      <div className="flex gap-4 flex-wrap">
        <button className={getButtonClasses('primary')}>
          <Plus className="w-4 h-4 mr-2 inline" />
          New Quote
        </button>
        <button className={getButtonClasses('secondary')}>
          View All
        </button>
        <button className={getButtonClasses('success')}>
          Approve
        </button>
        <button className={getButtonClasses('danger')}>
          Delete
        </button>
      </div>

      {/* Badges using helper functions */}
      <div className="flex gap-3 flex-wrap">
        <span className={getBadgeClasses('primary')}>Active</span>
        <span className={getBadgeClasses('accent')}>New</span>
        <span className={getBadgeClasses('success')}>Approved</span>
        <span className={getBadgeClasses('warning')}>Pending</span>
        <span className={getBadgeClasses('danger')}>Declined</span>
      </div>

      {/* Content Card */}
      <div className={getCardClasses()}>
        <h2 className={cn(
          theme.typography.h2.size,
          theme.typography.h2.weight,
          theme.colors.primary.text,
          'mb-3'
        )}>
          Recent Activity
        </h2>
        <p className={cn(
          theme.typography.body.size,
          theme.typography.body.weight,
          theme.colors.secondary.text,
          theme.typography.body.leading
        )}>
          This demonstrates the new theme management system. All colors, typography, 
          and spacing come from the centralized config. Update one file to change 
          the entire app's appearance.
        </p>
        <div className="mt-4 flex gap-3">
          <button className={getButtonClasses('primary')}>
            Learn More
          </button>
          <button className={getButtonClasses('secondary')}>
            Documentation
          </button>
        </div>
      </div>

      {/* Typography Scale Demo */}
      <div className={getCardClasses()}>
        <h1 className={cn(
          theme.typography.h1.size,
          theme.typography.h1.weight
        )}>
          H1: Professional Bold (27px)
        </h1>
        <h2 className={cn(
          theme.typography.h2.size,
          theme.typography.h2.weight,
          'mt-3'
        )}>
          H2: Section Heading (18px)
        </h2>
        <h3 className={cn(
          theme.typography.h3.size,
          theme.typography.h3.weight,
          'mt-2'
        )}>
          H3: Subsection (16px)
        </h3>
        <p className={cn(
          theme.typography.body.size,
          theme.typography.body.weight,
          theme.typography.body.leading,
          'mt-2'
        )}>
          Body: Regular text for content (14px font-medium)
        </p>
        <small className={cn(
          theme.typography.small.size,
          theme.typography.small.weight,
          'block mt-2'
        )}>
          Small: Captions and labels (13px font-medium)
        </small>
        <span className={cn(
          theme.typography.tiny.size,
          theme.typography.tiny.weight,
          'block mt-2 text-slate-500'
        )}>
          Tiny: Timestamps and metadata (11px font-medium)
        </span>
      </div>
    </div>
  );
}
