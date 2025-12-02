/**
 * SignNow API Client
 * Handles authentication and document operations with SignNow
 */

interface SignNowConfig {
  clientId: string
  clientSecret: string
  apiBaseUrl: string
  username?: string
  password?: string
}

interface SignNowTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token: string
}

interface SignNowUploadResponse {
  id: string
  document_name: string
}

interface SignNowInviteResponse {
  id: string
  status: string
}

export class SignNowClient {
  private config: SignNowConfig
  private accessToken: string | null = null
  private tokenExpiry: number = 0

  constructor(config: SignNowConfig) {
    this.config = config
  }

  /**
   * Get OAuth2 access token
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken
    }

    const authUrl = `${this.config.apiBaseUrl}/oauth2/token`
    
    // For production, use OAuth2 flow
    // For development/testing, use username/password
    const bodyParams: Record<string, string> = this.config.username && this.config.password
      ? {
          grant_type: 'password',
          username: this.config.username,
          password: this.config.password,
        }
      : {
          grant_type: 'client_credentials',
        }

    const credentials = Buffer.from(
      `${this.config.clientId}:${this.config.clientSecret}`
    ).toString('base64')

    const response = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(bodyParams),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`SignNow auth failed: ${error}`)
    }

    const data: SignNowTokenResponse = await response.json()
    
    this.accessToken = data.access_token
    // Set expiry to 5 minutes before actual expiry for safety
    this.tokenExpiry = Date.now() + (data.expires_in - 300) * 1000
    
    return this.accessToken
  }

  /**
   * Upload a PDF document to SignNow
   */
  async uploadDocument(pdfBuffer: Buffer, filename: string): Promise<string> {
    const token = await this.getAccessToken()
    
    const formData = new FormData()
    const blob = new Blob([new Uint8Array(pdfBuffer)], { type: 'application/pdf' })
    formData.append('file', blob, filename)

    const response = await fetch(`${this.config.apiBaseUrl}/document`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to upload document: ${error}`)
    }

    const data: SignNowUploadResponse = await response.json()
    return data.id
  }

  /**
   * Send document for signature
   */
  async createInvite(
    documentId: string,
    signerEmail: string,
    signerName: string,
    subject: string,
    message: string
  ): Promise<string> {
    const token = await this.getAccessToken()

    const inviteData = {
      to: [
        {
          email: signerEmail,
          role_id: '',
          role: 'Signer',
          order: 1,
          authentication_type: 'email',
          decline_by_signature: false,
        },
      ],
      from: this.config.username || 'noreply@fieldgenie.com',
      subject: subject,
      message: message,
    }

    const response = await fetch(
      `${this.config.apiBaseUrl}/document/${documentId}/invite`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(inviteData),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to create invite: ${error}`)
    }

    const data: SignNowInviteResponse = await response.json()
    return data.id
  }

  /**
   * Get signed document download URL
   */
  async getDocumentDownloadUrl(documentId: string): Promise<string> {
    const token = await this.getAccessToken()
    
    return `${this.config.apiBaseUrl}/document/${documentId}/download?token=${token}`
  }

  /**
   * Check document status
   */
  async getDocumentStatus(documentId: string): Promise<any> {
    const token = await this.getAccessToken()

    const response = await fetch(
      `${this.config.apiBaseUrl}/document/${documentId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to get document status: ${error}`)
    }

    return response.json()
  }

  /**
   * Delete document
   */
  async deleteDocument(documentId: string): Promise<void> {
    const token = await this.getAccessToken()

    const response = await fetch(
      `${this.config.apiBaseUrl}/document/${documentId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to delete document: ${error}`)
    }
  }
}

/**
 * Create SignNow client from environment variables
 */
export function createSignNowClient(): SignNowClient {
  const config: SignNowConfig = {
    clientId: process.env.SIGNNOW_CLIENT_ID || '',
    clientSecret: process.env.SIGNNOW_CLIENT_SECRET || '',
    apiBaseUrl: process.env.SIGNNOW_API_BASE_URL || 'https://api-eval.signnow.com',
    username: process.env.SIGNNOW_USERNAME,
    password: process.env.SIGNNOW_PASSWORD,
  }

  if (!config.clientId || !config.clientSecret) {
    throw new Error('SignNow credentials not configured')
  }

  return new SignNowClient(config)
}
