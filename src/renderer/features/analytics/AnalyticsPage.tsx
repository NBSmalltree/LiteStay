import { useTranslation } from 'react-i18next'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Card, Button } from '../../components'
import SourceAnalytics from './SourceAnalytics'
import RevenueAnalysis from './RevenueAnalysis'
import OccupancyChart from './OccupancyChart'
import { useAnalyticsData } from './useAnalyticsData'
import { PIE_COLORS } from '../../utils'

const fmtCurrency = (n: number, locale: string) => n.toLocaleString(locale, { style: 'currency', currency: 'CNY' })

export default function AnalyticsPage({ refreshKey }: { refreshKey?: number }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'zh' ? 'zh-CN' : 'en-US'
  const {
    occupancy, revenue, roomTypeData,
    monthlyRevenue, quarterlyRevenue, yearlyRevenue, revenueGrowth, paymentMethodTrend,
    sourceStats, adrRevparData, adrRevparTrend, adrByRoomType,
    showTable, setShowTable, todayOccupancy, monthRevenue, adr,
    roomTypes, revenueBarData, revenuePie, orderPie, sourceTrendData,
  } = useAnalyticsData(refreshKey)

  const stats = [
    { label: t('analytics.todayOccupancy'), value: `${todayOccupancy}%`, color: 'text-primary-600' },
    { label: t('analytics.monthRevenue'), value: fmtCurrency(monthRevenue, locale), color: 'text-primary-600' },
    { label: t('analytics.monthlyOccupancy'), value: `${Math.round(
      occupancy.filter(d => {
        const parts = d.date.split('/')
        const m = String(parseInt(parts[0])).padStart(2, '0')
        const day = String(parseInt(parts[1])).padStart(2, '0')
        const full = `${new Date().getFullYear()}-${m}-${day}`
        return full >= `${new Date().toISOString().slice(0, 7)}-01`
      }).reduce((sum, d) => sum + d.occupancyRate, 0) / Math.max(1,
        occupancy.filter(d => {
          const parts = d.date.split('/')
          const m = String(parseInt(parts[0])).padStart(2, '0')
          const day = String(parseInt(parts[1])).padStart(2, '0')
          return `${new Date().getFullYear()}-${m}-${day}` >= `${new Date().toISOString().slice(0, 7)}-01`
        }).length
      )
    )}%`, color: 'text-blue-600' },
    { label: t('analytics.monthRevenueGrowth'), value: `${revenueGrowth.growth_rate >= 0 ? '+' : ''}${revenueGrowth.growth_rate.toFixed(1)}%`, color: revenueGrowth.growth_rate >= 0 ? 'text-green-600' : 'text-red-600' },
    { label: t('analytics.currentMonthRevenue'), value: fmtCurrency(revenueGrowth.current_month, locale), color: 'text-green-600' },
    { label: t('analytics.lastMonthRevenue'), value: fmtCurrency(revenueGrowth.last_month, locale), color: 'text-gray-600' },
    { label: t('analytics.averageDailyRate'), value: `¥${adr.toLocaleString(locale)}`, color: 'text-indigo-600' },
    { label: t('analytics.vacantRooms'), value: `${occupancy.length > 0 ? occupancy[occupancy.length - 1].totalRooms - occupancy[occupancy.length - 1].occupiedRooms : 0}`, color: 'text-amber-600' },
    { label: t('analytics.totalCheckins'), value: `${occupancy.reduce((s, d) => s + d.occupiedRooms, 0)}`, color: 'text-blue-600' },
  ]

  return (
    <div className="p-8 space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.slice(0, 5).map((stat, i) => (
          <Card key={i} padding="sm" className="flex flex-col items-center justify-center">
            <span className="text-xs text-gray-500 mb-1 text-center">{stat.label}</span>
            <span className={`text-xl font-bold ${stat.color}`}>{stat.value}</span>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.slice(5).map((stat, i) => (
          <Card key={i} padding="sm" className="flex flex-col items-center justify-center">
            <span className="text-xs text-gray-500 mb-1 text-center">{stat.label}</span>
            <span className={`text-lg font-bold ${stat.color}`}>{stat.value}</span>
          </Card>
        ))}
      </div>

      {/* ADR/RevPAR Section */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">📊 {t('analytics.adrRevpar')}</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Card padding="sm" className="flex flex-col items-center justify-center">
          <span className="text-xs text-gray-500 mb-1">ADR</span>
          <span className="text-2xl font-bold text-blue-600">¥{adrRevparData.adr.toLocaleString(locale)}</span>
        </Card>
        <Card padding="sm" className="flex flex-col items-center justify-center">
          <span className="text-xs text-gray-500 mb-1">RevPAR</span>
          <span className="text-2xl font-bold text-purple-600">¥{adrRevparData.revpar.toLocaleString(locale)}</span>
        </Card>
        <Card padding="sm" className="flex flex-col items-center justify-center">
          <span className="text-xs text-gray-500 mb-1">{t('analytics.occupancyRate')}</span>
          <span className="text-2xl font-bold text-emerald-600">{adrRevparData.occupancy_rate}%</span>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Card padding="sm" className="flex flex-col items-center justify-center">
          <span className="text-xs text-gray-500 mb-1">{t('analytics.totalRoomFee')}</span>
          <span className="text-lg font-bold text-gray-900">{fmtCurrency(adrRevparData.total_room_fee, locale)}</span>
        </Card>
        <Card padding="sm" className="flex flex-col items-center justify-center">
          <span className="text-xs text-gray-500 mb-1">{t('analytics.soldRoomNights')}</span>
          <span className="text-lg font-bold text-gray-900">{adrRevparData.sold_room_nights}<span className="text-xs text-gray-400 ml-1">{t('analytics.nightsUnit')}</span></span>
        </Card>
        <Card padding="sm" className="flex flex-col items-center justify-center">
          <span className="text-xs text-gray-500 mb-1">{t('analytics.availableRoomNights')}</span>
          <span className="text-lg font-bold text-gray-900">{adrRevparData.available_room_nights}<span className="text-xs text-gray-400 ml-1">{t('analytics.nightsUnit')}</span></span>
        </Card>
      </div>

      {/* ADR/RevPAR 30-day Trend */}
      <Card padding="md" className="mb-4">
        <h4 className="text-sm font-medium text-gray-500 mb-2">{t('analytics.adrTrend')}</h4>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={adrRevparTrend} margin={{ top: 4, right: 16, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} interval={4} />
              <YAxis yAxisId="left" tickFormatter={(v: number) => `¥${v}`} tick={{ fontSize: 11, fill: '#6b7280' }} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 11, fill: '#6b7280' }} />
              <Tooltip formatter={(value: any, name: any) => {
                  if (name === t('analytics.occupancyRate')) return [`${value}%`, name]
                  return [`¥${value}`, name]
                }}
                labelFormatter={(label: any) => `${t('analytics.dateLabel')}: ${label}`}
                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line yAxisId="left" type="monotone" dataKey="adr" name="ADR" stroke="#3B82F6" strokeWidth={2} dot={false} />
              <Line yAxisId="left" type="monotone" dataKey="revpar" name="RevPAR" stroke="#8B5CF6" strokeWidth={2} dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="occupancy_rate" name={t('analytics.occupancyRate')} stroke="#10B981" strokeWidth={2} strokeDasharray="5 5" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* ADR by Room Type */}
      <Card padding="md">
        <h4 className="text-sm font-medium text-gray-500 mb-2">{t('analytics.adrByRoomType')}</h4>
        <div className="h-60">
          {adrByRoomType.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={adrByRoomType} margin={{ top: 4, right: 16, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="room_type" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis tickFormatter={(v: number) => `¥${v}`} tick={{ fontSize: 11, fill: '#6b7280' }} />
                <Tooltip formatter={(value: any) => [`¥${Number(value).toLocaleString(locale)}`, t('analytics.avgADR')]}
                  contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                <Bar dataKey="avg_adr" name={t('analytics.avgADR')} fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">{t('common.noData')}</div>
          )}
        </div>
      </Card>

      {/* 30-day Occupancy Trend */}
      <OccupancyChart data={occupancy} />

      {/* 30-day Revenue Trend */}
      <Card padding="md">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">💰 {t('analytics.revenueTrend')}</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueBarData} margin={{ top: 4, right: 16, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} interval={4} />
              <YAxis tickFormatter={(v: number) => `¥${v >= 10000 ? (v / 10000).toFixed(0) + t('analytics.10kUnit') : v}`} tick={{ fontSize: 11, fill: '#6b7280' }} />
              <Tooltip formatter={(value: any, name: any) => [`¥${Number(value).toLocaleString(locale)}`, name]}
                labelFormatter={(label: any) => `${t('analytics.dateLabel')}: ${label}`}
                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {roomTypes.map((type, i) => (
                <Bar key={type} dataKey={type} stackId="revenue" fill={PIE_COLORS[i % PIE_COLORS.length]} name={type} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Revenue & Order Share Pie Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card padding="md">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">🏠 {t('analytics.revenueShare')}</h3>
          <div className="h-64">
            {revenuePie.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={revenuePie} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2}
                    dataKey="value" label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ strokeWidth: 1 }}>
                    {revenuePie.map((_, i) => (<Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [`¥${Number(value).toLocaleString(locale)}`, t('analytics.revenue')]}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (<div className="h-full flex items-center justify-center text-gray-400 text-sm">{t('common.noData')}</div>)}
          </div>
        </Card>
        <Card padding="md">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">📋 {t('analytics.orderShare')}</h3>
          <div className="h-64">
            {orderPie.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={orderPie} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2}
                    dataKey="value" label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ strokeWidth: 1 }}>
                    {orderPie.map((_, i) => (<Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [`${value}${t('analytics.ordersUnit')}`, t('analytics.orderCount')]}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (<div className="h-full flex items-center justify-center text-gray-400 text-sm">{t('common.noData')}</div>)}
          </div>
        </Card>
      </div>

      {/* Source Analysis */}
      <SourceAnalytics sourceStats={sourceStats} sourceTrendData={sourceTrendData} locale={locale} />

      {/* Revenue Analysis */}
      <RevenueAnalysis monthlyRevenue={monthlyRevenue} quarterlyRevenue={quarterlyRevenue}
        yearlyRevenue={yearlyRevenue} paymentMethodTrend={paymentMethodTrend} locale={locale} />

      {/* Collapsible Detail Table */}
      <Card padding="md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700">📋 {t('analytics.detailedDataTable')}</h3>
          <Button variant="ghost" size="sm" onClick={() => setShowTable(!showTable)}>
            {showTable ? t('analytics.collapse') : t('analytics.expand')}
          </Button>
        </div>
        {showTable && (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">{t('analytics.date')}</th>
                    <th className="text-right px-3 py-2 font-medium">{t('analytics.occupancyRate')}</th>
                    <th className="text-right px-3 py-2 font-medium">{t('analytics.inHouse')}</th>
                    <th className="text-right px-3 py-2 font-medium">{t('analytics.vacant')}</th>
                    <th className="text-right px-3 py-2 font-medium">{t('analytics.revenue')}</th>
                    <th className="text-right px-3 py-2 font-medium">ADR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {occupancy.map((day, i) => {
                    const dayRevenue = revenue.filter(r => {
                      const d = new Date(r.date + 'T00:00:00')
                      return `${d.getMonth() + 1}/${d.getDate()}` === day.date
                    }).reduce((sum, r) => sum + r.total, 0)
                    const dayAdr = day.occupiedRooms > 0 ? Math.round(dayRevenue / day.occupiedRooms) : 0
                    return (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="px-3 py-2 text-gray-900 font-medium">{day.date}</td>
                        <td className="px-3 py-2 text-right text-gray-700">{day.occupancyRate}%</td>
                        <td className="px-3 py-2 text-right text-gray-700">{day.occupiedRooms}{t('analytics.roomsUnit')}</td>
                        <td className="px-3 py-2 text-right text-gray-700">{day.totalRooms - day.occupiedRooms}{t('analytics.roomsUnit')}</td>
                        <td className="px-3 py-2 text-right text-gray-900">¥{dayRevenue.toLocaleString(locale)}</td>
                        <td className="px-3 py-2 text-right text-gray-700">¥{dayAdr}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
