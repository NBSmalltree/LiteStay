export interface Order {
  order_id: number
  room_id: number
  guest_id?: number
  guest_name: string
  guest_phone?: string
  guest_id_card?: string
  guest_email?: string
  check_in_date: string
  check_out_date: string
  actual_amount: number
  deposit: number
  status: 'PREBOOK' | 'IN_HOUSE' | 'CHECKED_OUT'
  notes?: string
  source?: string
}

export interface GuestOrder {
  order_id: number
  room_id: number
  guest_name: string
  check_in_date: string
  check_out_date: string
  actual_amount: number
  deposit: number
  status: 'PREBOOK' | 'IN_HOUSE' | 'CHECKED_OUT'
  notes?: string
  room_number: string
  room_type: string
}

export const SOURCE_LABELS: Record<string, string> = {
  ctrip: '携程',
  meituan: '美团',
  direct: '直接预订',
  returning: '回头客',
  other: '其他',
}
