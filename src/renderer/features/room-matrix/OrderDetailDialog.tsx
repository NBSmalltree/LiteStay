import { useState, useEffect, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, Input, Select, Button, DatePicker, useDialogs } from '../../components'
import { useEdition } from '../../hooks/useEdition'
import IncidentalCharges from './IncidentalCharges'
import RoomChangePanel from './RoomChangePanel'
import InvoiceSection from './InvoiceSection'
import type { Order, Room, FinancialLog } from '../../../shared/types'

interface Props {
  open: boolean
  order: Order | null
  room: Room | null
  onClose: () => void
  onSaved: () => void
  onDeleted: () => void
}

const STATUS_LABELS: Record<string, string> = {
  PREBOOK: 'orderDetail.actions.prebook',
  IN_HOUSE: 'orderDetail.actions.inHouse',
  CHECKED_OUT: 'orderDetail.actions.checkedOut',
}

const PAYMENT_METHODS = [
  { value: 'WeChat', label: 'checkIn.wechat' },
  { value: 'Alipay', label: 'checkIn.alipay' },
  { value: 'Cash', label: 'checkIn.cash' },
]

const SOURCE_OPTIONS = [
  { value: 'direct', label: 'sources.direct' },
  { value: 'ctrip', label: 'sources.ctrip' },
  { value: 'meituan', label: 'sources.meituan' },
  { value: 'returning', label: 'sources.returning' },
  { value: 'other', label: 'sources.other' },
]

