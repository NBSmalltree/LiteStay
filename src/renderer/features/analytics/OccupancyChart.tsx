import { useTranslation } from 'react-i18next'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card } from '../../components'
import type { DailyOccupancy } from '../../../shared/types'

interface Props {
  data: DailyOccupancy[]
}

export default function OccupancyChart({ data }: Props) {
  const { t } = useTranslation()

  return (
    <Card padding="md">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">📈 {t('analytics.occupancyTrend')}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 16, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} interval={4} />
            <YAxis domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 11, fill: '#6b7280' }} />
            <Tooltip formatter={(value: any) => [`${value}%`, t('analytics.occupancyRate')]}
              labelFormatter={(label: any) => `${t('analytics.dateLabel')}: ${label}`}
              contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
            <Line type="monotone" dataKey="occupancyRate" stroke="#6366f1" strokeWidth={2}
              dot={{ r: 2, fill: '#6366f1' }} activeDot={{ r: 5 }} name={t('analytics.occupancyRate')} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
