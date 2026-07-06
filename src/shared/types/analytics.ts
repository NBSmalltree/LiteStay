export interface DailyOccupancy {
  date: string
  totalRooms: number
  occupiedRooms: number
  occupancyRate: number
}

export interface DailyRevenueByType {
  date: string
  room_type: string
  total: number
}

export interface RoomTypeAnalysis {
  room_type: string
  revenue: number
  order_count: number
  avg_price: number
}

export interface MonthlyRevenue {
  month: string
  total: number
  room_fee: number
  deposit: number
  incidental: number
}

export interface QuarterlyRevenue {
  quarter: string
  total: number
  room_fee: number
  deposit: number
  incidental: number
}

export interface YearlyRevenue {
  year: string
  total: number
  room_fee: number
  deposit: number
  incidental: number
}

export interface RevenueGrowth {
  current_month: number
  last_month: number
  growth_rate: number
  growth_amount: number
}

export interface PaymentMethodTrend {
  month: string
  payment_method: string
  total: number
}

export interface SourceStat {
  source: string
  order_count: number
  total_revenue: number
  avg_revenue: number
}

export interface SourceTrend {
  month: string
  source: string
  order_count: number
  total_revenue: number
}

export interface ADRRevPARData {
  adr: number
  revpar: number
  total_room_fee: number
  sold_room_nights: number
  available_room_nights: number
  occupancy_rate: number
}

export interface ADRRevPARTrend {
  date: string
  adr: number
  revpar: number
  occupancy_rate: number
}

export interface ADRByRoomType {
  room_type: string
  order_count: number
  total_revenue: number
  total_nights: number
  avg_adr: number
}
