import { useTranslation } from 'react-i18next'
import { PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Card } from '../../components'
import { SOURCE_LABELS } from '../../../shared/types'
import type { SourceStat, SourceTrend } from '../../../shared/types'

const SOURCE_COLORS: Record<string, string> = {
  ctrip: '#FF6B6B', meituan: '#FFD93D', direct: '#6BCB77', returning: '#4D96FF', other: '#9CA3AF',
}

interface Props {
  sourceStats: SourceStat[]
  sourceTrendData: { month: string }[]
  locale: string
}

export default function SourceAnalytics({ sourceStats, sourceTrendData, locale }: Props) {
  const { t } = useTranslation()

  const totalOrders = sourceStats.reduce((sum, s) => sum + s.order_count, 0)

  return (
    <div>
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">{t('analytics.sourceAnalysis')}</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card padding="md">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">{t('analytics.sourceRatio')}</h3>
          <div className="h-64">
            {sourceStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sourceStats} dataKey="order_count" nameKey="source"
                    cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3}
                    label={({ source, percent }: any) => `${SOURCE_LABELS[source] || source} ${(percent * 100).toFixed(0)}%`}
                    labelLine={{ strokeWidth: 1 }}>
                    {sourceStats.map((entry) => (
                      <Cell key={entry.source} fill={SOURCE_COLORS[entry.source] || '#9CA3AF'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [`${value}${t('analytics.ordersUnit')}`, t('analytics.orderCount')]}
                    labelFormatter={(label: any) => SOURCE_LABELS[label] || label}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">{t('common.noData')}</div>
            )}
          </div>
        </Card>

        <Card padding="md">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">{t('analytics.sourceRevenue')}</h3>
          <div className="h-64">
            {sourceStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sourceStats} margin={{ top: 4, right: 16, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="source" tickFormatter={(value: any) => SOURCE_LABELS[value] || value}
                    tick={{ fontSize: 11, fill: '#6b7280' }} />
                  <YAxis tickFormatter={(v: number) => `¥${v >= 10000 ? (v / 10000).toFixed(0) + t('analytics.10kUnit') : v}`}
                    tick={{ fontSize: 11, fill: '#6b7280' }} />
                  <Tooltip formatter={(value: any) => [`¥${Number(value).toLocaleString(locale)}`, t('analytics.totalRevenue')]}
                    labelFormatter={(label: any) => SOURCE_LABELS[label] || label}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                  <Bar dataKey="total_revenue" name={t('analytics.totalRevenue')} fill="#8B5CF6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">{t('common.noData')}</div>
            )}
          </div>
        </Card>
      </div>

      {sourceTrendData.length > 0 && (
        <Card padding="md">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">{t('analytics.sourceTrend')}</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sourceTrendData} margin={{ top: 4, right: 16, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
                <Tooltip formatter={(value: any) => [`${value}${t('analytics.ordersUnit')}`, '']}
                  contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="ctrip" name={t('sources.ctrip')} stackId="1" fill="#FF6B6B" stroke="#FF6B6B" fillOpacity={0.6} />
                <Area type="monotone" dataKey="meituan" name={t('sources.meituan')} stackId="1" fill="#FFD93D" stroke="#FFD93D" fillOpacity={0.6} />
                <Area type="monotone" dataKey="direct" name={t('sources.direct')} stackId="1" fill="#6BCB77" stroke="#6BCB77" fillOpacity={0.6} />
                <Area type="monotone" dataKey="returning" name={t('sources.returning')} stackId="1" fill="#4D96FF" stroke="#4D96FF" fillOpacity={0.6} />
                <Area type="monotone" dataKey="other" name={t('sources.other')} stackId="1" fill="#9CA3AF" stroke="#9CA3AF" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {sourceStats.length > 0 && (
        <Card padding="md">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">{t('analytics.sourceDetail')}</h3>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">{t('analytics.source')}</th>
                  <th className="text-right px-4 py-2 font-medium">{t('analytics.orderCount')}</th>
                  <th className="text-right px-4 py-2 font-medium">{t('analytics.ratio')}</th>
                  <th className="text-right px-4 py-2 font-medium">{t('analytics.totalRevenue')}</th>
                  <th className="text-right px-4 py-2 font-medium">{t('analytics.avgGuestSpend')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sourceStats.map((stat) => {
                  const percentage = totalOrders > 0 ? (stat.order_count / totalOrders * 100).toFixed(1) : '0'
                  return (
                    <tr key={stat.source} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2 text-gray-900 font-medium">{SOURCE_LABELS[stat.source] || stat.source}</td>
                      <td className="px-4 py-2 text-right text-gray-700">{stat.order_count}</td>
                      <td className="px-4 py-2 text-right text-gray-700">{percentage}%</td>
                      <td className="px-4 py-2 text-right text-gray-900">¥{(stat.total_revenue || 0).toLocaleString(locale)}</td>
                      <td className="px-4 py-2 text-right text-gray-700">¥{Math.round(stat.avg_revenue || 0).toLocaleString(locale)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
