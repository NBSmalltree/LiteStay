import { useState, useEffect, useMemo } from 'react'
import { fmtDate, daysAgo } from '../../utils'
import type {
  DailyOccupancy, DailyRevenueByType, RoomTypeAnalysis,
  MonthlyRevenue, QuarterlyRevenue, YearlyRevenue, RevenueGrowth, PaymentMethodTrend,
  ADRRevPARData, ADRRevPARTrend, ADRByRoomType,
  SourceStat, SourceTrend,
} from '../../../shared/types'

export interface AnalyticsData {
  occupancy: DailyOccupancy[]
  revenue: DailyRevenueByType[]
  roomTypeData: RoomTypeAnalysis[]
  monthlyRevenue: MonthlyRevenue[]
  quarterlyRevenue: QuarterlyRevenue[]
  yearlyRevenue: YearlyRevenue[]
  revenueGrowth: RevenueGrowth
  paymentMethodTrend: PaymentMethodTrend[]
  sourceStats: SourceStat[]
  sourceTrend: SourceTrend[]
  adrRevparData: ADRRevPARData
  adrRevparTrend: ADRRevPARTrend[]
  adrByRoomType: ADRByRoomType[]
  showTable: boolean
  setShowTable: (v: boolean) => void
  todayOccupancy: number
  monthRevenue: number
  adr: number
  roomTypes: string[]
  revenueBarData: { date: string }[]
  revenuePie: { name: string; value: number }[]
  orderPie: { name: string; value: number }[]
  sourceTrendData: { month: string }[]
}

export function useAnalyticsData(refreshKey?: number): AnalyticsData {
  const [occupancy, setOccupancy] = useState<DailyOccupancy[]>([])
  const [revenue, setRevenue] = useState<DailyRevenueByType[]>([])
  const [roomTypeData, setRoomTypeData] = useState<RoomTypeAnalysis[]>([])
  const [showTable, setShowTable] = useState(false)

  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue[]>([])
  const [quarterlyRevenue, setQuarterlyRevenue] = useState<QuarterlyRevenue[]>([])
  const [yearlyRevenue, setYearlyRevenue] = useState<YearlyRevenue[]>([])
  const [revenueGrowth, setRevenueGrowth] = useState<RevenueGrowth>({
    current_month: 0, last_month: 0, growth_rate: 0, growth_amount: 0
  })
  const [paymentMethodTrend, setPaymentMethodTrend] = useState<PaymentMethodTrend[]>([])

  const [sourceStats, setSourceStats] = useState<SourceStat[]>([])
  const [sourceTrend, setSourceTrend] = useState<SourceTrend[]>([])

  const [adrRevparData, setAdrRevparData] = useState<ADRRevPARData>({
    adr: 0, revpar: 0, total_room_fee: 0,
    sold_room_nights: 0, available_room_nights: 0, occupancy_rate: 0
  })
  const [adrRevparTrend, setAdrRevparTrend] = useState<ADRRevPARTrend[]>([])
  const [adrByRoomType, setAdrByRoomType] = useState<ADRByRoomType[]>([])

  const dateFrom = daysAgo(30)
  const dateTo = fmtDate(new Date())

  useEffect(() => {
    window.electron.db.getDailyOccupancy(dateFrom, dateTo).then(setOccupancy)
    window.electron.db.getDailyRevenueByType(dateFrom, dateTo).then(setRevenue)
    window.electron.db.getRoomTypeAnalysis(dateFrom, dateTo).then(setRoomTypeData)

    const currentYear = new Date().getFullYear()
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - 6)
    const sourceDateFrom = startDate.toISOString().slice(0, 10)
    const sourceDateTo = new Date().toISOString().slice(0, 10)

    Promise.all([
      window.electron.db.getMonthlyRevenue(currentYear),
      window.electron.db.getQuarterlyRevenue(currentYear),
      window.electron.db.getYearlyRevenue(),
      window.electron.db.getRevenueGrowth(),
      window.electron.db.getPaymentMethodTrend(6),
      window.electron.db.getADRRevPAR(dateFrom, dateTo),
      window.electron.db.getADRRevPARTrend(30),
      window.electron.db.getADRByRoomType(dateFrom, dateTo),
      window.electron.db.getSourceStats(sourceDateFrom, sourceDateTo),
      window.electron.db.getSourceTrend(6),
    ]).then(([monthly, quarterly, yearly, growth, payment, adrData, adrTrend, adrByType, stats, trend]) => {
      setMonthlyRevenue(monthly)
      setQuarterlyRevenue(quarterly)
      setYearlyRevenue(yearly)
      setRevenueGrowth(growth)
      setPaymentMethodTrend(payment)
      setAdrRevparData(adrData)
      setAdrRevparTrend(adrTrend)
      setAdrByRoomType(adrByType)
      setSourceStats(stats)
      setSourceTrend(trend)
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

  const thisMonthStart = todayStr.slice(0, 7) + '-01'
  const monthRevenue = useMemo(() => {
    return revenue.filter(r => r.date >= thisMonthStart).reduce((sum, r) => sum + r.total, 0)
  }, [revenue, thisMonthStart])

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
      date: (() => { const d = new Date(date + 'T00:00:00'); return `${d.getMonth() + 1}/${d.getDate()}` })(),
      ...types,
    }))
  }, [revenue])

  // -- Pie chart data --
  const revenuePie = useMemo(() =>
    roomTypeData.map(rt => ({ name: rt.room_type, value: rt.revenue })), [roomTypeData])
  const orderPie = useMemo(() =>
    roomTypeData.map(rt => ({ name: rt.room_type, value: rt.order_count })), [roomTypeData])

  // -- Source trend data --
  const sourceTrendData = useMemo(() => {
    const byMonth: Record<string, Record<string, number>> = {}
    for (const s of sourceTrend) {
      if (!byMonth[s.month]) byMonth[s.month] = {}
      byMonth[s.month][s.source] = (byMonth[s.month][s.source] || 0) + s.order_count
    }
    return Object.entries(byMonth).map(([month, sources]) => ({ month, ...sources }))
  }, [sourceTrend])

  return {
    occupancy, revenue, roomTypeData,
    monthlyRevenue, quarterlyRevenue, yearlyRevenue, revenueGrowth, paymentMethodTrend,
    sourceStats, sourceTrend,
    adrRevparData, adrRevparTrend, adrByRoomType,
    showTable, setShowTable, todayOccupancy, monthRevenue, adr,
    roomTypes, revenueBarData, revenuePie, orderPie, sourceTrendData,
  }
}
