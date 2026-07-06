import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RoomMatrix from '../features/room-matrix/RoomMatrix'
import type { Room, Order } from '../../shared/types'

// ============================================================
// Date helpers (all relative to "today" at render time, so tests
// are deterministic when we freeze Date)
// ============================================================

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function offsetDate(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ============================================================
// Test data
// ============================================================

const room101: Room = { room_id: 1, room_number: '101', room_type: '大床房', base_price: 200 }
const room102: Room = { room_id: 2, room_number: '102', room_type: '双床房', base_price: 300 }
const room201: Room = { room_id: 3, room_number: '201', room_type: '大床房', base_price: 280 }

// ============================================================
// Tests
// ============================================================

describe('RoomMatrix', () => {
  beforeEach(() => {
    // Freeze Date so all new Date() calls return the same value during the test
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-07-15T00:00:00.000Z') })
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ----------------------------------------------------------
  // 1. Empty state
  // ----------------------------------------------------------
  it('shows noRooms text when no rooms exist', async () => {
    vi.mocked(window.electron.db.getRooms).mockResolvedValue([])
    vi.mocked(window.electron.db.getOrders).mockResolvedValue([])

    render(<RoomMatrix />)

    await waitFor(() => {
      expect(screen.getByText('roomMatrix.noRooms')).toBeInTheDocument()
    })
  })

  // ----------------------------------------------------------
  // 2. Single room renders
  // ----------------------------------------------------------
  it('renders room number and type in the grid', async () => {
    vi.mocked(window.electron.db.getRooms).mockResolvedValue([room101])
    vi.mocked(window.electron.db.getOrders).mockResolvedValue([])

    render(<RoomMatrix />)

    await waitFor(() => {
      expect(screen.getByText('101')).toBeInTheDocument()
    })
    expect(screen.getByText('大床房')).toBeInTheDocument()
  })

  // ----------------------------------------------------------
  // 3. Today highlighting
  // ----------------------------------------------------------
  it('highlights today column with bg-primary-50', async () => {
    vi.mocked(window.electron.db.getRooms).mockResolvedValue([room101])
    vi.mocked(window.electron.db.getOrders).mockResolvedValue([])

    render(<RoomMatrix />)

    await waitFor(() => {
      expect(screen.getByText('101')).toBeInTheDocument()
    })

    const todayDateStr = `${new Date().getMonth() + 1}/${new Date().getDate()}`
    const dateLabel = screen.getByText(todayDateStr)
    const dateHeader = dateLabel.closest('[class*="bg-primary-50"]')
    expect(dateHeader).not.toBeNull()
  })

  // ----------------------------------------------------------
  // 4. Weekend dates
  // ----------------------------------------------------------
  it('shows weekday text for weekend columns', async () => {
    vi.mocked(window.electron.db.getRooms).mockResolvedValue([room101])
    vi.mocked(window.electron.db.getOrders).mockResolvedValue([])

    render(<RoomMatrix />)

    await waitFor(() => {
      expect(screen.getByText('101')).toBeInTheDocument()
    })

    // Weekend columns render t('weekdays.sun') and t('weekdays.sat')
    // The mock t() returns the key when no translation exists
    const weekendLabels = screen.getAllByText(/^weekdays\.(sun|sat)$/)
    expect(weekendLabels.length).toBeGreaterThanOrEqual(2)
  })

  // ----------------------------------------------------------
  // 5. Navigation — prev/next 14-day buttons
  // ----------------------------------------------------------
  it('prev/next 14-day buttons change the month label', async () => {
    vi.mocked(window.electron.db.getRooms).mockResolvedValue([room101])
    vi.mocked(window.electron.db.getOrders).mockResolvedValue([])

    const user = userEvent.setup()
    render(<RoomMatrix />)

    await waitFor(() => {
      expect(screen.getByText('101')).toBeInTheDocument()
    })

    // Initial month label (Chinese format since mock has language: 'zh')
    const initialLabel = '2026年7月'
    expect(screen.getByText(initialLabel)).toBeInTheDocument()

    // Navigate forward 28 days (two periods) to cross into August
    const nextBtn = screen.getByTitle('roomMatrix.next14Days')
    await user.click(nextBtn)
    await user.click(nextBtn)

    expect(screen.getByText('2026年8月')).toBeInTheDocument()

    // Navigate back
    const prevBtn = screen.getByTitle('roomMatrix.prev14Days')
    await user.click(prevBtn)
    await user.click(prevBtn)

    expect(screen.getByText(initialLabel)).toBeInTheDocument()
  })

  // ----------------------------------------------------------
  // 6. Single day navigation
  // ----------------------------------------------------------
  it('prev/next day buttons advance one day', async () => {
    vi.mocked(window.electron.db.getRooms).mockResolvedValue([room101])
    vi.mocked(window.electron.db.getOrders).mockResolvedValue([])

    const user = userEvent.setup()
    render(<RoomMatrix />)

    await waitFor(() => {
      expect(screen.getByText('101')).toBeInTheDocument()
    })

    // Header shows date labels like "7/15", "7/16", etc.
    // Navigate 1 day forward — the first date column should now show "7/16"
    const nextDayBtn = screen.getByTitle('roomMatrix.nextDay')
    await user.click(nextDayBtn)

    // The first visible column now shows July 16
    const afterForward = screen.queryAllByText('7/16')
    expect(afterForward.length).toBeGreaterThan(0)

    // Navigate 1 day back — back to original view
    const prevDayBtn = screen.getByTitle('roomMatrix.prevDay')
    await user.click(prevDayBtn)

    // The first visible column now shows July 15 again
    const afterBack = screen.queryAllByText('7/15')
    expect(afterBack.length).toBeGreaterThan(0)
  })

  // ----------------------------------------------------------
  // 7. "Today" button
  // ----------------------------------------------------------
  it('"Today" button navigates back to current view', async () => {
    vi.mocked(window.electron.db.getRooms).mockResolvedValue([room101])
    vi.mocked(window.electron.db.getOrders).mockResolvedValue([])

    const user = userEvent.setup()
    render(<RoomMatrix />)

    await waitFor(() => {
      expect(screen.getByText('101')).toBeInTheDocument()
    })

    // Navigate forward two periods, then click Today
    const initialLabel = '2026年7月'
    expect(screen.getByText(initialLabel)).toBeInTheDocument()

    const nextBtn = screen.getByTitle('roomMatrix.next14Days')
    await user.click(nextBtn)
    await user.click(nextBtn)

    expect(screen.getByText('2026年8月')).toBeInTheDocument()

    await user.click(screen.getByText('roomMatrix.today'))

    expect(screen.getByText(initialLabel)).toBeInTheDocument()
  })

  // ----------------------------------------------------------
  // 8. Visible IN_HOUSE order block
  // ----------------------------------------------------------
  it('renders a colored order block with guest name for an IN_HOUSE order spanning the view range', async () => {
    vi.mocked(window.electron.db.getRooms).mockResolvedValue([room101])
    vi.mocked(window.electron.db.getOrders).mockResolvedValue([{
      order_id: 10,
      room_id: 1,
      guest_name: '张三',
      check_in_date: offsetDate(-2),
      check_out_date: offsetDate(15),
      actual_amount: 2000,
      deposit: 500,
      status: 'IN_HOUSE',
      source: 'direct',
    }])

    render(<RoomMatrix />)

    await waitFor(() => {
      expect(screen.getByText('张三')).toBeInTheDocument()
    })
  })

  // ----------------------------------------------------------
  // 9. Order outside range
  // ----------------------------------------------------------
  it('does NOT render an order entirely outside the 14-day window', async () => {
    vi.mocked(window.electron.db.getRooms).mockResolvedValue([room101])

    // Order that ends before the visible range starts
    vi.mocked(window.electron.db.getOrders).mockResolvedValue([{
      order_id: 20,
      room_id: 1,
      guest_name: 'OutsideGuest',
      check_in_date: offsetDate(-10),
      check_out_date: offsetDate(-1),
      actual_amount: 500,
      deposit: 0,
      status: 'CHECKED_OUT',
      source: 'direct',
    }])

    render(<RoomMatrix />)

    await waitFor(() => {
      expect(screen.getByText('101')).toBeInTheDocument()
    })

    expect(screen.queryByText('OutsideGuest')).not.toBeInTheDocument()
  })

  // ----------------------------------------------------------
  // 10. PREBOOK order
  // ----------------------------------------------------------
  it('renders a PREBOOK order with blue styling', async () => {
    vi.mocked(window.electron.db.getRooms).mockResolvedValue([room101])

    const prebookOrder: Order = {
      order_id: 30,
      room_id: 1,
      guest_name: '预订单',
      check_in_date: offsetDate(2),
      check_out_date: offsetDate(5),
      actual_amount: 600,
      deposit: 0,
      status: 'PREBOOK',
      source: 'direct',
    }

    vi.mocked(window.electron.db.getOrders).mockResolvedValue([prebookOrder])

    render(<RoomMatrix />)

    await waitFor(() => {
      expect(screen.getByText('预订单')).toBeInTheDocument()
    })

    // PREBOOK style is bg-blue-500
    const block = screen.getByText('预订单').closest('[class*="bg-blue-500"]')
    expect(block).not.toBeNull()
  })

  // ----------------------------------------------------------
  // 11. CHECKED_OUT order
  // ----------------------------------------------------------
  it('renders a CHECKED_OUT order with gray styling', async () => {
    vi.mocked(window.electron.db.getRooms).mockResolvedValue([room101])

    // Order that ended recently (still visible since check_out_date after range start)
    const checkedOutOrder: Order = {
      order_id: 40,
      room_id: 1,
      guest_name: '已离店',
      check_in_date: offsetDate(-2),
      check_out_date: offsetDate(1),
      actual_amount: 400,
      deposit: 0,
      status: 'CHECKED_OUT',
      source: 'direct',
    }

    vi.mocked(window.electron.db.getOrders).mockResolvedValue([checkedOutOrder])

    render(<RoomMatrix />)

    await waitFor(() => {
      expect(screen.getByText('已离店')).toBeInTheDocument()
    })

    // CHECKED_OUT style is bg-gray-400
    const block = screen.getByText('已离店').closest('[class*="bg-gray-400"]')
    expect(block).not.toBeNull()
  })

  // ----------------------------------------------------------
  // 12. Multiple rooms render
  // ----------------------------------------------------------
  it('renders each room as its own row', async () => {
    const multipleRooms: Room[] = [room101, room102, room201]
    vi.mocked(window.electron.db.getRooms).mockResolvedValue(multipleRooms)
    vi.mocked(window.electron.db.getOrders).mockResolvedValue([])

    render(<RoomMatrix />)

    await waitFor(() => {
      expect(screen.getByText('101')).toBeInTheDocument()
    })

    expect(screen.getByText('102')).toBeInTheDocument()
    expect(screen.getByText('201')).toBeInTheDocument()

    // Each room type appears
    expect(screen.getAllByText('大床房').length).toBe(2) // rooms 101 and 201
    expect(screen.getByText('双床房')).toBeInTheDocument()
  })
})
