import type { Edition, EditionInfo } from '../editions'
import type { RoomType, Room } from './room'
import type { Order, GuestOrder } from './order'
import type { FinancialLog, FinancialLogDetailed, FinancialSummary, RevenueByRoomType, OccupancyStats, NightAuditData } from './finance'
import type { DailyOccupancy, DailyRevenueByType, RoomTypeAnalysis, MonthlyRevenue, QuarterlyRevenue, YearlyRevenue, RevenueGrowth, PaymentMethodTrend, SourceStat, SourceTrend, ADRRevPARData, ADRRevPARTrend, ADRByRoomType } from './analytics'
import type { PriceRule, PriceCalendar } from './pricing'
import type { Guest, GuestWithStats } from './guest'
import type { Invoice, InvoiceWithOrder } from './invoice'
import type { BackupInfo } from './backup'

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