export default function OrderDetailDialog({ open, order, room, onClose, onSaved, onDeleted }: Props) {
  const { t } = useTranslation()
  const { hasFeature } = useEdition()
  const { showAlert, AlertComponent } = useDialogs()
  const [guestName, setGuestName] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [checkInDate, setCheckInDate] = useState('')
  const [checkOutDate, setCheckOutDate] = useState('')
  const [actualAmount, setActualAmount] = useState('')
  const [deposit, setDeposit] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('WeChat')
  const [notes, setNotes] = useState('')
  const [source, setSource] = useState('direct')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const initRef = useRef(true)

  // Incidental state
  const [incidentals, setIncidentals] = useState<FinancialLog[]>([])
  const [showIncidental, setShowIncidental] = useState(false)
  const [incidentalAmount, setIncidentalAmount] = useState('100')
  const [incidentalMethod, setIncidentalMethod] = useState<'WeChat' | 'Alipay' | 'Cash'>('WeChat')
  const [editingLogId, setEditingLogId] = useState<number | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editMethod, setEditMethod] = useState<'WeChat' | 'Alipay' | 'Cash'>('WeChat')

  // Invoice state
  const [showInvoiceForm, setShowInvoiceForm] = useState(false)
  const [invoiceTitle, setInvoiceTitle] = useState('')
  const [invoiceTaxNumber, setInvoiceTaxNumber] = useState('')
  const [invoiceType, setInvoiceType] = useState<'normal' | 'special'>('normal')
  const [invoiceSaving, setInvoiceSaving] = useState(false)

  // Room-change state
  const [allRooms, setAllRooms] = useState<Room[]>([])
  const [showRoomChange, setShowRoomChange] = useState(false)
  const [targetRoomId, setTargetRoomId] = useState<number | null>(null)
  const [showPriceChangeConfirm, setShowPriceChangeConfirm] = useState(false)
  const [pendingRoomChange, setPendingRoomChange] = useState<{
    newRoomId: number
    currentPrice: number
    newPrice: number
    diff: number
    nights: number
  } | null>(null)

  const loadLogs = async (orderId: number) => {
    const logs = await window.electron.db.getFinancialLogsByOrder(orderId)
    const roomFeeLog = logs.find(l => l.type === 'ROOM_FEE')
    if (roomFeeLog) setPaymentMethod(roomFeeLog.payment_method)
    setIncidentals(logs.filter(l => l.type === 'INCIDENTAL'))
  }

  useEffect(() => {
    if (open && order) {
      initRef.current = true
      setGuestName(order.guest_name)
      setGuestPhone(order.guest_phone || '')
      setCheckInDate(order.check_in_date)
      setCheckOutDate(order.check_out_date)
      setActualAmount(String(order.actual_amount))
      setDeposit(String(order.deposit))
      setNotes(order.notes || '')
      setSource(order.source || 'direct')
      setError('')
      setConfirmDelete(false)
      setShowIncidental(false)
      setIncidentalAmount('100')
      setIncidentalMethod('WeChat')
      setEditingLogId(null)
      setShowRoomChange(false)
      setTargetRoomId(null)
      setShowPriceChangeConfirm(false)
      setPendingRoomChange(null)
      setShowInvoiceForm(false)
      setInvoiceTitle('')
      setInvoiceTaxNumber('')
      setInvoiceType('normal')
      loadLogs(order.order_id)
      window.electron.db.getRooms().then((rooms: Room[]) => setAllRooms(rooms))
    }
  }, [open, order])

  // Recalculate amount when dates change (skip initial load)
  useEffect(() => {
    if (!room || !checkInDate || !checkOutDate) return
    if (initRef.current) { initRef.current = false; return }
    const nights = Math.max(1, Math.ceil((new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / 86400000))
    setActualAmount(String(room.base_price * nights))
  }, [checkInDate, checkOutDate, room])

  const handleSave = async () => {
    if (!order) return
    setError('')
    if (!guestName.trim()) { setError(t('orderDetail.validation.guestNameRequired')); return }
    if (guestPhone.trim() && !/^1[3-9]\d{9}$/.test(guestPhone.trim())) {
      setError(t('orderDetail.validation.invalidPhone'))
      return
    }

    setSaving(true)
    try {
      const guest = await window.electron.db.findOrCreateGuest({
        name: guestName.trim(),
        phone: guestPhone.trim() || undefined,
      })
      await window.electron.db.updateOrder(order.order_id, {
        guest_id: guest.guest_id,
        guest_name: guestName.trim(),
        check_in_date: checkInDate,
        check_out_date: checkOutDate,
        actual_amount: Number(actualAmount),
        deposit: Number(deposit),
        notes: notes.trim() || undefined,
        source,
      })
      await window.electron.db.updateFinancialLogPayment(order.order_id, paymentMethod)
      await window.electron.db.updateFinancialLogAmount(order.order_id, 'ROOM_FEE', Number(actualAmount))
      await window.electron.db.updateFinancialLogAmount(order.order_id, 'DEPOSIT', Number(deposit))
      onSaved()
      onClose()
    } catch (e: any) {
      setError(e?.message || t('orderDetail.validation.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const today = new Date().toISOString().split('T')[0]

  const targetRoom = useMemo(
    () => allRooms.find(r => r.room_id === targetRoomId) ?? null,
    [allRooms, targetRoomId],
  )

  const handleStatusChange = async (newStatus: string) => {
    if (!order) return
    if (newStatus === 'IN_HOUSE' && order.status === 'PREBOOK' && checkInDate > today) {
      setError(t('orderDetail.validation.checkInNotReached'))
      return
    }
    setSaving(true)
    try {
      await window.electron.db.updateOrder(order.order_id, { status: newStatus as Order['status'] })
      onSaved()
      onClose()
    } catch (e: any) {
      setError(e?.message || t('orderDetail.validation.statusUpdateFailed'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!order) return
    if (!confirmDelete) { setConfirmDelete(true); return }
    setSaving(true)
    try {
      await window.electron.db.deleteOrder(order.order_id)
      onDeleted()
      onClose()
    } catch (e: any) {
      setError(e?.message || t('orderDetail.validation.deleteFailed'))
    } finally {
      setSaving(false)
    }
  }

  // Incidental handlers
  const handleAddIncidental = async () => {
    if (!order) return
    await window.electron.db.insertFinancialLog({
      order_id: order.order_id,
      type: 'INCIDENTAL',
      amount: Number(incidentalAmount),
      payment_method: incidentalMethod,
    })
    setShowIncidental(false)
    setIncidentalAmount('100')
    loadLogs(order.order_id)
    onSaved()
  }

  const handleDeleteIncidental = async (logId: number) => {
    await window.electron.db.deleteFinancialLog(logId)
    loadLogs(order!.order_id)
    onSaved()
  }

  const handleSaveIncidentalEdit = async (logId: number) => {
    await window.electron.db.updateFinancialLog(logId, {
      amount: Number(editAmount),
      payment_method: editMethod,
    })
    setEditingLogId(null)
    loadLogs(order!.order_id)
    onSaved()
  }

  const handleStartEdit = (log: FinancialLog) => {
    setEditingLogId(log.log_id)
    setEditAmount(String(log.amount))
    setEditMethod(log.payment_method)
  }

  // Room-change handlers
  const handleRoomChange = () => {
    if (!order || !targetRoom || !room) return
    const currentPrice = room.base_price
    const newPrice = targetRoom.base_price
    const priceDiff = newPrice - currentPrice
    const nights = Math.max(1, Math.ceil((new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / 86400000))
    if (Math.abs(priceDiff) > 0.01) {
      setPendingRoomChange({ newRoomId: targetRoom.room_id, currentPrice, newPrice, diff: priceDiff, nights })
      setShowPriceChangeConfirm(true)
    } else {
      executeRoomChange(targetRoom.room_id, order.actual_amount)
    }
  }

  const executeRoomChange = async (newRoomId: number, newAmount: number) => {
    if (!order) return
    setSaving(true)
    setError('')
    try {
      await window.electron.db.updateOrder(order.order_id, { room_id: newRoomId, actual_amount: newAmount })
      await window.electron.db.updateFinancialLogAmount(order.order_id, 'ROOM_FEE', newAmount)
      setActualAmount(String(newAmount))
      setShowPriceChangeConfirm(false)
      setPendingRoomChange(null)
      setShowRoomChange(false)
      setTargetRoomId(null)
      onSaved()
    } catch (e: any) {
      setError(e?.message || t('orderDetail.validation.roomChangeFailed'))
    } finally {
      setSaving(false)
    }
  }

  const cancelRoomChange = () => {
    setShowRoomChange(false)
    setTargetRoomId(null)
    setShowPriceChangeConfirm(false)
    setPendingRoomChange(null)
  }

  // Invoice handlers
  const handleApplyInvoice = async () => {
    if (!order) return
    if (!invoiceTitle.trim()) return
    setInvoiceSaving(true)
    try {
      await window.electron.db.insertInvoice({
        order_id: order.order_id,
        title: invoiceTitle.trim(),
        tax_number: invoiceTaxNumber || undefined,
        invoice_type: invoiceType,
      })
      setShowInvoiceForm(false)
      setInvoiceTitle('')
      setInvoiceTaxNumber('')
      setInvoiceType('normal')
      showAlert({ message: t('orderDetail.validation.invoiceSubmitted'), variant: 'success' })
    } catch (e: any) {
      showAlert({ message: e?.message || t('orderDetail.validation.invoiceFailed'), variant: 'error' })
    } finally {
      setInvoiceSaving(false)
    }
  }

  if (!order || !room) return null

  return (
    <Dialog open={open} onClose={onClose} title={t('orderDetail.title')} maxWidth="md">
      <div className="flex flex-col gap-3" style={{ maxHeight: 'calc(90vh - 160px)' }}>
        <div
          className="flex-1 overflow-y-auto flex flex-col gap-3"
          style={{ paddingRight: '12px', marginRight: '-4px', scrollbarGutter: 'stable', minHeight: 0 }}
        >
          {/* Room + status */}
          <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg">
            <span className="text-sm font-semibold text-gray-900">{room.room_number}</span>
            <span className="text-xs text-gray-500">{room.room_type}</span>
            <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full
              ${order.status === 'IN_HOUSE' ? 'bg-red-100 text-red-700' :
                order.status === 'PREBOOK' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
              {t(STATUS_LABELS[order.status])}
            </span>
          </div>

          {/* Date info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="edit-checkin" className="block text-sm font-medium text-gray-700">{t('orderDetail.fields.checkInDate')}</label>
              <DatePicker value={checkInDate} onChange={setCheckInDate}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="edit-checkout" className="block text-sm font-medium text-gray-700">{t('orderDetail.fields.checkOutDate')}</label>
              <DatePicker value={checkOutDate} onChange={setCheckOutDate}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors" />
            </div>
          </div>

          {/* Extend stay */}
          {order.status !== 'CHECKED_OUT' && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">{t('orderDetail.extendStay')}</span>
              {[1, 2, 3].map(n => (
                <button key={n} onClick={async () => {
                  const d = new Date(order.check_out_date)
                  d.setDate(d.getDate() + n)
                  const newDate = d.toISOString().split('T')[0]
                  const newAmount = Number(actualAmount) + room.base_price * n
                  await window.electron.db.updateOrder(order.order_id, { check_out_date: newDate, actual_amount: newAmount })
                  await window.electron.db.updateFinancialLogAmount(order.order_id, 'ROOM_FEE', newAmount)
                  setCheckOutDate(newDate)
                  setActualAmount(String(newAmount))
                  onSaved()
                }}
                  className="px-3 py-1 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors">
                  +{n}{t('orderDetail.extendDay')}
                </button>
              ))}
            </div>
          )}

          {/* Incidental charges */}
          {hasFeature('finance.incidentals') && order && (
            <IncidentalCharges
              order={order}
              incidentals={incidentals}
              showIncidental={showIncidental}
              incidentalAmount={incidentalAmount}
              incidentalMethod={incidentalMethod}
              editingLogId={editingLogId}
              editAmount={editAmount}
              editMethod={editMethod}
              onAdd={handleAddIncidental}
              onDelete={handleDeleteIncidental}
              onSaveEdit={handleSaveIncidentalEdit}
              onStartEdit={handleStartEdit}
              onCancelEdit={() => setEditingLogId(null)}
              onShowAdd={() => setShowIncidental(true)}
              onHideAdd={() => setShowIncidental(false)}
              setIncidentalAmount={setIncidentalAmount}
              setIncidentalMethod={setIncidentalMethod}
              setEditAmount={setEditAmount}
              setEditMethod={setEditMethod}
            />
          )}

          {/* Editable fields */}
          <div className="grid grid-cols-2 gap-3">
            <Input label={t('orderDetail.fields.guestName')} id="edit-guest" value={guestName} onChange={e => setGuestName(e.target.value)} />
            <Input label={t('orderDetail.fields.guestPhone')} id="edit-guest-phone" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label={t('orderDetail.fields.actualAmount')} id="edit-amount" type="number" value={actualAmount} onChange={e => setActualAmount(e.target.value)} />
            <Input label={t('orderDetail.fields.deposit')} id="edit-deposit" type="number" value={deposit} onChange={e => setDeposit(e.target.value)} />
            <Select label={t('orderDetail.fields.paymentMethod')} id="edit-payment" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
              {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{t(m.label)}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <Select label={t('orderDetail.fields.source')} id="edit-source" value={source || 'direct'} onChange={e => setSource(e.target.value)}>
              {SOURCE_OPTIONS.map(s => <option key={s.value} value={s.value}>{t(s.label)}</option>)}
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label htmlFor="edit-notes" className="block text-sm font-medium text-gray-700">{t('orderDetail.fields.notes')}</label>
            <textarea id="edit-notes" rows={1} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder={t('orderDetail.fields.notesPlaceholder')}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors resize-none" />
          </div>

          {/* Invoice section */}
          {order.status !== 'CHECKED_OUT' && (
            <InvoiceSection
              guestName={guestName}
              invoiceTitle={invoiceTitle}
              invoiceTaxNumber={invoiceTaxNumber}
              invoiceType={invoiceType}
              invoiceSaving={invoiceSaving}
              showInvoiceForm={showInvoiceForm}
              onShowForm={() => { setShowInvoiceForm(true); setInvoiceTitle(guestName) }}
              onHideForm={() => setShowInvoiceForm(false)}
              setInvoiceTitle={setInvoiceTitle}
              setInvoiceTaxNumber={setInvoiceTaxNumber}
              setInvoiceType={setInvoiceType}
              onSubmit={handleApplyInvoice}
            />
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          {/* Room-change panel */}
          {showRoomChange && order.status !== 'CHECKED_OUT' && (
            <RoomChangePanel
              order={order}
              room={room}
              allRooms={allRooms}
              saving={saving}
              showPriceChangeConfirm={showPriceChangeConfirm}
              pendingRoomChange={pendingRoomChange}
              targetRoomId={targetRoomId}
              onConfirm={handleRoomChange}
              onCancel={cancelRoomChange}
              onTargetRoomChange={(id) => { setTargetRoomId(id); setShowPriceChangeConfirm(false); setPendingRoomChange(null) }}
              onKeepOriginalPrice={() => { if (order) executeRoomChange(pendingRoomChange!.newRoomId, order.actual_amount) }}
              onAdjustPrice={(amount) => executeRoomChange(pendingRoomChange!.newRoomId, amount)}
              onCloseConfirm={() => { setShowPriceChangeConfirm(false); setPendingRoomChange(null) }}
            />
          )}

          {/* Status transition buttons */}
          {order.status === 'PREBOOK' && (
            <div className="pt-1 flex gap-2">
              <Button variant="secondary" onClick={() => handleStatusChange('IN_HOUSE')} disabled={saving}>
                {t('orderDetail.actions.toInHouse')}
              </Button>
            </div>
          )}
          {order.status === 'IN_HOUSE' && (
            <div className="pt-1 flex gap-2">
              <Button variant="secondary" onClick={() => handleStatusChange('CHECKED_OUT')} disabled={saving}>
                {t('orderDetail.actions.toCheckedOut')}
              </Button>
              <Button variant="secondary" onClick={() => setShowRoomChange(true)} disabled={saving}>
                {t('orderDetail.actions.changeRoom')}
              </Button>
            </div>
          )}
          {order.status === 'CHECKED_OUT' && (
            <div className="pt-1">
              <Button variant="secondary" onClick={() => handleStatusChange('IN_HOUSE')} disabled={saving}>
                {t('orderDetail.actions.restoreInHouse')}
              </Button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex justify-between items-center pt-2 border-t border-gray-100">
          <Button variant="ghost"
            className={confirmDelete ? 'text-red-600 hover:bg-red-50' : 'text-red-400 hover:text-red-600'}
            onClick={handleDelete} disabled={saving}>
            {confirmDelete ? t('orderDetail.actions.confirmDelete') : t('orderDetail.actions.deleteOrder')}
          </Button>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose}>{t('orderDetail.actions.cancel')}</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? t('orderDetail.actions.saving') : t('orderDetail.actions.saveChanges')}
            </Button>
          </div>
        </div>
      </div>
      {AlertComponent}
    </Dialog>
  )
}
