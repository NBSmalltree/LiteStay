export interface PriceRule {
  rule_id: number
  room_type: string
  rule_name: string
  rule_type: 'weekday' | 'weekend' | 'holiday' | 'custom'
  start_date?: string
  end_date?: string
  price_multiplier: number
  fixed_price?: number
  priority: number
  is_active: boolean
  created_at: string
}

export interface PriceCalendar {
  date: string
  room_type: string
  base_price: number
  final_price: number
  applied_rule?: string
}
