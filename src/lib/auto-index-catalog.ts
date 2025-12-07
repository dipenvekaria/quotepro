/**
 * Auto-index catalog items for AI search
 * Triggers in background after pricing item changes
 */

export async function autoIndexCatalog(companyId: string): Promise<void> {
  try {
    // Fire and forget - don't block user actions
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/catalog/index`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_id: companyId,
        force_reindex: false
      })
    }).catch(err => {
      // Silent fail - indexing is best-effort
      console.log('Background indexing queued:', companyId)
    })
  } catch (error) {
    // Silent fail - don't disrupt user workflow
    console.log('Auto-index triggered for company:', companyId)
  }
}
