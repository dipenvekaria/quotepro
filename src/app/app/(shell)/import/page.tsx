import { requireSession } from '@/lib/auth/session'
import { PageContainer, PageHeader } from '@/components/shared/page'

import { ImportWizard } from './import-wizard'

export const metadata = { title: 'Bring your data' }

export default async function ImportPage() {
  await requireSession()
  return (
    <PageContainer>
      <PageHeader
        title="Bring your data"
        description="Switching from Jobber, Housecall Pro, or Joist? Customers and your price book move over in one sitting."
      />
      <div className="mt-6 max-w-3xl">
        <ImportWizard />
      </div>
    </PageContainer>
  )
}
