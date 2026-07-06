export interface FinancialLog {
  log_id: number
  order_id: number | null
  type: 'ROOM_FEE' | 'DEPOSIT' | 'INCIDENTAL'
  amount: number
  payment_method: 'WeChat' | 'Alipay' | 'Cash'
  created_at: string
}

export interface FinancialLogDetailed extends FinancialLog {
  guest_name: string | null
  room_number: string | null
}

export interface FinancialSummary {
  roomFee: number
  deposit: number
  incidental: number
  byMethod: { payment_method: string; total: number }[]
  daily: { date: string; total: number }[]
}

export interface RevenueByRoomType {
  room_type: string
  total: number
  order_count: number
}

export interface OccupancyStats {
  totalRooms: number
  occupiedRooms: number
  vacantRooms: number
}

export interface NightAuditData {
  date: string
  summary: { total: number; roomFee: number; deposit: number; incidental: number }
  byRoomType: RevenueByRoomType[]
  byMethod: { payment_method: string; total: number }[]
  occupancy: OccupancyStats
}
