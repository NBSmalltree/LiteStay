import { useState, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, Input, Select, Button, DatePicker } from '../../components'
import type { Room, Guest } from '../../../shared/types'

interface Props {
  open: boolean
  room: Room | null
  checkInDate: string
  onClose: () => void
  onSaved: () => void
}

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
  const { t } = useTranslation()
  const [guestName, setGuestName] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [actualAmount, setActualAmount] = useState('')
  const [deposit, setDeposit] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'WeChat' | 'Alipay' | 'Cash'>('WeChat')
  const [source, setSource] = useState('direct')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const PAYMENT_METHODS = useMemo(() => [
    { value: 'WeChat', label: t('checkIn.wechat') },
    { value: 'Alipay', label: t('checkIn.alipay') },
    { value: 'Cash', label: t('checkIn.cash') },
  ], [t])

  const SOURCE_OPTIONS = useMemo(() => [
    { value: 'direct', label: t('sources.direct') },
    { value: 'ctrip', label: t('sources.ctrip') },
    { value: 'meituan', label: t('sources.meituan') },
    { value: 'returning', label: t('sources.returning') },
    { value: 'other', label: t('sources.other') },
  ], [t])

  // Guest search state
  const [guestSearchResults, setGuestSearchResults] = useState<Guest[]>([])
  const [showGuestSearch, setShowGuestSearch] = useState(false)
  const guestSearchDebounce = useRef<ReturnType<typeof setTimeout>>()
  const guestSearchContainerRef = useRef<HTMLDivElement>(null)

  // Reset form when dialog opens
  useEffect(() => {
    if (open && room) {
      setGuestName('')
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
    if (!guestName.trim()) { setError(t('checkIn.guestNameRequired')); return }
    if (checkOut <= checkInDate) { setError(t('checkIn.checkOutMustAfterCheckIn')); return }

    setSaving(true)
    try {
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

      await window.electron.db.insertFinancialLog({
        order_id: order.order_id,
        type: 'ROOM_FEE',
        amount: Number(actualAmount),
        payment_method: paymentMethod,
      })

      if (Number(deposit) > 0) {
        await window.electron.db.insertFinancialLog({
          order_id: order.order_id,
          type: 'DEPOSIT',
          amount: Number(deposit),
          payment_method: paymentMethod,
        })
      }

      onSaved()
      onClose()
    } catch (e: any) {
      setError(e?.message || t('checkIn.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={t('checkIn.title')} maxWidth="md">
      {room && (
        <div className="space-y-4">
          {/* Room info */}
          <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg">
            <span className="text-sm font-semibold text-gray-900">{room.room_number}</span>
            <span className="text-xs text-gray-500">{room.room_type}</span>
            <span className="text-xs text-gray-400 ml-auto">{t('checkIn.basePricePerNight')} ¥{room.base_price}/{t('checkIn.nightsUnit')}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="relative" ref={guestSearchContainerRef}>
              <Input label={t('checkIn.guestName')} id="guest-name" value={guestName} onChange={e => handleGuestNameChange(e.target.value)} />
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
            <Input label={t('checkIn.guestPhone')} id="guest-phone" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} />
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">{t('checkIn.checkInDate')}</label>
              <div className="px-3 py-2 text-sm rounded-lg border border-gray-200 bg-gray-50 text-gray-600">
                {checkInDate}
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="check-out" className="block text-sm font-medium text-gray-700">{t('checkIn.checkOutDate')}</label>
              <DatePicker
                value={checkOut}
                onChange={setCheckOut}
                min={checkInDate}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900
                  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">{t('checkIn.nights')}</label>
              <div className="px-3 py-2 text-sm rounded-lg border border-gray-200 bg-gray-50 text-gray-600">
                {nights} {t('checkIn.nightsUnit')}（{t('checkIn.basePrice')} ¥{basePrice}）
              </div>
            </div>
          </div>

          {/* Payment row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label={t('checkIn.actualAmount')}
                id="actual-amount"
                type="number"
                value={actualAmount}
                onChange={e => setActualAmount(e.target.value)}
              />
              <Input
                label={t('checkIn.deposit')}
                id="deposit"
                type="number"
                value={deposit}
                onChange={e => setDeposit(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Select label={t('checkIn.paymentMethod')} id="payment-method" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </Select>
              <Select label={t('checkIn.source')} id="source" value={source} onChange={e => setSource(e.target.value)}>
                {SOURCE_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">{t('checkIn.notes')}</label>
            <textarea
              id="notes"
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={t('checkIn.notesPlaceholder')}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900
                placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500
                focus:border-primary-500 transition-colors resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? t('checkIn.saving') : t('checkIn.confirm')}</Button>
          </div>
        </div>
      )}
    </Dialog>
  )
}
