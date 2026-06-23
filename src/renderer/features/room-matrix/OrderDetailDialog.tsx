import { useState, useEffect, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, Input, Select, Button } from '../../components'
import type { Order, Room, FinancialLog } from '../../../shared/types'
import { SOURCE_LABELS } from '../../../shared/types'

interface Props {
  open: boolean
  order: Order | null
  room: Room | null
  onClose: () => void
  onSaved: () => void
  onDeleted: () => void
}

const STATUS_LABELS: Record<string, string> = {
  PREBOOK: '预订',
  IN_HOUSE: '在住',
  CHECKED_OUT: '已退房',
}

const PAYMENT_METHODS = [
  { value: 'WeChat', label: '微信' },
  { value: 'Alipay', label: '支付宝' },
  { value: 'Cash', label: '现金' },
]

const METHOD_LABEL: Record<string, string> = { WeChat: '微信', Alipay: '支付宝', Cash: '现金' }

const SOURCE_OPTIONS = [
  { value: 'direct', label: '直接预订' },
  { value: 'ctrip', label: '携程' },
  { value: 'meituan', label: '美团' },
  { value: 'returning', label: '回头客' },
  { value: 'other', label: '其他' },
]

export default function OrderDetailDialog({ open, order, room, onClose, onSaved, onDeleted }: Props) {
  const { t } = useTranslation()
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
  const [incidentalMethod, setIncidentalMethod] = useState('WeChat')
  const [editingLogId, setEditingLogId] = useState<number | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editMethod, setEditMethod] = useState('WeChat')

  // Invoice form state
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
    const logs: FinancialLog[] = await (window.electron.db.getFinancialLogsByOrder(orderId) as any)
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
      // Load all rooms for room-change feature
      window.electron.db.getRooms().then((rooms: any) => setAllRooms(rooms))
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
    if (!guestName.trim()) { setError('请输入客人称呼'); return }

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
      setError(e?.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const today = new Date().toISOString().split('T')[0]

  // Derived room-change data
  const targetRoom = useMemo(
    () => allRooms.find(r => r.room_id === targetRoomId) ?? null,
    [allRooms, targetRoomId],
  )
  const isPriceDifferent = targetRoom && room && Math.abs(targetRoom.base_price - room.base_price) > 0.01

  const handleStatusChange = async (newStatus: string) => {
    if (!order) return
    if (newStatus === 'IN_HOUSE' && order.status === 'PREBOOK' && checkInDate > today) {
      setError('入住日期未到，暂不能转为在住')
      return
    }
    setSaving(true)
    try {
      await window.electron.db.updateOrder(order.order_id, { status: newStatus as any })
      onSaved()
      onClose()
    } catch (e: any) {
      setError(e?.message || '状态更新失败')
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
      setError(e?.message || '删除失败')
    } finally {
      setSaving(false)
    }
  }

  const handleAddIncidental = async () => {
    if (!order) return
    await window.electron.db.insertFinancialLog({
      order_id: order.order_id,
      type: 'INCIDENTAL',
      amount: Number(incidentalAmount),
      payment_method: incidentalMethod as any,
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
      payment_method: editMethod as any,
    })
    setEditingLogId(null)
    loadLogs(order!.order_id)
    onSaved()
  }

  const startEdit = (log: FinancialLog) => {
    setEditingLogId(log.log_id)
    setEditAmount(String(log.amount))
    setEditMethod(log.payment_method)
  }

  const handleRoomChange = () => {
    if (!order || !targetRoom || !room) return

    const currentPrice = room.base_price
    const newPrice = targetRoom.base_price
    const priceDiff = newPrice - currentPrice
    const nights = Math.max(1, Math.ceil((new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / 86400000))

    if (Math.abs(priceDiff) > 0.01) {
      // Price differs: show confirmation dialog
      setPendingRoomChange({
        newRoomId: targetRoom.room_id,
        currentPrice,
        newPrice,
        diff: priceDiff,
        nights,
      })
      setShowPriceChangeConfirm(true)
    } else {
      // Same price: execute directly
      executeRoomChange(targetRoom.room_id, order.actual_amount)
    }
  }

  const executeRoomChange = async (newRoomId: number, newAmount: number) => {
    if (!order) return
    setSaving(true)
    setError('')
    try {
      await window.electron.db.updateOrder(order.order_id, {
        room_id: newRoomId,
        actual_amount: newAmount,
      })
      await window.electron.db.updateFinancialLogAmount(order.order_id, 'ROOM_FEE', newAmount)
      setActualAmount(String(newAmount))
      setShowPriceChangeConfirm(false)
      setPendingRoomChange(null)
      setShowRoomChange(false)
      setTargetRoomId(null)
      onSaved()
    } catch (e: any) {
      setError(e?.message || '换房失败')
    } finally {
      setSaving(false)
    }
  }

  const handleApplyInvoice = async () => {
    if (!order) return
    if (!invoiceTitle.trim()) return
    setInvoiceSaving(true)
    try {
      await (window.electron.db.insertInvoice({
        order_id: order.order_id,
        title: invoiceTitle.trim(),
        tax_number: invoiceTaxNumber || undefined,
        invoice_type: invoiceType,
      }) as any)
      setShowInvoiceForm(false)
      setInvoiceTitle('')
      setInvoiceTaxNumber('')
      setInvoiceType('normal')
      alert('发票申请已提交')
    } catch (e: any) {
      alert(e?.message || '申请失败')
    } finally {
      setInvoiceSaving(false)
    }
  }

  if (!order || !room) return null

  const footer = (
    <div className="flex justify-between items-center">
      <Button
        variant="ghost"
        className={confirmDelete ? 'text-red-600 hover:bg-red-50' : 'text-red-400 hover:text-red-600'}
        onClick={handleDelete}
        disabled={saving}
      >
        {confirmDelete ? '确认删除？' : '删除订单'}
      </Button>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={onClose}>取消</Button>
        <Button onClick={handleSave} disabled={saving}>{saving ? '保存中...' : '保存修改'}</Button>
      </div>
    </div>
  )

  return (
    <Dialog open={open} onClose={onClose} title={t('orderDetail.title')} maxWidth="md" footer={footer}>
      <div className="space-y-3">
        {/* Room + status */}
        <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg">
          <span className="text-sm font-semibold text-gray-900">{room.room_number}</span>
          <span className="text-xs text-gray-500">{room.room_type}</span>
          <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full
            ${order.status === 'IN_HOUSE' ? 'bg-red-100 text-red-700' :
              order.status === 'PREBOOK' ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-600'}`}>
            {STATUS_LABELS[order.status]}
          </span>
        </div>

        {/* Date info */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="edit-checkin" className="block text-sm font-medium text-gray-700">入住日期</label>
            <input
              id="edit-checkin"
              type="date"
              value={checkInDate}
              onChange={e => setCheckInDate(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="edit-checkout" className="block text-sm font-medium text-gray-700">退房日期</label>
            <input
              id="edit-checkout"
              type="date"
              value={checkOutDate}
              onChange={e => setCheckOutDate(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            />
          </div>
        </div>

        {/* Extend stay */}
        {order.status !== 'CHECKED_OUT' && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">续住</span>
            {[1, 2, 3].map(n => (
              <button
                key={n}
                onClick={async () => {
                  const d = new Date(order.check_out_date)
                  d.setDate(d.getDate() + n)
                  const newDate = d.toISOString().split('T')[0]
                  const newAmount = Number(actualAmount) + room.base_price * n
                  await window.electron.db.updateOrder(order.order_id, {
                    check_out_date: newDate,
                    actual_amount: newAmount,
                  })
                  await window.electron.db.updateFinancialLogAmount(order.order_id, 'ROOM_FEE', newAmount)
                  setCheckOutDate(newDate)
                  setActualAmount(String(newAmount))
                  onSaved()
                }}
                className="px-3 py-1 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                +{n}天
              </button>
            ))}
          </div>
        )}

        {/* Incidental charges section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">杂费记录</span>
            {order.status !== 'CHECKED_OUT' && !showIncidental && (
              <button
                onClick={() => setShowIncidental(true)}
                className="text-xs text-primary-600 hover:text-primary-700 hover:underline"
              >
                + 添加杂费
              </button>
            )}
          </div>

          {/* Existing incidentals list */}
          {incidentals.length > 0 && (
            <div className="space-y-1.5">
              {incidentals.map(log => (
                <div key={log.log_id}>
                  {editingLogId === log.log_id ? (
                    <div className="flex items-end gap-2 p-2 bg-amber-50 rounded-lg">
                      <div className="w-24">
                        <Input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)} />
                      </div>
                      <div className="w-24">
                        <Select value={editMethod} onChange={e => setEditMethod(e.target.value)}>
                          {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </Select>
                      </div>
                      <button onClick={() => handleSaveIncidentalEdit(log.log_id)}
                        className="px-2 py-1.5 text-xs font-medium bg-amber-600 text-white rounded hover:bg-amber-700">
                        保存
                      </button>
                      <button onClick={() => setEditingLogId(null)}
                        className="px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700">
                        取消
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 px-3 py-2 bg-amber-50/60 rounded-lg group">
                      <span className="text-sm text-amber-700 font-medium">杂费</span>
                      <span className="text-sm text-gray-600">{METHOD_LABEL[log.payment_method]}</span>
                      <span className="ml-auto text-sm font-semibold text-gray-900">¥{log.amount}</span>
                      {order.status !== 'CHECKED_OUT' && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => startEdit(log)} title="编辑"
                            className="p-1 rounded text-gray-400 hover:text-primary-600 hover:bg-primary-50">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                            </svg>
                          </button>
                          <button onClick={() => handleDeleteIncidental(log.log_id)} title="删除"
                            className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add new incidental form */}
          {showIncidental && (
            <div className="flex items-end gap-3 p-3 bg-amber-50 rounded-lg">
              <div className="w-28">
                <Input label="杂费金额" id="incidental-amount" type="number" value={incidentalAmount}
                  onChange={e => setIncidentalAmount(e.target.value)} />
              </div>
              <div className="w-28">
                <Select label="支付方式" id="incidental-method" value={incidentalMethod}
                  onChange={e => setIncidentalMethod(e.target.value)}>
                  {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </Select>
              </div>
              <button onClick={handleAddIncidental}
                className="px-3 py-2 text-sm font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors">
                确认
              </button>
              <button onClick={() => setShowIncidental(false)}
                className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
                取消
              </button>
            </div>
          )}

          {incidentals.length === 0 && !showIncidental && (
            <p className="text-xs text-gray-400">暂无杂费记录</p>
          )}
        </div>

        {/* Editable fields */}
        <div className="grid grid-cols-2 gap-3">
          <Input label="客人称呼" id="edit-guest" value={guestName} onChange={e => setGuestName(e.target.value)} />
          <Input label="手机号（选填）" id="edit-guest-phone" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Input label="实际房费" id="edit-amount" type="number" value={actualAmount} onChange={e => setActualAmount(e.target.value)} />
          <Input label="押金" id="edit-deposit" type="number" value={deposit} onChange={e => setDeposit(e.target.value)} />
          <Select label="支付方式" id="edit-payment" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
            {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </Select>
        </div>
        <div className="grid grid-cols-1 gap-3">
          <Select label="客人来源" id="edit-source" value={source || 'direct'} onChange={e => setSource(e.target.value)}>
            {SOURCE_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label htmlFor="edit-notes" className="block text-sm font-medium text-gray-700">备注</label>
          <textarea
            id="edit-notes"
            rows={1}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="特殊需求：加床、接机、禁止吸烟..."
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900
              placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500
              focus:border-primary-500 transition-colors resize-none"
          />
        </div>

        {/* Invoice application section */}
        {order.status !== 'CHECKED_OUT' && (
          <div className="space-y-2">
            {!showInvoiceForm ? (
              <button
                onClick={() => {
                  setShowInvoiceForm(true)
                  setInvoiceTitle(guestName)
                }}
                className="text-xs text-primary-600 hover:text-primary-700 hover:underline"
              >
                + 申请发票
              </button>
            ) : (
              <div className="p-3 bg-blue-50 rounded-lg space-y-3">
                <h4 className="text-sm font-medium text-blue-800">发票信息</h4>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="发票抬头 *"
                    value={invoiceTitle}
                    onChange={e => setInvoiceTitle(e.target.value)}
                    placeholder="公司名称或个人姓名"
                  />
                  <Input
                    label="税号"
                    value={invoiceTaxNumber}
                    onChange={e => setInvoiceTaxNumber(e.target.value)}
                    placeholder="纳税人识别号"
                  />
                </div>
                <Select
                  label="发票类型"
                  value={invoiceType}
                  onChange={e => setInvoiceType(e.target.value as 'normal' | 'special')}
                >
                  <option value="normal">普通发票</option>
                  <option value="special">专用发票</option>
                </Select>
                <div className="flex gap-2">
                  <button
                    onClick={handleApplyInvoice}
                    disabled={invoiceSaving || !invoiceTitle.trim()}
                    className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {invoiceSaving ? '提交中...' : '提交申请'}
                  </button>
                  <button
                    onClick={() => setShowInvoiceForm(false)}
                    className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    取消
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* Room-change panel */}
        {showRoomChange && order.status !== 'CHECKED_OUT' && (
          <div className="p-3 bg-indigo-50 rounded-lg space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Select
                  label="选择房间"
                  value={targetRoomId ?? ''}
                  onChange={e => {
                    const val = e.target.value
                    setTargetRoomId(val ? Number(val) : null)
                    setShowPriceChangeConfirm(false)
                    setPendingRoomChange(null)
                  }}
                >
                  <option value="">请选择目标房间</option>
                  {allRooms
                    .filter(r => r.room_id !== room.room_id)
                    .map(r => (
                      <option key={r.room_id} value={r.room_id}>
                        {r.room_number} - {r.room_type} (¥{r.base_price}/晚)
                      </option>
                    ))}
                </Select>
              </div>
            </div>

            {isPriceDifferent && targetRoomId && (
              <p className="text-xs text-indigo-600">
                新房型价格（¥{targetRoom!.base_price}/晚）与当前不同，换房时将提示价格确认
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleRoomChange}
                disabled={saving || !targetRoomId}
                className="px-3 py-1.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                换房
              </button>
              <button
                onClick={() => {
                  setShowRoomChange(false)
                  setTargetRoomId(null)
                  setShowPriceChangeConfirm(false)
                  setPendingRoomChange(null)
                }}
                className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* Status transition buttons */}
        {order.status === 'PREBOOK' && (
          <div className="pt-1 flex gap-2">
            <Button variant="secondary" onClick={() => handleStatusChange('IN_HOUSE')} disabled={saving}>
              转为在住
            </Button>
          </div>
        )}
        {order.status === 'IN_HOUSE' && (
          <div className="pt-1 flex gap-2">
            <Button variant="secondary" onClick={() => handleStatusChange('CHECKED_OUT')} disabled={saving}>
              办理退房
            </Button>
            <Button variant="secondary" onClick={() => { setShowRoomChange(true) }} disabled={saving}>
              换房
            </Button>
          </div>
        )}
        {order.status === 'CHECKED_OUT' && (
          <div className="pt-1">
            <Button variant="secondary" onClick={() => handleStatusChange('IN_HOUSE')} disabled={saving}>
              还原为在住
            </Button>
          </div>
        )}
      </div>

      {/* Price change confirmation dialog */}
      {showPriceChangeConfirm && pendingRoomChange && (
        <Dialog
          open={showPriceChangeConfirm}
          onClose={() => {
            setShowPriceChangeConfirm(false)
            setPendingRoomChange(null)
          }}
          title="换房价格确认"
          maxWidth="sm"
          zIndex={60}
        >
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">当前房间：</span>
                <span className="font-medium">{room?.room_number}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">当前房费：</span>
                <span className="font-medium">¥{pendingRoomChange.currentPrice.toFixed(2)}/晚</span>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">新房间：</span>
                <span className="font-medium">{allRooms.find(r => r.room_id === pendingRoomChange.newRoomId)?.room_number}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">标准价格：</span>
                <span className="font-medium">¥{pendingRoomChange.newPrice.toFixed(2)}/晚</span>
              </div>
            </div>

            <div className={`rounded-lg p-4 ${
              pendingRoomChange.diff > 0 ? 'bg-amber-50' : 'bg-green-50'
            }`}>
              <div className="flex items-center gap-2">
                <span className="text-lg">
                  {pendingRoomChange.diff > 0 ? '⚠️' : '✅'}
                </span>
                <span className={`font-medium ${
                  pendingRoomChange.diff > 0 ? 'text-amber-800' : 'text-green-800'
                }`}>
                  价格差异：{pendingRoomChange.diff > 0 ? '+' : ''}
                  ¥{pendingRoomChange.diff.toFixed(2)}/晚
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                是否将订单房费调整为新价格？（共{pendingRoomChange.nights}晚）
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={() => {
                  executeRoomChange(pendingRoomChange.newRoomId, order!.actual_amount)
                }}
                disabled={saving}
                className="flex-1"
              >
                保持原价 ¥{order!.actual_amount}
              </Button>
              <Button
                onClick={() => {
                  const newAmount = pendingRoomChange.newPrice * pendingRoomChange.nights
                  executeRoomChange(pendingRoomChange.newRoomId, newAmount)
                }}
                disabled={saving}
                className="flex-1"
              >
                调整为 ¥{(pendingRoomChange.newPrice * pendingRoomChange.nights).toFixed(2)}
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </Dialog>
  )
}
