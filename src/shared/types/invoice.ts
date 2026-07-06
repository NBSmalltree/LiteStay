export interface Invoice {
  invoice_id: number
  order_id: number
  title: string
  tax_number?: string
  company_address?: string
  phone?: string
  bank_name?: string
  bank_account?: string
  invoice_type: 'normal' | 'special'
  status: 'pending' | 'issued' | 'cancelled'
  issued_at?: string
  notes?: string
  created_at: string
}

export interface InvoiceWithOrder extends Invoice {
  guest_name: string
  room_number: string
  check_in_date: string
  check_out_date: string
  actual_amount: number
}
