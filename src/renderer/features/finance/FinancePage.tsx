import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, Input, Select, Dialog, DatePicker } from '../../components'
import type { FinancialSummary, FinancialLogDetailed, Order, Room, NightAuditData, RevenueByRoomType, OccupancyStats } from '../../../shared/types'

const today = () => new Date().toISOString().slice(0, 10)
const firstOfMonth = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

type Range = 'today' | 'month' | 'custom'
const METHOD_COLORS: Record<string, string> = { WeChat: '#07C160', Alipay: '#1677FF', Cash: '#F59E0B' }

export default function FinancePage({ refreshKey }: { refreshKey: number }) {
  const { t, i18n } = useTranslation()
  const [range, setRange] = useState<Range>('today')
  const [dateFrom, setDateFrom] = useState(today())
  const [dateTo, setDateTo] = useState(today())
  const [summary, setSummary] = useState<FinancialSummary | null>(null)
  const [logs, setLogs] = useState<FinancialLogDetailed[]>([])
  const [exporting, setExporting] = useState(false)
  const [showIncidental, setShowIncidental] = useState(false)
  const [incAmount, setIncAmount] = useState('100')
  const [incMethod, setIncMethod] = useState('WeChat')
  const [incOrderId, setIncOrderId] = useState('')
  const [orders, setOrders] = useState<Order[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [showNightAuditConfirm, setShowNightAuditConfirm] = useState(false)
  const [showNightAuditReport, setShowNightAuditReport] = useState(false)
  const [auditData, setAuditData] = useState<NightAuditData | null>(null)
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditExporting, setAuditExporting] = useState(false)
  const resolvedFrom = range === 'today' ? today() : range === 'month' ? firstOfMonth() : dateFrom
  const resolvedTo = range === 'today' ? today() : range === 'month' ? today() : dateTo

  const TYPE_LABEL: Record<string, string> = useMemo(() => ({
    ROOM_FEE: t('finance.roomFeeType'),
    DEPOSIT: t('finance.depositType'),
    INCIDENTAL: t('finance.incidentalType'),
  }), [t])

  const METHOD_LABEL: Record<string, string> = useMemo(() => ({
    WeChat: t('checkIn.wechat'),
    Alipay: t('checkIn.alipay'),
    Cash: t('checkIn.cash'),
  }), [t])

  const PAYMENT_METHODS = useMemo(() => [
    { value: 'WeChat', label: t('checkIn.wechat') },
    { value: 'Alipay', label: t('checkIn.alipay') },
    { value: 'Cash', label: t('checkIn.cash') },
  ], [t])

  const load = useCallback(async () => {
    try {
      const [s, l] = await Promise.all([
        window.electron.db.getFinancialSummary(resolvedFrom, resolvedTo),
        window.electron.db.getFinancialLogsDetailed(resolvedFrom, resolvedTo),
      ])
      setSummary(s)
      setLogs(l)
    } catch (e) {
      console.error('[FinancePage] load error:', e)
    }
  }, [resolvedFrom, resolvedTo])

  useEffect(() => { load() }, [load, refreshKey])
  useEffect(() => {
    Promise.resolve(window.electron.db.getOrders()).then(setOrders).catch((e: any) => console.error('[FinancePage] orders error:', e))
    Promise.resolve(window.electron.db.getRooms()).then(setRooms).catch((e: any) => console.error('[FinancePage] rooms error:', e))
  }, [refreshKey])

  const handleRange = (r: Range) => {
    setRange(r)
    if (r === 'today') { setDateFrom(today()); setDateTo(today()) }
    else if (r === 'month') { setDateFrom(firstOfMonth()); setDateTo(today()) }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const path = await window.electron.db.exportFinancialLogs(resolvedFrom, resolvedTo)
      if (path) alert(`${t('finance.exportedTo')}：${path}`)
    } finally {
      setExporting(false)
    }
  }

  const executeNightAudit = async () => {
    setShowNightAuditConfirm(false)
    setAuditLoading(true)
    try {
      const date = today()
      const [summary, byRoomType, occupancy] = await Promise.all([
        window.electron.db.getFinancialSummary(date, date),
        window.electron.db.getRevenueByRoomType(date, date),
        window.electron.db.getOccupancyStats(date),
      ])
      setAuditData({
        date,
        summary: {
          total: summary.roomFee + summary.deposit + summary.incidental,
          roomFee: summary.roomFee,
          deposit: summary.deposit,
          incidental: summary.incidental,
        },
        byRoomType,
        byMethod: summary.byMethod,
        occupancy,
      })
      setShowNightAuditReport(true)
    } catch (e) {
      console.error('[NightAudit] error:', e)
      alert(t('finance.nightAuditLoadFailed'))
    } finally {
      setAuditLoading(false)
    }
  }

  const handlePrintAudit = () => {
    const el = document.getElementById('night-audit-print')
    if (!el || !auditData) return
    const printWin = window.open('', '_blank')
    if (!printWin) return
    printWin.document.write(`
      <!DOCTYPE html>
      <html><head><meta charset="utf-8"><title>${auditData.date} Night Audit Report</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; padding: 40px; color: #111827; }
        h1 { font-size: 22px; text-align: center; margin-bottom: 28px; border-bottom: 2px solid #111827; padding-bottom: 12px; }
        h2 { font-size: 15px; margin: 20px 0 10px; color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        th, td { padding: 6px 10px; text-align: left; font-size: 13px; }
        th { background: #f9fafb; font-weight: 600; border-bottom: 1px solid #e5e7eb; }
        td { border-bottom: 1px solid #f3f4f6; }
        .amount { text-align: right; }
        .total-row { font-weight: 700; font-size: 18px; }
        .section { margin-bottom: 24px; }
        .sub { color: #6b7280; padding-left: 20px; }
        @media print { body { padding: 20px; } }
      </style></head><body>
      ${el.innerHTML}
      </body></html>
    `)
    printWin.document.close()
    printWin.focus()
    setTimeout(() => { printWin.print(); printWin.close() }, 300)
  }

  const handleExportAudit = async () => {
    if (!auditData) return
    setAuditExporting(true)
    try {
      const path = await window.electron.db.exportNightAudit(auditData)
      if (path) alert(`${t('finance.nightAuditExportedTo')}：${path}`)
    } catch (e) {
      console.error('[NightAudit] export error:', e)
      alert(t('finance.exportFailed'))
    } finally {
      setAuditExporting(false)
    }
  }

  const totalIncome = summary ? summary.roomFee + summary.incidental : 0

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('finance.title')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('finance.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNightAuditConfirm(true)}
            disabled={auditLoading}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
            </svg>
            {auditLoading ? t('finance.nightAuditing') : t('finance.nightAudit')}
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || logs.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            {exporting ? t('finance.exporting') : t('finance.export')}
          </button>
        </div>
      </div>

      {/* Date range tabs */}
      <div className="flex items-center gap-3">
        {([['today', t('finance.today')], ['month', t('finance.thisMonth')], ['custom', t('finance.custom')]] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => handleRange(key)}
            className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${range === key ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300'}`}
          >
            {label}
          </button>
        ))}
        {range === 'custom' && (
          <div className="flex items-center gap-2 ml-2">
            <DatePicker value={dateFrom} onChange={setDateFrom}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
            <span className="text-gray-400 text-sm">{t('finance.to')}</span>
            <DatePicker value={dateTo} onChange={setDateTo}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
          </div>
        )}
      </div>

      {/* Incidental charge form */}
      {!showIncidental ? (
        <button onClick={() => setShowIncidental(true)}
          className="text-sm text-primary-600 hover:text-primary-700 hover:underline">
          {t('finance.addIncidental')}
        </button>
      ) : (
        <div className="flex items-end gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
          <div className="w-32">
            <Input label={t('finance.incidentalAmount')} id="inc-amount" type="number" value={incAmount}
              onChange={e => setIncAmount(e.target.value)} />
          </div>
          <div className="w-28">
            <Select label={t('finance.incidentalMethod')} id="inc-method" value={incMethod}
              onChange={e => setIncMethod(e.target.value)}>
              {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </Select>
          </div>
          <div className="w-40">
            <Select label={t('finance.incidentalOrder')} id="inc-order" value={incOrderId}
              onChange={e => setIncOrderId(e.target.value)}>
              <option value="">{t('finance.noOrder')}</option>
              {orders.map(o => {
                const r = rooms.find(rm => rm.room_id === o.room_id)
                return <option key={o.order_id} value={o.order_id}>{r?.room_number ?? '?'} - {o.guest_name}</option>
              })}
            </Select>
          </div>
          <button
            onClick={async () => {
              await window.electron.db.insertFinancialLog({
                order_id: incOrderId ? Number(incOrderId) : null,
                type: 'INCIDENTAL',
                amount: Number(incAmount),
                payment_method: incMethod as any,
              })
              setShowIncidental(false)
              setIncAmount('100')
              setIncOrderId('')
              load()
            }}
            className="px-4 py-2 text-sm font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
          >
            {t('finance.confirmRecord')}
          </button>
          <button onClick={() => setShowIncidental(false)}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
            {t('common.cancel')}
          </button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t('finance.roomFee')}</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">¥{(summary?.roomFee ?? 0).toLocaleString('zh-CN', { minimumFractionDigits: 0 })}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t('finance.deposit')}</p>
              <p className="mt-2 text-3xl font-bold text-blue-600">¥{(summary?.deposit ?? 0).toLocaleString('zh-CN', { minimumFractionDigits: 0 })}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
              </svg>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t('finance.incidental')}</p>
              <p className="mt-2 text-3xl font-bold text-amber-600">¥{(summary?.incidental ?? 0).toLocaleString('zh-CN', { minimumFractionDigits: 0 })}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
              </svg>
            </div>
          </div>
        </Card>
      </div>

      {/* Chart + Logs */}
      <div className="grid grid-cols-5 gap-5">
        {/* Pie chart */}
        <Card className="col-span-2">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">{t('finance.paymentMethodRatio')}</h2>
          {summary && summary.byMethod.length > 0 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={summary.byMethod}
                    dataKey="total"
                    nameKey="payment_method"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    label={({ name, percent }: any) =>
                      `${METHOD_LABEL[name] || name} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {summary.byMethod.map((entry) => (
                      <Cell key={entry.payment_method} fill={METHOD_COLORS[entry.payment_method] || '#9CA3AF'} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => `¥${Number(value).toLocaleString('zh-CN')}`}
                    labelFormatter={(label: any) => METHOD_LABEL[label] || label}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-56 flex items-center justify-center text-sm text-gray-400">{t('finance.noData')}</div>
          )}
          {/* Legend */}
          {summary && summary.byMethod.length > 0 && (
            <div className="flex justify-center gap-5 mt-2">
              {summary.byMethod.map(m => (
                <div key={m.payment_method} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: METHOD_COLORS[m.payment_method] || '#9CA3AF' }} />
                  {METHOD_LABEL[m.payment_method] || m.payment_method}
                  <span className="text-gray-400">¥{m.total.toLocaleString('zh-CN')}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Financial logs table */}
        <Card className="col-span-3">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">{t('finance.transactionDetails')}</h2>
          {logs.length > 0 ? (
            <div className="overflow-auto max-h-80 rounded-lg border border-gray-100">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">{t('finance.time')}</th>
                    <th className="text-left px-3 py-2 font-medium">{t('finance.type')}</th>
                    <th className="text-left px-3 py-2 font-medium">{t('finance.roomNumber')}</th>
                    <th className="text-left px-3 py-2 font-medium">{t('finance.guest')}</th>
                    <th className="text-left px-3 py-2 font-medium">{t('finance.paymentMethod')}</th>
                    <th className="text-right px-3 py-2 font-medium">{t('finance.amount')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {logs.map((log) => (
                    <tr key={log.log_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{formatTime(log.created_at)}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${typeBadgeClass(log.type)}`}>
                          {TYPE_LABEL[log.type] || log.type}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-900">{log.room_number || '-'}</td>
                      <td className="px-3 py-2 text-gray-600">{log.guest_name || '-'}</td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-1 text-xs">
                          <span className="w-2 h-2 rounded-full" style={{ background: METHOD_COLORS[log.payment_method] || '#9CA3AF' }} />
                          {METHOD_LABEL[log.payment_method] || log.payment_method}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-gray-900">¥{log.amount.toLocaleString('zh-CN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-16 text-center text-sm text-gray-400">{t('finance.noLogs')}</div>
          )}
        </Card>
      </div>

      {/* Night Audit Confirmation Dialog */}
      <Dialog open={showNightAuditConfirm} onClose={() => setShowNightAuditConfirm(false)} title={t('finance.nightAuditConfirm')}>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {t('finance.nightAuditConfirmText')} <span className="font-semibold text-gray-900">{today()}</span> {t('finance.nightAuditConfirmText2')}
          </p>
          <p className="text-xs text-gray-400">{t('finance.nightAuditHint')}</p>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setShowNightAuditConfirm(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={executeNightAudit}
              className="px-4 py-2 text-sm font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
            >
              {t('finance.confirmExecute')}
            </button>
          </div>
        </div>
      </Dialog>

      {/* Night Audit Report Dialog */}
      <Dialog
        open={showNightAuditReport}
        onClose={() => setShowNightAuditReport(false)}
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
                        ? ((m.total / auditData.summary.total) * 100).toFixed(1)
                        : '0.0'
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

            {/* Action buttons */}
            <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-gray-100">
              <button
                onClick={handlePrintAudit}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m0 0a48.159 48.159 0 018.5 0m-8.5 0V5.625a2.25 2.25 0 012.25-2.25h4.5a2.25 2.25 0 012.25 2.25v1.613" />
                </svg>
                {t('finance.printReport')}
              </button>
              <button
                onClick={handleExportAudit}
                disabled={auditExporting}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-40 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                {auditExporting ? t('finance.exporting') : t('finance.export')}
              </button>
              <button
                onClick={() => setShowNightAuditReport(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}

function formatTime(iso: string) {
  if (!iso) return '-'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function typeBadgeClass(type: string) {
  switch (type) {
    case 'ROOM_FEE': return 'bg-green-50 text-green-700'
    case 'DEPOSIT':  return 'bg-blue-50 text-blue-700'
    case 'INCIDENTAL': return 'bg-amber-50 text-amber-700'
    default: return 'bg-gray-100 text-gray-600'
  }
}

function fmtCurrency(n: number) {
  return `¥${n.toLocaleString('zh-CN', { minimumFractionDigits: 0 })}`
}
