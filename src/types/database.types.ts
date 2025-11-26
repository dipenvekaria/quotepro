export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          user_id: string
          name: string
          logo_url: string | null
          phone: string | null
          email: string | null
          address: string | null
          tax_rate: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          logo_url?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          tax_rate?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          logo_url?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          tax_rate?: number
          created_at?: string
          updated_at?: string
        }
      }
      team_members: {
        Row: {
          id: string
          company_id: string
          user_id: string
          role: 'admin' | 'sales'
          invited_by: string | null
          invited_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          user_id: string
          role?: 'admin' | 'sales'
          invited_by?: string | null
          invited_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          user_id?: string
          role?: 'admin' | 'sales'
          invited_by?: string | null
          invited_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      pricing_items: {
        Row: {
          id: string
          company_id: string
          name: string
          description: string | null
          price: number
          category: string | null
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          description?: string | null
          price: number
          category?: string | null
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          description?: string | null
          price?: number
          category?: string | null
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      quotes: {
        Row: {
          id: string
          company_id: string
          quote_number: string
          customer_name: string
          customer_email: string | null
          customer_phone: string | null
          customer_address: string | null
          description: string | null
          subtotal: number
          tax_rate: number
          tax_amount: number
          total: number
          notes: string | null
          status: string
          photos: string[]
          sent_at: string | null
          signed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          quote_number: string
          customer_name: string
          customer_email?: string | null
          customer_phone?: string | null
          customer_address?: string | null
          description?: string | null
          subtotal: number
          tax_rate: number
          tax_amount: number
          total: number
          notes?: string | null
          status?: string
          photos?: string[]
          sent_at?: string | null
          signed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          quote_number?: string
          customer_name?: string
          customer_email?: string | null
          customer_phone?: string | null
          customer_address?: string | null
          description?: string | null
          subtotal?: number
          tax_rate?: number
          tax_amount?: number
          total?: number
          notes?: string | null
          status?: string
          photos?: string[]
          sent_at?: string | null
          signed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      quote_items: {
        Row: {
          id: string
          quote_id: string
          pricing_item_id: string | null
          name: string
          description: string | null
          quantity: number
          unit_price: number
          total: number
          option_tier: string | null
          is_upsell: boolean
          sort_order: number | null
          created_at: string
        }
        Insert: {
          id?: string
          quote_id: string
          pricing_item_id?: string | null
          name: string
          description?: string | null
          quantity?: number
          unit_price: number
          total: number
          option_tier?: string | null
          is_upsell?: boolean
          sort_order?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          quote_id?: string
          pricing_item_id?: string | null
          name?: string
          description?: string | null
          quantity?: number
          unit_price?: number
          total?: number
          option_tier?: string | null
          is_upsell?: boolean
          sort_order?: number | null
          created_at?: string
        }
      }
      signed_documents: {
        Row: {
          id: string
          quote_id: string
          dropbox_signature_request_id: string
          status: string
          signed_url: string | null
          signed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          quote_id: string
          dropbox_signature_request_id: string
          status: string
          signed_url?: string | null
          signed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          quote_id?: string
          dropbox_signature_request_id?: string
          status?: string
          signed_url?: string | null
          signed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
