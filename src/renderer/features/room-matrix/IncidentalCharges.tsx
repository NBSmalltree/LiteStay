import { useTranslation } from 'react-i18next'
import { Input, Select } from '../../components'
import type { Order, FinancialLog } from '../../../shared/types'

const PAYMENT_METHODS = [
  { value: 'WeChat', label: 'checkIn.wechat' },
  { value: 'Alipay', label: 'checkIn.alipay' },
  { value: 'Cash', label: 'checkIn.cash' },
]

interface Props {
  order: Order
  incidentals: FinancialLog[]
  showIncidental: boolean
  incidentalAmount: string
  incidentalMethod: 'WeChat' | 'Alipay' | 'Cash'
  editingLogId: number | null
  editAmount: string
  editMethod: 'WeChat' | 'Alipay' | 'Cash'
  onAdd: () => void
  onDelete: (logId: number) => void
  onSaveEdit: (logId: number) => void
  onStartEdit: (log: FinancialLog) => void
  onCancelEdit: () => void
  onShowAdd: () => void
  onHideAdd: () => void
  setIncidentalAmount: (v: string) => void
  setIncidentalMethod: (v: 'WeChat' | 'Alipay' | 'Cash') => void
  setEditAmount: (v: string) => void
  setEditMethod: (v: 'WeChat' | 'Alipay' | 'Cash') => void
}

export default function IncidentalCharges(props: Props) {
  const { t } = useTranslation()
  const {
    order,
    incidentals,
    showIncidental,
    incidentalAmount,
    incidentalMethod,
    editingLogId,
    editAmount,
    editMethod,
    onAdd,
    onDelete,
    onSaveEdit,
    onStartEdit,
    onCancelEdit,
    onShowAdd,
    onHideAdd,
    setIncidentalAmount,
    setIncidentalMethod,
    setEditAmount,
    setEditMethod,
  } = props

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{t('orderDetail.incidentals.title')}</span>
        {order.status !== 'CHECKED_OUT' && !showIncidental && (
          <button
            onClick={onShowAdd}
            className="text-xs text-primary-600 hover:text-primary-700 hover:underline"
          >
            {t('orderDetail.incidentals.addIncidental')}
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
                    <Select value={editMethod} onChange={e => setEditMethod(e.target.value as 'WeChat' | 'Alipay' | 'Cash')}>
                      {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{t(m.label)}</option>)}
                    </Select>
                  </div>
                  <button onClick={() => onSaveEdit(log.log_id)}
                    className="px-2 py-1.5 text-xs font-medium bg-amber-600 text-white rounded hover:bg-amber-700">
                    {t('orderDetail.incidentals.save')}
                  </button>
                  <button onClick={onCancelEdit}
                    className="px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700">
                    {t('orderDetail.incidentals.cancel')}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 px-3 py-2 bg-amber-50/60 rounded-lg group">
                  <span className="text-sm text-amber-700 font-medium">{t('orderDetail.incidentals.incidentalLabel')}</span>
                  <span className="text-sm text-gray-600">{t(`checkIn.${log.payment_method.toLowerCase() === 'wechat' ? 'wechat' : log.payment_method.toLowerCase() === 'alipay' ? 'alipay' : 'cash'}`)}</span>
                  <span className="ml-auto text-sm font-semibold text-gray-900">¥{log.amount}</span>
                  {order.status !== 'CHECKED_OUT' && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => onStartEdit(log)} title={t('common.edit')}
                        className="p-1 rounded text-gray-400 hover:text-primary-600 hover:bg-primary-50">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                        </svg>
                      </button>
                      <button onClick={() => onDelete(log.log_id)} title={t('common.delete')}
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
            <Input label={t('orderDetail.incidentals.amount')} id="incidental-amount" type="number" value={incidentalAmount}
              onChange={e => setIncidentalAmount(e.target.value)} />
          </div>
          <div className="w-28">
            <Select label={t('orderDetail.incidentals.method')} id="incidental-method" value={incidentalMethod}
              onChange={e => setIncidentalMethod(e.target.value as 'WeChat' | 'Alipay' | 'Cash')}>
              {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{t(m.label)}</option>)}
            </Select>
          </div>
          <button onClick={onAdd}
            className="px-3 py-2 text-sm font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors">
            {t('orderDetail.incidentals.confirm')}
          </button>
          <button onClick={onHideAdd}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
            {t('orderDetail.incidentals.cancel')}
          </button>
        </div>
      )}

      {incidentals.length === 0 && !showIncidental && (
        <p className="text-xs text-gray-400">{t('orderDetail.incidentals.noIncidentals')}</p>
      )}
    </div>
  )
}
