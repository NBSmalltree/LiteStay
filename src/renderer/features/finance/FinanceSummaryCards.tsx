import { useTranslation } from 'react-i18next'
import type { FinancialSummary } from '../../../shared/types'
import { Card } from '../../components'

interface Props {
  summary: FinancialSummary | null
  locale: string
}

export default function FinanceSummaryCards({ summary, locale }: Props) {
  const { t } = useTranslation()
  const fmt = (v: number) => v.toLocaleString(locale, { minimumFractionDigits: 0 })

  const cards = [
    { label: t('finance.roomFee'), value: summary?.roomFee ?? 0, color: 'text-gray-900', bg: 'bg-green-50', text: 'text-green-600', path: 'M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: t('finance.deposit'), value: summary?.deposit ?? 0, color: 'text-blue-600', bg: 'bg-blue-50', text: 'text-blue-600', path: 'M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z' },
    { label: t('finance.incidental'), value: summary?.incidental ?? 0, color: 'text-amber-600', bg: 'bg-amber-50', text: 'text-amber-600', path: 'M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3zM6 6h.008v.008H6V6z' },
  ]

  return (
    <div className="grid grid-cols-3 gap-4">
      {cards.map(({ label, value, color, bg, text: tc, path }) => (
        <Card key={label}>
          <div className="flex items-center justify-between">
            <div><p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p><p className={`mt-2 text-3xl font-bold ${color}`}>¥{fmt(value)}</p></div>
            <div className={`w-10 h-10 rounded-full ${bg} flex items-center justify-center`}>
              <svg className={`w-5 h-5 ${tc}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={path} /></svg>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
