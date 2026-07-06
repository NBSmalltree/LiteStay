export interface RoomType {
  type_id: number
  type_name: string
  sort_order: number
}

export interface Room {
  room_id: number
  room_number: string
  room_type: string
  base_price: number
}

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

export interface BackupInfo {
  filename: string
  path: string
  size: number
  created_at: string
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

export const SOURCE_LABELS: Record<string, string> = {
  ctrip: '携程',
  meituan: '美团',
  direct: '直接预订',
  returning: '回头客',
  other: '其他',
}

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

export interface ElectronAPI {
  getPlatform(): Promise<string>
  win: {
    minimize(): void
    maximize(): void
    close(): void
    onMaximized(callback: (isMaximized: boolean) => void): void
    onOrdersChanged(callback: () => void): void
  }
  db: {
    getRoomTypes(): Promise<RoomType[]>
    insertRoomType(name: string): Promise<RoomType>
    deleteRoomType(typeId: number): Promise<boolean>
    insertRoom(room: Pick<Room, 'room_number' | 'room_type' | 'base_price'>): Promise<Room>
    getRooms(): Promise<Room[]>
    deleteRoom(roomId: number): Promise<boolean>
    updateRoom(roomId: number, updates: Partial<Pick<Room, 'room_type' | 'base_price'>>): Promise<Room>
    insertOrder(order: Omit<Order, 'order_id'>): Promise<Order>
    getOrders(): Promise<Order[]>
    updateOrder(orderId: number, updates: Partial<Omit<Order, 'order_id'>>): Promise<Order>
    deleteOrder(orderId: number): Promise<boolean>
    insertFinancialLog(log: Omit<FinancialLog, 'log_id' | 'created_at'>): Promise<FinancialLog>
    getFinancialLogs(date?: string): Promise<FinancialLog[]>
    getFinancialLogsByOrder(orderId: number): Promise<FinancialLog[]>
    updateFinancialLogPayment(orderId: number, paymentMethod: string): Promise<boolean>
    updateFinancialLogAmount(orderId: number, type: string, amount: number): Promise<boolean>
    deleteFinancialLog(logId: number): Promise<boolean>
    updateFinancialLog(logId: number, updates: Partial<Pick<FinancialLog, 'amount' | 'payment_method'>>): Promise<boolean>
    getIncidentalSums(): Promise<{ order_id: number; total: number }[]>
    getFinancialSummary(dateFrom: string, dateTo: string): Promise<FinancialSummary>
    getFinancialLogsDetailed(dateFrom: string, dateTo: string): Promise<FinancialLogDetailed[]>
    getRevenueByRoomType(dateFrom: string, dateTo: string): Promise<RevenueByRoomType[]>
    getOccupancyStats(date: string): Promise<OccupancyStats>
    getDailyOccupancy(dateFrom: string, dateTo: string): Promise<DailyOccupancy[]>
    getDailyRevenueByType(dateFrom: string, dateTo: string): Promise<DailyRevenueByType[]>
    getRoomTypeAnalysis(dateFrom: string, dateTo: string): Promise<RoomTypeAnalysis[]>
    exportFinancialLogs(dateFrom: string, dateTo: string): Promise<string | null>
    exportNightAudit(auditData: NightAuditData): Promise<string | null>
    getBackups(): Promise<BackupInfo[]>
    createBackup(customName?: string): Promise<BackupInfo>
    restoreBackup(backupFilename: string): Promise<boolean>
    deleteBackup(backupFilename: string): Promise<boolean>
    exportBackup(backupFilename: string): Promise<string | null>
    importBackup(): Promise<BackupInfo | null>
    getPriceRules(): Promise<PriceRule[]>
    insertPriceRule(rule: Omit<PriceRule, 'rule_id' | 'created_at'>): Promise<PriceRule>
    updatePriceRule(ruleId: number, updates: Partial<Omit<PriceRule, 'rule_id' | 'created_at'>>): Promise<PriceRule>
    deletePriceRule(ruleId: number): Promise<boolean>
    getPriceCalendar(roomType: string, dateFrom: string, dateTo: string): Promise<PriceCalendar[]>
    getGuests(): Promise<Guest[]>
    getGuestById(guestId: number): Promise<Guest | undefined>
    getGuestByPhone(phone: string): Promise<Guest | undefined>
    insertGuest(guest: Pick<Guest, 'name'> & Partial<Pick<Guest, 'phone' | 'id_card' | 'email' | 'notes'>>): Promise<Guest>
    updateGuest(guestId: number, updates: Partial<Pick<Guest, 'name' | 'phone' | 'id_card' | 'email' | 'notes'>>): Promise<Guest>
    deleteGuest(guestId: number): Promise<{ error: string } | true>
    findOrCreateGuest(guestData: {name: string; phone?: string; id_card?: string; email?: string; notes?: string}): Promise<Guest>
    getGuestsWithStats(): Promise<GuestWithStats[]>
    searchGuests(query: string): Promise<Guest[]>
    getGuestOrders(guestName: string): Promise<GuestOrder[]>
    getMonthlyRevenue(year: number): Promise<MonthlyRevenue[]>
    getQuarterlyRevenue(year: number): Promise<QuarterlyRevenue[]>
    getYearlyRevenue(): Promise<YearlyRevenue[]>
    getRevenueGrowth(): Promise<RevenueGrowth>
    getPaymentMethodTrend(months: number): Promise<PaymentMethodTrend[]>
    getSourceStats(dateFrom: string, dateTo: string): Promise<SourceStat[]>
    getSourceTrend(months: number): Promise<SourceTrend[]>
    updateOrderSource(orderId: number, source: string): Promise<boolean>
    getADRRevPAR(dateFrom: string, dateTo: string): Promise<ADRRevPARData>
    getADRRevPARTrend(days: number): Promise<ADRRevPARTrend[]>
    getADRByRoomType(dateFrom: string, dateTo: string): Promise<ADRByRoomType[]>
    getInvoices(): Promise<InvoiceWithOrder[]>
    insertInvoice(invoice: Omit<Invoice, 'invoice_id' | 'status' | 'issued_at' | 'created_at'>): Promise<Invoice>
    updateInvoice(invoiceId: number, updates: Partial<Omit<Invoice, 'invoice_id' | 'created_at'>>): Promise<Invoice>
    deleteInvoice(invoiceId: number): Promise<boolean>
    markInvoiceIssued(invoiceId: number): Promise<Invoice>
    exportInvoiceList(status: string): Promise<string | null>
  }
  edition: {
    getInfo(): Promise<EditionInfo>
    checkTrial(): Promise<{ expired: boolean; clockRollback: boolean }>
    activate(licenseKey: string): Promise<{ success: boolean; edition: Edition; error?: string }>
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
  }
}

// Import and re-export edition types
export type { Edition, EditionInfo } from './editions'
