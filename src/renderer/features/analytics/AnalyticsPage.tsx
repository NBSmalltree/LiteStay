import { useState, useEffect, useMemo } from 'react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import type {
  DailyOccupancy, DailyRevenueByType, RoomTypeAnalysis,
  MonthlyRevenue, QuarterlyRevenue, YearlyRevenue, RevenueGrowth, PaymentMethodTrend,
} from '../../../shared/types'
import { Card, Button } from '../../components'

// Format: get date N days ago in YYYY-MM-DD
function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - n + 1)
  return fmtDate(d)
}

const PIE_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

export default function AnalyticsPage({ refreshKey }: { refreshKey?: number }) {
  const [occupancy, setOccupancy] = useState<DailyOccupancy[]>([])
  const [revenue, setRevenue] = useState<DailyRevenueByType[]>([])
  const [roomTypeData, setRoomTypeData] = useState<RoomTypeAnalysis[]>([])
  const [showTable, setShowTable] = useState(false)

  // Revenue analytics state
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue[]>([])
  const [quarterlyRevenue, setQuarterlyRevenue] = useState<QuarterlyRevenue[]>([])
  const [yearlyRevenue, setYearlyRevenue] = useState<YearlyRevenue[]>([])
  const [revenueGrowth, setRevenueGrowth] = useState<RevenueGrowth>({
    current_month: 0,
    last_month: 0,
    growth_rate: 0,
    growth_amount: 0
  })
  const [paymentMethodTrend, setPaymentMethodTrend] = useState<PaymentMethodTrend[]>([])

  const dateFrom = daysAgo(30)
  const dateTo = fmtDate(new Date())

  useEffect(() => {
    window.electron.db.getDailyOccupancy(dateFrom, dateTo).then(setOccupancy)
    window.electron.db.getDailyRevenueByType(dateFrom, dateTo).then(setRevenue)
    window.electron.db.getRoomTypeAnalysis(dateFrom, dateTo).then(setRoomTypeData)

    const currentYear = new Date().getFullYear()
    Promise.all([
      window.electron.db.getMonthlyRevenue(currentYear),
      window.electron.db.getQuarterlyRevenue(currentYear),
      window.electron.db.getYearlyRevenue(),
      window.electron.db.getRevenueGrowth(),
      window.electron.db.getPaymentMethodTrend(6),
    ]).then(([monthly, quarterly, yearly, growth, payment]) => {
      setMonthlyRevenue(monthly)
      setQuarterlyRevenue(quarterly)
      setYearlyRevenue(yearly)
      setRevenueGrowth(growth)
      setPaymentMethodTrend(payment)
    })
  }, [refreshKey])

  // -- Stat card calculations --
  const todayStr = fmtDate(new Date())
  const todayData = occupancy.find(d => {
    const parts = d.date.split('/')
    const m = String(parseInt(parts[0])).padStart(2, '0')
    const day = String(parseInt(parts[1])).padStart(2, '0')
    return `${new Date().getFullYear()}-${m}-${day}` === todayStr
  })
  const todayOccupancy = todayData?.occupancyRate ?? 0

  // This month revenue (sum from 1st of month)
  const thisMonthStart = todayStr.slice(0, 7) + '-01'
  const monthRevenue = useMemo(() => {
    return revenue
      .filter(r => r.date >= thisMonthStart)
      .reduce((sum, r) => sum + r.total, 0)
  }, [revenue, thisMonthStart])

  // This month occupancy (average)
  const monthOccupancy = useMemo(() => {
    const monthData = occupancy.filter(d => {
      const parts = d.date.split('/')
      const m = String(parseInt(parts[0])).padStart(2, '0')
      const day = String(parseInt(parts[1])).padStart(2, '0')
      const full = `${new Date().getFullYear()}-${m}-${day}`
      return full >= thisMonthStart
    })
    if (monthData.length === 0) return 0
    return Math.round(monthData.reduce((sum, d) => sum + d.occupancyRate, 0) / monthData.length)
  }, [occupancy, thisMonthStart])

  // ADR = total room fee / occupied room-nights
  const adr = useMemo(() => {
    const totalRevenue = roomTypeData.reduce((s, r) => s + r.revenue, 0)
    const totalNights = occupancy.reduce((s, d) => s + d.occupiedRooms, 0)
    return totalNights > 0 ? Math.round(totalRevenue / totalNights) : 0
  }, [roomTypeData, occupancy])

  // -- Revenue by room type stacked bar chart --
  const roomTypes = useMemo(() => [...new Set(revenue.map(r => r.room_type))], [revenue])
  const revenueBarData = useMemo(() => {
    const byDate: Record<string, Record<string, number>> = {}
    for (const r of revenue) {
      if (!byDate[r.date]) byDate[r.date] = {}
      byDate[r.date][r.room_type] = r.total
    }
    return Object.entries(byDate).map(([date, types]) => ({
      date: (() => {
        const d = new Date(date + 'T00:00:00')
        return `${d.getMonth() + 1}/${d.getDate()}`
      })(),
      ...types,
    }))
  }, [revenue])

  // -- Pie chart data --
  const revenuePie = roomTypeData.map(r => ({ name: r.room_type, value: Math.round(r.revenue) }))
  const orderPie = roomTypeData.map(r => ({ name: r.room_type, value: r.order_count }))

  // Format revenue display
  function fmtRevenue(n: number): string {
    if (n >= 10000) return `${(n / 10000).toFixed(1)}万`
    return n.toLocaleString('zh-CN')
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">数据分析</h1>
        <p className="mt-1 text-sm text-gray-500">近30天经营数据概览</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="md" className="flex flex-col items-center justify-center">
          <span className="text-xs text-gray-500 mb-1">今日入住率</span>
          <span className="text-3xl font-bold text-primary-600">{todayOccupancy}%</span>
        </Card>
        <Card padding="md" className="flex flex-col items-center justify-center">
          <span className="text-xs text-gray-500 mb-1">本月收益</span>
          <span className="text-3xl font-bold text-green-600">¥{fmtRevenue(revenueGrowth.current_month)}</span>
          {revenueGrowth.last_month > 0 && (
            <span className={`text-xs mt-1 ${revenueGrowth.growth_rate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {revenueGrowth.growth_rate >= 0 ? '↑' : '↓'}
              {' '}{Math.abs(revenueGrowth.growth_rate)}%
              <span className="text-gray-500"> 较上月</span>
            </span>
          )}
        </Card>
        <Card padding="md" className="flex flex-col items-center justify-center">
          <span className="text-xs text-gray-500 mb-1">本月入住率</span>
          <span className="text-3xl font-bold text-blue-600">{monthOccupancy}%</span>
        </Card>
        <Card padding="md" className="flex flex-col items-center justify-center">
          <span className="text-xs text-gray-500 mb-1">平均房价 (ADR)</span>
          <span className="text-3xl font-bold text-orange-500">¥{adr}</span>
        </Card>
      </div>

      {/* 30-day Occupancy Trend Line Chart */}
      <Card padding="md">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">📈 30天入住率趋势</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={occupancy} margin={{ top: 4, right: 16, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} interval={4} />
              <YAxis
                domain={[0, 100]}
                tickFormatter={(v: number) => `${v}%`}
                tick={{ fontSize: 11, fill: '#6b7280' }}
              />
              <Tooltip
                formatter={(value: any) => [`${value}%`, '入住率']}
                labelFormatter={(label: any) => `日期: ${label}`}
                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
              />
              <Line
                type="monotone"
                dataKey="occupancyRate"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ r: 2, fill: '#6366f1' }}
                activeDot={{ r: 5 }}
                name="入住率"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* 30-day Revenue Trend Stacked Bar Chart */}
      <Card padding="md">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">💰 30天收益趋势</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueBarData} margin={{ top: 4, right: 16, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} interval={4} />
              <YAxis
                tickFormatter={(v: number) => `¥${v >= 10000 ? (v / 10000).toFixed(0) + '万' : v}`}
                tick={{ fontSize: 11, fill: '#6b7280' }}
              />
              <Tooltip
                formatter={(value: any, name: any) => [`¥${Number(value).toLocaleString('zh-CN')}`, name]}
                labelFormatter={(label: any) => `日期: ${label}`}
                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {roomTypes.map((type, i) => (
                <Bar
                  key={type}
                  dataKey={type}
                  stackId="revenue"
                  fill={PIE_COLORS[i % PIE_COLORS.length]}
                  name={type}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Room Type Analysis Pie Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card padding="md">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">🏠 各房型收益占比</h3>
          <div className="h-64">
            {revenuePie.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={revenuePie}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }: any) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={{ strokeWidth: 1 }}
                  >
                    {revenuePie.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => [`¥${Number(value).toLocaleString('zh-CN')}`, '收益']}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">暂无数据</div>
            )}
          </div>
        </Card>
        <Card padding="md">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">📋 各房型订单数占比</h3>
          <div className="h-64">
            {orderPie.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={orderPie}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }: any) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={{ strokeWidth: 1 }}
                  >
                    {orderPie.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => [`${value}单`, '订单数']}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">暂无数据</div>
            )}
          </div>
        </Card>
      </div>

      {/* Revenue Analytics Section */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">收益分析报表</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Stacked Bar Chart */}
        <Card padding="md">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">月度收益构成</h3>
          <div className="h-64">
            {monthlyRevenue.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyRevenue} margin={{ top: 4, right: 16, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} />
                  <YAxis
                    tickFormatter={(v: number) => `¥${v >= 10000 ? (v / 10000).toFixed(0) + '万' : v}`}
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                  />
                  <Tooltip
                    formatter={(value: any) => [`¥${Number(value).toLocaleString('zh-CN')}`]}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="room_fee" name="房费" stackId="a" fill="#10B981" />
                  <Bar dataKey="deposit" name="押金" stackId="a" fill="#3B82F6" />
                  <Bar dataKey="incidental" name="杂费" stackId="a" fill="#F59E0B" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">暂无数据</div>
            )}
          </div>
        </Card>

        {/* Quarterly Revenue Bar Chart */}
        <Card padding="md">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">季度收益对比</h3>
          <div className="h-64">
            {quarterlyRevenue.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={quarterlyRevenue} margin={{ top: 4, right: 16, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: '#6b7280' }} />
                  <YAxis
                    tickFormatter={(v: number) => `¥${v >= 10000 ? (v / 10000).toFixed(0) + '万' : v}`}
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                  />
                  <Tooltip
                    formatter={(value: any) => [`¥${Number(value).toLocaleString('zh-CN')}`]}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                  />
                  <Bar dataKey="total" fill="#8B5CF6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">暂无数据</div>
            )}
          </div>
        </Card>
      </div>

      {/* Payment Method Trend Stacked Area Chart */}
      <Card padding="md">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">支付方式趋势</h3>
        <div className="h-64">
          {paymentMethodTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={paymentMethodTrend} margin={{ top: 4, right: 16, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis
                  tickFormatter={(v: number) => `¥${v >= 10000 ? (v / 10000).toFixed(0) + '万' : v}`}
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                />
                <Tooltip
                  formatter={(value: any) => [`¥${Number(value).toLocaleString('zh-CN')}`]}
                  contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="WeChat" name="微信" stackId="1" fill="#07C160" stroke="#07C160" fillOpacity={0.6} />
                <Area type="monotone" dataKey="Alipay" name="支付宝" stackId="1" fill="#1677FF" stroke="#1677FF" fillOpacity={0.6} />
                <Area type="monotone" dataKey="Cash" name="现金" stackId="1" fill="#F59E0B" stroke="#F59E0B" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">暂无数据</div>
          )}
        </div>
      </Card>

      {/* Yearly Revenue Summary Table */}
      <Card padding="md">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">年度收益汇总</h3>
        {yearlyRevenue.length > 0 ? (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">年份</th>
                  <th className="text-right px-4 py-2 font-medium">总收益</th>
                  <th className="text-right px-4 py-2 font-medium">房费</th>
                  <th className="text-right px-4 py-2 font-medium">押金</th>
                  <th className="text-right px-4 py-2 font-medium">杂费</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {yearlyRevenue.map((yr) => (
                  <tr key={yr.year} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2 text-gray-900 font-medium">{yr.year}</td>
                    <td className="px-4 py-2 text-right text-gray-900">¥{yr.total.toLocaleString('zh-CN')}</td>
                    <td className="px-4 py-2 text-right text-gray-700">¥{yr.room_fee.toLocaleString('zh-CN')}</td>
                    <td className="px-4 py-2 text-right text-gray-700">¥{yr.deposit.toLocaleString('zh-CN')}</td>
                    <td className="px-4 py-2 text-right text-gray-700">¥{yr.incidental.toLocaleString('zh-CN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="h-16 flex items-center justify-center text-gray-400 text-sm">暂无数据</div>
        )}
      </Card>

      {/* Collapsible Detail Table */}
      <Card padding="md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700">📋 详细数据表格</h3>
          <Button variant="ghost" size="sm" onClick={() => setShowTable(!showTable)}>
            {showTable ? '收起' : '展开'}
          </Button>
        </div>
        {showTable && (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">日期</th>
                    <th className="text-right px-3 py-2 font-medium">入住率</th>
                    <th className="text-right px-3 py-2 font-medium">在住</th>
                    <th className="text-right px-3 py-2 font-medium">空房</th>
                    <th className="text-right px-3 py-2 font-medium">收益</th>
                    <th className="text-right px-3 py-2 font-medium">ADR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {occupancy.map((day, i) => {
                    const dayRevenue = revenue
                      .filter(r => {
                        const d = new Date(r.date + 'T00:00:00')
                        return `${d.getMonth() + 1}/${d.getDate()}` === day.date
                      })
                      .reduce((sum, r) => sum + r.total, 0)
                    const dayAdr = day.occupiedRooms > 0 ? Math.round(dayRevenue / day.occupiedRooms) : 0
                    return (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="px-3 py-2 text-gray-900 font-medium">{day.date}</td>
                        <td className="px-3 py-2 text-right text-gray-700">{day.occupancyRate}%</td>
                        <td className="px-3 py-2 text-right text-gray-700">{day.occupiedRooms}间</td>
                        <td className="px-3 py-2 text-right text-gray-700">{day.totalRooms - day.occupiedRooms}间</td>
                        <td className="px-3 py-2 text-right text-gray-900">¥{dayRevenue.toLocaleString('zh-CN')}</td>
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
