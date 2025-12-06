// Public Quote Viewer - No authentication required
// Accessible via /q/{quote_id} from PDF links

import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, FileText, Phone, Mail, MapPin, Calendar } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

interface QuoteViewerProps {
  params: Promise<{ id: string }>
}

export default async function PublicQuoteViewer({ params }: QuoteViewerProps) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch quote first (without joins to avoid RLS issues)
  const { data: quote, error } = await supabase
    .from('work_items')
    .select('*')
    .eq('id', id)
    .single() as { data: any; error: any }

  if (error || !quote) {
    console.error('Quote fetch error:', error, 'id:', id)
    notFound()
  }

  // Fetch related data separately
  const { data: items } = await supabase
    .from('quote_items')
    .select('*')
    .eq('quote_id', id)
    .order('sort_order') as { data: any[] | null }

  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('id', quote.company_id)
    .single() as { data: any }

  const { data: customer } = quote.customer_id ? await supabase
    .from('customers')
    .select('*')
    .eq('id', quote.customer_id)
    .single() as { data: any } : { data: null }

  // Get customer address if customer exists
  let primaryAddress: any = null
  if (customer?.id) {
    const { data: addresses } = await supabase
      .from('customer_addresses')
      .select('*')
      .eq('customer_id', customer.id)
      .order('is_primary', { ascending: false })
      .limit(1) as { data: any[] | null }
    primaryAddress = addresses?.[0]
  }

  // Track that the quote was viewed
  await (supabase
    .from('work_items') as any)
    .update({ viewed_at: new Date().toISOString() })
    .eq('id', id)

  // Determine quote status
  const getStatusInfo = () => {
    // @ts-ignore
    if (quote.signed_at) {
      return { label: 'Signed', color: 'bg-emerald-600', icon: CheckCircle }
    }
    // @ts-ignore
    if (quote.accepted_at) {
      return { label: 'Accepted', color: 'bg-green-600', icon: CheckCircle }
    }
    // @ts-ignore
    if (quote.sent_at) {
      return { label: 'Sent', color: 'bg-blue-600', icon: FileText }
    }
    return { label: 'Draft', color: 'bg-gray-600', icon: FileText }
  }

  const status = getStatusInfo()
  const StatusIcon = status.icon

  // Group items by tier for Good/Better/Best display
  const quoteItems = items || []
  const tiers = quoteItems.reduce((acc: any, item: any) => {
    const tier = item.option_tier || 'standard'
    if (!acc[tier]) acc[tier] = []
    acc[tier].push(item)
    return acc
  }, {})

  const hasTiers = Object.keys(tiers).length > 1

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header with Company Branding */}
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {company.logo_url && (
                <Image
                  src={company.logo_url}
                  alt={company.name}
                  width={60}
                  height={60}
                  className="rounded-lg object-contain"
                />
              )}
              <div>
                <h1 className="text-sm font-bold text-gray-900">
                  {company.name}
                </h1>
                <p className="text-sm text-gray-600">
                  Professional Quote
                </p>
              </div>
            </div>
            <Badge className={`${status.color} text-white`}>
              <StatusIcon className="h-4 w-4 mr-1" />
              {status.label}
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Quote Details Card */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-sm">
                  Quote for {customer?.name || 'Customer'}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {/* @ts-ignore */}
                  Quote #{quote.quote_number}
                </p>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {/* @ts-ignore */}
                  {new Date(quote.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Customer Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="space-y-3">
                <h3 className="font-bold text-sm text-gray-600 uppercase">
                  Customer Details
                </h3>
                {customer?.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span>{customer.phone}</span>
                  </div>
                )}
                {customer?.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span>{customer.email}</span>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <h3 className="font-bold text-sm text-gray-600 uppercase">
                  Job Location
                </h3>
                {primaryAddress?.address && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                    <span>{primaryAddress.address}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Job Description */}
            {/* @ts-ignore */}
            {quote.description && (
              <div>
                <h3 className="font-bold mb-2">Job Description</h3>
                <p className="text-sm text-muted-foreground bg-blue-50 border border-blue-200 rounded-lg p-4">
                  {/* @ts-ignore */}
                  {quote.description}
                </p>
              </div>
            )}

            {/* Job Photos */}
            {/* @ts-ignore */}
            {quote.photos && quote.photos.length > 0 && (
              <div>
                <h3 className="font-bold mb-3">Job Photos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* @ts-ignore */}
                  {quote.photos.map((photo: string, index: number) => (
                    <div key={index} className="relative aspect-video rounded-lg overflow-hidden">
                      <Image
                        src={photo}
                        alt={`Job photo ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pricing - Good/Better/Best or Single Table */}
            <div>
              <h3 className="font-bold mb-3">Pricing Details</h3>
              
              {hasTiers ? (
                // Good/Better/Best Display
                <div className="space-y-4">
                  {Object.entries(tiers).map(([tier, tierItems]: [string, any]) => (
                    <div
                      key={tier}
                      className="border-2 rounded-lg p-4 hover:border-[#2563eb] transition-colors"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-bold text-sm capitalize">{tier} Option</h4>
                        <div className="text-right">
                          <div className="text-sm font-bold text-[#2563eb]">
                            $
                            {tierItems
                              .reduce((sum: number, item: any) => sum + item.total, 0)
                              .toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {tierItems.map((item: any, idx: number) => (
                          <div
                            key={idx}
                            className={`flex justify-between items-start p-3 rounded ${
                              item.is_upsell
                                ? 'bg-blue-50 border-l-4 border-[#2563eb]'
                                : 'bg-gray-50'
                            }`}
                          >
                            <div className="flex-1">
                              <div className="font-bold">{item.name}</div>
                              {item.description && (
                                <div className="text-sm text-muted-foreground">
                                  {item.description}
                                </div>
                              )}
                              <div className="text-sm text-muted-foreground mt-1">
                                Qty: {item.quantity} × ${item.unit_price.toFixed(2)}
                              </div>
                              {item.is_upsell && (
                                <Badge className="bg-[#2563eb] text-white mt-2">
                                  UPGRADE
                                </Badge>
                              )}
                            </div>
                            <div className="font-bold ml-4">${item.total.toFixed(2)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Single Table Display
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="text-left p-3 text-sm font-bold">Description</th>
                        <th className="text-center p-3 text-sm font-bold">Qty</th>
                        <th className="text-right p-3 text-sm font-bold">Price</th>
                        <th className="text-right p-3 text-sm font-bold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quoteItems.map((item: any, idx: number) => (
                        <tr
                          key={idx}
                          className={`border-t ${
                            item.is_upsell
                              ? 'bg-blue-50 border-l-4 border-[#2563eb]'
                              : ''
                          }`}
                        >
                          <td className="p-3">
                            <div className="font-bold">{item.name}</div>
                            {item.description && (
                              <div className="text-sm text-muted-foreground">
                                {item.description}
                              </div>
                            )}
                            {item.is_upsell && (
                              <Badge className="bg-[#2563eb] text-white mt-1">UPGRADE</Badge>
                            )}
                          </td>
                          <td className="p-3 text-center">{item.quantity}</td>
                          <td className="p-3 text-right">${item.unit_price.toFixed(2)}</td>
                          <td className="p-3 text-right font-bold">
                            ${item.total.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Totals */}
              <div className="mt-6 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  {/* @ts-ignore */}
                  <span className="font-bold">${quote.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {/* @ts-ignore */}
                    Tax ({quote.tax_rate}%)
                  </span>
                  {/* @ts-ignore */}
                  <span className="font-bold">${quote.tax_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-bold pt-3 border-t-2">
                  <span>Total</span>
                  {/* @ts-ignore */}
                  <span className="text-[#2563eb]">${quote.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {/* @ts-ignore */}
            {quote.notes && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-bold mb-2">Additional Notes</h3>
                {/* @ts-ignore */}
                <p className="text-sm text-muted-foreground">{quote.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* @ts-ignore */}
              {!quote.signed_at && !quote.accepted_at && (
                <>
                  <Link href={`/q/${id}/sign`}>
                    <Button
                      className="w-full h-14 bg-[#2563eb] hover:bg-[#2563eb]/90 text-white text-sm font-bold"
                      size="lg"
                    >
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Accept & Sign This Quote
                    </Button>
                  </Link>
                  <p className="text-xs text-center text-muted-foreground">
                    Click above to review and electronically sign this quote
                  </p>
                </>
              )}

              {/* @ts-ignore */}
              {quote.signed_at && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center">
                  <CheckCircle className="h-12 w-12 text-emerald-600 mx-auto mb-2" />
                  <h3 className="font-bold text-emerald-900">
                    Quote Signed!
                  </h3>
                  <p className="text-sm text-emerald-700 mt-1">
                    {/* @ts-ignore */}
                    Signed on {new Date(quote.signed_at).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-emerald-600 mt-2">
                    We'll contact you soon to schedule the work.
                  </p>
                </div>
              )}

              {/* @ts-ignore */}
              {!quote.signed_at && quote.accepted_at && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
                  <h3 className="font-bold text-green-900">
                    Quote Accepted!
                  </h3>
                  <p className="text-sm text-green-700 mt-1">
                    {/* @ts-ignore */}
                    Accepted on {new Date(quote.accepted_at).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-green-600 mt-2">
                    We'll contact you soon to schedule the work.
                  </p>
                </div>
              )}

              {/* PDF Download */}
              {/* @ts-ignore */}
              {quote.pdf_url && (
                // @ts-ignore
                <a href={quote.pdf_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="w-full" size="lg">
                    <FileText className="h-5 w-5 mr-2" />
                    Download PDF
                  </Button>
                </a>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Company Footer */}
        <Card className="bg-gray-50">
          <CardContent className="pt-6">
            <div className="text-center space-y-3">
              <h3 className="font-bold text-sm">{company.name}</h3>
              <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
                {company.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <span>{company.phone}</span>
                  </div>
                )}
                {company.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span>{company.email}</span>
                  </div>
                )}
              </div>
              {company.license_number && (
                <p className="text-xs text-muted-foreground">
                  License #{company.license_number}
                </p>
              )}
              {company.website && (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#2563eb] hover:underline"
                >
                  {company.website}
                </a>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Trust Indicators */}
        <div className="text-center text-xs text-muted-foreground py-4">
          <p>🔒 Secure Quote Viewing • Licensed & Insured • Professional Service</p>
        </div>
      </main>
    </div>
  )
}
