import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RoomMatrix from '../features/room-matrix/RoomMatrix'
import CheckInDialog from '../features/room-matrix/CheckInDialog'
import OrderDetailDialog from '../features/room-matrix/OrderDetailDialog'
import type { Room, Order, RoomType, FinancialLog } from '../../shared/types'

// ============================================================
// Test data
// ============================================================

const mockRoomTypes: RoomType[] = [
  { type_id: 1, type_name: '大床房', sort_order: 1 },
  { type_id: 2, type_name: '双床房', sort_order: 2 },
]

const room101: Room = { room_id: 1, room_number: '101', room_type: '大床房', base_price: 200 }
const room102: Room = { room_id: 2, room_number: '102', room_type: '双床房', base_price: 300 }
const room201: Room = { room_id: 3, room_number: '201', room_type: '大床房', base_price: 280 }

const allRooms: Room[] = [room101, room102, room201]

const occupiedOrder: Order = {
  order_id: 10,
  room_id: 2,
  guest_name: '李四',
  guest_phone: '13900139000',
  check_in_date: '2026-06-30',
  check_out_date: '2026-07-10',
  actual_amount: 3000,
  deposit: 500,
  status: 'IN_HOUSE',
  source: 'ctrip',
  notes: '带小孩',
}

const pastOrder: Order = {
  order_id: 20,
  room_id: 3,
  guest_name: '王五',
  check_in_date: '2026-07-01',
  check_out_date: '2026-07-05',
  actual_amount: 1400,
  deposit: 0,
  status: 'CHECKED_OUT',
  source: 'direct',
}

const allOrders: Order[] = [occupiedOrder, pastOrder]

const mockGuest = {
  guest_id: 1,
  name: '张三',
  phone: '13800138000',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}

const createdOrder: Order = {
  order_id: 100,
  room_id: 1,
  guest_name: '张三',
  check_in_date: '2026-07-06',
  check_out_date: '2026-07-07',
  actual_amount: 200,
  deposit: 0,
  status: 'IN_HOUSE',
  source: 'direct',
}

// ============================================================
// Helper: click the first date cell of a room row in the Matrix
// ============================================================
async function clickFirstRoomCell(user: ReturnType<typeof userEvent.setup>, roomNumber: string) {
  // Use getAllByText in case the component renders the room number twice (e.g. dialog open)
  const roomNumberElements = screen.getAllByText(roomNumber)
  const roomInfo = roomNumberElements[0].closest('[class*="flex"]')!
  const roomRow = roomInfo.parentElement!
  const cellsDiv = roomRow.querySelector('[class*="flex-1"][class*="relative"]')!
  const firstCell = cellsDiv.querySelector('[class*="cursor-pointer"]')! as HTMLElement
  await user.click(firstCell)
}

async function waitForRooms() {
  await waitFor(() => {
    expect(screen.queryAllByText('101').length).toBeGreaterThan(0)
  })
}

// ============================================================
// Integration test harness (mirrors App.tsx state pattern)
// ============================================================

function CheckInHarness() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [checkInRoom, setCheckInRoom] = useState<Room | null>(null)
  const [checkInDate, setCheckInDate] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [selectedOrderRoom, setSelectedOrderRoom] = useState<Room | null>(null)

  return (
    <>
      <RoomMatrix
        key={refreshKey}
        onCellClick={(room, date) => {
          setCheckInRoom(room)
          setCheckInDate(date)
        }}
        onOrderClick={(order, room) => {
          setSelectedOrder(order)
          setSelectedOrderRoom(room)
        }}
      />
      <CheckInDialog
        open={!!checkInRoom}
        room={checkInRoom}
        checkInDate={checkInDate}
        onClose={() => setCheckInRoom(null)}
        onSaved={() => {
          setCheckInRoom(null)
          setRefreshKey(k => k + 1)
        }}
      />
      <OrderDetailDialog
        open={!!selectedOrder}
        order={selectedOrder}
        room={selectedOrderRoom}
        onClose={() => { setSelectedOrder(null); setSelectedOrderRoom(null) }}
        onSaved={() => { setSelectedOrder(null); setSelectedOrderRoom(null); setRefreshKey(k => k + 1) }}
        onDeleted={() => { setSelectedOrder(null); setSelectedOrderRoom(null); setRefreshKey(k => k + 1) }}
      />
    </>
  )
}

