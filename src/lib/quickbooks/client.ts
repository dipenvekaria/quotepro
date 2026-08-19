import { query } from '@/lib/db'
import { env, envServer } from '@/lib/env'

/**
 * QuickBooks Online, bookkeeping-only.
 *
 * Rivet is the system of record for the work; QBO is the books. Invoices and
 * payments flow one way — Rivet → QBO — and nothing here touches money: the
 * payment records we push are facts about payments that already happened.
 *
 * Tokens live per company in `quickbooks_connections`. Intuit rotates the
 * refresh token on every refresh, so both tokens are rewritten together —
 * losing a rotated refresh token strands the connection until the owner
 * reconnects, which the integrations card surfaces via `last_error`.
 */

const AUTH_BASE = 'https://appcenter.intuit.com/connect/oauth2'
const TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer'

export function qboConfigured(): boolean {
  const { QBO_CLIENT_ID, QBO_CLIENT_SECRET } = envServer()
  return Boolean(QBO_CLIENT_ID && QBO_CLIENT_SECRET)
}

function apiBase(): string {
  return envServer().QBO_ENVIRONMENT === 'production'
    ? 'https://quickbooks.api.intuit.com'
    : 'https://sandbox-quickbooks.api.intuit.com'
}

export function qboAuthorizeUrl(state: string): string {
  const { QBO_CLIENT_ID } = envServer()
  const NEXT_PUBLIC_APP_URL = env.NEXT_PUBLIC_APP_URL
  const params = new URLSearchParams({
    client_id: QBO_CLIENT_ID ?? '',
    response_type: 'code',
    scope: 'com.intuit.quickbooks.accounting',
    redirect_uri: `${NEXT_PUBLIC_APP_URL}/api/integrations/quickbooks/callback`,
    state,
  })
  return `${AUTH_BASE}?${params}`
}

type TokenResponse = {
  access_token: string
  refresh_token: string
  expires_in: number
}

async function tokenRequest(body: URLSearchParams): Promise<TokenResponse> {
  const { QBO_CLIENT_ID, QBO_CLIENT_SECRET } = envServer()
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${QBO_CLIENT_ID}:${QBO_CLIENT_SECRET}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body,
  })
  if (!res.ok) throw new Error(`Intuit token endpoint ${res.status}: ${await res.text()}`)
  return (await res.json()) as TokenResponse
}

export async function exchangeCode(code: string): Promise<TokenResponse> {
  const NEXT_PUBLIC_APP_URL = env.NEXT_PUBLIC_APP_URL
  return tokenRequest(
    new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${NEXT_PUBLIC_APP_URL}/api/integrations/quickbooks/callback`,
    }),
  )
}

export type QboConnection = {
  company_id: string
  realm_id: string
  access_token: string
  refresh_token: string
  access_expires_at: string
  qbo_item_id: string | null
}

export async function qboConnection(companyId: string): Promise<QboConnection | null> {
  const [row] = await query<QboConnection>(
    `select company_id, realm_id, access_token, refresh_token, access_expires_at, qbo_item_id
       from quickbooks_connections where company_id = $1 limit 1`,
    [companyId],
  )
  return row ?? null
}

/** A connection whose access token is valid for at least the next minute. */
async function freshConnection(companyId: string): Promise<QboConnection> {
  const conn = await qboConnection(companyId)
  if (!conn) throw new Error('QuickBooks is not connected')

  if (new Date(conn.access_expires_at).getTime() - Date.now() > 60_000) return conn

  const t = await tokenRequest(
    new URLSearchParams({ grant_type: 'refresh_token', refresh_token: conn.refresh_token }),
  )
  const expiresAt = new Date(Date.now() + t.expires_in * 1000).toISOString()
  await query(
    `update quickbooks_connections
        set access_token = $2, refresh_token = $3, access_expires_at = $4
      where company_id = $1`,
    [companyId, t.access_token, t.refresh_token, expiresAt],
  )
  return { ...conn, access_token: t.access_token, refresh_token: t.refresh_token, access_expires_at: expiresAt }
}

async function qboFetch<T>(
  companyId: string,
  path: string,
  init?: { method?: string; body?: unknown },
): Promise<T> {
  const conn = await freshConnection(companyId)
  const url = `${apiBase()}/v3/company/${conn.realm_id}${path}${path.includes('?') ? '&' : '?'}minorversion=75`
  const res = await fetch(url, {
    method: init?.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${conn.access_token}`,
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  })
  if (!res.ok) throw new Error(`QBO ${init?.method ?? 'GET'} ${path} ${res.status}: ${await res.text()}`)
  return (await res.json()) as T
}

const esc = (s: string) => s.replaceAll("'", "\\'")

export async function qboQuery<T>(companyId: string, q: string): Promise<T> {
  return qboFetch<T>(companyId, `/query?query=${encodeURIComponent(q)}`)
}

