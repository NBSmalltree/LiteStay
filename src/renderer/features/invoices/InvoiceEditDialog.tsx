import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, Button, Input, Select } from '../../components'
import type { InvoiceWithOrder, Order } from '../../../shared/types'

interface Props {
  open: boolean
  invoice: InvoiceWithOrder | null
  orders: Order[]
  onClose: () => void
  onSaved: () => void
}

export default function InvoiceEditDialog({ open, invoice, orders, onClose, onSaved }: Props) {
  const { t } = useTranslation()
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
  }

  useEffect(() => {
    if (!open) return
    if (invoice) {
      setForm({
        order_id: invoice.order_id,
        title: invoice.title,
        tax_number: invoice.tax_number || '',
        company_address: invoice.company_address || '',
        phone: invoice.phone || '',
        bank_name: invoice.bank_name || '',
        bank_account: invoice.bank_account || '',
        invoice_type: invoice.invoice_type,
        notes: invoice.notes || '',
      })
    } else {
      resetForm()
    }
    setError('')
  }, [open, invoice])

  const getOrderLabel = (order: Order) => {
    return `${t('invoices.roomOrderLabel')} #${order.order_id} - ${order.guest_name} (${order.check_in_date} ~ ${order.check_out_date})`
  }

  const handleSave = async () => {
    setError('')
    if (!form.title.trim()) { setError(t('invoices.titleRequired')); return }
    if (!form.order_id) { setError(t('invoices.orderRequired')); return }
    setSaving(true)
    try {
      if (invoice) {
        await window.electron.db.updateInvoice(invoice.invoice_id, {
          order_id: form.order_id,
          title: form.title.trim(),
          tax_number: form.tax_number || undefined,
          company_address: form.company_address || undefined,
          phone: form.phone || undefined,
          bank_name: form.bank_name || undefined,
          bank_account: form.bank_account || undefined,
          invoice_type: form.invoice_type,
          notes: form.notes || undefined,
        })
      } else {
        await window.electron.db.insertInvoice({
          order_id: form.order_id,
          title: form.title.trim(),
          tax_number: form.tax_number || undefined,
          company_address: form.company_address || undefined,
          phone: form.phone || undefined,
          bank_name: form.bank_name || undefined,
          bank_account: form.bank_account || undefined,
          invoice_type: form.invoice_type,
          notes: form.notes || undefined,
        })
      }
      onSaved()
    } catch (e: any) {
      setError(e?.message || t('invoices.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={() => { onClose(); resetForm() }} title={invoice ? t('invoices.editInvoice') : t('invoices.newInvoice')} maxWidth="md">
      <div className="space-y-4">
        {!invoice && (
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

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">{t('invoices.basicInfo')}</h4>
          <div className="grid grid-cols-2 gap-4">
            <Input label={`${t('invoices.titleField')} *`} value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder={t('invoices.titlePlaceholder')} />
            <Input label={t('invoices.taxNumber')} value={form.tax_number}
              onChange={e => setForm({ ...form, tax_number: e.target.value })}
              placeholder={t('invoices.taxNumberPlaceholder')} />
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">{t('invoices.contactInfo')}</h4>
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('invoices.companyAddress')} value={form.company_address}
              onChange={e => setForm({ ...form, company_address: e.target.value })} />
            <Input label={t('invoices.phone')} value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })} />
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">{t('invoices.bankInfo')}</h4>
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('invoices.bankName')} value={form.bank_name}
              onChange={e => setForm({ ...form, bank_name: e.target.value })} />
            <Input label={t('invoices.bankAccount')} value={form.bank_account}
              onChange={e => setForm({ ...form, bank_account: e.target.value })} />
          </div>
        </div>

        <Select label={t('invoices.invoiceType')} value={form.invoice_type}
          onChange={e => setForm({ ...form, invoice_type: e.target.value as 'normal' | 'special' })}>
          <option value="normal">{t('invoices.normalInvoice')}</option>
          <option value="special">{t('invoices.specialInvoice')}</option>
        </Select>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700">{t('invoices.notes')}</label>
          <textarea className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900
            placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500
            focus:border-primary-500 transition-colors resize-none" rows={3}
            value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
            placeholder={t('invoices.notesPlaceholder')} />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
          <Button variant="secondary" onClick={() => { onClose(); resetForm() }}>{t('invoices.cancel')}</Button>
          <Button onClick={handleSave} disabled={saving || !form.title.trim()}>
            {saving ? t('invoices.saving') : t('invoices.save')}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
