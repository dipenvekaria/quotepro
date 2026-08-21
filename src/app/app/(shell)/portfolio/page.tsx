import { requireSession } from '@/lib/auth/session'
import { PageContainer, PageHeader } from '@/components/shared/page'
import { EmptyState } from '@/components/shared/empty-state'
import { Camera } from 'lucide-react'

import { listShowcasePhotos } from '../pipeline/[id]/photo-actions'
import { PortfolioGallery } from './gallery'

export const metadata = { title: 'Portfolio' }
export const dynamic = 'force-dynamic'

/**
 * The work portfolio — photos the contractor has added from their jobs, to
 * show a prospect as proof of past work. Photos are tagged by AI on upload so
 * a large collection stays findable. Curated on purpose: only photos the
 * contractor opted in appear here, never every job photo.
 */
export default async function PortfolioPage() {
  await requireSession()
  const photos = await listShowcasePhotos()

  return (
    <PageContainer>
      <PageHeader
        title="Portfolio"
        description="Your best work, ready to show a customer. Add photos from any job — open the job, tap a photo, and choose “Add to portfolio.”"
      />
      {photos.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={Camera}
            title="No portfolio photos yet"
            description="On any completed job, add a photo to your portfolio. They’re tagged automatically so you can find the right example fast."
          />
        </div>
      ) : (
        <PortfolioGallery photos={photos} />
      )}
    </PageContainer>
  )
}
