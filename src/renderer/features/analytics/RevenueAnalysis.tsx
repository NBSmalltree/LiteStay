import { useTranslation } from 'react-i18next'
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Card } from '../../components'
import type { MonthlyRevenue, QuarterlyRevenue, YearlyRevenue, PaymentMethodTrend } from '../../../shared/types'

interface Props {
  monthlyRevenue: MonthlyRevenue[]
  quarterlyRevenue: QuarterlyRevenue[]
  yearlyRevenue: YearlyRevenue[]
  paymentMethodTrend: PaymentMethodTrend[]
  locale: string
}

export default function RevenueAnalysis({ monthlyRevenue, quarterlyRevenue, yearlyRevenue, paymentMethodTrend, locale }: Props) {
  const { t } = useTranslation()

  return (
    <div>
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">{t('analytics.revenueAnalytics')}</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card padding="md">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">{t('analytics.monthlyRevenueBreakdown')}</h3>
          <div className="h-64">
            {monthlyRevenue.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyRevenue} margin={{ top: 4, right: 16, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} />
                  <YAxis tickFormatter={(v: number) => `¥${v >= 10000 ? (v / 10000).toFixed(0) + t('analytics.10kUnit') : v}`}
                    tick={{ fontSize: 11, fill: '#6b7280' }} />
                  <Tooltip formatter={(value: any) => [`¥${Number(value).toLocaleString(locale)}`]}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="room_fee" name={t('analytics.roomFee')} stackId="a" fill="#10B981" />
                  <Bar dataKey="deposit" name={t('analytics.deposit')} stackId="a" fill="#3B82F6" />
                  <Bar dataKey="incidental" name={t('analytics.incidental')} stackId="a" fill="#F59E0B" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">{t('common.noData')}</div>
            )}
          </div>
        </Card>

        <Card padding="md">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">{t('analytics.quarterlyRevenue')}</h3>
          <div className="h-64">
            {quarterlyRevenue.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={quarterlyRevenue} margin={{ top: 4, right: 16, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: '#6b7280' }} />
                  <YAxis tickFormatter={(v: number) => `¥${v >= 10000 ? (v / 10000).toFixed(0) + t('analytics.10kUnit') : v}`}
                    tick={{ fontSize: 11, fill: '#6b7280' }} />
                  <Tooltip formatter={(value: any) => [`¥${Number(value).toLocaleString(locale)}`]}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                  <Bar dataKey="total" fill="#8B5CF6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">{t('common.noData')}</div>
            )}
          </div>
        </Card>
      </div>

      {paymentMethodTrend.length > 0 && (
        <Card padding="md">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">{t('analytics.paymentMethodTrend')}</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={paymentMethodTrend} margin={{ top: 4, right: 16, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis tickFormatter={(v: number) => `¥${v >= 10000 ? (v / 10000).toFixed(0) + t('analytics.10kUnit') : v}`}
                  tick={{ fontSize: 11, fill: '#6b7280' }} />
                <Tooltip formatter={(value: any) => [`¥${Number(value).toLocaleString(locale)}`]}
                  contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="WeChat" name={t('analytics.wechat')} stackId="1" fill="#07C160" stroke="#07C160" fillOpacity={0.6} />
                <Area type="monotone" dataKey="Alipay" name={t('analytics.alipay')} stackId="1" fill="#1677FF" stroke="#1677FF" fillOpacity={0.6} />
                <Area type="monotone" dataKey="Cash" name={t('analytics.cash')} stackId="1" fill="#F59E0B" stroke="#F59E0B" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <Card padding="md">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">{t('analytics.yearlyRevenueSummary')}</h3>
        {yearlyRevenue.length > 0 ? (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">{t('analytics.year')}</th>
                  <th className="text-right px-4 py-2 font-medium">{t('analytics.totalRevenue')}</th>
                  <th className="text-right px-4 py-2 font-medium">{t('analytics.roomFee')}</th>
                  <th className="text-right px-4 py-2 font-medium">{t('analytics.deposit')}</th>
                  <th className="text-right px-4 py-2 font-medium">{t('analytics.incidental')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {yearlyRevenue.map((yr) => (
                  <tr key={yr.year} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2 text-gray-900 font-medium">{yr.year}</td>
                    <td className="px-4 py-2 text-right text-gray-900">¥{yr.total.toLocaleString(locale)}</td>
                    <td className="px-4 py-2 text-right text-gray-700">¥{yr.room_fee.toLocaleString(locale)}</td>
                    <td className="px-4 py-2 text-right text-gray-700">¥{yr.deposit.toLocaleString(locale)}</td>
                    <td className="px-4 py-2 text-right text-gray-700">¥{yr.incidental.toLocaleString(locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="h-16 flex items-center justify-center text-gray-400 text-sm">{t('common.noData')}</div>
        )}
      </Card>
    </div>
  )
}
