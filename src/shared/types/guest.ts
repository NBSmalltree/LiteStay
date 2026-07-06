export interface Guest {
  guest_id: number
  name: string
  phone?: string
  id_card?: string
  email?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface GuestWithStats extends Guest {
  order_count: number
  total_spent: number
  last_check_in: string
  preferred_room_type?: string
}