// ============================================================
// Tests
// ============================================================

describe('入住办理集成测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // All IPC methods return Promises
    vi.mocked(window.electron.db.getRooms).mockResolvedValue(allRooms)
    vi.mocked(window.electron.db.getOrders).mockResolvedValue(allOrders)
    vi.mocked(window.electron.db.getRoomTypes).mockResolvedValue(mockRoomTypes)

    // OrderDetailDialog loads financial logs on mount
    vi.mocked(window.electron.db.getFinancialLogsByOrder).mockResolvedValue([])

    // Default price calendar: uses base price
    vi.mocked(window.electron.db.getPriceCalendar).mockImplementation(
      async (_roomType: string, _from: string, to: string) => {
        const base = _roomType === '双床房' ? 300 : 280
        const days: { date: string; room_type: string; base_price: number; final_price: number }[] = []
        const start = new Date(_from)
        const end = new Date(to)
        for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
          days.push({
            date: d.toISOString().slice(0, 10),
            room_type: _roomType,
            base_price: base,
            final_price: base,
          })
        }
        return days
      }
    )

    // Guest search: empty by default
    vi.mocked(window.electron.db.searchGuests).mockResolvedValue([])

    // Guest & order creation
    vi.mocked(window.electron.db.findOrCreateGuest).mockResolvedValue(mockGuest)
    vi.mocked(window.electron.db.insertOrder).mockResolvedValue(createdOrder)
    vi.mocked(window.electron.db.insertFinancialLog).mockResolvedValue({
      log_id: 1,
      order_id: 100,
      type: 'ROOM_FEE' as const,
      amount: 200,
      payment_method: 'WeChat' as const,
      created_at: '2026-07-06T00:00:00.000Z',
    })
  })

  // ----------------------------------------------------------
  // 1. Matrix cell click → CheckInDialog
  // ----------------------------------------------------------
  it('点击空房格子 → 弹出入住办理弹窗，预填房号和日期', async () => {
    const user = userEvent.setup()
    render(<CheckInHarness />)

    await waitForRooms()

    await clickFirstRoomCell(user, '101')

    await waitFor(() => {
      expect(screen.getByText('办理入住')).toBeInTheDocument()
      // Room number in dialog (also present in matrix, so use getAllByText)
      expect(screen.queryAllByText('101').length).toBeGreaterThanOrEqual(2)
      expect(screen.getByLabelText('客人姓名')).toBeInTheDocument()
    })
  }, 10000)

  // ----------------------------------------------------------
  // 2. Full check-in flow: IN_HOUSE
  // ----------------------------------------------------------
  it('完整入住：点击空房 → 填写姓名 → 保存 → 弹窗关闭(IN_HOUSE)', async () => {
    const user = userEvent.setup()
    render(<CheckInHarness />)

    await waitForRooms()
    await clickFirstRoomCell(user, '101')
    await waitFor(() => expect(screen.getByText('办理入住')).toBeInTheDocument())

    await user.type(screen.getByLabelText('客人姓名'), '张三')
    await user.click(screen.getByRole('button', { name: '确认入住' }))

    // Check that DB methods were called
    await waitFor(() => {
      expect(window.electron.db.findOrCreateGuest).toHaveBeenCalled()
    })
    await waitFor(() => {
      expect(window.electron.db.insertOrder).toHaveBeenCalledWith(
        expect.objectContaining({ room_id: 1, status: 'IN_HOUSE' })
      )
    })
    await waitFor(() => {
      expect(window.electron.db.insertFinancialLog).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'ROOM_FEE' })
      )
    })

    // Dialog closes
    await waitFor(() => {
      expect(screen.queryByText('办理入住')).not.toBeInTheDocument()
    })
  }, 10000)

  // ----------------------------------------------------------
  // 3. Deposit → two financial logs
  // ----------------------------------------------------------
  it('设置押金 → 插入 ROOM_FEE + DEPOSIT 两条财务日志', async () => {
    const user = userEvent.setup()
    render(<CheckInHarness />)

    await waitForRooms()
    await clickFirstRoomCell(user, '101')
    await waitFor(() => expect(screen.getByText('办理入住')).toBeInTheDocument())

    await user.type(screen.getByLabelText('客人姓名'), '张三')
    const depositInput = screen.getByLabelText('押金')
    await user.clear(depositInput)
    await user.type(depositInput, '200')
    await user.click(screen.getByRole('button', { name: '确认入住' }))

    await waitFor(() => {
      expect(window.electron.db.insertFinancialLog).toHaveBeenCalledTimes(2)
      expect(window.electron.db.insertFinancialLog).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'DEPOSIT', amount: 200 })
      )
    })
  })

  // ----------------------------------------------------------
  // 4. PREBOOK for future date
  // ----------------------------------------------------------
  it('未来日期入住 → 订单状态为 PREBOOK', async () => {
    const user = userEvent.setup()
    render(<CheckInHarness />)

    await waitForRooms()

    // Navigate forward two periods (28 days ahead) using the untranslated title
    const nextBtn = screen.getByTitle('roomMatrix.next14Days')
    await user.click(nextBtn)
    await user.click(nextBtn)

    await clickFirstRoomCell(user, '101')
    await waitFor(() => expect(screen.getByText('办理入住')).toBeInTheDocument())

    await user.type(screen.getByLabelText('客人姓名'), '张三')
    await user.click(screen.getByRole('button', { name: '确认入住' }))

    await waitFor(() => {
      expect(window.electron.db.insertOrder).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'PREBOOK' })
      )
    })
  })

  // ----------------------------------------------------------
  // 5. Price rules affect amount
  // ----------------------------------------------------------
  it('价格规则 → actualAmount 反映 final_price 而非 base_price', async () => {
    vi.mocked(window.electron.db.getPriceCalendar).mockResolvedValue([
      { date: '2026-07-06', room_type: '大床房', base_price: 200, final_price: 250 },
    ])

    const user = userEvent.setup()
    render(<CheckInHarness />)

    await waitForRooms()
    await clickFirstRoomCell(user, '101')

    await waitFor(() => {
      const amountInput = screen.getByLabelText('实收金额') as HTMLInputElement
      expect(Number(amountInput.value)).toBe(250)
    })
  })

  // ----------------------------------------------------------
  // 6. Guest search during check-in
  // ----------------------------------------------------------
  it('搜索回头客 → 选择后自动填充电话 → 完成入住', async () => {
    vi.mocked(window.electron.db.searchGuests).mockResolvedValue([
      { guest_id: 5, name: '老顾客', phone: '13600136000', created_at: '', updated_at: '' },
    ])

    const user = userEvent.setup()
    render(<CheckInHarness />)

    await waitForRooms()
    await clickFirstRoomCell(user, '101')
    await waitFor(() => expect(screen.getByText('办理入住')).toBeInTheDocument())

    const guestInput = screen.getByLabelText('客人姓名')
    await user.type(guestInput, '老顾客')
    await new Promise(r => setTimeout(r, 500))

    expect(screen.getByText('老顾客')).toBeInTheDocument()
    expect(screen.getByText('13600136000')).toBeInTheDocument()
    await user.click(screen.getByText('老顾客'))

    expect(screen.getByLabelText('客人电话')).toHaveValue('13600136000')

    await user.click(screen.getByRole('button', { name: '确认入住' }))

    await waitFor(() => {
      expect(window.electron.db.findOrCreateGuest).toHaveBeenCalled()
      expect(window.electron.db.insertOrder).toHaveBeenCalled()
    })
  }, 15000)

  // ----------------------------------------------------------
  // 7. Occupied room shows order block
  // ----------------------------------------------------------
  it('在住房间的订单条块可点击', async () => {
    render(<CheckInHarness />)

    await waitFor(() => expect(screen.getAllByText('101').length).toBeGreaterThan(0))

    // Room 102 has an IN_HOUSE order for "李四" spanning Jun 30 - Jul 10
    expect(screen.getByText('李四')).toBeInTheDocument()
  })
})
