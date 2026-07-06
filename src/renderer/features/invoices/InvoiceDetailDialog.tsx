import { useTranslation } from 'react-i18next'
import { Dialog, Button } from '../../components'
import type { InvoiceWithOrder } from '../../../shared/types'

interface Props {
  open: boolean
  invoice: InvoiceWithOrder | null
  currencyLocale: string
  onClose: () => void
}

export default function InvoiceDetailDialog({ open, invoice, currencyLocale, onClose }: Props) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onClose={onClose} title={t('invoices.invoiceDetail')} maxWidth="md">
      {invoice && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg">
            <span className="text-sm font-semibold text-gray-900">#{invoice.invoice_id}</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded ${
              invoice.status === 'issued' ? 'bg-green-100 text-green-700' :
              invoice.status === 'pending' ? 'bg-amber-100 text-amber-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              {t(`invoices.status.${invoice.status}`)}
            </span>
            <span className="text-xs text-gray-500 ml-auto">
              {invoice.invoice_type === 'normal' ? t('invoices.normalInvoice') : t('invoices.specialInvoice')}
            </span>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 space-y-2">
            <h4 className="text-sm font-medium text-blue-800 mb-2">{t('invoices.linkedOrder')}</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-gray-500">{t('invoices.guest')}：</span>{invoice.guest_name}</div>
              <div><span className="text-gray-500">{t('invoices.roomNumber')}：</span>{invoice.room_number}</div>
              <div><span className="text-gray-500">{t('invoices.checkIn')}：</span>{invoice.check_in_date}</div>
              <div><span className="text-gray-500">{t('invoices.checkOut')}：</span>{invoice.check_out_date}</div>
              <div><span className="text-gray-500">{t('invoices.amount')}：</span>
                {invoice.actual_amount.toLocaleString(currencyLocale, { style: 'currency', currency: 'CNY' })}
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <h4 className="text-sm font-medium text-gray-800 mb-2">{t('invoices.invoiceInfo')}</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-gray-500">{t('invoices.titleColumn')}：</span>{invoice.title}</div>
              {invoice.tax_number && <div><span className="text-gray-500">{t('invoices.taxNumber')}：</span>{invoice.tax_number}</div>}
              {invoice.company_address && <div><span className="text-gray-500">{t('invoices.address')}：</span>{invoice.company_address}</div>}
              {invoice.phone && <div><span className="text-gray-500">{t('invoices.phone')}：</span>{invoice.phone}</div>}
              {invoice.bank_name && <div><span className="text-gray-500">{t('invoices.bankName')}：</span>{invoice.bank_name}</div>}
              {invoice.bank_account && <div><span className="text-gray-500">{t('invoices.account')}：</span>{invoice.bank_account}</div>}
            </div>
          </div>

          {invoice.notes && (
            <div className="text-sm"><span className="text-gray-500">{t('invoices.notes')}：</span>{invoice.notes}</div>
          )}

          {invoice.issued_at && (
            <div className="text-sm"><span className="text-gray-500">{t('invoices.issuedAt')}：</span>{invoice.issued_at}</div>
          )}

          <div className="flex justify-end pt-4 border-t border-gray-100">
            <Button variant="secondary" onClick={onClose}>{t('invoices.close')}</Button>
          </div>
        </div>
      )}
    </Dialog>
  )
}
