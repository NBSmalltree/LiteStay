import { useTranslation } from 'react-i18next'
import { Card } from '../../components'
import { formatTime, typeBadgeClass, METHOD_COLORS } from '../../utils'
import type { FinancialLogDetailed } from '../../../shared/types'

interface Props {
  logs: FinancialLogDetailed[]
  typeLabel: Record<string, string>
  methodLabel: Record<string, string>
}

export default function FinanceLogTable({ logs, typeLabel, methodLabel }: Props) {
  const { t } = useTranslation()

  return (
    <Card className="col-span-3">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">{t('finance.transactionDetails')}</h2>
      {logs.length > 0 ? (
        <div className="overflow-auto max-h-80 rounded-lg border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 sticky top-0">
              <tr>
                <th className="text-left px-3 py-2 font-medium">{t('finance.time')}</th>
                <th className="text-left px-3 py-2 font-medium">{t('finance.type')}</th>
                <th className="text-left px-3 py-2 font-medium">{t('finance.roomNumber')}</th>
                <th className="text-left px-3 py-2 font-medium">{t('finance.guest')}</th>
                <th className="text-left px-3 py-2 font-medium">{t('finance.paymentMethod')}</th>
                <th className="text-right px-3 py-2 font-medium">{t('finance.amount')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.map(log => (
                <tr key={log.log_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{formatTime(log.created_at)}</td>
                  <td className="px-3 py-2"><span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${typeBadgeClass(log.type)}`}>{typeLabel[log.type] || log.type}</span></td>
                  <td className="px-3 py-2 text-gray-900">{log.room_number || '-'}</td>
                  <td className="px-3 py-2 text-gray-600">{log.guest_name || '-'}</td>
                  <td className="px-3 py-2"><span className="inline-flex items-center gap-1 text-xs"><span className="w-2 h-2 rounded-full" style={{ background: METHOD_COLORS[log.payment_method] || '#9CA3AF' }} />{methodLabel[log.payment_method] || log.payment_method}</span></td>
                  <td className="px-3 py-2 text-right font-medium text-gray-900">¥{log.amount.toLocaleString('zh-CN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <div className="py-16 text-center text-sm text-gray-400">{t('finance.noLogs')}</div>}
    </Card>
  )
}
