import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Select } from '../../components'
import PriceChangeConfirmDialog from './PriceChangeConfirmDialog'
import type { Room } from '../../../shared/types'

interface Props {
  order: { status: string; actual_amount: number }
  room: Room
  allRooms: Room[]
  saving: boolean
  showPriceChangeConfirm: boolean
  pendingRoomChange: {
    newRoomId: number
    currentPrice: number
    newPrice: number
    diff: number
    nights: number
  } | null
  targetRoomId: number | null
  onConfirm: () => void
  onCancel: () => void
  onTargetRoomChange: (roomId: number | null) => void
  onKeepOriginalPrice: () => void
  onAdjustPrice: (newAmount: number) => void
  onCloseConfirm: () => void
}

export default function RoomChangePanel(props: Props) {
  const { t } = useTranslation()
  const {
    order,
    room,
    allRooms,
    saving,
    showPriceChangeConfirm,
    pendingRoomChange,
    targetRoomId,
    onConfirm,
    onCancel,
    onTargetRoomChange,
    onKeepOriginalPrice,
    onAdjustPrice,
    onCloseConfirm,
  } = props

  const targetRoom = useMemo(
    () => allRooms.find(r => r.room_id === targetRoomId) ?? null,
    [allRooms, targetRoomId],
  )
  const isPriceDifferent =
    targetRoom && Math.abs(targetRoom.base_price - room.base_price) > 0.01

  return (
    <>
      {order.status !== 'CHECKED_OUT' && (
        <div className="p-3 bg-indigo-50 rounded-lg space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Select
                label={t('orderDetail.roomChange.selectRoom')}
                value={targetRoomId ?? ''}
                onChange={e => {
                  const val = e.target.value
                  onTargetRoomChange(val ? Number(val) : null)
                }}
              >
                <option value="">
                  {t('orderDetail.roomChange.selectRoomPlaceholder')}
                </option>
                {allRooms
                  .filter(r => r.room_id !== room.room_id)
                  .map(r => (
                    <option key={r.room_id} value={r.room_id}>
                      {r.room_number} - {r.room_type} (¥{r.base_price}
                      {t('orderDetail.roomChange.perNight')})
                    </option>
                  ))}
              </Select>
            </div>
          </div>

          {isPriceDifferent && targetRoomId && (
            <p className="text-xs text-indigo-600">
              {t('orderDetail.roomChange.priceChangeNote')} (¥
              {targetRoom!.base_price}
              {t('orderDetail.roomChange.perNight')})
            </p>
          )}

          <div className="flex gap-2">
            <button
              onClick={onConfirm}
              disabled={saving || !targetRoomId}
              className="px-3 py-1.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {t('orderDetail.roomChange.confirm')}
            </button>
            <button
              onClick={onCancel}
              className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              {t('orderDetail.roomChange.cancel')}
            </button>
          </div>
        </div>
      )}

      {showPriceChangeConfirm && pendingRoomChange && (
        <PriceChangeConfirmDialog
          open={showPriceChangeConfirm}
          pending={pendingRoomChange}
          currentRoomNumber={room.room_number}
          newRoomNumber={allRooms.find(r => r.room_id === pendingRoomChange.newRoomId)?.room_number ?? ''}
          originalAmount={order.actual_amount}
          saving={saving}
          onKeepOriginalPrice={onKeepOriginalPrice}
          onAdjustPrice={onAdjustPrice}
          onClose={onCloseConfirm}
        />
      )}
    </>
  )
}
