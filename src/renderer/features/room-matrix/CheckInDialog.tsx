import { useState, useEffect, useMemo, useRef } from 'react'
import { Dialog, Input, Select, Button } from '../../components'
import type { Room, Guest } from '../../../shared/types'

interface Props {
  open: boolean
  room: Room | null
  checkInDate: string
  onClose: () => void
  onSaved: () => void
}

const PAYMENT_METHODS = [
  { value: 'WeChat', label: '微信' },
  { value: 'Alipay', label: '支付宝' },
  { value: 'Cash', label: '现金' },
]

const SOURCE_OPTIONS = [
  { value: 'direct', label: '直接预订' },
  { value: 'ctrip', label: '携程' },
  { value: 'meituan', label: '美团' },
  { value: 'returning', label: '回头客' },
  { value: 'other', label: '其他' },
]

function addOneDay(dateStr: string): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

function daysBetween(a: string, b: string): number {
  const ms = new Date(b).getTime() - new Date(a).getTime()
  return Math.max(1, Math.ceil(ms / 86400000))
}

export default function CheckInDialog({ open, room, checkInDate, onClose, onSaved }: Props) {
  const [guestName, setGuestName] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [actualAmount, setActualAmount] = useState('')
  const [deposit, setDeposit] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('WeChat')
  const [source, setSource] = useState('direct')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Guest search state
  const [guestSearchResults, setGuestSearchResults] = useState<Guest[]>([])
  const [showGuestSearch, setShowGuestSearch] = useState(false)
  const guestSearchDebounce = useRef<ReturnType<typeof setTimeout>>()
  const guestSearchContainerRef = useRef<HTMLDivElement>(null)

  // Reset form when dialog opens
  useEffect(() => {
    if (open && room) {
      setGuestName('张先生')
      setGuestPhone('')
      setCheckOut(addOneDay(checkInDate))
      setActualAmount(String(room.base_price))
      setDeposit('0')
      setPaymentMethod('WeChat')
      setSource('direct')
      setNotes('')
      setError('')
      setGuestSearchResults([])
      setShowGuestSearch(false)
    }
  }, [open, room, checkInDate])

  // Close guest search dropdown on click outside
  useEffect(() => {
    if (!showGuestSearch) return
    const handleClickOutside = (e: MouseEvent) => {
      if (guestSearchContainerRef.current && !guestSearchContainerRef.current.contains(e.target as Node)) {
        setShowGuestSearch(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showGuestSearch])

  const nights = useMemo(() => daysBetween(checkInDate, checkOut), [checkInDate, checkOut])
  const basePrice = room ? room.base_price * nights : 0

  // Recalculate price using price rules when nights or dates change
  useEffect(() => {
    if (!room || !checkInDate || !checkOut || checkOut <= checkInDate) return

    const calculateWithRules = async () => {
      try {
        const calendar = await window.electron.db.getPriceCalendar(room.room_type, checkInDate, checkOut)
        let totalPrice = 0
        for (const day of calendar) {
          totalPrice += day.final_price
        }
        if (totalPrice > 0) {
          setActualAmount(String(Math.round(totalPrice * 100) / 100))
        } else {
          setActualAmount(String(room.base_price * nights))
        }
      } catch {
        setActualAmount(String(room.base_price * nights))
      }
    }
    calculateWithRules()
  }, [nights, room, checkInDate, checkOut])

  // Guest search handler with debounce
  const handleGuestNameChange = (value: string) => {
    setGuestName(value)
    clearTimeout(guestSearchDebounce.current)
    if (value.length >= 2) {
      guestSearchDebounce.current = setTimeout(async () => {
        const results = await window.electron.db.searchGuests(value)
        setGuestSearchResults(results)
        setShowGuestSearch(results.length > 0)
      }, 300)
    } else {
      setGuestSearchResults([])
      setShowGuestSearch(false)
    }
  }

  const selectGuest = (guest: Guest) => {
    setGuestName(guest.name)
    setGuestPhone(guest.phone || '')
    setShowGuestSearch(false)
    setGuestSearchResults([])
  }

  const handleSave = async () => {
    if (!room) return
    setError('')
    if (!guestName.trim()) { setError('请输入客人称呼'); return }
    if (checkOut <= checkInDate) { setError('退房日期必须晚于入住日期'); return }

    // 验证手机号格式（如果填写了）
    if (guestPhone.trim() && !/^1[3-9]\d{9}$/.test(guestPhone.trim())) {
      setError('请输入正确的手机号')
      return
    }

    setSaving(true)
    try {
      // 查找或创建客人
      const guest = await window.electron.db.findOrCreateGuest({
        name: guestName.trim(),
        phone: guestPhone.trim() || undefined,
      })

      const isFuture = checkInDate > new Date().toISOString().split('T')[0]
      const order = await window.electron.db.insertOrder({
        room_id: room.room_id,
        guest_id: guest.guest_id,
        guest_name: guestName.trim(),
        check_in_date: checkInDate,
        check_out_date: checkOut,
        actual_amount: Number(actualAmount),
        deposit: Number(deposit),
        status: isFuture ? 'PREBOOK' : 'IN_HOUSE',
        notes: notes.trim() || undefined,
        source,
      })

      // Log room fee
      await window.electron.db.insertFinancialLog({
        order_id: order.order_id,
        type: 'ROOM_FEE',
        amount: Number(actualAmount),
        payment_method: paymentMethod as any,
      })

      // Log deposit if > 0
      if (Number(deposit) > 0) {
        await window.electron.db.insertFinancialLog({
          order_id: order.order_id,
          type: 'DEPOSIT',
          amount: Number(deposit),
          payment_method: paymentMethod as any,
        })
      }

      onSaved()
      onClose()
    } catch (e: any) {
      setError(e?.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="开房登记" maxWidth="md">
      {room && (
        <div className="space-y-4">
          {/* Room info */}
          <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg">
            <span className="text-sm font-semibold text-gray-900">{room.room_number}</span>
            <span className="text-xs text-gray-500">{room.room_type}</span>
            <span className="text-xs text-gray-400 ml-auto">基础房价 ¥{room.base_price}/晚</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="relative" ref={guestSearchContainerRef}>
              <Input label="客人称呼" id="guest-name" value={guestName} onChange={e => handleGuestNameChange(e.target.value)} />
              {showGuestSearch && guestSearchResults.length > 0 && (
                <div className="absolute z-10 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 w-full max-h-40 overflow-auto">
                  {guestSearchResults.map(guest => (
                    <div
                      key={guest.guest_id}
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm transition-colors"
                      onClick={() => selectGuest(guest)}
                    >
                      <span className="font-medium text-gray-900">{guest.name}</span>
                      {guest.phone && <span className="ml-2 text-gray-400">{guest.phone}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Input label="手机号（选填）" id="guest-phone" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} />
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">入住日期</label>
              <div className="px-3 py-2 text-sm rounded-lg border border-gray-200 bg-gray-50 text-gray-600">
                {checkInDate}
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="check-out" className="block text-sm font-medium text-gray-700">退房日期</label>
              <input
                id="check-out"
                type="date"
                value={checkOut}
                onChange={e => setCheckOut(e.target.value)}
                min={checkInDate}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900
                  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">住宿天数</label>
              <div className="px-3 py-2 text-sm rounded-lg border border-gray-200 bg-gray-50 text-gray-600">
                {nights} 晚（基础 ¥{basePrice}）
              </div>
            </div>
          </div>

          {/* Payment row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="实际房费"
                id="actual-amount"
                type="number"
                value={actualAmount}
                onChange={e => setActualAmount(e.target.value)}
              />
              <Input
                label="押金"
                id="deposit"
                type="number"
                value={deposit}
                onChange={e => setDeposit(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Select label="支付方式" id="payment-method" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </Select>
              <Select label="客人来源" id="source" value={source} onChange={e => setSource(e.target.value)}>
                {SOURCE_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">备注</label>
            <textarea
              id="notes"
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="特殊需求：加床、接机、禁止吸烟..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900
                placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500
                focus:border-primary-500 transition-colors resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={onClose}>取消</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? '保存中...' : '确认登记'}</Button>
          </div>
        </div>
      )}
    </Dialog>
  )
}