async function incomeAccountId(companyId: string): Promise<string> {
  const accounts = await qboQuery<{ QueryResponse: { Account?: { Id: string }[] } }>(
    companyId,
    "select Id from Account where AccountType = 'Income' maxresults 1",
  )
  const id = accounts.QueryResponse.Account?.[0]?.Id
  if (!id) throw new Error('No income account found in QuickBooks')
  return id
}

/**
 * Find-or-create a QBO Service item by name. QBO item names are unique per
 * company, so an item the bookkeeper already made is reused, never duplicated.
 */
export async function ensureQboItem(companyId: string, name: string): Promise<string> {
  const clean = name.trim().slice(0, 100)
  const found = await qboQuery<{ QueryResponse: { Item?: { Id: string }[] } }>(
    companyId,
    `select Id from Item where Name = '${esc(clean)}'`,
  )
  const existing = found.QueryResponse.Item?.[0]?.Id
  if (existing) return existing

  const created = await qboFetch<{ Item: { Id: string } }>(companyId, '/item', {
    method: 'POST',
    body: {
      Name: clean,
      Type: 'Service',
      IncomeAccountRef: { value: await incomeAccountId(companyId) },
    },
  })
  return created.Item.Id
}

/**
 * The catch-all Service item for lines with no price book identity — custom
 * one-offs, estimates, discounts. Creating a QBO item per ad-hoc line would
 * fill their item list with junk; the line description carries the detail.
 */
export async function ensureServiceItem(companyId: string): Promise<string> {
  const conn = await qboConnection(companyId)
  if (conn?.qbo_item_id) return conn.qbo_item_id

  const itemId = await ensureQboItem(companyId, 'Rivet Services')
  await query(`update quickbooks_connections set qbo_item_id = $2 where company_id = $1`, [
    companyId,
    itemId,
  ])
  return itemId
}

export async function findOrCreateCustomer(
  companyId: string,
  customer: { id: string; name: string; email: string | null; qbo_customer_id: string | null },
): Promise<string> {
  if (customer.qbo_customer_id) return customer.qbo_customer_id

  const found = await qboQuery<{ QueryResponse: { Customer?: { Id: string }[] } }>(
    companyId,
    `select Id from Customer where DisplayName = '${esc(customer.name)}'`,
  )
  let qboId = found.QueryResponse.Customer?.[0]?.Id

  if (!qboId) {
    const created = await qboFetch<{ Customer: { Id: string } }>(companyId, '/customer', {
      method: 'POST',
      body: {
        DisplayName: customer.name,
        ...(customer.email ? { PrimaryEmailAddr: { Address: customer.email } } : {}),
      },
    })
    qboId = created.Customer.Id
  }

  await query(`update customers set qbo_customer_id = $2 where id = $1 and company_id = $3`, [
    customer.id,
    qboId,
    companyId,
  ])
  return qboId
}

export async function createQboInvoice(
  companyId: string,
  input: {
    qboCustomerId: string
    docNumber: string
    lines: { itemId: string; description: string; quantity: number; unitPrice: number; amount: number }[]
    taxAmount: number
    dueDate: string | null
  },
): Promise<string> {
  const body = {
    CustomerRef: { value: input.qboCustomerId },
    DocNumber: input.docNumber.slice(0, 21),
    ...(input.dueDate ? { DueDate: input.dueDate } : {}),
    Line: input.lines.map((l) => ({
      Amount: l.amount,
      DetailType: 'SalesItemLineDetail',
      Description: l.description.slice(0, 4000),
      SalesItemLineDetail: {
        ItemRef: { value: l.itemId },
        Qty: l.quantity,
        UnitPrice: l.unitPrice,
      },
    })),
    // Companies on QuickBooks automated sales tax may recalculate this; the
    // line amounts are authoritative either way.
    ...(input.taxAmount > 0 ? { TxnTaxDetail: { TotalTax: input.taxAmount } } : {}),
    PrivateNote: 'Synced from Rivet',
  }
  const res = await qboFetch<{ Invoice: { Id: string } }>(companyId, '/invoice', {
    method: 'POST',
    body,
  })
  return res.Invoice.Id
}

export async function createQboPayment(
  companyId: string,
  input: { qboCustomerId: string; qboInvoiceId: string; amount: number; date: string },
): Promise<string> {
  const res = await qboFetch<{ Payment: { Id: string } }>(companyId, '/payment', {
    method: 'POST',
    body: {
      CustomerRef: { value: input.qboCustomerId },
      TotalAmt: input.amount,
      TxnDate: input.date.slice(0, 10),
      Line: [
        {
          Amount: input.amount,
          LinkedTxn: [{ TxnId: input.qboInvoiceId, TxnType: 'Invoice' }],
        },
      ],
    },
  })
  return res.Payment.Id
}
