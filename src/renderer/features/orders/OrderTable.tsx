import { useTranslation } from 'react-i18next'
import { STATUS_STYLES } from '../../utils'
import type { Order, Room } from '../../../shared/types'

interface Props {
  filtered: Order[]
  roomMap: Map<number, Room>
  incidentalMap: Map<number, number>
  statusLabels: Record<string, string>
  statusOptions: { value: string; label: string }[]
  searchKeyword: string
  hasActiveAdvanced: boolean
  filter: string
  onEditOrder: (order: Order, room: Room) => void
  onDelete: (orderId: number) => void
}

export default function OrderTable({ filtered, roomMap, incidentalMap, statusLabels, statusOptions, searchKeyword, hasActiveAdvanced, filter, onEditOrder, onDelete }: Props) {
  const { t } = useTranslation()

  if (filtered.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 text-sm">
        {(searchKeyword.trim() || hasActiveAdvanced)
          ? t('orders.noFilteredOrders')
          : filter === 'ALL'
            ? t('orders.noOrders')
            : `暂无${statusOptions.find(o => o.value === filter)?.label}${t('orders.noOrders').replace('暂无', '')}`}
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            <th className="text-left px-4 py-3 font-medium">{t('orders.room')}</th>
            <th className="text-left px-4 py-3 font-medium">{t('orders.guest')}</th>
            <th className="text-left px-4 py-3 font-medium">{t('orders.checkIn')}</th>
            <th className="text-left px-4 py-3 font-medium">{t('orders.checkOut')}</th>
            <th className="text-left px-4 py-3 font-medium">{t('orders.statusCol')}</th>
            <th className="text-right px-4 py-3 font-medium">{t('orders.roomFee')}</th>
            <th className="text-right px-4 py-3 font-medium">{t('orders.deposit')}</th>
            <th className="text-right px-4 py-3 font-medium">{t('orders.incidental')}</th>
            <th className="text-right px-4 py-3 font-medium">{t('orders.actions')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {filtered.map(order => {
            const room = roomMap.get(order.room_id)
            const style = STATUS_STYLES[order.status] || STATUS_STYLES.CHECKED_OUT
            return (
              <tr key={order.order_id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3"><span className="font-medium text-gray-900">{room?.room_number ?? '?'}</span><span className="ml-1.5 text-xs text-gray-400">{room?.room_type}</span></td>
                <td className="px-4 py-3"><div className="text-gray-900">{order.guest_name}</div>{order.guest_phone && <div className="text-xs text-gray-400 mt-0.5">{order.guest_phone}</div>}</td>
                <td className="px-4 py-3 text-gray-600">{order.check_in_date}</td>
                <td className="px-4 py-3 text-gray-600">{order.check_out_date}</td>
                <td className="px-4 py-3"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>{statusLabels[order.status]}</span></td>
                <td className="px-4 py-3 text-right text-gray-900">¥{order.actual_amount}</td>
                <td className="px-4 py-3 text-right text-gray-600">¥{order.deposit}</td>
                <td className="px-4 py-3 text-right text-amber-600">{incidentalMap.has(order.order_id) ? `¥${incidentalMap.get(order.order_id)}` : '-'}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => room && onEditOrder(order, room)} className="p-1.5 rounded text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors" title={t('common.edit')}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
                    </button>
                    <button onClick={() => onDelete(order.order_id)} className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title={t('common.delete')}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
