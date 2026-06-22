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
  guest_name: string
  check_in_date: string
  check_out_date: string
  actual_amount: number
  deposit: number
  status: 'PREBOOK' | 'IN_HOUSE' | 'CHECKED_OUT'
  notes?: string
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
    getRoomTypes(): RoomType[]
    insertRoomType(name: string): RoomType
    deleteRoomType(typeId: number): boolean
    insertRoom(room: Pick<Room, 'room_number' | 'room_type' | 'base_price'>): Room
    getRooms(): Room[]
    insertOrder(order: Omit<Order, 'order_id'>): Order
    getOrders(): Order[]
    updateOrder(orderId: number, updates: Partial<Omit<Order, 'order_id'>>): Order
    deleteOrder(orderId: number): boolean
    insertFinancialLog(log: Omit<FinancialLog, 'log_id' | 'created_at'>): FinancialLog
    getFinancialLogs(date?: string): FinancialLog[]
    getFinancialLogsByOrder(orderId: number): Promise<FinancialLog[]>
    updateFinancialLogPayment(orderId: number, paymentMethod: string): Promise<boolean>
    updateFinancialLogAmount(orderId: number, type: string, amount: number): Promise<boolean>
    deleteFinancialLog(logId: number): Promise<boolean>
    updateFinancialLog(logId: number, updates: Partial<Pick<FinancialLog, 'amount' | 'payment_method'>>): Promise<boolean>
    getIncidentalSums(): Promise<{ order_id: number; total: number }[]>
    getFinancialSummary(dateFrom: string, dateTo: string): Promise<FinancialSummary>
    getFinancialLogsDetailed(dateFrom: string, dateTo: string): Promise<FinancialLogDetailed[]>
    exportFinancialLogs(dateFrom: string, dateTo: string): Promise<string | null>
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
  }
}
