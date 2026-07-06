import { useTranslation } from 'react-i18next'
import { Dialog, Button } from '../../components'

interface PriceChangeInfo {
  newRoomId: number
  currentPrice: number
  newPrice: number
  diff: number
  nights: number
}

interface Props {
  open: boolean
  pending: PriceChangeInfo
  currentRoomNumber: string
  newRoomNumber: string
  originalAmount: number
  saving: boolean
  onKeepOriginalPrice: () => void
  onAdjustPrice: (newAmount: number) => void
  onClose: () => void
}

export default function PriceChangeConfirmDialog({
  open,
  pending,
  currentRoomNumber,
  newRoomNumber,
  originalAmount,
  saving,
  onKeepOriginalPrice,
  onAdjustPrice,
  onClose,
}: Props) {
  const { t } = useTranslation()

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('orderDetail.roomChange.roomChangePriceConfirm')}
      maxWidth="sm"
      zIndex={60}
    >
      <div className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">{t('orderDetail.roomChange.currentRoom')}：</span>
            <span className="font-medium">{currentRoomNumber}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">{t('orderDetail.roomChange.currentFee')}：</span>
            <span className="font-medium">¥{pending.currentPrice.toFixed(2)}{t('orderDetail.roomChange.perNight')}</span>
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">{t('orderDetail.roomChange.newRoom')}：</span>
            <span className="font-medium">{newRoomNumber}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">{t('orderDetail.roomChange.standardPrice')}：</span>
            <span className="font-medium">¥{pending.newPrice.toFixed(2)}{t('orderDetail.roomChange.perNight')}</span>
          </div>
        </div>

        <div className={`rounded-lg p-4 ${pending.diff > 0 ? 'bg-amber-50' : 'bg-green-50'}`}>
          <div className="flex items-center gap-2">
            <span className="text-lg">{pending.diff > 0 ? '⚠️' : '✅'}</span>
            <span className={`font-medium ${pending.diff > 0 ? 'text-amber-800' : 'text-green-800'}`}>
              {t('orderDetail.roomChange.priceDiff')}：{pending.diff > 0 ? '+' : ''}
              ¥{pending.diff.toFixed(2)}{t('orderDetail.roomChange.perNight')}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {t('orderDetail.roomChange.adjustTo')} {pending.nights} {t('orderDetail.extendDay')}?
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={onKeepOriginalPrice} disabled={saving} className="flex-1">
            {t('orderDetail.roomChange.keepOriginalPrice')} ¥{originalAmount}
          </Button>
          <Button onClick={() => onAdjustPrice(pending.newPrice * pending.nights)} disabled={saving} className="flex-1">
            {t('orderDetail.roomChange.adjustTo')} ¥{(pending.newPrice * pending.nights).toFixed(2)}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
