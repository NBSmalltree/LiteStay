import { useTranslation } from 'react-i18next'
import { Dialog, Button } from '../../components'
import type { GuestWithStats, GuestOrder } from '../../../shared/types'

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  IN_HOUSE: { bg: 'bg-red-100', text: 'text-red-700' },
  PREBOOK: { bg: 'bg-blue-100', text: 'text-blue-700' },
  CHECKED_OUT: { bg: 'bg-gray-100', text: 'text-gray-600' },
}

interface Props {
  open: boolean
  guest: GuestWithStats | null
  orders: GuestOrder[]
  onClose: () => void
  onEdit: () => void
}

export default function GuestDetailDialog({ open, guest, orders, onClose, onEdit }: Props) {
  const { t } = useTranslation()

  if (!guest) return null

  return (
    <Dialog open={open} onClose={onClose} title={t('guests.guestDetail')} maxWidth="lg">
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 pb-2 border-b border-gray-200">{t('guests.basicInfo')}</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">{t('guests.name')}</span>
              <span className="text-gray-900 font-medium">{guest.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t('guests.phone')}</span>
              <span className="text-gray-900">{guest.phone || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t('guests.idCard')}</span>
              <span className="text-gray-900">{guest.id_card || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t('guests.email')}</span>
              <span className="text-gray-900">{guest.email || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t('guests.notes')}</span>
              <span className="text-gray-900">{guest.notes || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t('guests.createdAt')}</span>
              <span className="text-gray-900">{guest.created_at?.slice(0, 10) || '-'}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 pb-2 border-b border-gray-200">{t('guests.consumptionStats')}</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">{t('guests.orderCount')}</span>
              <span className="text-gray-900 font-medium">{guest.order_count}{t('guests.timesUnit')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t('guests.totalSpent')}</span>
              <span className="text-gray-900 font-medium text-green-600">
                {guest.total_spent > 0 ? `¥${guest.total_spent.toLocaleString()}` : '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t('guests.lastCheckIn')}</span>
              <span className="text-gray-900">{guest.last_check_in || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t('guests.preferredRoomType')}</span>
              <span className="text-gray-900">{guest.preferred_room_type || '-'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-gray-900 pb-2 border-b border-gray-200 mb-3">{t('guests.orderHistory')}</h3>
        {orders.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-sm">{t('guests.noOrderHistory')}</div>
        ) : (
          <div className="max-h-60 overflow-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">{t('guests.roomNumber')}</th>
                  <th className="text-left px-3 py-2 font-medium">{t('guests.roomType')}</th>
                  <th className="text-left px-3 py-2 font-medium">{t('guests.checkIn')}</th>
                  <th className="text-left px-3 py-2 font-medium">{t('guests.checkOut')}</th>
                  <th className="text-left px-3 py-2 font-medium">{t('guests.status')}</th>
                  <th className="text-right px-3 py-2 font-medium">{t('guests.roomFee')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map(order => {
                  const style = STATUS_STYLES[order.status] || STATUS_STYLES.CHECKED_OUT
                  return (
                    <tr key={order.order_id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-900 font-medium">{order.room_number}</td>
                      <td className="px-3 py-2 text-gray-600">{order.room_type}</td>
                      <td className="px-3 py-2 text-gray-600">{order.check_in_date}</td>
                      <td className="px-3 py-2 text-gray-600">{order.check_out_date}</td>
                      <td className="px-3 py-2">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
                          {order.status === 'IN_HOUSE' ? t('guests.statusInHouse') :
                           order.status === 'PREBOOK' ? t('guests.statusPrebook') :
                           t('guests.statusCheckedOut')}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-gray-900">¥{order.actual_amount}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button variant="secondary" onClick={onClose}>{t('common.close')}</Button>
        <Button onClick={onEdit}>{t('guests.editInfo')}</Button>
      </div>
    </Dialog>
  )
}
