import { useTranslation } from 'react-i18next'
import { Input, Select } from '../../components'

interface Props {
  guestName: string
  invoiceTitle: string
  invoiceTaxNumber: string
  invoiceType: 'normal' | 'special'
  invoiceSaving: boolean
  showInvoiceForm: boolean
  onShowForm: () => void
  onHideForm: () => void
  setInvoiceTitle: (v: string) => void
  setInvoiceTaxNumber: (v: string) => void
  setInvoiceType: (v: 'normal' | 'special') => void
  onSubmit: () => void
}

export default function InvoiceSection({
  guestName,
  invoiceTitle,
  invoiceTaxNumber,
  invoiceType,
  invoiceSaving,
  showInvoiceForm,
  onShowForm,
  onHideForm,
  setInvoiceTitle,
  setInvoiceTaxNumber,
  setInvoiceType,
  onSubmit,
}: Props) {
  const { t } = useTranslation()

  if (!showInvoiceForm) {
    return (
      <div className="space-y-2">
        <button
          onClick={onShowForm}
          className="text-xs text-primary-600 hover:text-primary-700 hover:underline"
        >
          {t('orderDetail.invoice.applyInvoice')}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="p-3 bg-blue-50 rounded-lg space-y-3">
        <h4 className="text-sm font-medium text-blue-800">{t('orderDetail.invoice.title')}</h4>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t('orderDetail.invoice.titleField')}
            value={invoiceTitle}
            onChange={e => setInvoiceTitle(e.target.value)}
            placeholder={t('orderDetail.invoice.titlePlaceholder')}
          />
          <Input
            label={t('orderDetail.invoice.taxNumber')}
            value={invoiceTaxNumber}
            onChange={e => setInvoiceTaxNumber(e.target.value)}
            placeholder={t('orderDetail.invoice.taxPlaceholder')}
          />
        </div>
        <Select
          label={t('orderDetail.invoice.type')}
          value={invoiceType}
          onChange={e => setInvoiceType(e.target.value as 'normal' | 'special')}
        >
          <option value="normal">{t('orderDetail.invoice.normalInvoice')}</option>
          <option value="special">{t('orderDetail.invoice.specialInvoice')}</option>
        </Select>
        <div className="flex gap-2">
          <button
            onClick={onSubmit}
            disabled={invoiceSaving || !invoiceTitle.trim()}
            className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {invoiceSaving ? t('orderDetail.invoice.submitting') : t('orderDetail.invoice.submit')}
          </button>
          <button
            onClick={onHideForm}
            className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            {t('orderDetail.invoice.cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}
