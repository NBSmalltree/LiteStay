import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, Button, Dialog, Input, Select } from '../../components'
import type { InvoiceWithOrder, Order, Room } from '../../../shared/types'

interface Props {
  refreshKey: number
}

export default function InvoicesPage({ refreshKey }: Props) {
  const { t, i18n } = useTranslation()
  const currencyLocale = i18n.language === 'en' ? 'en-US' : 'zh-CN'
  const [invoices, setInvoices] = useState<InvoiceWithOrder[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showEdit, setShowEdit] = useState(false)
  const [editInvoice, setEditInvoice] = useState<InvoiceWithOrder | null>(null)
  const [showDetail, setShowDetail] = useState<InvoiceWithOrder | null>(null)
  const [form, setForm] = useState({
    order_id: 0,
    title: '',
    tax_number: '',
    company_address: '',
    phone: '',
    bank_name: '',
    bank_account: '',
    invoice_type: 'normal' as 'normal' | 'special',
    notes: '',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

  const loadInvoices = useCallback(async () => {
    try {
      const data: InvoiceWithOrder[] = await (window.electron.db.getInvoices() as any)
      setInvoices(data)
    } catch {
      setInvoices([])
    }
  }, [])

  const loadOrders = useCallback(async () => {
    try {
      const data: Order[] = await (window.electron.db.getOrders() as any)
      setOrders(data)
    } catch {
      setOrders([])
    }
  }, [])

  const loadRooms = useCallback(async () => {
    try {
      const data: Room[] = await (window.electron.db.getRooms() as any)
      setRooms(data)
    } catch {
      setRooms([])
    }
  }, [])

  useEffect(() => {
    loadInvoices()
    loadOrders()
    loadRooms()
  }, [loadInvoices, loadOrders, loadRooms, refreshKey])

  // Statistics
  const pendingCount = useMemo(() => invoices.filter(i => i.status === 'pending').length, [invoices])

  const issuedThisMonth = useMemo(() => {
    const now = new Date()
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    return invoices.filter(i => i.status === 'issued' && i.issued_at && i.issued_at.startsWith(monthStr)).length
  }, [invoices])

  const totalAmount = useMemo(() => invoices.filter(i => i.status !== 'cancelled').reduce((sum, i) => sum + i.actual_amount, 0), [invoices])

  // Filtered list
  const filteredInvoices = useMemo(() => {
    if (statusFilter === 'all') return invoices
    return invoices.filter(i => i.status === statusFilter)
  }, [invoices, statusFilter])

  const resetForm = () => {
    setForm({
      order_id: 0,
      title: '',
      tax_number: '',
      company_address: '',
      phone: '',
      bank_name: '',
      bank_account: '',
      invoice_type: 'normal',
      notes: '',
    })
    setError('')
    setEditInvoice(null)
  }

  const handleNew = () => {
    resetForm()
    // Pre-select first order if available
    if (orders.length > 0) {
      setForm(f => ({ ...f, order_id: orders[0].order_id }))
    }
    setShowEdit(true)
  }

  const handleEdit = (inv: InvoiceWithOrder) => {
    setEditInvoice(inv)
    setForm({
      order_id: inv.order_id,
      title: inv.title,
      tax_number: inv.tax_number || '',
      company_address: inv.company_address || '',
      phone: inv.phone || '',
      bank_name: inv.bank_name || '',
      bank_account: inv.bank_account || '',
      invoice_type: inv.invoice_type,
      notes: inv.notes || '',
    })
    setError('')
    setShowEdit(true)
  }

  const handleSave = async () => {
    setError('')
    if (!form.title.trim()) { setError(t('invoices.titleRequired')); return }
    if (!form.order_id) { setError(t('invoices.orderRequired')); return }
    setSaving(true)
    try {
      if (editInvoice) {
        await (window.electron.db.updateInvoice(editInvoice.invoice_id, {
          order_id: form.order_id,
          title: form.title.trim(),
          tax_number: form.tax_number || undefined,
          company_address: form.company_address || undefined,
          phone: form.phone || undefined,
          bank_name: form.bank_name || undefined,
          bank_account: form.bank_account || undefined,
          invoice_type: form.invoice_type,
          notes: form.notes || undefined,
        }) as any)
      } else {
        await (window.electron.db.insertInvoice({
          order_id: form.order_id,
          title: form.title.trim(),
          tax_number: form.tax_number || undefined,
          company_address: form.company_address || undefined,
          phone: form.phone || undefined,
          bank_name: form.bank_name || undefined,
          bank_account: form.bank_account || undefined,
          invoice_type: form.invoice_type,
          notes: form.notes || undefined,
        }) as any)
      }
      setShowEdit(false)
      resetForm()
      loadInvoices()
    } catch (e: any) {
      setError(e?.message || t('invoices.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const handleMarkIssued = async (invoiceId: number) => {
    try {
      await (window.electron.db.markInvoiceIssued(invoiceId) as any)
      loadInvoices()
    } catch (e: any) {
      alert(e?.message || t('invoices.operationFailed'))
    }
  }

  const handleCancel = async (invoiceId: number) => {
    try {
      await (window.electron.db.updateInvoice(invoiceId, { status: 'cancelled' }) as any)
      loadInvoices()
    } catch (e: any) {
      alert(e?.message || t('invoices.operationFailed'))
    }
  }

  const handleDelete = async (invoiceId: number) => {
    if (confirmDeleteId !== invoiceId) {
      setConfirmDeleteId(invoiceId)
      return
    }
    try {
      await (window.electron.db.deleteInvoice(invoiceId) as any)
      setConfirmDeleteId(null)
      loadInvoices()
    } catch (e: any) {
      alert(e?.message || t('invoices.deleteFailed'))
    }
  }

  const handleExport = async () => {
    try {
      const result = await (window.electron.db.exportInvoiceList(statusFilter) as any)
      if (result) {
        alert(`${t('invoices.exportSuccess')}: ${result}`)
      }
    } catch (e: any) {
      alert(e?.message || t('invoices.exportFailed'))
    }
  }

  // Build order display label
  const getOrderLabel = (order: Order) => {
    const room = rooms.find(r => r.room_id === order.room_id)
    return `#${order.order_id} - ${order.guest_name} - ${room?.room_number || ''} (${order.check_in_date} ~ ${order.check_out_date})`
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('invoices.title')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('invoices.subtitle')}</p>
        </div>
        <Button onClick={handleNew}>{t('invoices.addInvoice')}</Button>
      </div>

      {/* Statistics cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <div className="text-center">
            <div className="text-sm text-gray-500 mb-1">{t('invoices.pending')}</div>
            <div className="text-3xl font-bold text-amber-600">{pendingCount}</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-sm text-gray-500 mb-1">{t('invoices.issuedThisMonth')}</div>
            <div className="text-3xl font-bold text-green-600">{issuedThisMonth}</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-sm text-gray-500 mb-1">{t('invoices.totalAmount')}</div>
            <div className="text-3xl font-bold text-blue-600">{totalAmount.toLocaleString(currencyLocale, { style: 'currency', currency: 'CNY' })}</div>
          </div>
        </Card>
      </div>

      {/* Filter and export */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            {[
              { value: 'all', label: t('invoices.status.all') },
              { value: 'pending', label: t('invoices.status.pending') },
              { value: 'issued', label: t('invoices.status.issued') },
              { value: 'cancelled', label: t('invoices.status.cancelled') },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                  statusFilter === opt.value
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <Button variant="secondary" onClick={handleExport}>
            <svg className="w-4 h-4 mr-1.5 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            {t('invoices.exportExcel')}
          </Button>
        </div>

        {/* Invoice list table */}
        {filteredInvoices.length > 0 ? (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-600">{t('invoices.invoiceNumber')}</th>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-600">{t('invoices.statusColumn')}</th>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-600">{t('invoices.titleColumn')}</th>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-600">{t('invoices.guest')}</th>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-600">{t('invoices.roomNumber')}</th>
                  <th className="px-4 py-2.5 text-right font-medium text-gray-600">{t('invoices.amount')}</th>
                  <th className="px-4 py-2.5 text-center font-medium text-gray-600">{t('invoices.operations')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredInvoices.map(inv => (
                  <tr key={inv.invoice_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-gray-900">#{inv.invoice_id}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        inv.status === 'issued' ? 'bg-green-100 text-green-700' :
                        inv.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {t(`invoices.status.${inv.status}`)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-900 max-w-[200px] truncate">{inv.title}</td>
                    <td className="px-4 py-2.5 text-gray-600">{inv.guest_name}</td>
                    <td className="px-4 py-2.5 text-gray-600">{inv.room_number}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-gray-900">{inv.actual_amount.toLocaleString(currencyLocale, { style: 'currency', currency: 'CNY' })}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1 justify-center">
                        <button
                          onClick={() => setShowDetail(inv)}
                          className="px-2 py-1 text-xs text-primary-600 hover:bg-primary-50 rounded transition-colors"
                        >
                          {t('invoices.view')}
                        </button>
                        {inv.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleEdit(inv)}
                              className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors"
                            >
                              {t('invoices.edit')}
                            </button>
                            <button
                              onClick={() => handleMarkIssued(inv.invoice_id)}
                              className="px-2 py-1 text-xs text-green-600 hover:bg-green-50 rounded transition-colors"
                            >
                              {t('invoices.markIssued')}
                            </button>
                            <button
                              onClick={() => handleCancel(inv.invoice_id)}
                              className="px-2 py-1 text-xs text-amber-600 hover:bg-amber-50 rounded transition-colors"
                            >
                              {t('invoices.cancel')}
                            </button>
                          </>
                        )}
                        {inv.status === 'issued' && (
                          <button
                            onClick={() => handleEdit(inv)}
                            className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors"
                          >
                            {t('invoices.edit')}
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(inv.invoice_id)}
                          className={`px-2 py-1 text-xs rounded transition-colors ${
                            confirmDeleteId === inv.invoice_id
                              ? 'text-white bg-red-600'
                              : 'text-red-400 hover:bg-red-50 hover:text-red-600'
                          }`}
                        >
                          {confirmDeleteId === inv.invoice_id ? t('invoices.confirmDelete') : t('invoices.delete')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400 text-sm">
            {invoices.length === 0 ? t('invoices.noInvoices') : t('invoices.noFilteredInvoices')}
          </div>
        )}
      </Card>

      {/* Edit / New Invoice Dialog */}
      <Dialog open={showEdit} onClose={() => { setShowEdit(false); resetForm() }} title={editInvoice ? t('invoices.editInvoice') : t('invoices.newInvoice')} maxWidth="md">
        <div className="space-y-4">
          {/* Order selection */}
          {!editInvoice && (
            <Select
              label={`${t('invoices.linkedOrder')} *`}
              value={form.order_id}
              onChange={e => setForm({ ...form, order_id: Number(e.target.value) })}
            >
              <option value="">{t('invoices.selectOrder')}</option>
              {orders.map(o => (
                <option key={o.order_id} value={o.order_id}>{getOrderLabel(o)}</option>
              ))}
            </Select>
          )}

          {/* Basic info */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">{t('invoices.basicInfo')}</h4>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label={`${t('invoices.titleField')} *`}
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder={t('invoices.titlePlaceholder')}
              />
              <Input
                label={t('invoices.taxNumber')}
                value={form.tax_number}
                onChange={e => setForm({ ...form, tax_number: e.target.value })}
                placeholder={t('invoices.taxNumberPlaceholder')}
              />
            </div>
          </div>

          {/* Contact info */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">{t('invoices.contactInfo')}</h4>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label={t('invoices.companyAddress')}
                value={form.company_address}
                onChange={e => setForm({ ...form, company_address: e.target.value })}
              />
              <Input
                label={t('invoices.phone')}
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>

          {/* Bank info */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">{t('invoices.bankInfo')}</h4>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label={t('invoices.bankName')}
                value={form.bank_name}
                onChange={e => setForm({ ...form, bank_name: e.target.value })}
              />
              <Input
                label={t('invoices.bankAccount')}
                value={form.bank_account}
                onChange={e => setForm({ ...form, bank_account: e.target.value })}
              />
            </div>
          </div>

          {/* Invoice type */}
          <Select
            label={t('invoices.invoiceType')}
            value={form.invoice_type}
            onChange={e => setForm({ ...form, invoice_type: e.target.value as 'normal' | 'special' })}
          >
            <option value="normal">{t('invoices.normalInvoice')}</option>
            <option value="special">{t('invoices.specialInvoice')}</option>
          </Select>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">{t('invoices.notes')}</label>
            <textarea
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900
                placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500
                focus:border-primary-500 transition-colors resize-none"
              rows={3}
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder={t('invoices.notesPlaceholder')}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
            <Button variant="secondary" onClick={() => { setShowEdit(false); resetForm() }}>{t('invoices.cancel')}</Button>
            <Button onClick={handleSave} disabled={saving || !form.title.trim()}>
              {saving ? t('invoices.saving') : t('invoices.save')}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Invoice Detail Dialog */}
      <Dialog open={!!showDetail} onClose={() => setShowDetail(null)} title={t('invoices.invoiceDetail')} maxWidth="md">
        {showDetail && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg">
              <span className="text-sm font-semibold text-gray-900">#{showDetail.invoice_id}</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                showDetail.status === 'issued' ? 'bg-green-100 text-green-700' :
                showDetail.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                'bg-gray-100 text-gray-600'
              }`}>
                {t(`invoices.status.${showDetail.status}`)}
              </span>
              <span className="text-xs text-gray-500 ml-auto">
                {showDetail.invoice_type === 'normal' ? t('invoices.normalInvoice') : t('invoices.specialInvoice')}
              </span>
            </div>

            {/* Order info */}
            <div className="bg-blue-50 rounded-lg p-4 space-y-2">
              <h4 className="text-sm font-medium text-blue-800 mb-2">{t('invoices.linkedOrder')}</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-gray-500">{t('invoices.guest')}：</span>{showDetail.guest_name}</div>
                <div><span className="text-gray-500">{t('invoices.roomNumber')}：</span>{showDetail.room_number}</div>
                <div><span className="text-gray-500">{t('invoices.checkIn')}：</span>{showDetail.check_in_date}</div>
                <div><span className="text-gray-500">{t('invoices.checkOut')}：</span>{showDetail.check_out_date}</div>
                <div><span className="text-gray-500">{t('invoices.amount')}：</span>{showDetail.actual_amount.toLocaleString(currencyLocale, { style: 'currency', currency: 'CNY' })}</div>
              </div>
            </div>

            {/* Invoice info */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <h4 className="text-sm font-medium text-gray-800 mb-2">{t('invoices.invoiceInfo')}</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-gray-500">{t('invoices.titleColumn')}：</span>{showDetail.title}</div>
                {showDetail.tax_number && <div><span className="text-gray-500">{t('invoices.taxNumber')}：</span>{showDetail.tax_number}</div>}
                {showDetail.company_address && <div><span className="text-gray-500">{t('invoices.address')}：</span>{showDetail.company_address}</div>}
                {showDetail.phone && <div><span className="text-gray-500">{t('invoices.phone')}：</span>{showDetail.phone}</div>}
                {showDetail.bank_name && <div><span className="text-gray-500">{t('invoices.bankName')}：</span>{showDetail.bank_name}</div>}
                {showDetail.bank_account && <div><span className="text-gray-500">{t('invoices.account')}：</span>{showDetail.bank_account}</div>}
              </div>
            </div>

            {showDetail.notes && (
              <div className="text-sm">
                <span className="text-gray-500">{t('invoices.notes')}：</span>{showDetail.notes}
              </div>
            )}

            {showDetail.issued_at && (
              <div className="text-sm">
                <span className="text-gray-500">{t('invoices.issuedAt')}：</span>{showDetail.issued_at}
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-gray-100">
              <Button variant="secondary" onClick={() => setShowDetail(null)}>{t('invoices.close')}</Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}
