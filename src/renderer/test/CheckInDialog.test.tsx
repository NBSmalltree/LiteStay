import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CheckInDialog from '../features/room-matrix/CheckInDialog'
import type { Room } from '../../shared/types'

const mockRoom: Room = {
  room_id: 1,
  room_number: '101',
  room_type: '大床房',
  base_price: 200,
}

const mockGuest = {
  guest_id: 1,
  name: '张三',
  phone: '13800138000',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}

const mockOrder = {
  order_id: 1,
  room_id: 1,
  guest_name: '张三',
  check_in_date: '2026-07-06',
  check_out_date: '2026-07-07',
  actual_amount: 200,
  deposit: 0,
  status: 'IN_HOUSE' as const,
  source: 'direct',
}

describe('CheckInDialog', () => {
  const onClose = vi.fn()
  const onSaved = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock implementations
    vi.mocked(window.electron.db.getPriceCalendar).mockResolvedValue([
      { date: '2026-07-06', room_type: '大床房', base_price: 200, final_price: 200 },
    ])
    vi.mocked(window.electron.db.searchGuests).mockResolvedValue([])
    vi.mocked(window.electron.db.findOrCreateGuest).mockResolvedValue(mockGuest)
    vi.mocked(window.electron.db.insertOrder).mockResolvedValue(mockOrder)
    vi.mocked(window.electron.db.insertFinancialLog).mockResolvedValue({
      log_id: 1,
      order_id: 1,
      type: 'ROOM_FEE' as const,
      amount: 200,
      payment_method: 'WeChat' as const,
      created_at: '2026-07-06T00:00:00.000Z',
    })
  })

  // ========== Rendering ==========

  it('renders nothing when open is false', () => {
    const { container } = render(
      <CheckInDialog
        open={false}
        room={mockRoom}
        checkInDate="2026-07-06"
        onClose={onClose}
        onSaved={onSaved}
      />
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders dialog shell but no room content when room is null', () => {
    render(
      <CheckInDialog
        open={true}
        room={null}
        checkInDate="2026-07-06"
        onClose={onClose}
        onSaved={onSaved}
      />
    )

    // Dialog title renders
    expect(screen.getByText('办理入住')).toBeInTheDocument()
    // Room-specific content should NOT render
    expect(screen.queryByText('101')).not.toBeInTheDocument()
    expect(screen.queryByText('大床房')).not.toBeInTheDocument()
  })

  it('renders form with pre-filled values when open with a room', () => {
    render(
      <CheckInDialog
        open={true}
        room={mockRoom}
        checkInDate="2026-07-06"
        onClose={onClose}
        onSaved={onSaved}
      />
    )

    // Room info displayed
    expect(screen.getByText('101')).toBeInTheDocument()
    expect(screen.getByText('大床房')).toBeInTheDocument()

    // Check-in date displayed as read-only text
    expect(screen.getByText('2026-07-06')).toBeInTheDocument()

    // Check-out date hidden input defaults to checkIn + 1 day
    expect(screen.getByDisplayValue('2026-07-07')).toBeInTheDocument()

    // Nights display
    expect(screen.getByText(/1 晚/)).toBeInTheDocument()

    // Actual amount defaults to base price
    const amountInput = screen.getByLabelText('实收金额')
    expect(amountInput).toHaveValue(200)

    // Default deposit is 0
    const depositInput = screen.getByLabelText('押金')
    expect(depositInput).toHaveValue(0)

    // Buttons
    expect(screen.getByRole('button', { name: '确认入住' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '取消' })).toBeInTheDocument()
  })

  it('calls getPriceCalendar on mount to calculate price', async () => {
    render(
      <CheckInDialog
        open={true}
        room={mockRoom}
        checkInDate="2026-07-06"
        onClose={onClose}
        onSaved={onSaved}
      />
    )

    await waitFor(() => {
      expect(window.electron.db.getPriceCalendar).toHaveBeenCalledWith(
        '大床房', '2026-07-06', '2026-07-07'
      )
    })
  })

  // ========== Validation ==========

  it('shows error when guest name is empty on save', async () => {
    const user = userEvent.setup()
    render(
      <CheckInDialog
        open={true}
        room={mockRoom}
        checkInDate="2026-07-06"
        onClose={onClose}
        onSaved={onSaved}
      />
    )

    await user.click(screen.getByRole('button', { name: '确认入住' }))

    expect(screen.getByText('请输入客人姓名')).toBeInTheDocument()
    expect(window.electron.db.findOrCreateGuest).not.toHaveBeenCalled()
    expect(window.electron.db.insertOrder).not.toHaveBeenCalled()
  })

  // ========== Save flow ==========

  it('saves successfully with valid data', async () => {
    const user = userEvent.setup()
    render(
      <CheckInDialog
        open={true}
        room={mockRoom}
        checkInDate="2026-07-06"
        onClose={onClose}
        onSaved={onSaved}
      />
    )

    await user.type(screen.getByLabelText('客人姓名'), '张三')
    await user.click(screen.getByRole('button', { name: '确认入住' }))

    await waitFor(() => {
      // findOrCreateGuest called with guest data
      expect(window.electron.db.findOrCreateGuest).toHaveBeenCalledWith({
        name: '张三',
        phone: undefined,
      })

      // insertOrder called with correct data
      expect(window.electron.db.insertOrder).toHaveBeenCalledWith({
        room_id: 1,
        guest_id: 1,
        guest_name: '张三',
        check_in_date: '2026-07-06',
        check_out_date: '2026-07-07',
        actual_amount: 200,
        deposit: 0,
        status: 'IN_HOUSE',
        notes: undefined,
        source: 'direct',
      })

      // financial log inserted for room fee
      expect(window.electron.db.insertFinancialLog).toHaveBeenCalledWith({
        order_id: 1,
        type: 'ROOM_FEE',
        amount: 200,
        payment_method: 'WeChat',
      })

      // callbacks
      expect(onSaved).toHaveBeenCalled()
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('creates DEPOSIT financial log when deposit > 0', async () => {
    const user = userEvent.setup()
    render(
      <CheckInDialog
        open={true}
        room={mockRoom}
        checkInDate="2026-07-06"
        onClose={onClose}
        onSaved={onSaved}
      />
    )

    await user.type(screen.getByLabelText('客人姓名'), '张三')
    const depositInput = screen.getByLabelText('押金')
    await user.clear(depositInput)
    await user.type(depositInput, '100')
    await user.click(screen.getByRole('button', { name: '确认入住' }))

    await waitFor(() => {
      expect(window.electron.db.insertFinancialLog).toHaveBeenCalledTimes(2)
      expect(window.electron.db.insertFinancialLog).toHaveBeenCalledWith({
        order_id: 1,
        type: 'DEPOSIT',
        amount: 100,
        payment_method: 'WeChat',
      })
    })
  })

  it('creates PREBOOK order when check-in date is in the future', async () => {
    const user = userEvent.setup()
    render(
      <CheckInDialog
        open={true}
        room={mockRoom}
        checkInDate="2099-01-01"
        onClose={onClose}
        onSaved={onSaved}
      />
    )

    await user.type(screen.getByLabelText('客人姓名'), '张三')
    await user.click(screen.getByRole('button', { name: '确认入住' }))

    await waitFor(() => {
      expect(window.electron.db.insertOrder).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'PREBOOK' })
      )
    })
  })

  // ========== Guest search ==========

  it('calls searchGuests with debounce when typing guest name', async () => {
    const user = userEvent.setup()
    render(
      <CheckInDialog
        open={true}
        room={mockRoom}
        checkInDate="2026-07-06"
        onClose={onClose}
        onSaved={onSaved}
      />
    )

    const guestInput = screen.getByLabelText('客人姓名')
    await user.type(guestInput, '张三')

    // Wait for debounce (300ms) + buffer
    await new Promise(r => setTimeout(r, 500))

    expect(window.electron.db.searchGuests).toHaveBeenCalledWith('张三')
  }, 10000)

  it('shows guest search results dropdown and fills name on selection', async () => {
    vi.mocked(window.electron.db.searchGuests).mockResolvedValue([
      { guest_id: 1, name: '张三', phone: '13800138000', created_at: '', updated_at: '' },
      { guest_id: 2, name: '张三丰', phone: '13900139000', created_at: '', updated_at: '' },
    ])

    const user = userEvent.setup()
    render(
      <CheckInDialog
        open={true}
        room={mockRoom}
        checkInDate="2026-07-06"
        onClose={onClose}
        onSaved={onSaved}
      />
    )

    const guestInput = screen.getByLabelText('客人姓名')
    await user.type(guestInput, '张三')
    await new Promise(r => setTimeout(r, 500))

    // Search results appear
    expect(screen.getByText('张三')).toBeInTheDocument()
    expect(screen.getByText('13800138000')).toBeInTheDocument()

    // Click on result
    await user.click(screen.getByText('张三'))

    // Name filled in, dropdown gone
    expect(guestInput).toHaveValue('张三')
    await waitFor(() => {
      expect(screen.queryByText('13800138000')).not.toBeInTheDocument()
    })
  }, 15000)

  // ========== Payment method and source ==========

  it('renders payment method and source selectors', () => {
    render(
      <CheckInDialog
        open={true}
        room={mockRoom}
        checkInDate="2026-07-06"
        onClose={onClose}
        onSaved={onSaved}
      />
    )

    expect(screen.getByLabelText('支付方式')).toBeInTheDocument()
    expect(screen.getByLabelText('客源')).toBeInTheDocument()
  })

  // ========== Error handling ==========

  it('shows error message when save fails', async () => {
    const user = userEvent.setup()
    vi.mocked(window.electron.db.findOrCreateGuest).mockRejectedValue(
      new Error('数据库错误')
    )

    render(
      <CheckInDialog
        open={true}
        room={mockRoom}
        checkInDate="2026-07-06"
        onClose={onClose}
        onSaved={onSaved}
      />
    )

    await user.type(screen.getByLabelText('客人姓名'), '张三')
    await user.click(screen.getByRole('button', { name: '确认入住' }))

    await waitFor(() => {
      expect(screen.getByText('数据库错误')).toBeInTheDocument()
    })
    expect(onSaved).not.toHaveBeenCalled()
  })

  // ========== Dialog close ==========

  it('calls onClose when cancel button is clicked', async () => {
    const user = userEvent.setup()
    render(
      <CheckInDialog
        open={true}
        room={mockRoom}
        checkInDate="2026-07-06"
        onClose={onClose}
        onSaved={onSaved}
      />
    )

    await user.click(screen.getByRole('button', { name: '取消' }))
    expect(onClose).toHaveBeenCalled()
  })
})
