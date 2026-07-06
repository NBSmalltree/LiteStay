import { useTranslation } from 'react-i18next'
import { Dialog } from '../../components'
import { fmtCurrency, METHOD_COLORS } from '../../utils'
import type { NightAuditData, RevenueByRoomType } from '../../../shared/types'

interface Props {
  open: boolean
  auditData: NightAuditData | null
  auditExporting: boolean
  onPrint: () => void
  onExport: () => void
  onClose: () => void
}

export default function NightAuditReport({ open, auditData, auditExporting, onPrint, onExport, onClose }: Props) {
  const { t } = useTranslation()
  const METHOD_LABEL: Record<string, string> = { WeChat: t('checkIn.wechat'), Alipay: t('checkIn.alipay'), Cash: t('checkIn.cash') }

  return (
    <Dialog open={open} onClose={onClose}
      title={auditData ? `${auditData.date} ${t('finance.auditReport')}` : t('finance.auditReport')}
      maxWidth="xl"
    >
      {auditData && (
        <div>
          <div id="night-audit-print" className="space-y-5 max-h-[65vh] overflow-y-auto pr-1">
            {/* Income Summary */}
            <div>
              <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5 mb-3">
                <span className="w-5 h-5 rounded bg-green-50 flex items-center justify-center text-green-600 text-xs">¥</span>
                {t('finance.incomeSummary')}
              </h2>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-gray-500">{t('finance.totalIncome')}</span>
                  <span className="text-xl font-bold text-gray-900">{fmtCurrency(auditData.summary.total)}</span>
                </div>
                <div className="border-t border-gray-200 pt-2 space-y-1.5">
                  <div className="flex justify-between items-center pl-4">
                    <span className="text-sm text-gray-500">{t('finance.roomFee')}</span>
                    <span className="text-sm font-semibold text-gray-800">{fmtCurrency(auditData.summary.roomFee)}</span>
                  </div>
                  <div className="flex justify-between items-center pl-4">
                    <span className="text-sm text-gray-500">{t('finance.deposit')}</span>
                    <span className="text-sm font-semibold text-gray-800">{fmtCurrency(auditData.summary.deposit)}</span>
                  </div>
                  <div className="flex justify-between items-center pl-4">
                    <span className="text-sm text-gray-500">{t('finance.incidental')}</span>
                    <span className="text-sm font-semibold text-gray-800">{fmtCurrency(auditData.summary.incidental)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Revenue by Room Type */}
            {auditData.byRoomType.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5 mb-3">
                  <span className="w-5 h-5 rounded bg-blue-50 flex items-center justify-center text-blue-600 text-xs">房</span>
                  {t('finance.byRoomType')}
                </h2>
                <div className="bg-gray-50 rounded-xl p-4 space-y-1.5">
                  {auditData.byRoomType.map((rt: RevenueByRoomType) => (
                    <div key={rt.room_type} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{rt.room_type}</span>
                      <span className="text-sm text-gray-800">
                        <span className="font-semibold">{fmtCurrency(rt.total)}</span>
                        <span className="text-gray-400 ml-1">({rt.order_count}{t('finance.rooms')})</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Revenue by Payment Method */}
            {auditData.byMethod.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5 mb-3">
                  <span className="w-5 h-5 rounded bg-purple-50 flex items-center justify-center text-purple-600 text-xs">$</span>
                  {t('finance.byPaymentMethod')}
                </h2>
                <div className="bg-gray-50 rounded-xl p-4 space-y-1.5">
                  {auditData.byMethod.map((m) => {
                    const pct = auditData.summary.total > 0
                      ? ((m.total / auditData.summary.total) * 100).toFixed(1) : '0.0'
                    return (
                      <div key={m.payment_method} className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: METHOD_COLORS[m.payment_method] || '#9CA3AF' }} />
                          <span className="text-sm text-gray-600">{METHOD_LABEL[m.payment_method] || m.payment_method}</span>
                        </div>
                        <span className="text-sm text-gray-800">
                          <span className="font-semibold">{fmtCurrency(m.total)}</span>
                          <span className="text-gray-400 ml-1">({pct}%)</span>
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Occupancy */}
            <div>
              <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5 mb-3">
                <span className="w-5 h-5 rounded bg-amber-50 flex items-center justify-center text-amber-600 text-xs">%</span>
                {t('finance.occupancy')}
              </h2>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">{t('finance.todayOccupancy')}</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {auditData.occupancy.totalRooms > 0
                      ? `${((auditData.occupancy.occupiedRooms / auditData.occupancy.totalRooms) * 100).toFixed(0)}%`
                      : '0%'
                    }
                    <span className="text-gray-400 font-normal ml-1">
                      ({auditData.occupancy.occupiedRooms}/{auditData.occupancy.totalRooms}{t('finance.rooms')})
                    </span>
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">{t('finance.vacantRooms')}</span>
                  <span className="text-sm font-semibold text-gray-900">{auditData.occupancy.vacantRooms}{t('finance.rooms')}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-gray-100">
            <button onClick={onPrint}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m0 0a48.159 48.159 0 018.5 0m-8.5 0V5.625a2.25 2.25 0 012.25-2.25h4.5a2.25 2.25 0 012.25 2.25v1.613" />
              </svg>
              {t('finance.printReport')}
            </button>
            <button onClick={onExport} disabled={auditExporting}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-40 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              {auditExporting ? t('finance.exporting') : t('finance.export')}
            </button>
            <button onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              {t('common.close')}
            </button>
          </div>
        </div>
      )}
    </Dialog>
  )
}
