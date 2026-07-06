import { useTranslation } from 'react-i18next'
import type { InvoiceWithOrder } from '../../../shared/types'

interface Props {
  invoices: InvoiceWithOrder[]
  confirmDeleteId: number | null
  currencyLocale: string
  onView: (inv: InvoiceWithOrder) => void
  onEdit: (inv: InvoiceWithOrder) => void
  onMarkIssued: (invoiceId: number) => void
  onCancel: (invoiceId: number) => void
  onDelete: (invoiceId: number) => void
}

export default function InvoiceTable({
  invoices, confirmDeleteId, currencyLocale,
  onView, onEdit, onMarkIssued, onCancel, onDelete,
}: Props) {
  const { t } = useTranslation()

  if (invoices.length === 0) return null

  return (
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
          {invoices.map(inv => (
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
              <td className="px-4 py-2.5 text-right font-medium text-gray-900">
                {inv.actual_amount.toLocaleString(currencyLocale, { style: 'currency', currency: 'CNY' })}
              </td>
              <td className="px-4 py-2.5">
                <div className="flex gap-1 justify-center">
                  <button onClick={() => onView(inv)}
                    className="px-2 py-1 text-xs text-primary-600 hover:bg-primary-50 rounded transition-colors">
                    {t('invoices.view')}
                  </button>
                  {inv.status === 'pending' && (
                    <>
                      <button onClick={() => onEdit(inv)}
                        className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors">
                        {t('invoices.edit')}
                      </button>
                      <button onClick={() => onMarkIssued(inv.invoice_id)}
                        className="px-2 py-1 text-xs text-green-600 hover:bg-green-50 rounded transition-colors">
                        {t('invoices.markIssued')}
                      </button>
                      <button onClick={() => onCancel(inv.invoice_id)}
                        className="px-2 py-1 text-xs text-amber-600 hover:bg-amber-50 rounded transition-colors">
                        {t('invoices.cancel')}
                      </button>
                    </>
                  )}
                  {inv.status === 'issued' && (
                    <button onClick={() => onEdit(inv)}
                      className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors">
                      {t('invoices.edit')}
                    </button>
                  )}
                  <button onClick={() => onDelete(inv.invoice_id)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      confirmDeleteId === inv.invoice_id
                        ? 'text-white bg-red-600'
                        : 'text-red-400 hover:bg-red-50 hover:text-red-600'
                    }`}>
                    {confirmDeleteId === inv.invoice_id ? t('invoices.confirmDelete') : t('invoices.delete')}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
